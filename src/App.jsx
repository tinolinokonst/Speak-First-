import React, { useState, useRef, useEffect } from "react";
import "./App.css";

// ── Scenarios: the thing the learner actually does. Real situations, not drills.
const SCENARIOS = [
  {
    id: "cafe",
    title: "Order at a café",
    sub: "Madrid, mid-morning",
    persona:
      "You are Marta, a warm but busy barista at a café in Madrid. You only speak Spanish. Greet the customer and take their order naturally.",
    opener: "¡Hola! Buenos días. ¿Qué te pongo?",
    level: "Beginner",
    difficulty: 1,
    recommended: true,
  },
  {
    id: "interview",
    title: "Job interview",
    sub: "Marketing role, Bogotá",
    persona:
      "You are Diego, a friendly hiring manager interviewing a candidate for a junior marketing role in Bogotá. You only speak Spanish. Ask normal interview questions, one at a time.",
    opener: "Buenas. Gracias por venir. Cuéntame un poco sobre ti.",
    level: "Intermediate",
    difficulty: 3,
  },
  {
    id: "friend",
    title: "Catch up with a friend",
    sub: "Weekend small talk",
    persona:
      "You are Lucía, an old friend catching up over coffee. You only speak Spanish. Be casual, curious, and chatty about each other's week.",
    opener: "¡Ey! Cuánto tiempo. ¿Qué tal todo?",
    level: "Beginner",
    difficulty: 2,
  },
];

// ── Design tokens ────────────────────────────────────────────────────────────
// One source of truth for all three screens. Chime-inspired structure:
// near-white base, pure-white surfaces, ONE accent used sparingly per screen,
// clear type scale, very gentle depth. Not banking-green — warm terracotta.
const T = {
  // Color
  bg:          "#FBF8F4",   // page background — warm off-white
  surface:     "#FFFFFF",   // card / bubble surface
  surfaceWarm: "#FDF9F5",   // recommended card tint — barely warm
  text:        "#1E1B16",   // primary text — deep warm near-black (WCAG AA ✓)
  textSub:     "#6B6560",   // secondary labels / captions
  border:      "#EDE8E2",   // card borders and dividers

  // Accent — coral/terracotta. ONE element per screen gets this. Chime discipline:
  // do not flood the UI. In chat, only the mic ring while listening.
  accent:     "#E8654E",
  accentTint: "#FBE9E3",   // badge backgrounds, tint fills — very soft

  // Support — muted sage. Reserved for encouragement / success moments only.
  support:     "#5C7A6B",
  supportTint: "#E8F0EB",

  // Typography — warm humanist sans. Inter if available, system stack otherwise.
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

  // Border-radius
  card: 18,    // standard card and bubble radius
  pill: 100,   // pill-shaped buttons

  // Shadows — very subtle, Chime-style quiet depth
  shadowCard: "0 1px 3px rgba(30,27,22,.05), 0 4px 12px rgba(30,27,22,.04)",
  shadowMic:  "0 4px 16px rgba(30,27,22,.18)",
};

