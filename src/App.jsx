import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Languages,
  Lightbulb,
  MapPin,
  Mic,
  RotateCcw,
  Square,
  Star,
  Volume2,
  X,
} from "lucide-react";

// ── Scenarios: the thing the learner actually does. Real situations, not drills.
const SCENARIOS = [
  {
    id: "cafe",
    title: "Order at a café",
    sub: "Madrid, mid-morning",
    persona:
      "You are Marta, a warm but busy barista at a café in Madrid. You only speak Spanish. Greet the customer and take their order naturally.",
    opener: "¡Hola! Buenos días. ¿Qué te pongo?",
    level: "A1",
    difficulty: 1,
    recommended: true,
  },
  {
    id: "groceries",
    title: "Buying groceries",
    sub: "Local market, Spain",
    persona:
      "You are Carmen, a friendly vendor at a small neighborhood grocery store in Spain. You only speak Spanish. Help the customer find items, weigh produce, and total up their purchase. Keep it simple and warm.",
    opener: "¡Hola! ¿Qué necesitas hoy?",
    level: "A1",
    difficulty: 2,
  },
  {
    id: "directions",
    title: "Asking for directions",
    sub: "Street corner, Seville",
    persona:
      "You are Pablo, a relaxed local on the street in Seville. You only speak Spanish. A tourist stops you to ask how to get somewhere. Give simple directions and be patient and encouraging.",
    opener: "¿Sí? ¿En qué te puedo ayudar?",
    level: "A2",
    difficulty: 3,
  },
  {
    id: "friend",
    title: "Catch up with a friend",
    sub: "Weekend small talk",
    persona:
      "You are Lucía, an old friend catching up over coffee. You only speak Spanish. Be casual, curious, and chatty about each other's week.",
    opener: "¡Ey! Cuánto tiempo. ¿Qué tal todo?",
    level: "A2",
    difficulty: 4,
  },
  {
    id: "doctor",
    title: "Doctor's appointment",
    sub: "Clinic, Mexico City",
    persona:
      "You are Dr. Ramírez, a kind general doctor in a clinic in Mexico City. You only speak Spanish. The patient has come in not feeling well. Ask about their symptoms, how long they've felt this way, and reassure them. Stay calm and professional.",
    opener: "Buenos días, pase y siéntese. Cuénteme, ¿qué le pasa?",
    level: "B1",
    difficulty: 5,
  },
  {
    id: "interview",
    title: "Job interview",
    sub: "Marketing role, Bogotá",
    persona:
      "You are Diego, a friendly hiring manager interviewing a candidate for a junior marketing role in Bogotá. You only speak Spanish. Ask normal interview questions, one at a time.",
    opener: "Buenas. Gracias por venir. Cuéntame un poco sobre ti.",
    level: "B1",
    difficulty: 6,
  },
  {
    id: "debate",
    title: "Disagreeing in a debate",
    sub: "Coffee debate, anywhere",
    persona:
      "You are Elena, a sharp but respectful friend who loves a good debate over coffee. You only speak Spanish. Engage the learner in a friendly disagreement about an everyday topic (e.g. city vs country living, technology, food). Push back on their points to make them defend their view, but stay warm and never hostile.",
    opener: "Vale, te lo discuto: creo que vivir en la ciudad es mucho mejor que en el campo. ¿No estás de acuerdo?",
    level: "C1",
    difficulty: 7,
  },
];

