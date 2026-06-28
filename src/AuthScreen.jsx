import React, { useState } from "react";
import { supabase } from "./supabase.js";
import { ChevronRight, Mail } from "lucide-react";

// Design tokens — kept in sync with App.jsx manually (no shared module needed yet).
const T = {
  bg:          "#FBF8F4",
  surface:     "#FFFFFF",
  text:        "#1E1B16",
  textSub:     "#6B6560",
  border:      "#EDE8E2",
  accent:      "#E8654E",
  accentTint:  "#FBE9E3",
  support:     "#5C7A6B",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  card: 18,
  pill: 100,
  shadowCard: "0 1px 3px rgba(30,27,22,.05), 0 4px 12px rgba(30,27,22,.04)",
};
const OL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" };

// Google "G" mark as an inline SVG — avoids any external image dependency.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}

export default function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkEmail, setCheckEmail] = useState(false); // post-signup confirmation state

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        // If Supabase returns a session immediately, email confirmation is disabled
        // and onAuthStateChange SIGNED_IN will navigate us into the app automatically.
        // If there's no session, email confirmation is required — show the prompt.
        if (!data.session) setCheckEmail(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // onAuthStateChange SIGNED_IN in App.jsx navigates to home.
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // After Google login the user lands back here; Supabase restores the session.
        redirectTo: window.location.origin,
      },
    });
    if (err) setError(friendlyError(err.message));
  }

  if (checkEmail) {
    return (
      <div className="sf-screen" style={containerStyle}>
        <div style={{ ...OL, color: T.accent, marginBottom: 24 }}>Speak First</div>
        <h2 style={headingStyle}>Check your email</h2>
        <p style={bodyStyle}>
          We sent a confirmation link to <strong>{email}</strong>.
          Open it to activate your account, then come back here to log in.
        </p>
        <button onClick={() => { setCheckEmail(false); setMode("login"); }} style={secondaryBtnStyle}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <div className="sf-screen" style={containerStyle}>
      {/* Wordmark */}
      <div style={{ ...OL, color: T.accent, marginBottom: 28 }}>Speak First</div>

      <h2 style={headingStyle}>
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h2>
      <p style={{ ...bodyStyle, marginBottom: 28 }}>
        {mode === "login"
          ? "Log in to continue your Spanish practice."
          : "Sign up free to start speaking."}
      </p>

      {/* Google OAuth */}
      <button onClick={handleGoogle} style={googleBtnStyle}>
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div style={dividerStyle}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ ...OL, color: T.textSub, padding: "0 12px" }}>or</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* Email + password form */}
      <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ ...primaryBtnStyle, opacity: loading ? 0.6 : 1 }}
        >
          <Mail size={16} />
          {loading
            ? (mode === "login" ? "Logging in…" : "Creating account…")
            : (mode === "login" ? "Log in with email" : "Sign up with email")}
        </button>
      </form>

      {/* Toggle mode */}
      <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: T.textSub }}>
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
          style={linkBtnStyle}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  );
}

// ── Friendly copies for common Supabase auth errors ─────────────────────────
function friendlyError(msg) {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Email or password is incorrect.";
  if (m.includes("email already registered") || m.includes("user already registered"))
    return "An account with that email already exists. Try logging in instead.";
  if (m.includes("password should be"))
    return "Password must be at least 6 characters.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email address before logging in.";
  if (m.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  return msg;
}

// ── Style objects ────────────────────────────────────────────────────────────
const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "64px 20px",
  maxWidth: 420,
  margin: "0 auto",
};

const headingStyle = {
  fontSize: 36,
  fontWeight: 800,
  letterSpacing: "-0.022em",
  lineHeight: 1.1,
  margin: "0 0 10px",
  color: T.text,
};

const bodyStyle = {
  fontSize: 16,
  lineHeight: 1.6,
  color: T.textSub,
  margin: 0,
};

const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  fontSize: 16,
  fontFamily: T.sans,
  color: T.text,
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.card,
  outline: "none",
  boxSizing: "border-box",
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
  cursor: "pointer",
  transition: "opacity .15s ease",
};

const secondaryBtnStyle = {
  ...primaryBtnStyle,
  background: "none",
  color: T.text,
  border: `1.5px solid ${T.border}`,
  fontWeight: 600,
  marginTop: 16,
};

const googleBtnStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: T.surface,
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: T.pill,
  padding: "13px 24px",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: T.sans,
  cursor: "pointer",
  boxShadow: T.shadowCard,
};

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  margin: "20px 0",
};

const errorStyle = {
  fontSize: 14,
  color: T.accent,
  background: T.accentTint,
  border: `1px solid rgba(232,101,78,.2)`,
  borderRadius: 10,
  padding: "10px 14px",
  lineHeight: 1.45,
};

const linkBtnStyle = {
  background: "none",
  border: "none",
  color: T.accent,
  fontFamily: T.sans,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
  textDecorationColor: "rgba(232,101,78,.4)",
};
