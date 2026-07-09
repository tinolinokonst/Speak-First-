import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, X, ChevronRight, Keyboard } from "lucide-react";
import { speak, stopAllSpeech, recognitionSupported, createRecognizer } from "./speech.js";
import TextReplyInput from "./TextReplyInput.jsx";

// ── Landing-page guest demo ───────────────────────────────────────────────────
// One button that expands into a small inline panel (no modal). The visitor
// talks to "Sofía" through /api/demo — the system prompt lives server-side.
//
// PRIVACY INVARIANT: the conversation lives in component state ONLY. Nothing
// here writes to Supabase, cookies, or localStorage; closing the panel (or
// leaving the page) destroys it. This backs the privacy copy on the page.
const T = {
  bg:          "#FBF8F4",
  surface:     "#FFFFFF",
  surfaceWarm: "#FDF9F5",
  text:        "#1E1B16",
  textSub:     "#6B6560",
  border:      "#EDE8E2",
  accent:      "#E8654E",
  accentTint:  "#FBE9E3",
  support:     "#5C7A6B",
  supportTint: "#E8F0EB",
  card: 18,
  pill: 100,
  shadowCard: "0 1px 3px rgba(30,27,22,.05), 0 4px 12px rgba(30,27,22,.04)",
};
const OL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" };

const MAX_USER_TURNS = 4;

