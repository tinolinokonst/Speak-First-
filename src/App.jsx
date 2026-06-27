import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Languages,
  Lightbulb,
  LogOut,
  MapPin,
  Mic,
  RotateCcw,
  Settings,
  Square,
  Star,
  Volume2,
  X,
} from "lucide-react";
import { supabase } from "./supabase.js";
import AuthScreen from "./AuthScreen.jsx";
import SettingsPage from "./SettingsPage.jsx";
import WhyPage from "./WhyPage.jsx";

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
    id: "introductions",
    title: "Introducing yourself",
    sub: "Social event, Spain",
    persona:
      "You are Sofía, a friendly person meeting someone new at a casual social event in Spain. You only speak Spanish. Make small talk: ask their name, where they're from, what they do. Keep it simple, warm, and encouraging.",
    opener: "¡Hola! Creo que no nos conocemos. ¿Cómo te llamas?",
    level: "A1",
    difficulty: 3,
  },
  {
    id: "directions",
    title: "Asking for directions",
    sub: "Street corner, Seville",
    persona:
      "You are Pablo, a relaxed local on the street in Seville. You only speak Spanish. A tourist stops you to ask how to get somewhere. Give simple directions and be patient and encouraging.",
    opener: "¿Sí? ¿En qué te puedo ayudar?",
    level: "A2",
    difficulty: 4,
  },
  {
    id: "friend",
    title: "Catch up with a friend",
    sub: "Weekend small talk",
    persona:
      "You are Lucía, an old friend catching up over coffee. You only speak Spanish. Be casual, curious, and chatty about each other's week.",
    opener: "¡Ey! Cuánto tiempo. ¿Qué tal todo?",
    level: "A2",
    difficulty: 5,
  },
  {
    id: "clothing",
    title: "Shopping for clothes",
    sub: "Clothing shop, Madrid",
    persona:
      "You are Marco, a helpful clothing shop assistant in Madrid. You only speak Spanish. Help the customer find items, sizes, and colors, and handle trying on and paying. Keep it friendly and patient.",
    opener: "¡Buenas! ¿Buscas algo en particular?",
    level: "A2",
    difficulty: 6,
  },
  {
    id: "doctor",
    title: "Doctor's appointment",
    sub: "Clinic, Mexico City",
    persona:
      "You are Dr. Ramírez, a kind general doctor in a clinic in Mexico City. You only speak Spanish. The patient has come in not feeling well. Ask about their symptoms, how long they've felt this way, and reassure them. Stay calm and professional.",
    opener: "Buenos días, pase y siéntese. Cuénteme, ¿qué le pasa?",
    level: "B1",
    difficulty: 7,
  },
  {
    id: "interview",
    title: "Job interview",
    sub: "Marketing role, Bogotá",
    persona:
      "You are Diego, a friendly hiring manager interviewing a candidate for a junior marketing role in Bogotá. You only speak Spanish. Ask normal interview questions, one at a time.",
    opener: "Buenas. Gracias por venir. Cuéntame un poco sobre ti.",
    level: "B1",
    difficulty: 8,
  },
  {
    id: "apartment",
    title: "Renting an apartment",
    sub: "Flat viewing, Valencia",
    persona:
      "You are Lucía Fernández, a landlord showing an apartment to a prospective tenant in Valencia. You only speak Spanish. Discuss the apartment, rent, deposit, contract terms, and answer the tenant's questions. Be professional and realistic, willing to negotiate a little.",
    opener: "Bienvenido. Pase, le enseño el piso. ¿Qué le gustaría saber?",
    level: "B2",
    difficulty: 9,
  },
  {
    id: "complaint",
    title: "Making a complaint",
    sub: "Phone call, Mexico City",
    persona:
      "You are Andrés, a customer service representative at a phone/internet company in Mexico City. You only speak Spanish. The customer has a problem with their service or bill. Listen, ask clarifying questions, and try to resolve it professionally. Be polite but realistic — don't instantly give them everything they want.",
    opener: "Gracias por llamar. ¿En qué puedo ayudarle hoy?",
    level: "B2",
    difficulty: 10,
  },
  {
    id: "debate",
    title: "Disagreeing in a debate",
    sub: "Coffee debate, anywhere",
    persona:
      "You are Elena, a sharp but respectful friend who loves a good debate over coffee. You only speak Spanish. Engage the learner in a friendly disagreement about an everyday topic (e.g. city vs country living, technology, food). Push back on their points to make them defend their view, but stay warm and never hostile.",
    opener: "Vale, te lo discuto: creo que vivir en la ciudad es mucho mejor que en el campo. ¿No estás de acuerdo?",
    level: "C1",
    difficulty: 11,
  },
  {
    id: "deeper",
    title: "A deeper conversation",
    sub: "Long coffee, anywhere",
    persona:
      "You are Teresa, a thoughtful friend who enjoys discussing bigger ideas over a long coffee. You only speak Spanish, at a natural native pace using idioms and nuance. Engage the learner on an abstract topic (e.g. how technology is changing relationships, what makes a good life, whether cities or nature shape us more). Ask probing follow-up questions, express subtle opinions, and use natural expressions — treat them as a capable speaker.",
    opener: "Oye, llevo días dándole vueltas a una idea y quiero saber qué piensas: ¿crees que la tecnología nos acerca o en realidad nos aísla más?",
    level: "C2",
    difficulty: 12,
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

  // Accent — coral/terracotta. Primary actions and key highlights.
  accent:     "#E8654E",
  accentTint: "#FBE9E3",

  // Support — muted sage. Encouragement / success moments.
  support:     "#5C7A6B",
  supportTint: "#E8F0EB",

  // Known (flashcard "Know it") — vivid sage-green; white text WCAG AA 5.3:1
  known:     "#2E7D52",
  knownTint: "#E5F3EC",

  // Learn (flashcard "Still learning") — deeper coral; white text WCAG AA 4.8:1
  learn:     "#C44B32",
  learnTint: "#FAE9E5",

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

// CEFR level badge colors — green for beginner, amber for intermediate, indigo for advanced
const LEVEL_BADGE = {
  A1: { text: "#2E7D52", bg: "#E5F3EC" },
  A2: { text: "#2E7D52", bg: "#E5F3EC" },
  B1: { text: "#7A5200", bg: "#FEF3E2" },
  B2: { text: "#7A5200", bg: "#FEF3E2" },
  C1: { text: "#3B4ABB", bg: "#ECEFFE" },
  C2: { text: "#3B4ABB", bg: "#ECEFFE" },
};

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | auth | home | warmup | chat | feedback | settings | why
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]); // {role:'tutor'|'user', text}
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 500);
  const [warmupPhrases, setWarmupPhrases] = useState({}); // { [scenarioId]: "loading" | null | phrase[] }
  // Flashcard state — reset each time goToWarmup() is called
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [warmupFlipped, setWarmupFlipped] = useState(false);
  const [warmupPhase, setWarmupPhase] = useState("cards"); // "cards" | "summary"
  const [warmupMarks, setWarmupMarks] = useState([]); // sparse array by card index: "known" | "learning"
  const [warmupDeck, setWarmupDeck] = useState(null); // null = full phraseList; array = review subset

  // ── Auth state
  const [user, setUser] = useState(null);       // null = not yet known | false = logged out | object = logged in
  const [authReady, setAuthReady] = useState(false); // true once we've checked for an existing session

  // ── In-context comprehension support (in-memory cache, reset per scenario)
  const [translations, setTranslations] = useState({});
  const [shownTranslations, setShownTranslations] = useState(new Set());
  const [wordMeanings, setWordMeanings] = useState({});
  const [activeWord, setActiveWord] = useState(null); // { msgIdx, word } | null
  const [hint, setHint] = useState(null); // null | 'loading' | 'error' | { spanish, english }
  const [showHint, setShowHint] = useState(false);

  const recogRef = useRef(null);
  const scrollRef = useRef(null);
  const pendingSpeakRef = useRef(null); // tracks any deferred voiceschanged listener so it can be cancelled
  const speakVersionRef = useRef(0);   // incremented on every speak() call; stale callbacks check this and bail

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

  // ── Bootstrap auth session and listen for changes ───────────────────────
  useEffect(() => {
    // Guard: if Supabase env vars aren't configured (e.g. local dev without .env),
    // skip the auth handshake entirely and render the app as logged-out immediately.
    // In production, both vars are always present via Vercel env settings.
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setAuthReady(true);
      return;
    }

    // getSession() resolves with the current session (or null) — this sets authReady
    // so the app never blocks indefinitely on a blank screen.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));

    // onAuthStateChange handles every subsequent state change.
    // SIGNED_IN covers: email/password login, OAuth redirect back to the app.
    // Functional update reads the *current* screen without a stale closure —
    // this was the root cause of the original bug (screen was always "landing").
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === "SIGNED_IN") {
          setScreen(prev => (prev === "auth" || prev === "landing") ? "home" : prev);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    stopAllSpeech();
    await supabase.auth.signOut();
    setScreen("landing");
  }

  // Called when the "Start practicing" CTA is tapped on the landing page.
  function handleStartPracticing() {
    if (user) {
      setScreen("home");
    } else {
      setScreen("auth");
    }
  }

  // Cancels all in-progress and queued speech, increments the version counter so
  // any doSpeak callback already scheduled (via setTimeout or voiceschanged) will
  // see a stale version and bail, and clears the pending listener reference.
  function stopAllSpeech() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speakVersionRef.current++;
    if (pendingSpeakRef.current) {
      window.speechSynthesis.removeEventListener("voiceschanged", pendingSpeakRef.current);
      pendingSpeakRef.current = null;
    }
  }

  // Hardened Web Speech API wrapper.
  // Fixes: (1) voices load async — wait for voiceschanged before speaking;
  //        (2) engine stall on backgrounded tabs — resume() if paused;
  //        (3) missing Spanish voice — fall back to system default rather than fail silently;
  //        (4) Chrome cancel() is async — version guard + 50ms delay prevent stale/overlapping audio.
  function speak(text) {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (synth.paused) synth.resume();

    if (pendingSpeakRef.current) {
      synth.removeEventListener("voiceschanged", pendingSpeakRef.current);
      pendingSpeakRef.current = null;
    }

    // Stamp this speak() call; any older doSpeak callbacks will see a mismatch and exit.
    const version = ++speakVersionRef.current;

    const doSpeak = () => {
      if (speakVersionRef.current !== version) return;
      pendingSpeakRef.current = null;
      // Strip pictographic emoji (and their variation selectors / ZWJ sequences) so
      // the browser never reads "cara sonriente" or similar emoji names aloud.
      const spoken = text
        .replace(/\p{Extended_Pictographic}[︀-️‍]*/gu, "")
        .replace(/ {2,}/g, " ")
        .trim();
      const u = new SpeechSynthesisUtterance(spoken);
      u.lang = "es-ES";
      u.rate = 0.95;
      const voices = synth.getVoices();
      const spanish = voices.find((v) => v.lang.startsWith("es"));
      if (spanish) u.voice = spanish;
      synth.speak(u);
    };

    if (synth.getVoices().length > 0) {
      // 50ms lets Chrome's async cancel() take effect before the new utterance
      // starts, preventing the cancelled audio from briefly stacking with it.
      setTimeout(doSpeak, 50);
    } else {
      // Voice list is often empty on first call in Chrome — defer until ready.
      pendingSpeakRef.current = doSpeak;
      synth.addEventListener("voiceschanged", doSpeak, { once: true });
    }
  }

  function startScenario(s) {
    stopAllSpeech();
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

  async function fetchWarmupPhrases(s) {
    setWarmupPhrases((prev) => ({ ...prev, [s.id]: "loading" }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "warmup",
          system:
            "You are a Spanish language teaching assistant. Return ONLY a JSON array — no prose, no code fences, no explanation. Do not include any emojis or symbols in the Spanish or English values.",
          messages: [
            {
              role: "user",
              content:
                `Scenario: "${s.title}" (${s.sub}).\n\n` +
                `List 6 useful Spanish words or short phrases a beginner needs for this conversation. ` +
                `Return ONLY a JSON array in this exact format, nothing else:\n` +
                `[{"spanish":"...","english":"..."}]`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("API error");
      const { text } = await res.json();
      const cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
      setWarmupPhrases((prev) => ({ ...prev, [s.id]: parsed.slice(0, 8) }));
    } catch {
      setWarmupPhrases((prev) => ({ ...prev, [s.id]: null }));
    }
  }

  function goToWarmup(s) {
    setScenario(s);
    setScreen("warmup");
    setWarmupIndex(0);
    setWarmupFlipped(false);
    setWarmupPhase("cards");
    setWarmupMarks([]);
    setWarmupDeck(null);
    if (!(s.id in warmupPhrases)) fetchWarmupPhrases(s);
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
- Ask a follow-up question to keep them talking.
- Do not use any emojis, emoticons, or symbols. Reply in plain text only — your reply will be read aloud.`;

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
    stopAllSpeech();
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
    stopAllSpeech();
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

  // Don't flash any content while we check for an existing session.
  if (!authReady) return null;

  // Auth screen replaces everything else (full-page, outside the main column).
  if (screen === "auth") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.sans }}>
        <AuthScreen onSuccess={() => setScreen("home")} />
      </div>
    );
  }

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
          <div style={{ paddingBottom: 88 }}>

            {/* ── Top nav ─────────────────────────────── */}
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 20,
                paddingBottom: 20,
                marginBottom: 44,
              }}
            >
              <div style={{ ...OL, color: T.accent }}>Speak First</div>
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
                {!user && (
                  <button
                    onClick={() => setScreen("why")}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.textSub,
                      fontFamily: "inherit",
                      fontSize: isMobile ? 13 : 14,
                      cursor: "pointer",
                      padding: "4px 0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isMobile ? "Why" : "Why Speak First"}
                  </button>
                )}
                {user ? (
                  <button
                    onClick={() => setScreen("home")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: T.surface,
                      color: T.text,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.pill,
                      padding: isMobile ? "9px 14px" : "10px 18px",
                      fontSize: isMobile ? 13 : 14,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ArrowLeft size={14} />
                    {isMobile ? "Dashboard" : "Back to dashboard"}
                  </button>
                ) : (
                  <button
                    onClick={handleStartPracticing}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: T.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: T.pill,
                      padding: isMobile ? "9px 14px" : "10px 18px",
                      fontSize: isMobile ? 13 : 14,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isMobile ? "Start" : "Start practicing"}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </nav>

            <div className="sf-fade-up">

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
              onClick={user ? () => setScreen("home") : handleStartPracticing}
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
              {user ? "Go to your scenarios" : "Start practicing"}
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
                onClick={user ? () => setScreen("home") : handleStartPracticing}
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
                {user ? "Go to your scenarios" : "Start practicing"}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── HOME ───────────────────────────────── */}
        {screen === "home" && (
          <div className="sf-screen" style={{ paddingTop: 60, paddingBottom: 80 }}>

            {/* Top row: wordmark + account controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

              {user && (
                <button
                  onClick={() => setScreen("settings")}
                  title="Account settings"
                  aria-label="Account settings"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.textSub,
                    fontSize: 13,
                    fontFamily: "inherit",
                    padding: "4px 0",
                  }}
                >
                  <Settings size={16} />
                </button>
              )}
            </div>

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
            <div style={{ marginTop: 28 }}>

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
                    onClick={() => goToWarmup(s)}
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
                        color: (LEVEL_BADGE[s.level] || {}).text ?? T.textSub,
                        background: (LEVEL_BADGE[s.level] || {}).bg ?? T.border,
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

        {/* ── WARMUP ──────────────────────────────── */}
        {screen === "warmup" && scenario && (() => {
          const phrasesVal = warmupPhrases[scenario.id];
          const isLoading = phrasesVal === "loading" || phrasesVal === undefined;
          const isError   = phrasesVal === null;
          const phraseList = Array.isArray(phrasesVal) ? phrasesVal : [];
          const currentDeck = warmupDeck || phraseList;
          const totalCards = currentDeck.length;
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const isReviewRound = warmupDeck !== null;

          function markAndAdvance(status) {
            setWarmupMarks(prev => { const n = [...prev]; n[warmupIndex] = status; return n; });
            setWarmupFlipped(false);
            if (warmupIndex < totalCards - 1) {
              setWarmupIndex(i => i + 1);
            } else {
              setWarmupPhase("summary");
            }
          }

          const knownCount    = warmupMarks.filter(m => m === "known").length;
          const learningCount = warmupMarks.filter(m => m === "learning").length;

          const sharedHeader = (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <button
                onClick={() => setScreen("home")}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.textSub, display: "flex", alignItems: "center", padding: 4 }}
                aria-label="Back to scenarios"
              >
                <ArrowLeft size={18} />
              </button>
              <div style={{ ...OL, color: T.accent }}>Speak First</div>
              <button
                className="sf-btn-ghost"
                onClick={() => startScenario(scenario)}
                style={{ background: "none", border: "none", color: T.textSub, fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: "4px 0" }}
              >
                Skip warm-up →
              </button>
            </div>
          );

          /* ── Summary phase ── */
          if (warmupPhase === "summary") {
            const stillLearning = currentDeck.filter((_, i) => warmupMarks[i] === "learning");
            return (
              <div className="sf-screen" style={{ paddingTop: 52, paddingBottom: 88 }}>
                {sharedHeader}
                <div className="sf-fade-up">
                  <div style={{ ...OL, color: T.textSub, marginBottom: 12 }}>{scenario.level} · {scenario.title}</div>
                  <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.018em", lineHeight: 1.2, margin: "0 0 16px", color: T.text }}>
                    {knownCount === totalCards ? "All locked in." : "Ready to go in."}
                  </h1>

                  {/* Colour-coded count badges */}
                  {(knownCount > 0 || learningCount > 0) && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                      {knownCount > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.knownTint, color: T.known, borderRadius: T.pill, padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>
                          <Check size={13} /> {knownCount} known
                        </span>
                      )}
                      {learningCount > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.learnTint, color: T.learn, borderRadius: T.pill, padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>
                          <BookOpen size={13} /> {learningCount} to practise
                        </span>
                      )}
                    </div>
                  )}

                  {/* Still-learning quick-reference list */}
                  {stillLearning.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                      {stillLearning.map((p, i) => (
                        <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.card, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: T.shadowCard }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{p.spanish}</div>
                            <div style={{ fontSize: 13, color: T.textSub, marginTop: 2 }}>{p.english}</div>
                          </div>
                          <button onClick={() => speak(p.spanish)} aria-label={`Hear "${p.spanish}"`} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: T.pill, cursor: "pointer", color: T.textSub, display: "flex", alignItems: "center", padding: "6px 9px", flexShrink: 0 }}>
                            <Volume2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    className="sf-btn-primary"
                    onClick={() => startScenario(scenario)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.accent, color: "#fff", border: "none", borderRadius: T.pill, padding: "17px 24px", fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    Start conversation <ChevronRight size={18} />
                  </button>
                  {stillLearning.length > 0 && (
                    <button
                      className="sf-btn-mark"
                      onClick={() => {
                        setWarmupDeck(stillLearning);
                        setWarmupIndex(0);
                        setWarmupFlipped(false);
                        setWarmupPhase("cards");
                        setWarmupMarks([]);
                      }}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.learnTint, color: T.learn, border: `1.5px solid ${T.learn}`, borderRadius: T.pill, padding: "14px 24px", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                    >
                      <RotateCcw size={15} /> Review still-learning ({stillLearning.length})
                    </button>
                  )}
                  {!isReviewRound && (
                    <button
                      className="sf-btn-ghost"
                      onClick={() => { setWarmupDeck(null); setWarmupIndex(0); setWarmupFlipped(false); setWarmupPhase("cards"); setWarmupMarks([]); }}
                      style={{ background: "none", border: "none", color: T.textSub, fontFamily: "inherit", fontSize: 14, cursor: "pointer", padding: "8px 0", textAlign: "center" }}
                    >
                      ← Review all again
                    </button>
                  )}
                </div>
              </div>
            );
          }

          /* ── Cards phase ── */
          const card = currentDeck[warmupIndex] || null;
          const currentMark = warmupMarks[warmupIndex];

          /* Progress dots — coloured per mark status */
          const progressDots = (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {currentDeck.map((_, i) => (
                <div key={i} style={{
                  width: i === warmupIndex ? 20 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: warmupMarks[i] === "known" ? T.known
                    : warmupMarks[i] === "learning" ? T.learn
                    : i === warmupIndex ? T.text : T.border,
                  transition: reducedMotion ? "none" : "width .22s ease, background .22s ease",
                }} />
              ))}
            </div>
          );

          const cardFront = card && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); speak(card.spanish); }}
                aria-label={`Hear "${card.spanish}"`}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: T.pill, cursor: "pointer", color: T.textSub, display: "flex", alignItems: "center", padding: "7px 10px", marginBottom: 4 }}
              >
                <Volume2 size={16} />
              </button>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.text, textAlign: "center", lineHeight: 1.3 }}>
                {card.spanish}
              </div>
              <div style={{ fontSize: 12, color: T.textSub, marginTop: 6 }}>tap card to see translation</div>
            </>
          );

          const cardBack = card && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.1em" }}>meaning</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.text, textAlign: "center", lineHeight: 1.3 }}>
                {card.english}
              </div>
              <div style={{ fontSize: 14, color: T.textSub, marginTop: 6 }}>{card.spanish}</div>
            </>
          );

          return (
            <div className="sf-screen" style={{ paddingTop: 52, paddingBottom: 88 }}>
              {sharedHeader}
              <div style={{ ...OL, color: T.textSub, marginBottom: 20 }}>{scenario.level} · {scenario.title}</div>

              {isLoading && (
                <div style={{ color: T.textSub, fontSize: 14, lineHeight: 1.6, padding: "8px 0 24px" }}>
                  Getting key phrases for this scenario…
                </div>
              )}
              {isError && (
                <div style={{ color: T.textSub, fontSize: 14, lineHeight: 1.6, padding: "8px 0 24px" }}>
                  Couldn't load phrases — you can still head right in.
                </div>
              )}

              {!isLoading && !isError && totalCards > 0 && (
                <div className="sf-fade-up" style={{ animationDelay: ".08s" }}>

                  {/* Progress dots + counter */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    {progressDots}
                    <div style={{ fontSize: 13, color: T.textSub, fontVariantNumeric: "tabular-nums" }}>{warmupIndex + 1} / {totalCards}</div>
                  </div>

                  {/* Flip card — re-keyed on index so sf-reveal fires on every card change */}
                  {reducedMotion ? (
                    <div
                      key={warmupIndex}
                      className="sf-flashcard"
                      onClick={() => setWarmupFlipped(f => !f)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWarmupFlipped(f => !f); }}}
                      tabIndex={0}
                      role="button"
                      aria-label={warmupFlipped ? `Translation: ${card?.english}` : `${card?.spanish} — tap to reveal meaning`}
                      style={{ background: warmupFlipped ? T.surfaceWarm : T.surface, border: `1px solid ${T.border}`, borderRadius: T.card, boxShadow: T.shadowCard, padding: "36px 24px", minHeight: 168, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", marginBottom: 20, outline: "none" }}
                    >
                      {warmupFlipped ? cardBack : cardFront}
                    </div>
                  ) : (
                    <div
                      key={warmupIndex}
                      className="sf-reveal sf-flashcard"
                      onClick={() => setWarmupFlipped(f => !f)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWarmupFlipped(f => !f); }}}
                      tabIndex={0}
                      role="button"
                      aria-label={warmupFlipped ? `Translation: ${card?.english}` : `${card?.spanish} — tap to reveal meaning`}
                      style={{ perspective: "900px", WebkitPerspective: "900px", cursor: "pointer", marginBottom: 20, outline: "none" }}
                    >
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        width: "100%",
                        transformStyle: "preserve-3d",
                        WebkitTransformStyle: "preserve-3d",
                        transition: "transform 0.44s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: `rotateY(${warmupFlipped ? 180 : 0}deg)`,
                        WebkitTransform: `rotateY(${warmupFlipped ? 180 : 0}deg)`,
                      }}>
                        <div className="sf-card-face" style={{ gridColumn: 1, gridRow: 1, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.card, boxShadow: T.shadowCard, padding: "36px 24px", minHeight: 168, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                          {cardFront}
                        </div>
                        <div className="sf-card-face" style={{ gridColumn: 1, gridRow: 1, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", WebkitTransform: "rotateY(180deg)", background: T.surfaceWarm, border: `1px solid ${T.border}`, borderRadius: T.card, boxShadow: T.shadowCard, padding: "36px 24px", minHeight: 168, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                          {cardBack}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mark buttons — the ONLY way to advance (fixes skip-through bug) */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <button
                      className="sf-btn-mark"
                      onClick={() => markAndAdvance("known")}
                      aria-label="Mark as known and advance"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px 8px", background: currentMark === "known" ? T.known : T.surface, color: currentMark === "known" ? "#fff" : T.text, border: `1.5px solid ${currentMark === "known" ? T.known : T.border}`, borderRadius: T.card, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      <Check size={15} /> Know it
                    </button>
                    <button
                      className="sf-btn-mark"
                      onClick={() => markAndAdvance("learning")}
                      aria-label="Mark as still learning and advance"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px 8px", background: currentMark === "learning" ? T.learnTint : T.surface, color: currentMark === "learning" ? T.learn : T.text, border: `1.5px solid ${currentMark === "learning" ? T.learn : T.border}`, borderRadius: T.card, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      <BookOpen size={15} /> Still learning
                    </button>
                  </div>

                  {/* Back nav only — no Next; marking IS the advance mechanism */}
                  <button
                    className="sf-btn-ghost"
                    onClick={() => { setWarmupIndex(i => Math.max(0, i - 1)); setWarmupFlipped(false); }}
                    disabled={warmupIndex === 0}
                    style={{ background: "none", border: "none", color: warmupIndex === 0 ? T.border : T.textSub, cursor: warmupIndex === 0 ? "default" : "pointer", fontFamily: "inherit", fontSize: 14, padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                </div>
              )}
            </div>
          );
        })()}


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
                  stopAllSpeech();
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

        {/* ── SETTINGS ───────────────────────────── */}
        {screen === "settings" && user && (
          <SettingsPage
            user={user}
            onBack={() => setScreen("home")}
            onSignOut={handleSignOut}
            onDeleted={() => setScreen("landing")}
          />
        )}

        {/* ── WHY PAGE ──────────────────────────── */}
        {screen === "why" && (
          <WhyPage
            onBack={() => setScreen(user ? "home" : "landing")}
            onStartPracticing={handleStartPracticing}
          />
        )}
      </div>
    </div>
  );
}
