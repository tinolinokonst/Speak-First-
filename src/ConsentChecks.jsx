import React from "react";

// ── Shared consent + age checkboxes ──────────────────────────────────────────
// Used by BOTH the email signup form and the post-OAuth consent gate, so the
// wording a user agrees to is identical however they arrive. Both boxes are
// controlled and always start unchecked — this component never pre-fills.
const T = {
  bg:      "#FBF8F4",
  text:    "#1E1B16",
  textSub: "#6B6560",
  border:  "#EDE8E2",
  accent:  "#E8654E",
  card: 18,
};

export default function ConsentChecks({
  agreedTerms,
  setAgreedTerms,
  agreedAge,
  setAgreedAge,
  onChange,
  shake = false,
}) {
  const touch = () => onChange && onChange();

  return (
    <div className={shake ? "sf-shake" : ""} style={boxStyle}>
      <label style={rowStyle}>
        <input
          type="checkbox"
          checked={agreedTerms}
          onChange={(e) => { setAgreedTerms(e.target.checked); touch(); }}
          style={checkboxStyle}
        />
        <span>
          I agree to the{" "}
          {/* New tab: reading the documents must never discard the form or
              interrupt the consent step. */}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Privacy Policy
          </a>.
        </span>
      </label>

      <label style={{ ...rowStyle, marginBottom: 0 }}>
        <input
          type="checkbox"
          checked={agreedAge}
          onChange={(e) => { setAgreedAge(e.target.checked); touch(); }}
          style={checkboxStyle}
        />
        <span>I confirm I am 18 years of age or older.</span>
      </label>
    </div>
  );
}

/** Message for a blocked attempt, matched to which box is missing. */
export function consentMessage(agreedTerms, agreedAge) {
  if (!agreedTerms && !agreedAge)
    return "Please confirm you're 18 or older and agree to the Terms and Privacy Policy.";
  if (!agreedTerms)
    return "Please agree to the Terms of Service and Privacy Policy to continue.";
  return "Please confirm you're 18 or older to continue.";
}

const boxStyle = {
  background: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: T.card,
  padding: "14px 16px",
  marginBottom: 16,
};

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontSize: 13.5,
  lineHeight: 1.5,
  color: T.text,
  cursor: "pointer",
  marginBottom: 10,
};

const checkboxStyle = {
  width: 17,
  height: 17,
  marginTop: 1,
  flexShrink: 0,
  accentColor: T.accent,
  cursor: "pointer",
};

const linkStyle = {
  color: T.accent,
  textDecorationColor: "rgba(232,101,78,.4)",
};