export default function DemoPanel({ onSignup, onListeningChange }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // drives the height+opacity transition
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content}
  const [listening, setListeningState] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [typeMode, setTypeMode] = useState(!recognitionSupported());
  const [error, setError] = useState(null);
  const recogRef = useRef(null);
  const scrollRef = useRef(null);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Listening state also drives the hero waveform amplitude via the parent.
  function setListening(v) {
    setListeningState(v);
    onListeningChange && onListeningChange(v);
  }

  const userTurns = messages.filter((m) => m.role === "user").length;
  const demoOver = userTurns >= MAX_USER_TURNS;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  // Trigger the expand transition one frame after the panel mounts so the
  // grid-rows 0fr → 1fr change actually animates.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  function closePanel() {
    setExpanded(false);
    if (listening) setListening(false);
    if (reducedMotion) setOpen(false);
    else setTimeout(() => setOpen(false), 300); // matches --sf-dur-slow
  }

  // Kill any audio + recognition when the panel closes or unmounts.
  useEffect(() => {
    if (open) return;
    stopAllSpeech();
    recogRef.current && recogRef.current.abort && recogRef.current.abort();
  }, [open]);
  useEffect(() => () => stopAllSpeech(), []);

  async function sendUtterance(text) {
    setError(null);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setThinking(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.done) return; // server says demo over — the end card renders below
      if (!res.ok) {
        setError(
          res.status === 429
            ? "The demo is busy right now — try again in a little while."
            : "Sofía couldn't answer — try once more."
        );
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.text }]);
      speak(data.text);
    } catch {
      setError("Sofía couldn't answer — try once more.");
    } finally {
      setThinking(false);
    }
  }

  function toggleListen() {
    if (listening) {
      recogRef.current && recogRef.current.stop();
      return;
    }
    stopAllSpeech();
    const r = createRecognizer({
      onResult: (said) => sendUtterance(said),
      onEnd: () => setListening(false),
      onError: (e) => {
        setListening(false);
        // Mic denied or unavailable — swap to the typed fallback, never a dead button.
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed" || e?.error === "audio-capture") {
          setTypeMode(true);
        }
      },
    });
    if (!r) {
      setTypeMode(true);
      return;
    }
    recogRef.current = r;
    setListening(true);
    r.start();
  }

  // ── Collapsed: a single inviting button ──
  if (!open) {
    return (
      <button
        className="sf-btn-secondary"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: T.surface, color: T.accent,
          border: `1.5px solid ${T.accent}`, borderRadius: T.pill,
          padding: "13px 22px", fontSize: 15, fontWeight: 600,
          fontFamily: "inherit", cursor: "pointer",
        }}
      >
        <Mic size={16} />
        Try it — say hi to Sofía
      </button>
    );
  }

  // ── Expanded inline panel — height + opacity animate via .sf-expand ──
  return (
    <div className={`sf-expand${expanded ? " sf-expand--open" : ""}`}>
      <div>
        <div
          style={{
            maxWidth: 440,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.card,
            boxShadow: T.shadowCard,
            overflow: "hidden",
          }}
        >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${T.border}`, background: T.bg }}>
        <div style={{ ...OL, color: T.accent }}>Sofía · live demo</div>
        <button
          onClick={closePanel}
          aria-label="Close demo"
          style={{ background: "none", border: "none", cursor: "pointer", color: T.textSub, display: "flex", padding: 2 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ maxHeight: 240, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.textSub, margin: 0 }}>
            Sofía is a beginner-friendly Spanish partner. Say{" "}
            <strong style={{ color: T.text }}>"hola"</strong> — she'll take it from there.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className="sf-msg-in"
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.role === "user" ? T.text : T.surfaceWarm,
              color: m.role === "user" ? "#fff" : T.text,
              border: m.role === "user" ? "none" : `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "9px 13px",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {m.content}
          </div>
        ))}
        {thinking && (
          <div className="sf-msg-in sf-typing" aria-label="Sofía is typing" style={{ alignSelf: "flex-start" }}>
            <span /><span /><span />
          </div>
        )}
        {error && (
          <div className="sf-msg-in" style={{ fontSize: 13, color: T.accent, background: T.accentTint, borderRadius: 10, padding: "8px 12px" }}>{error}</div>
        )}
      </div>

      {/* Footer: end card, or mic / typed input */}
      <div style={{ padding: "12px 16px 14px", borderTop: `1px solid ${T.border}` }}>
        {demoOver && !thinking ? (
          <div className="sf-msg-in" style={{ background: T.supportTint, border: "1px solid rgba(92,122,107,.2)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: T.text, margin: "0 0 10px" }}>
              That's the demo — sign up to practice 12 real scenarios.
            </p>
            <button
              className="sf-btn-primary sf-arrow-cta"
              onClick={onSignup}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: T.accent, color: "#fff", border: "none",
                borderRadius: T.pill, padding: "11px 18px",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Sign up free <ChevronRight size={15} />
            </button>
          </div>
        ) : typeMode ? (
          <TextReplyInput onSend={sendUtterance} disabled={thinking} busy={thinking} autoFocus />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={toggleListen}
              disabled={thinking}
              className={`sf-mic ${listening ? "sf-mic--listening" : thinking ? "sf-mic--processing" : "sf-mic-idle"}`}
              aria-label={listening ? "Stop recording" : "Start speaking"}
              style={{
                width: 48, height: 48, borderRadius: "50%", border: "none",
                cursor: thinking ? "default" : "pointer",
                background: listening ? T.accent : thinking ? T.border : T.text,
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}
            >
              {listening ? <Square size={20} fill="currentColor" strokeWidth={0} /> : <Mic size={20} />}
            </button>
            <span style={{ fontSize: 13, color: T.textSub, flex: 1 }}>
              {listening ? "Listening… tap to stop" : thinking ? "Sofía is thinking…" : "Tap and say hola"}
            </span>
            <button
              onClick={() => setTypeMode(true)}
              className="sf-btn-ghost"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: "pointer",
                color: T.accent, fontSize: 13, fontWeight: 600,
                fontFamily: "inherit", padding: "4px 2px", flexShrink: 0,
              }}
            >
              <Keyboard size={14} /> type instead
            </button>
          </div>
        )}
        <p style={{ fontSize: 11.5, color: T.textSub, margin: "10px 0 0", lineHeight: 1.5 }}>
          Nothing you say here is saved — the demo lives in this tab and disappears when you close it.
        </p>
      </div>
        </div>
      </div>
    </div>
  );
}
