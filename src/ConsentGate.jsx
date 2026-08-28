import React, { useState } from "react";
import { supabase } from "./supabase.js";
import { ShieldCheck } from "lucide-react";
import ConsentChecks, { consentMessage } from "./ConsentChecks.jsx";
import { POLICY_VERSION, recordConsent } from "./consent.js";

// ── Post-authentication consent gate ─────────────────────────────────────────
// Shown when someone is authenticated but has no consent record for the current
// policy version. This is what closes the Google bypass: OAuth authenticates
// before the user is back in the app, so the button-level check on the signup
// tab can't cover a new user who clicked "Continue with Google" from the log-in
// tab (Supabase creates the account either way). Enforcing at the session level
// covers every route in, including a refresh mid-flow.
const T = {
  bg:          "#FBF8F4",
  surface:     "#FFFFFF",
  text:        "#1E1B16",
  textSub:     "#6B6560",
  border:      "#EDE8E2",
  accent:      "#E8654E",
  accentTint:  "#FBE9E3",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  card: 18,
  pill: 100,
};
const OL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" };

export default function ConsentGate({ user, onConsented, onCancelled }) {
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(false);

  const consentGiven = agreedTerms && agreedAge;

  async function handleAgree() {
    if (!consentGiven) {
      setError(consentMessage(agreedTerms, agreedAge));
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }
    setError(null);
    setLoading(true);
    const { ok } = await recordConsent(user.id, POLICY_VERSION);
    setLoading(false);
    if (!ok) {
      // Do NOT let them through on a failed write — an unrecorded consent is
      // the same as no consent, and silently proceeding is how this bug began.
      setError("We couldn't save your agreement. Please try again in a moment.");
      return;
    }
    onConsented();
  }

  async function handleCancel() {
    // Declining must not leave an authenticated session able to reach the app.
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
      onCancelled();
    }
  }

  return (
    <div className="sf-screen" style={containerStyle}>
      <div style={{ ...OL, color: T.accent, marginBottom: 28 }}>Speak First</div>

      <div style={iconWrapStyle}>
        <ShieldCheck size={22} color={T.accent} />
      </div>

      <h2 style={headingStyle}>One quick thing</h2>
      <p style={bodyStyle}>
        You're signed in as <strong>{user?.email}</strong>. Before you start practicing,
        please confirm the two points below — we ask everyone once.
      </p>

      <div style={{ marginTop: 24 }}>
        <ConsentChecks
          agreedTerms={agreedTerms}
          setAgreedTerms={setAgreedTerms}
          agreedAge={agreedAge}
          setAgreedAge={setAgreedAge}
          onChange={() => setError(null)}
          shake={shake}
        />
      </div>

      <div className={`sf-field-msg${error ? " sf-field-msg--show" : ""}`} aria-live="polite">
        <div>
          <div style={errorStyle}>{error || " "}</div>
        </div>
      </div>

      <button
        onClick={handleAgree}
        disabled={loading || !consentGiven}
        className={loading ? "sf-btn-loading" : ""}
        style={{
          ...primaryBtnStyle,
          position: "relative",
          opacity: !consentGiven || loading ? 0.5 : 1,
          cursor: !consentGiven || loading ? "not-allowed" : "pointer",
        }}
      >
        <span className="sf-btn-label">Agree and continue</span>
        <span className="sf-btn-spinner" aria-hidden="true" />
      </button>

      <button onClick={handleCancel} disabled={loading} style={cancelBtnStyle}>
        Cancel and sign out
      </button>

      <p style={footnoteStyle}>
        You can't use Speak First without agreeing. Cancelling signs you out and leaves
        your account untouched — you can delete it any time from account settings.
      </p>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "64px 20px",
  maxWidth: 420,
  margin: "0 auto",
};

const iconWrapStyle = {
  width: 44,
  height: 44,
  borderRadius: 13,
  background: T.accentTint,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
};

const headingStyle = {
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: "-0.022em",
  lineHeight: 1.1,
  margin: "0 0 10px",
  color: T.text,
};

const bodyStyle = {
  fontSize: 15,
  lineHeight: 1.6,
  color: T.textSub,
  margin: 0,
};

const primaryBtnStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: T.accent,
  color: "#fff",
  border: "none",
  borderRadius: T.pill,
  padding: "15px 24px",
  fontSize: 16,
  fontWeight: 700,
  fontFamily: T.sans,
};

const cancelBtnStyle = {
  width: "100%",
  background: "none",
  color: T.textSub,
  border: "none",
  borderRadius: T.pill,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: T.sans,
  cursor: "pointer",
  marginTop: 10,
};

const errorStyle = {
  fontSize: 14,
  color: T.accent,
  background: T.accentTint,
  border: "1px solid rgba(232,101,78,.2)",
  borderRadius: 10,
  padding: "10px 14px",
  lineHeight: 1.45,
};

const footnoteStyle = {
  fontSize: 12.5,
  lineHeight: 1.55,
  color: T.textSub,
  textAlign: "center",
  margin: "18px 0 0",
};