// Shared overline style — uppercase label used on all three screens
const OL = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export default function App() {
  const [screen, setScreen] = useState("home"); // home | chat | feedback
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]); // {role:'tutor'|'user', text}
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 500);

  const recogRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) setSupported(false);
  }, []);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 500);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function speak(text) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function startScenario(s) {
    setScenario(s);
    setMessages([{ role: "tutor", text: s.opener }]);
    setFeedback(null);
    setScreen("chat");
    setTimeout(() => speak(s.opener), 400);
  }

  // ── Conversation call. The system prompt is the whole product. It stays in
  // character and NEVER corrects mid-flow. Correction is saved for the coach.
  async function getTutorReply(history) {
    const convo = history
      .map((m) => `${m.role === "user" ? "Learner" : "You"}: ${m.text}`)
      .join("\n");
    const system = `${scenario.persona}

Rules:
- Reply ONLY in natural Spanish, 1-2 short sentences. This is spoken conversation.
- Stay fully in character. Never break role.
- NEVER correct the learner's mistakes or comment on their Spanish. Just respond to what they meant and keep the conversation moving.
- If they make an error, understand their intent and react naturally, like a patient native speaker would.
- Ask a follow-up question to keep them talking.`;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "conversation",
        system,
        messages: [{ role: "user", content: convo + "\n\nYou:" }],
      }),
    });
    if (!res.ok) throw new Error("API error");
    const { text } = await res.json();
    return text;
  }

  async function handleUserUtterance(text) {
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setThinking(true);
    try {
      const reply = await getTutorReply(next);
      setMessages((m) => [...m, { role: "tutor", text: reply }]);
      speak(reply);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "tutor", text: "(Perdona, se me fue. ¿Puedes repetir?)" },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function toggleListen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recogRef.current && recogRef.current.stop();
      return;
    }
    window.speechSynthesis && window.speechSynthesis.cancel();
    const r = new SR();
    r.lang = "es-ES";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const said = e.results[0][0].transcript;
      handleUserUtterance(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  }

  // ── Coach call. Runs at the end on the full transcript. THIS is where
  // correction lives. Top 3 fixes only, so it builds confidence not despair.
  async function endAndReview() {
    window.speechSynthesis && window.speechSynthesis.cancel();
    setFeedbackLoading(true);
    setScreen("feedback");
    const transcript = messages
      .map((m) => `${m.role === "user" ? "Learner" : "Partner"}: ${m.text}`)
      .join("\n");
    const system = `You are a kind, sharp Spanish coach reviewing a conversation a learner just had.
Return ONLY valid JSON, no markdown, no preamble, in this exact shape:
{"encouragement":"one warm sentence on what they did well","fixes":[{"said":"what the learner said","better":"the natural way to say it","why":"short plain-English reason"}],"phrase":"one useful phrase to try next time"}
Pick at MOST 3 fixes, the highest-impact ones. If the learner barely spoke, say so kindly in encouragement and return fewer fixes.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "coach",
          system,
          messages: [
            {
              role: "user",
              content: `Here is the conversation:\n${transcript}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("API error");
      const { text } = await res.json();
      const raw = text.replace(/```json|```/g, "").trim();
      setFeedback(JSON.parse(raw));
    } catch (e) {
      setFeedback({
        encouragement: "Nice work showing up and speaking.",
        fixes: [],
        phrase: "",
      });
    } finally {
      setFeedbackLoading(false);
    }
  }

  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: T.sans,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, padding: "0 20px" }}>

        {/* ── HOME ───────────────────────────────── */}
        {screen === "home" && (
          <div style={{ paddingTop: 60, paddingBottom: 80 }}>

            {/* Overline */}
            <div style={{ ...OL, color: T.accent }}>Speak first</div>

            {/* Hero */}
            <h1
              style={{
                fontSize: 38,
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: "14px 0 16px",
                color: T.text,
              }}
            >
              Have a real conversation.
              <br />
              Get corrected after.
            </h1>

            {/* Subhead */}
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: T.textSub,
                margin: 0,
                maxWidth: 400,
              }}
            >
              No interruptions, no red marks mid-sentence. Talk your way
              through a real situation, then see the three things worth fixing.
            </p>

            {/* Browser warning */}
            {!supported && (
              <div
                style={{
                  marginTop: 20,
                  padding: "14px 16px",
                  background: T.accentTint,
                  borderRadius: T.card,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: T.text,
                }}
              >
                Voice input needs Chrome on desktop or Android. You can still
                read along, but the mic won't work in this browser.
              </div>
            )}

            {/* ── Journey arc ─────────────────────────── */}
            <div style={{ marginTop: 52 }}>

              {/* Section overline */}
              <div style={{ ...OL, color: T.textSub, marginBottom: 32 }}>
                Your journey
              </div>

              {(() => {
                const journey = [...SCENARIOS].sort(
                  (a, b) => a.difficulty - b.difficulty
                );
                // DOT_COL: width of the column holding the path dot.
                // Vertical line centers inside it on desktop; fixed 15px on mobile.
                const DOT_COL = 32;

                const makeDot = (s) => (
                  <div
                    aria-hidden="true"
                    style={{
                      width: s.recommended ? 18 : 13,
                      height: s.recommended ? 18 : 13,
                      borderRadius: "50%",
                      background: s.recommended ? T.accent : T.text,
                      border: `2.5px solid ${T.bg}`,
                      boxShadow: `0 0 0 1.5px ${
                        s.recommended ? T.accent : T.border
                      }`,
                      flexShrink: 0,
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                );

                const makeCard = (s) => (
                  <button
                    className="sf-stop"
                    onClick={() => startScenario(s)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: s.recommended ? T.surfaceWarm : T.surface,
                      border: `${s.recommended ? "1.5px" : "1px"} solid ${
                        s.recommended ? T.accent : T.border
                      }`,
                      borderRadius: T.card,
                      padding: "20px 22px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: T.shadowCard,
                    }}
                  >
                    {s.recommended && (
                      <div
                        style={{
                          ...OL,
                          color: T.accent,
                          letterSpacing: "0.10em",
                          marginBottom: 10,
                        }}
                      >
                        ✦ Start here
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        marginBottom: 4,
                        color: T.text,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.textSub,
                        lineHeight: 1.4,
                        marginBottom: 12,
                      }}
                    >
                      {s.sub}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        ...OL,
                        letterSpacing: "0.08em",
                        color:
                          s.level === "Intermediate" ? T.accent : T.support,
                        background:
                          s.level === "Intermediate"
                            ? T.accentTint
                            : T.supportTint,
                        padding: "4px 9px",
                        borderRadius: T.pill,
                      }}
                    >
                      {s.level}
                    </span>
                  </button>
                );

                return (
                  <div style={{ position: "relative" }}>
                    {/* Vertical dashed path line */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: isMobile ? 15 : "50%",
                        transform: isMobile ? "none" : "translateX(-50%)",
                        top: 8,
                        bottom: 8,
                        width: 1,
                        background: `repeating-linear-gradient(
                          to bottom,
                          ${T.border} 0px,
                          ${T.border} 5px,
                          transparent 5px,
                          transparent 11px
                        )`,
                      }}
                    />

                    {journey.map((s, i) => {
                      const isLast = i === journey.length - 1;
                      const cardLeft = i % 2 === 0;

                      /* Mobile: single column, line on left */
                      if (isMobile) {
                        return (
                          <div
                            key={s.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: isLast ? 0 : 20,
                            }}
                          >
                            <div
                              style={{
                                width: DOT_COL,
                                flexShrink: 0,
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              {makeDot(s)}
                            </div>
                            <div style={{ flex: 1 }}>{makeCard(s)}</div>
                          </div>
                        );
                      }

                      /* Desktop: zigzag */
                      const innerPad = DOT_COL / 2 + 14;
                      return (
                        <div
                          key={s.id}
                          style={{ marginBottom: isLast ? 0 : 32 }}
                        >
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <div
                              style={{ flex: 1, paddingRight: innerPad }}
                            >
                              {cardLeft ? makeCard(s) : null}
                            </div>
                            <div
                              style={{
                                width: DOT_COL,
                                flexShrink: 0,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              {makeDot(s)}
                            </div>
                            <div
                              style={{ flex: 1, paddingLeft: innerPad }}
                            >
                              {!cardLeft ? makeCard(s) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── CHAT ───────────────────────────────── */}
        {screen === "chat" && scenario && (
          <div
            style={{
              height: "100vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                paddingTop: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => {
                  window.speechSynthesis && window.speechSynthesis.cancel();
                  setScreen("home");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: T.textSub,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "inherit",
                  padding: "4px 0",
                }}
              >
                ← Leave
              </button>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.text,
                }}
              >
                {scenario.title}
              </div>
              {/* End & review — dark when active; accent is reserved for mic */}
              <button
                onClick={endAndReview}
                disabled={userTurns === 0}
                style={{
                  background: userTurns === 0 ? T.border : T.text,
                  color: userTurns === 0 ? T.textSub : "#fff",
                  border: "none",
                  borderRadius: T.pill,
                  padding: "8px 16px",
                  cursor: userTurns === 0 ? "default" : "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                End &amp; review
              </button>
            </div>

            {/* Message list */}
            <div
              ref={scrollRef}
              style={{ flex: 1, overflowY: "auto", padding: "24px 4px" }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 14,
                  }}
                >
                  <div
                    onClick={() => m.role === "tutor" && speak(m.text)}
                    style={{
                      maxWidth: "78%",
                      padding: "13px 17px",
                      borderRadius: T.card,
                      fontSize: 16,
                      lineHeight: 1.45,
                      cursor: m.role === "tutor" ? "pointer" : "default",
                      background: m.role === "user" ? T.text : T.surface,
                      color: m.role === "user" ? "#fff" : T.text,
                      border:
                        m.role === "tutor"
                          ? `1px solid ${T.border}`
                          : "none",
                      boxShadow:
                        m.role === "tutor" ? T.shadowCard : "none",
                      borderBottomRightRadius: m.role === "user" ? 4 : T.card,
                      borderBottomLeftRadius:
                        m.role === "tutor" ? 4 : T.card,
                    }}
                  >
                    {m.text}
                    {m.role === "tutor" && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          color: T.textSub,
                        }}
                      >
                        ⏵
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div
                  style={{
                    color: T.textSub,
                    fontSize: 16,
                    padding: "4px 4px",
                  }}
                >
                  …
                </div>
              )}
            </div>

            {/* Mic control — the ONE accent element on this screen */}
            <div
              style={{
                paddingTop: 20,
                paddingBottom: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <button
                onClick={toggleListen}
                disabled={!supported || thinking}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  border: "none",
                  cursor: supported && !thinking ? "pointer" : "default",
                  background: listening
                    ? T.accent
                    : !supported || thinking
                    ? T.border
                    : T.text,
                  color: "#fff",
                  fontSize: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: listening
                    ? `0 0 0 10px ${T.accentTint}`
                    : !supported || thinking
                    ? "none"
                    : T.shadowMic,
                  transition: "background .2s ease, box-shadow .2s ease",
                }}
              >
                {listening ? "■" : "🎙"}
              </button>
              <span style={{ fontSize: 13, color: T.textSub }}>
                {listening
                  ? "Listening… tap to stop"
                  : thinking
                  ? "Thinking…"
                  : "Tap to speak"}
              </span>
            </div>
          </div>
        )}

        {/* ── FEEDBACK ───────────────────────────── */}
        {screen === "feedback" && (
          <div style={{ paddingTop: 52, paddingBottom: 60 }}>

            {/* Overline */}
            <div style={{ ...OL, color: T.support }}>Your review</div>

            {/* Scenario title */}
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                margin: "10px 0 28px",
                color: T.text,
              }}
            >
              {scenario.title}
            </h2>

            {feedbackLoading && (
              <p style={{ color: T.textSub, fontSize: 16 }}>
                Reading back your conversation…
              </p>
            )}

            {feedback && (
              <>
                {/* Encouragement — sage support color, only positive moment */}
                <div
                  style={{
                    background: T.supportTint,
                    border: "1px solid rgba(92,122,107,.18)",
                    borderRadius: T.card,
                    padding: "20px 22px",
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: T.text,
                    marginBottom: 28,
                  }}
                >
                  {feedback.encouragement}
                </div>

                {/* Section label */}
                {feedback.fixes && feedback.fixes.length > 0 && (
                  <div
                    style={{ ...OL, color: T.textSub, marginBottom: 14 }}
                  >
                    Worth fixing
                  </div>
                )}

                {/* Fix cards */}
                {feedback.fixes &&
                  feedback.fixes.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: T.card,
                        padding: "20px 22px",
                        marginBottom: 12,
                        boxShadow: T.shadowCard,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          color: T.textSub,
                          textDecoration: "line-through",
                          marginBottom: 4,
                        }}
                      >
                        {f.said}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: T.accent,
                          marginBottom: 8,
                        }}
                      >
                        {f.better}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: T.text,
                        }}
                      >
                        {f.why}
                      </div>
                    </div>
                  ))}

                {/* "Try this next time" phrase card */}
                {feedback.phrase && (
                  <div
                    style={{
                      marginTop: 24,
                      padding: "20px 22px",
                      background: T.text,
                      borderRadius: T.card,
                    }}
                  >
                    <div
                      style={{
                        ...OL,
                        color: "#fff",
                        opacity: 0.55,
                        marginBottom: 8,
                      }}
                    >
                      Try this next time
                    </div>
                    <div
                      style={{
                        fontSize: 19,
                        lineHeight: 1.35,
                        color: "#fff",
                      }}
                    >
                      {feedback.phrase}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Primary CTA — the ONE accent element on this screen */}
            <button
              onClick={() => setScreen("home")}
              style={{
                marginTop: 36,
                width: "100%",
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: T.pill,
                padding: "17px 24px",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "opacity .15s ease",
              }}
            >
              Practice again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