// Human-readable hints paired with each CEFR code
const CEFR_HINT = {
  A1: "Beginner", A2: "Elementary",
  B1: "Intermediate", B2: "Upper-intermediate",
  C1: "Advanced", C2: "Mastery",
};

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
  const [screen, setScreen] = useState("landing"); // landing | home | chat | feedback
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]); // {role:'tutor'|'user', text}
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 500);

  // ── In-context comprehension support (in-memory cache, reset per scenario)
  const [translations, setTranslations] = useState({});
  const [shownTranslations, setShownTranslations] = useState(new Set());
  const [wordMeanings, setWordMeanings] = useState({});
  const [activeWord, setActiveWord] = useState(null); // { msgIdx, word } | null
  const [hint, setHint] = useState(null); // null | 'loading' | 'error' | { spanish, english }
  const [showHint, setShowHint] = useState(false);

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

  // Hardened Web Speech API wrapper.
  // Fixes: (1) voices load async — wait for voiceschanged before speaking;
  //        (2) engine stall on backgrounded tabs — resume() if paused;
  //        (3) missing Spanish voice — fall back to system default rather than fail silently.
  function speak(text) {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel(); // clear any in-progress utterance to prevent overlap / cutoff
    if (synth.paused) synth.resume(); // un-stall if tab was backgrounded

    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      u.rate = 0.95;
      // Prefer an explicit Spanish voice; fall back to system default gracefully.
      const voices = synth.getVoices();
      const spanish = voices.find((v) => v.lang.startsWith("es"));
      if (spanish) u.voice = spanish;
      synth.speak(u);
    };

    // Voice list is often empty on first call in Chrome — defer until ready.
    if (synth.getVoices().length > 0) {
      doSpeak();
    } else {
      synth.addEventListener("voiceschanged", doSpeak, { once: true });
    }
  }

  function startScenario(s) {
    setScenario(s);
    setMessages([{ role: "tutor", text: s.opener }]);
    setFeedback(null);
    setTranslations({});
    setShownTranslations(new Set());
    setWordMeanings({});
    setActiveWord(null);
    setHint(null);
    setShowHint(false);
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
    setHint(null);
    setShowHint(false);
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

  // ── In-context comprehension: translate a full partner message ──────────
  async function fetchTranslation(msgIdx, text) {
    setTranslations((prev) => ({ ...prev, [msgIdx]: "loading" }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "translate",
          system:
            "Translate the following Spanish to natural English. Return ONLY the translation, no explanation.",
          messages: [{ role: "user", content: text }],
        }),
      });
      if (!res.ok) throw new Error();
      const { text: t } = await res.json();
      setTranslations((prev) => ({ ...prev, [msgIdx]: t.trim() }));
    } catch {
      setTranslations((prev) => ({ ...prev, [msgIdx]: "error" }));
    }
  }

  function toggleTranslation(msgIdx, text) {
    const isShown = shownTranslations.has(msgIdx);
    if (!isShown && (!translations[msgIdx] || translations[msgIdx] === "error")) {
      fetchTranslation(msgIdx, text);
    }
    setShownTranslations((prev) => {
      const next = new Set(prev);
      if (isShown) next.delete(msgIdx);
      else next.add(msgIdx);
      return next;
    });
  }

  // ── In-context comprehension: single word lookup ─────────────────────────
  async function fetchWordMeaning(msgIdx, word, sentence) {
    const key = `${msgIdx}::${word}`;
    setWordMeanings((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "word",
          system:
            "You help Spanish learners understand individual words. Given a Spanish sentence and one word from it, give a very short English gloss (1–5 words) for that word as used in context. Reply with just the gloss — nothing else.",
          messages: [
            {
              role: "user",
              content: `Sentence: "${sentence}"\nWord: "${word}"`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error();
      const { text } = await res.json();
      setWordMeanings((prev) => ({ ...prev, [key]: text.trim() }));
    } catch {
      setWordMeanings((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  function handleWordTap(e, msgIdx, rawWord, sentence) {
    e.stopPropagation();
    const word = rawWord
      .replace(/[¡!¿?.,;:«»"""''()\[\]—]/g, "")
      .trim()
      .toLowerCase();
    if (!word) return;
    if (activeWord && activeWord.msgIdx === msgIdx && activeWord.word === word) {
      setActiveWord(null);
      return;
    }
    setActiveWord({ msgIdx, word });
    const key = `${msgIdx}::${word}`;
    if (!wordMeanings[key] || wordMeanings[key] === "error") {
      fetchWordMeaning(msgIdx, word, sentence);
    }
  }

  // ── In-context comprehension: reply hint ─────────────────────────────────
  async function fetchHint() {
    setHint("loading");
    const convo = messages
      .map((m) => `${m.role === "user" ? "Learner" : "Partner"}: ${m.text}`)
      .join("\n");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "hint",
          system:
            'You help a beginner Spanish learner keep a conversation going. Given the conversation so far, suggest ONE short, natural Spanish phrase the learner could say next, with its English meaning. Keep it simple and beginner-appropriate. Return ONLY valid JSON: {"spanish":"...","english":"..."}',
          messages: [
            {
              role: "user",
              content: `Conversation so far:\n${convo}\n\nSuggest one short reply for the Learner:`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error();
      const { text } = await res.json();
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setHint(parsed);
    } catch {
      setHint("error");
    }
  }

  function toggleHint() {
    if (showHint) {
      setShowHint(false);
    } else {
      setShowHint(true);
      if (!hint || hint === "error") fetchHint();
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

        {/* ── LANDING ─────────────────────────────── */}
        {screen === "landing" && (
          <div style={{ paddingTop: 64, paddingBottom: 88 }}>
            <div className="sf-fade-up">

            {/* Wordmark */}
            <div style={{ ...OL, color: T.accent, marginBottom: 28 }}>
              Speak First
            </div>

            {/* Hero headline */}
            <h1
              style={{
                fontSize: isMobile ? 36 : 44,
                lineHeight: 1.07,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                margin: "0 0 20px",
                color: T.text,
              }}
            >
              Speak.<br />
              Make mistakes.<br />
              Get better.
            </h1>

            {/* Subhead */}
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.65,
                color: T.textSub,
                margin: "0 0 36px",
                maxWidth: 400,
              }}
            >
              Your AI conversation partner never interrupts or corrects you
              mid-sentence. Say whatever Spanish you can — then see the three
              things most worth fixing.
            </p>

            {/* Primary CTA */}
            <button
              onClick={() => setScreen("home")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: T.pill,
                padding: "16px 28px",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "opacity .15s ease",
              }}
            >
              Start practicing
              <ChevronRight size={18} />
            </button>
            </div>

            {/* ── Why Speak First? ──────────────────────── */}
            <div className="sf-fade-up" style={{ marginTop: 72, animationDelay: ".1s" }}>
              <div style={{ ...OL, color: T.textSub, marginBottom: 20 }}>
                Why Speak First?
              </div>

              {/* Contrast card */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.card,
                  boxShadow: T.shadowCard,
                  overflow: "hidden",
                }}
              >
                {/* Column headers */}
                <div
                  style={{
                    display: "flex",
                    background: T.bg,
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: "11px 16px",
                      ...OL,
                      color: T.textSub,
                      letterSpacing: "0.08em",
                    }}
                  >
                    Other apps
                  </div>
                  <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
                  <div
                    style={{
                      flex: 1,
                      padding: "11px 16px",
                      ...OL,
                      color: T.text,
                      letterSpacing: "0.08em",
                    }}
                  >
                    Speak First
                  </div>
                </div>

                {/* Comparison rows */}
                {[
                  ["Drills and tap exercises", "Real spoken conversations"],
                  ["Corrects you mid-sentence", "Never interrupts you"],
                  ["You tap, not talk", "You speak the whole time"],
                  ["Scores and streaks", "3 fixes worth knowing"],
                ].map(([left, right], idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      borderTop: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: "13px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: T.textSub,
                      }}
                    >
                      <X size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                      {left}
                    </div>
                    <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
                    <div
                      style={{
                        flex: 1,
                        padding: "13px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: T.text,
                      }}
                    >
                      <Check
                        size={12}
                        color={T.support}
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      {right}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── How it works ──────────────────────────── */}
            <div className="sf-fade-up" style={{ marginTop: 64, animationDelay: ".18s" }}>
              <div style={{ ...OL, color: T.textSub, marginBottom: 20 }}>
                How it works
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    icon: <MapPin size={20} color={T.accent} />,
                    tileBg: T.accentTint,
                    title: "Pick a real situation",
                    body: "Choose from real scenarios — order at a café, catch up with a friend, or practise for a job interview.",
                  },
                  {
                    icon: <Mic size={20} color={T.accent} />,
                    tileBg: T.accentTint,
                    title: "Have the conversation out loud",
                    body: "The AI partner speaks Spanish. You reply with whatever you've got. No corrections, no interruptions.",
                  },
                  {
                    icon: <BookOpen size={20} color={T.support} />,
                    tileBg: T.supportTint,
                    title: "Get your end-of-session coaching",
                    body: "After you finish, see the 3 most important things to fix — focused feedback, not a list of every mistake.",
                  },
                ].map(({ icon, tileBg, title, body }, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.card,
                      padding: "18px 20px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      boxShadow: T.shadowCard,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: tileBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: T.text,
                          marginBottom: 4,
                          lineHeight: 1.3,
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: T.textSub,
                        }}
                      >
                        {body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Reassurance ───────────────────────────── */}
            <div
              className="sf-fade-up"
              style={{
                marginTop: 40,
                animationDelay: ".25s",
                background: T.surfaceWarm,
                border: `1px solid ${T.border}`,
                borderRadius: T.card,
                padding: "22px 24px",
                fontSize: 15,
                lineHeight: 1.65,
                color: T.text,
              }}
            >
              Speaking a new language feels exposed. This is a low-pressure
              space to practise — the AI partner understands even broken
              Spanish, and you'll never be judged or corrected mid-sentence.
            </div>

            {/* ── Bottom CTA ────────────────────────────── */}
            <div
              className="sf-fade-up"
              style={{
                marginTop: 56,
                animationDelay: ".32s",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setScreen("home")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: T.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: T.pill,
                  padding: "16px 28px",
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity .15s ease",
                }}
              >
                Start practicing
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── HOME ───────────────────────────────── */}
        {screen === "home" && (
          <div className="sf-screen" style={{ paddingTop: 60, paddingBottom: 80 }}>

            {/* Wordmark — tap to go back to landing */}
            <button
              onClick={() => setScreen("landing")}
              style={{
                ...OL,
                color: T.accent,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
                letterSpacing: "0.12em",
              }}
            >
              Speak first
            </button>

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
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Star size={11} />
                        Start here
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
                        color: s.level.startsWith("A")
                          ? T.support
                          : s.level.startsWith("B")
                          ? T.accent
                          : T.text,
                        background: s.level.startsWith("A")
                          ? T.supportTint
                          : s.level.startsWith("B")
                          ? T.accentTint
                          : T.border,
                        padding: "4px 9px",
                        borderRadius: T.pill,
                      }}
                    >
                      {s.level} · {CEFR_HINT[s.level]}
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
            className="sf-screen"
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
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ArrowLeft size={15} />
                Leave
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
              {messages.map((m, i) => {
                /* ── User bubble ─────────────────────────────────────── */
                if (m.role === "user") {
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "78%",
                          padding: "13px 17px",
                          borderRadius: T.card,
                          borderBottomRightRadius: 4,
                          fontSize: 16,
                          lineHeight: 1.45,
                          background: T.text,
                          color: "#fff",
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                }

                /* ── Partner bubble with comprehension controls ───────── */
                const wordKey =
                  activeWord && activeWord.msgIdx === i
                    ? `${i}::${activeWord.word}`
                    : null;
                const wordMeaning = wordKey ? wordMeanings[wordKey] : null;
                const xlation = translations[i];
                const xlShown = shownTranslations.has(i);

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      marginBottom: 18,
                    }}
                  >
                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "13px 17px",
                        borderRadius: T.card,
                        borderBottomLeftRadius: 4,
                        fontSize: 16,
                        lineHeight: 1.45,
                        background: T.surface,
                        color: T.text,
                        border: `1px solid ${T.border}`,
                        boxShadow: T.shadowCard,
                      }}
                    >
                      {/* Clickable words */}
                      <div style={{ lineHeight: 1.45 }}>
                        {m.text.split(/(\s+)/).map((seg, wi) => {
                          if (/^\s+$/.test(seg))
                            return <span key={wi}>{seg}</span>;
                          const clean = seg
                            .replace(/[¡!¿?.,;:«»"""''()\[\]—]/g, "")
                            .trim()
                            .toLowerCase();
                          if (!clean) return <span key={wi}>{seg}</span>;
                          const isActive =
                            activeWord &&
                            activeWord.msgIdx === i &&
                            activeWord.word === clean;
                          return (
                            <button
                              key={wi}
                              className={`sf-word${
                                isActive ? " sf-word--active" : ""
                              }`}
                              onClick={(e) =>
                                handleWordTap(e, i, seg, m.text)
                              }
                            >
                              {seg}
                            </button>
                          );
                        })}
                      </div>

                      {/* Word meaning panel */}
                      {wordKey && (
                        <div
                          className="sf-reveal"
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: `1px solid ${T.border}`,
                            fontSize: 13,
                            color: T.textSub,
                            lineHeight: 1.4,
                          }}
                        >
                          <em style={{ color: T.text, fontStyle: "italic" }}>
                            {activeWord.word}
                          </em>
                          {" — "}
                          {wordMeaning === "loading"
                            ? "…"
                            : wordMeaning === "error"
                            ? "couldn't look up"
                            : wordMeaning}
                        </div>
                      )}

                      {/* Play row */}
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => speak(m.text)}
                          aria-label="Play audio"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: T.textSub,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Translate row (below bubble) */}
                    <div style={{ marginTop: 6, marginLeft: 2 }}>
                      <button
                        onClick={() => toggleTranslation(i, m.text)}
                        style={{
                          background: "none",
                          border: `1px solid ${T.border}`,
                          borderRadius: T.pill,
                          padding: "3px 10px",
                          cursor: "pointer",
                          fontSize: 12,
                          color: T.textSub,
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Languages size={12} />
                        {xlShown ? "hide" : "English"}
                      </button>
                      {xlShown && xlation && (
                        <div
                          className="sf-reveal"
                          style={{
                            marginTop: 6,
                            fontSize: 14,
                            color: T.textSub,
                            fontStyle: "italic",
                            lineHeight: 1.45,
                            paddingLeft: 2,
                          }}
                        >
                          {xlation === "loading"
                            ? "…"
                            : xlation === "error"
                            ? "Couldn't translate"
                            : xlation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
              {/* How to reply hint — visible only when partner just spoke */}
              {messages.length > 0 &&
                messages[messages.length - 1].role === "tutor" &&
                !listening &&
                !thinking && (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {showHint && (
                      <div
                        className="sf-reveal"
                        style={{
                          width: "100%",
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          borderRadius: T.card,
                          padding: "14px 16px",
                          boxShadow: T.shadowCard,
                        }}
                      >
                        {hint === "loading" ? (
                          <span style={{ fontSize: 14, color: T.textSub }}>
                            …
                          </span>
                        ) : hint === "error" ? (
                          <span style={{ fontSize: 14, color: T.textSub }}>
                            Couldn't suggest a reply
                          </span>
                        ) : hint && typeof hint === "object" ? (
                          <>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: T.text,
                                lineHeight: 1.3,
                                marginBottom: 4,
                              }}
                            >
                              {hint.spanish}
                            </div>
                            <div style={{ fontSize: 13, color: T.textSub }}>
                              {hint.english}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                    <button
                      onClick={toggleHint}
                      style={{
                        background: "none",
                        border: `1px solid ${T.border}`,
                        borderRadius: T.pill,
                        padding: "5px 14px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: T.textSub,
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Lightbulb size={12} />
                      {showHint ? "hide hint" : "how to reply?"}
                    </button>
                  </div>
                )}

              <button
                onClick={toggleListen}
                disabled={!supported || thinking}
                className={listening ? "sf-mic--listening" : ""}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: listening
                    ? undefined
                    : !supported || thinking
                    ? "none"
                    : T.shadowMic,
                  transition: "background .2s ease, box-shadow .2s ease",
                }}
                aria-label={listening ? "Stop recording" : "Start speaking"}
              >
                {listening ? (
                  <Square size={28} fill="currentColor" strokeWidth={0} />
                ) : (
                  <Mic size={28} />
                )}
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
          <div className="sf-screen" style={{ paddingTop: 52, paddingBottom: 60 }}>

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

            {/* CTAs — primary repeats same scenario, secondary picks another */}
            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => startScenario(scenario)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
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
                <RotateCcw size={17} />
                Try this again
              </button>
              <button
                onClick={() => setScreen("home")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "none",
                  color: T.text,
                  border: `1.5px solid ${T.border}`,
                  borderRadius: T.pill,
                  padding: "15px 24px",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <MapPin size={17} />
                Pick another scenario
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
