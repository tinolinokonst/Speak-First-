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

// ── Palette: calm, low-anxiety. Deep ink, warm paper, a single confident coral
// for the live "you're being heard" state. Nothing clinical, nothing gamified.
const C = {
  ink: "#1C2230",
  paper: "#FBF7F0",
  card: "#FFFFFF",
  coral: "#E8654E",
  coralSoft: "#FBE3DC",
  sage: "#5C7A6B",
  sageSoft: "#E4ECE6",
  line: "#E7E0D5",
  muted: "#8A8578",
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
        background: C.paper,
        color: C.ink,
        fontFamily:
          "'Georgia', 'Iowan Old Style', serif",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, padding: "0 18px" }}>
        {/* ── HOME ───────────────────────────────── */}
        {screen === "home" && (
          <div style={{ paddingTop: 56, paddingBottom: 64 }}>
            <div
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: 12,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: C.coral,
                fontWeight: 700,
              }}
            >
              Speak first
            </div>
            <h1
              style={{
                fontSize: 40,
                lineHeight: 1.05,
                margin: "12px 0 14px",
                fontWeight: 400,
                letterSpacing: -0.5,
              }}
            >
              Have a real conversation.
              <br />
              Get corrected after.
            </h1>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.5,
                color: C.muted,
                maxWidth: 420,
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
              }}
            >
              No interruptions, no red marks mid-sentence. Talk your way through
              a real situation, then see the three things worth fixing.
            </p>

            {!supported && (
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 14px",
                  background: C.coralSoft,
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}
              >
                Voice input needs Chrome on desktop or Android. You can still
                read along, but the mic won't work in this browser.
              </div>
            )}

            {/* ── JOURNEY ARC ─────────────────────────── */}
            <div style={{ marginTop: 48 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontSize: 11,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: C.muted,
                  fontWeight: 700,
                  marginBottom: 36,
                }}
              >
                Your journey
              </div>

              {(() => {
                const journey = [...SCENARIOS].sort(
                  (a, b) => a.difficulty - b.difficulty
                );
                // Width of the column that holds the path dot.
                // The vertical line is centered inside this column on desktop,
                // and at a fixed 15px offset on mobile.
                const DOT_COL = 32;

                const makeDot = (s) => (
                  <div
                    aria-hidden="true"
                    style={{
                      width: s.recommended ? 18 : 13,
                      height: s.recommended ? 18 : 13,
                      borderRadius: "50%",
                      background: s.recommended ? C.coral : C.ink,
                      border: `2.5px solid ${C.paper}`,
                      boxShadow: `0 0 0 1.5px ${
                        s.recommended ? C.coral : C.line
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
                      background: s.recommended ? "#FDF9F5" : C.card,
                      border: `1.5px solid ${
                        s.recommended ? C.coral : C.line
                      }`,
                      borderRadius: 14,
                      padding: "16px 18px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {s.recommended && (
                      <div
                        style={{
                          fontFamily: "'Helvetica Neue', Arial, sans-serif",
                          fontSize: 11,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          color: C.coral,
                          fontWeight: 700,
                          marginBottom: 9,
                        }}
                      >
                        ✦ Start here
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 18,
                        lineHeight: 1.2,
                        marginBottom: 4,
                        color: C.ink,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        fontFamily: "'Helvetica Neue', Arial, sans-serif",
                        marginBottom: 10,
                      }}
                    >
                      {s.sub}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        fontFamily: "'Helvetica Neue', Arial, sans-serif",
                        fontSize: 11,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color:
                          s.level === "Intermediate" ? C.coral : C.sage,
                        background:
                          s.level === "Intermediate"
                            ? C.coralSoft
                            : C.sageSoft,
                        padding: "4px 8px",
                        borderRadius: 20,
                        fontWeight: 600,
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
                          ${C.line} 0px,
                          ${C.line} 5px,
                          transparent 5px,
                          transparent 11px
                        )`,
                      }}
                    />

                    {journey.map((s, i) => {
                      const isLast = i === journey.length - 1;
                      // Even index → card on left; odd → card on right
                      const cardLeft = i % 2 === 0;

                      /* ── Mobile: single column, line on left ── */
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

                      /* ── Desktop: zigzag ── */
                      // Gap between card edge and dot: DOT_COL/2 + 14px
                      const innerPad = DOT_COL / 2 + 14;
                      return (
                        <div
                          key={s.id}
                          style={{ marginBottom: isLast ? 0 : 32 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {/* Left half */}
                            <div
                              style={{ flex: 1, paddingRight: innerPad }}
                            >
                              {cardLeft ? makeCard(s) : null}
                            </div>

                            {/* Dot column — sits on the center line */}
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

                            {/* Right half */}
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
            <div
              style={{
                paddingTop: 20,
                paddingBottom: 14,
                borderBottom: `1px solid ${C.line}`,
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
                  color: C.muted,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}
              >
                ← Leave
              </button>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {scenario.title}
              </div>
              <button
                onClick={endAndReview}
                disabled={userTurns === 0}
                style={{
                  background: userTurns === 0 ? C.line : C.ink,
                  color: userTurns === 0 ? C.muted : "#fff",
                  border: "none",
                  borderRadius: 20,
                  padding: "7px 14px",
                  cursor: userTurns === 0 ? "default" : "pointer",
                  fontSize: 13,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontWeight: 600,
                }}
              >
                End &amp; review
              </button>
            </div>

            <div
              ref={scrollRef}
              style={{ flex: 1, overflowY: "auto", padding: "20px 2px" }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div
                    onClick={() => m.role === "tutor" && speak(m.text)}
                    style={{
                      maxWidth: "78%",
                      padding: "12px 16px",
                      borderRadius: 16,
                      fontSize: 17,
                      lineHeight: 1.4,
                      cursor: m.role === "tutor" ? "pointer" : "default",
                      background: m.role === "user" ? C.ink : C.card,
                      color: m.role === "user" ? "#fff" : C.ink,
                      border:
                        m.role === "tutor" ? `1px solid ${C.line}` : "none",
                      borderBottomRightRadius: m.role === "user" ? 4 : 16,
                      borderBottomLeftRadius: m.role === "tutor" ? 4 : 16,
                    }}
                  >
                    {m.text}
                    {m.role === "tutor" && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: C.muted,
                        }}
                      >
                        ⏵
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div style={{ color: C.muted, fontSize: 15, padding: "4px 4px" }}>
                  …
                </div>
              )}
            </div>

            <div
              style={{
                padding: "16px 0 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                onClick={toggleListen}
                disabled={!supported || thinking}
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: "50%",
                  border: "none",
                  cursor: supported && !thinking ? "pointer" : "default",
                  background: listening ? C.coral : C.ink,
                  color: "#fff",
                  fontSize: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: listening
                    ? `0 0 0 10px ${C.coralSoft}`
                    : "0 6px 18px rgba(28,34,48,.18)",
                  transition: "all .2s ease",
                }}
              >
                {listening ? "■" : "🎙"}
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: C.muted,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}
              >
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
          <div style={{ paddingTop: 48, paddingBottom: 40 }}>
            <div
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: 12,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: C.sage,
                fontWeight: 700,
              }}
            >
              Your review
            </div>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 400,
                margin: "10px 0 22px",
              }}
            >
              {scenario.title}
            </h2>

            {feedbackLoading && (
              <p style={{ color: C.muted }}>Reading back your conversation…</p>
            )}

            {feedback && (
              <>
                <div
                  style={{
                    background: C.sageSoft,
                    borderRadius: 14,
                    padding: "16px 18px",
                    fontSize: 17,
                    lineHeight: 1.45,
                    marginBottom: 26,
                  }}
                >
                  {feedback.encouragement}
                </div>

                {feedback.fixes && feedback.fixes.length > 0 && (
                  <div
                    style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif",
                      fontSize: 12,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: C.muted,
                      marginBottom: 12,
                      fontWeight: 700,
                    }}
                  >
                    Worth fixing
                  </div>
                )}

                {feedback.fixes &&
                  feedback.fixes.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        border: `1px solid ${C.line}`,
                        borderRadius: 14,
                        padding: "16px 18px",
                        marginBottom: 12,
                        background: C.card,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          color: C.muted,
                          textDecoration: "line-through",
                          marginBottom: 4,
                        }}
                      >
                        {f.said}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          color: C.coral,
                          marginBottom: 8,
                          fontWeight: 600,
                        }}
                      >
                        {f.better}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.4,
                          color: C.ink,
                          fontFamily: "'Helvetica Neue', Arial, sans-serif",
                        }}
                      >
                        {f.why}
                      </div>
                    </div>
                  ))}

                {feedback.phrase && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: "16px 18px",
                      background: C.ink,
                      color: "#fff",
                      borderRadius: 14,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Helvetica Neue', Arial, sans-serif",
                        fontSize: 11,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        opacity: 0.6,
                        marginBottom: 6,
                      }}
                    >
                      Try this next time
                    </div>
                    <div style={{ fontSize: 19 }}>{feedback.phrase}</div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setScreen("home")}
              style={{
                marginTop: 30,
                width: "100%",
                background: C.coral,
                color: "#fff",
                border: "none",
                borderRadius: 24,
                padding: "15px",
                fontSize: 16,
                cursor: "pointer",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontWeight: 600,
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