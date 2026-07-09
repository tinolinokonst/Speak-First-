import React, { useState } from "react";
import { Send } from "lucide-react";

// ── Shared typed-reply fallback ───────────────────────────────────────────────
// Used by the landing-page demo AND the main conversation screen whenever
// speech recognition is unsupported, mic permission is denied, or the user
// simply prefers typing. One implementation, no dead mic buttons anywhere.
const T = {
  text:    "#1E1B16",
  textSub: "#6B6560",
  border:  "#EDE8E2",
  surface: "#FFFFFF",
  accent:  "#E8654E",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// `busy` swaps the send icon for an inline spinner (same size, no dead button
// after a click). Optional — the main chat screen doesn't pass it and is unchanged.
export default function TextReplyInput({ onSend, disabled, busy = false, placeholder = "Escribe tu respuesta…", autoFocus = false }) {
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, width: "100%" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label="Type your reply in Spanish"
        style={{
          flex: 1,
          minWidth: 0,
          padding: "12px 16px",
          fontSize: 15,
          fontFamily: T.sans,
          color: T.text,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 100,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send reply"
        className={busy ? "sf-btn-loading" : ""}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          flexShrink: 0,
          position: "relative",
          background: busy ? T.accent : value.trim() && !disabled ? T.accent : T.border,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: value.trim() && !disabled ? "pointer" : "default",
          transition: "background var(--sf-dur-fast) var(--sf-ease)",
        }}
      >
        <span className="sf-btn-label"><Send size={17} /></span>
        <span className="sf-btn-spinner" aria-hidden="true" />
      </button>
    </form>
  );
}
