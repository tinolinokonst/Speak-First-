import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import "./App.css";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Keyboard,
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
import Reveal from "./Reveal.jsx";
import DemoPanel from "./DemoPanel.jsx";
import { PrivacyPage, TermsPage } from "./LegalPages.jsx";
import TextReplyInput from "./TextReplyInput.jsx";
import { speak, stopAllSpeech, createRecognizer } from "./speech.js";
import { WARMUP_PHRASES } from "./warmupPhrases.js";

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

// ── Site footer ──────────────────────────────────────────────────────────────
// Plain anchors: /privacy and /terms are URL routes, so a full navigation is
// correct (and works from any screen, logged in or out).
function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${T.border}`,
        marginTop: 48,
        padding: "24px 0 32px",
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        color: T.textSub,
      }}
    >
      <span>© {new Date().getFullYear()} Speak First</span>
      <span style={{ display: "flex", gap: 18 }}>
        <a className="sf-nav-link" href="/privacy" style={{ color: T.textSub, textDecoration: "none" }}>
          Privacy Policy
        </a>
        <a className="sf-nav-link" href="/terms" style={{ color: T.textSub, textDecoration: "none" }}>
          Terms
        </a>
      </span>
    </footer>
  );
}

// ── Mobile app waitlist (landing page) ───────────────────────────────────────
// Email-only signup. Submitting IS the consent — the purpose statement sits
// directly under the field. Success and duplicate submissions render the same
// confirmation, so nothing leaks about whether an address was already on the
// list. State is local; the row is written server-side by /api/waitlist.
function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 429
            ? "Too many attempts — please try again in a little while."
            : res.status === 400 && data.error
            ? data.error // e.g. "Please enter a valid email address"
            : "Something went wrong — please try again."
        );
      }
      setJoined(true); // {already:true} intentionally renders identically
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Reveal threshold={0.2} style={{ marginTop: 72 }}>
      <div
        style={{
          background: T.surfaceWarm,
          border: `1px solid ${T.border}`,
          borderRadius: T.card,
          padding: "36px 28px",
        }}
      >
        <h2
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            margin: "0 0 8px",
            color: T.text,
          }}
        >
          Speak First is coming to your pocket
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: T.textSub, margin: "0 0 22px", maxWidth: 420 }}>
          Join the waitlist for the mobile app. Be the first in, shape what we build.
        </p>

        {/* Fixed-height slot: the form → confirmation swap never shifts layout */}
        <div style={{ minHeight: 104 }}>
          {joined ? (
            <div
              className="sf-msg-in"
              style={{ display: "flex", alignItems: "center", gap: 10, color: T.known, fontSize: 16, fontWeight: 600, padding: "12px 0" }}
            >
              <Check size={20} /> You're on the list.
            </div>
          ) : (
            <>
              <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  disabled={loading}
                  style={{
                    flex: "1 1 220px",
                    padding: "13px 16px",
                    fontSize: 15,
                    fontFamily: "inherit",
                    color: T.text,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.pill,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`sf-btn-primary${loading ? " sf-btn-loading" : ""}`}
                  style={{
                    position: "relative",
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: T.pill,
                    padding: "13px 24px",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <span className="sf-btn-label">Join the waitlist</span>
                  <span className="sf-btn-spinner" aria-hidden="true" />
                </button>
              </form>

              {/* Inline error — expands/fades, never pops */}
              <div className={`sf-field-msg${error ? " sf-field-msg--show" : ""}`} aria-live="polite">
                <div>
                  <div style={{ fontSize: 13, color: T.accent, paddingTop: 8 }}>{error || " "}</div>
                </div>
              </div>

              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: T.textSub, margin: "10px 0 0" }}>
                We'll only email you about the mobile app launch. See our{" "}
                <a href="/privacy" style={{ color: T.textSub, textDecorationColor: "rgba(107,101,96,.5)" }}>
                  Privacy Policy
                </a>.
              </p>
            </>
          )}
        </div>
      </div>
    </Reveal>
  );
}

// ── Landing page ─────────────────────────────────────────────────────────────
function LandingPage({ user, isMobile, onStartPracticing, onWhy, onDashboard }) {
  const [navScrolled, setNavScrolled] = useState(false);
  const [waveActive, setWaveActive] = useState(false); // demo mic listening → hotter waveform

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaText   = user ? "Go to your scenarios" : "Start practicing";
  const ctaAction = user ? onDashboard : onStartPracticing;

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* ── Sticky nav ────────────────────────────────── */}
      <nav className={`sf-landing-nav${navScrolled ? " sf-nav--scrolled" : ""}`}>
        <div style={{ ...OL, color: T.accent }}>Speak First</div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
          {!user && (
            <button
              className="sf-nav-link"
              onClick={onWhy}
              style={{
                background: "none", border: "none", color: T.textSub,
                fontFamily: "inherit", fontSize: isMobile ? 13 : 14,
                cursor: "pointer", padding: "4px 0", whiteSpace: "nowrap",
              }}
            >
              {isMobile ? "Why" : "Why Speak First"}
            </button>
          )}
          {user ? (
            <button
              onClick={onDashboard}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: T.surface, color: T.text, border: `1px solid ${T.border}`,
                borderRadius: T.pill, padding: isMobile ? "9px 14px" : "10px 18px",
                fontSize: isMobile ? 13 : 14, fontWeight: 600,
                fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              <ArrowLeft size={14} />
              {isMobile ? "Dashboard" : "Back to dashboard"}
            </button>
          ) : (
            <button
              className="sf-nav-cta sf-arrow-cta"
              onClick={onStartPracticing}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: T.accent, color: "#fff", border: "none",
                borderRadius: T.pill, padding: isMobile ? "9px 14px" : "10px 18px",
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {isMobile ? "Start" : "Start practicing"}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section style={{ paddingTop: 44, paddingBottom: 8 }}>
        <h1
          className="sf-fade-up"
          style={{
            fontSize: isMobile ? 38 : 50,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: "-0.028em",
            margin: "0 0 22px",
            color: T.text,
          }}
        >
          Speak.<br />
          Make mistakes.<br />
          Get better.
        </h1>
        {/* Decorative waveform — pure CSS oscillation, hidden on reduced motion.
            Gains amplitude while the demo mic is listening. */}
        <div className={`sf-wave sf-fade-up${waveActive ? " sf-wave--active" : ""}`} style={{ animationDelay: ".06s" }} aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <p
          className="sf-fade-up"
          style={{
            animationDelay: ".10s",
            fontSize: 17,
            lineHeight: 1.65,
            color: T.textSub,
            margin: "0 0 12px",
            maxWidth: 420,
          }}
        >
          Your AI conversation partner never interrupts or corrects you mid-sentence.
          Say whatever Spanish you can — then see the three things most worth fixing.
        </p>
        {/* Trust line — wording verified by the storage audit; do not embellish */}
        <p
          className="sf-fade-up"
          style={{
            animationDelay: ".14s",
            fontSize: 13,
            lineHeight: 1.6,
            color: T.textSub,
            margin: "0 0 34px",
            maxWidth: 420,
          }}
        >
          Your practice sessions are never saved — they exist only in your browser tab and
          disappear when you close it.
        </p>
        <div
          className="sf-fade-up"
          style={{ animationDelay: ".18s", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}
        >
          <button
            className="sf-cta-hero sf-arrow-cta"
            onClick={ctaAction}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: T.accent, color: "#fff", border: "none",
              borderRadius: T.pill, padding: "17px 30px",
              fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            {ctaText}
            <ChevronRight size={18} />
          </button>
          {/* Guest demo — conversation lives in component state only, never stored */}
          {!user && <DemoPanel onSignup={onStartPracticing} onListeningChange={setWaveActive} />}
        </div>
      </section>

      {/* ── What you practice ────────────────────────── */}
      <section style={{ marginTop: 80 }}>
        <Reveal>
          <div style={{ ...OL, color: T.textSub, marginBottom: 8 }}>
            What you practice
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: T.textSub, margin: "0 0 22px" }}>
            Twelve real situations — from beginner small talk to advanced debates. Each one is a full conversation, not a drill.
          </p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          {SCENARIOS.map((s, i) => (
            <Reveal
              key={s.id}
              delay={i * 0.05}
              className="sf-scenario-tile"
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.card,
                padding: "14px 15px",
                boxShadow: T.shadowCard,
              }}
            >
              <span
                style={{
                  ...OL,
                  letterSpacing: "0.08em",
                  color: (LEVEL_BADGE[s.level] || {}).text ?? T.textSub,
                  background: (LEVEL_BADGE[s.level] || {}).bg ?? T.border,
                  padding: "2px 8px",
                  borderRadius: T.pill,
                  display: "inline-block",
                  marginBottom: 8,
                }}
              >
                {s.level}
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 2 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.4 }}>
                {s.sub}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section style={{ marginTop: 72 }}>
        <Reveal style={{ ...OL, color: T.textSub, marginBottom: 20 }}>
          How it works
        </Reveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              icon: <MapPin size={20} color={T.accent} />,
              tileBg: T.accentTint,
              title: "Pick a real situation",
              body: "Choose from twelve real scenarios — order at a café, navigate a doctor's appointment, or practice for a job interview.",
            },
            {
              icon: <Mic size={20} color={T.accent} />,
              tileBg: T.accentTint,
              title: "Have the conversation out loud",
              body: "The AI partner speaks Spanish. You reply with whatever you've got. No corrections mid-sentence, no interruptions.",
            },
            {
              icon: <BookOpen size={20} color={T.support} />,
              tileBg: T.supportTint,
              title: "Get your end-of-session coaching",
              body: "After you finish, see the three most important things to fix — focused feedback, not a list of every mistake.",
            },
          ].map(({ icon, tileBg, title, body }, i) => (
            <Reveal
              key={title}
              delay={i * 0.06}
              className="sf-step"
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.card,
                padding: "20px 22px",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                boxShadow: T.shadowCard,
              }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 13,
                  background: tileBg, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: T.textSub }}>
                  {body}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── What makes it different ──────────────────── */}
      <section style={{ marginTop: 72 }}>
        <Reveal style={{ ...OL, color: T.textSub, marginBottom: 20 }}>
          What makes it different
        </Reveal>
        <Reveal
          delay={0.07}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.card,
            boxShadow: T.shadowCard,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ flex: 1, padding: "11px 16px", ...OL, color: T.textSub, letterSpacing: "0.08em" }}>
              Other apps
            </div>
            <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "11px 16px", ...OL, color: T.text, letterSpacing: "0.08em" }}>
              Speak First
            </div>
          </div>
          {[
            ["Drills and tap exercises",  "Real spoken conversations"],
            ["Corrects you mid-sentence", "Never interrupts you"],
            ["You tap, not talk",         "You speak the whole time"],
            ["Scores and streaks",        "3 fixes worth knowing"],
          ].map(([left, right], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <div style={{ flex: 1, padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, lineHeight: 1.5, color: T.textSub }}>
                <X size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                {left}
              </div>
              <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, lineHeight: 1.5, color: T.text }}>
                <Check size={12} color={T.support} style={{ marginTop: 2, flexShrink: 0 }} />
                {right}
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── Reassurance ──────────────────────────────── */}
      <Reveal threshold={0.2} style={{ marginTop: 44 }}>
        <div
          style={{
            background: T.surfaceWarm,
            border: `1px solid ${T.border}`,
            borderRadius: T.card,
            padding: "24px 26px",
            fontSize: 15,
            lineHeight: 1.7,
            color: T.text,
          }}
        >
          Speaking a new language feels exposed. This is a low-pressure space to practice — the AI partner understands even broken Spanish, and you'll never be judged or corrected mid-sentence.
        </div>
      </Reveal>

      {/* ── Bottom CTA ───────────────────────────────── */}
      <Reveal
        threshold={0.3}
        style={{ marginTop: 72, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
      >
        <div style={{ ...OL, color: T.textSub, marginBottom: 16 }}>
          Ready to start speaking?
        </div>
        <button
          className="sf-cta-hero sf-arrow-cta"
          onClick={ctaAction}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: T.accent, color: "#fff", border: "none",
            borderRadius: T.pill, padding: "17px 32px",
            fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          {ctaText}
          <ChevronRight size={18} />
        </button>
        {!user && (
          <p style={{ fontSize: 13, color: T.textSub, marginTop: 12 }}>
            Free to start.
          </p>
        )}
      </Reveal>

      {/* ── Mobile app waitlist ──────────────────────── */}
      <WaitlistSection />
    </div>
  );
}

export default function App() {
  // landing | auth | home | warmup | chat | feedback | settings | why | privacy | terms
  // /privacy and /terms are URL-routed (vercel.json rewrites them to index.html).
  const [screen, setScreen] = useState(() => {
    const p = window.location.pathname;
    return p === "/privacy" ? "privacy" : p === "/terms" ? "terms" : "landing";
  });
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

  const [completions, setCompletions] = useState(new Set()); // Set of scenario IDs the user has confirmed complete

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
  const [typeMode, setTypeMode] = useState(false); // typed-reply fallback on the chat screen

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

  // ── Completions ─────────────────────────────────────────────────────────
  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid) loadCompletions(uid);
    else setCompletions(new Set());
  }, [user]);

  async function loadCompletions(uid) {
    const { data } = await supabase
      .from("completions")
      .select("scenario_id")
      .eq("user_id", uid);
    if (data) setCompletions(new Set(data.map(r => r.scenario_id)));
  }

  async function markComplete(scenarioId) {
    if (!user?.id) return;
    await supabase
      .from("completions")
      .upsert(
        { user_id: user.id, scenario_id: scenarioId },
        { onConflict: "user_id,scenario_id", ignoreDuplicates: true }
      );
    setCompletions(prev => new Set([...prev, scenarioId]));
    setScreen("home");
  }

  async function handleSignOut() {
    stopAllSpeech();
    await supabase.auth.signOut();
    setScreen("landing");
  }

  // ── Route fade for the PUBLIC pages (landing ↔ why ↔ auth) ───────────────
  // Uses the View Transitions API when available; plain setScreen otherwise.
  // flushSync makes React commit inside the transition callback so the API
  // can capture old/new frames. In-app navigation is untouched.
  function navigateScreen(next) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduced) {
      document.startViewTransition(() => flushSync(() => setScreen(next)));
    } else {
      setScreen(next);
    }
  }

  // Called when the "Start practicing" CTA is tapped on the landing page.
  function handleStartPracticing() {
    navigateScreen(user ? "home" : "auth");
  }

  // speak() / stopAllSpeech() now live in src/speech.js, shared with the
  // landing-page demo so there is exactly one hardened TTS implementation.

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
    if (!(s.id in warmupPhrases)) {
      // Static phrase sets ship with the repo — instant, no API call.
      // The generator only runs for a scenario id with no preset (cache miss),
      // which keeps the loading/error states as the fallback path.
      const preset = WARMUP_PHRASES[s.id];
      if (preset) setWarmupPhrases((prev) => ({ ...prev, [s.id]: preset }));
      else fetchWarmupPhrases(s);
    }
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
- Do not use any emojis, emoticons, or symbols. Reply in plain text only — your reply will be read aloud.
- Always use correct Spanish orthography: opening ¿ and ¡, and all accent marks (á, é, í, ó, ú, ñ). Never omit them for simplicity.`;

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
    if (listening) {
      recogRef.current && recogRef.current.stop();
      return;
    }
    stopAllSpeech();
    const r = createRecognizer({
      onResult: (said) => handleUserUtterance(said),
      onEnd: () => setListening(false),
      onError: (e) => {
        setListening(false);
        // Mic denied or unavailable — switch to the typed fallback so the
        // user is never stuck looking at a dead mic button.
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
Pick at MOST 3 fixes, the highest-impact ones. If the learner barely spoke, say so kindly in encouragement and return fewer fixes.
In all Spanish text you write, always use correct Spanish orthography: opening ¿ and ¡, and all accent marks (á, é, í, ó, ú, ñ). Never omit them for simplicity.`;

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
          <LandingPage
            user={user}
            isMobile={isMobile}
            onStartPracticing={handleStartPracticing}
            onWhy={() => navigateScreen("why")}
            onDashboard={() => navigateScreen("home")}
          />
        )}

        {/* ── HOME ───────────────────────────────── */}
        {screen === "home" && (
          <div className="sf-screen" style={{ paddingTop: 72, paddingBottom: 88 }}>

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

              {/* Section overline + completion stat */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ ...OL, color: T.textSub, marginBottom: user ? 10 : 0 }}>
                  Your journey
                </div>
                {user && (
                  <div className="sf-stat" style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1, color: completions.size > 0 ? T.known : T.textSub }}>
                      {completions.size}
                    </span>
                    <span style={{ fontSize: 14, color: T.textSub }}>
                      of {SCENARIOS.length} completed
                    </span>
                  </div>
                )}
              </div>

              {(() => {
                const journey = [...SCENARIOS].sort(
                  (a, b) => a.difficulty - b.difficulty
                );
                const DOT_COL = 32;

                // First scenario in arc order that the user has NOT completed.
                // -1 means every scenario is done (all highlighted green, no "current").
                const currentIdx = journey.findIndex(s => !completions.has(s.id));

                // Fraction of the path line to fill with solid green (0–100).
                // Aligns with the current dot's approximate position along the arc.
                const currentPct = currentIdx < 0
                  ? 100
                  : currentIdx === 0
                  ? 0
                  : (currentIdx / (journey.length - 1)) * 100;

                // Shared positioning for both path-line segments
                const lineX = {
                  left:      isMobile ? 15 : "50%",
                  transform: isMobile ? "none" : "translateX(-50%)",
                };

                const makeDot = (s, isCurrent) => {
                  const isDone = completions.has(s.id);
                  const size   = (isDone || isCurrent) ? 16 : 11;
                  const bg     = isDone ? T.known   : (isCurrent ? T.accent   : T.textSub);
                  const ring   = isDone ? T.known   : (isCurrent ? T.accent   : T.border);
                  return (
                    <div
                      aria-hidden="true"
                      style={{
                        width: size, height: size,
                        borderRadius: "50%",
                        background: bg,
                        border: `2.5px solid ${T.bg}`,
                        boxShadow: `0 0 0 1.5px ${ring}`,
                        flexShrink: 0,
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  );
                };

                const makeCard = (s, isCurrent) => {
                  const isDone = completions.has(s.id);
                  return (
                    <button
                      className="sf-stop"
                      onClick={() => goToWarmup(s)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background:   isDone    ? T.knownTint   : (isCurrent ? T.surfaceWarm : T.surface),
                        border:      `${(isDone || isCurrent) ? "1.5px" : "1px"} solid ${
                                       isDone   ? T.known       : (isCurrent ? T.accent      : T.border)}`,
                        borderRadius: T.card,
                        padding:      "20px 22px",
                        cursor:       "pointer",
                        fontFamily:   "inherit",
                        boxShadow:    T.shadowCard,
                      }}
                    >
                      {/* State overline */}
                      {isDone ? (
                        <div style={{ ...OL, color: T.known, letterSpacing: "0.10em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                          <Check size={11} /> Completed
                        </div>
                      ) : isCurrent ? (
                        <div style={{ ...OL, color: T.accent, letterSpacing: "0.10em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                          {s.recommended ? <><Star size={11} /> Start here</> : "Up next"}
                        </div>
                      ) : null}

                      {/* Title */}
                      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2, marginBottom: 4, color: isDone ? T.known : T.text }}>
                        {s.title}
                      </div>

                      {/* Sub-title */}
                      <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.4, marginBottom: 12 }}>
                        {s.sub}
                      </div>

                      {/* CEFR badge */}
                      <span style={{ display: "inline-block", ...OL, letterSpacing: "0.08em", color: (LEVEL_BADGE[s.level] || {}).text ?? T.textSub, background: (LEVEL_BADGE[s.level] || {}).bg ?? T.border, padding: "4px 9px", borderRadius: T.pill }}>
                        {s.level} · {CEFR_HINT[s.level]}
                      </span>
                    </button>
                  );
                };

                return (
                  <div style={{ position: "relative" }}>

                    {/* Filled path segment — solid green up to current position */}
                    {currentPct > 0 && (
                      <div aria-hidden="true" style={{ position: "absolute", ...lineX, top: 0, height: `${currentPct}%`, width: 2, background: T.known, zIndex: 0 }} />
                    )}

                    {/* Dashed remaining path — from current position to end */}
                    {currentPct < 100 && (
                      <div aria-hidden="true" style={{
                        position: "absolute", ...lineX,
                        top: `${currentPct}%`, bottom: 0, width: 1, zIndex: 0,
                        background: `repeating-linear-gradient(to bottom, ${T.border} 0px, ${T.border} 5px, transparent 5px, transparent 11px)`,
                      }} />
                    )}

                    {journey.map((s, i) => {
                      const isLast    = i === journey.length - 1;
                      const cardLeft  = i % 2 === 0;
                      const isCurrent = i === currentIdx;

                      /* Mobile: single column, line on left */
                      if (isMobile) {
                        return (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", marginBottom: isLast ? 0 : 20 }}>
                            <div style={{ width: DOT_COL, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                              {makeDot(s, isCurrent)}
                            </div>
                            <div style={{ flex: 1 }}>{makeCard(s, isCurrent)}</div>
                          </div>
                        );
                      }

                      /* Desktop: zigzag */
                      const innerPad = DOT_COL / 2 + 14;
                      return (
                        <div key={s.id} style={{ marginBottom: isLast ? 0 : 32 }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ flex: 1, paddingRight: innerPad }}>
                              {cardLeft ? makeCard(s, isCurrent) : null}
                            </div>
                            <div style={{ width: DOT_COL, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                              {makeDot(s, isCurrent)}
                            </div>
                            <div style={{ flex: 1, paddingLeft: innerPad }}>
                              {!cardLeft ? makeCard(s, isCurrent) : null}
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
                          <BookOpen size={13} /> {learningCount} to practice
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
              <div style={{ fontSize: 32, fontWeight: 700, color: T.text, textAlign: "center", lineHeight: 1.25, letterSpacing: "-0.015em" }}>
                {card.spanish}
              </div>
              <div style={{ fontSize: 12, color: T.textSub, marginTop: 6 }}>tap card to see translation</div>
            </>
          );

          const cardBack = card && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.1em" }}>meaning</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: T.text, textAlign: "center", lineHeight: 1.25, letterSpacing: "-0.01em" }}>
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

              {(!supported || typeMode) ? (
                /* Typed-reply fallback — same min-height as the mic block so
                   switching modes doesn't shift the layout. */
                <div style={{ width: "100%", minHeight: 76, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <TextReplyInput onSend={handleUserUtterance} disabled={thinking} autoFocus />
                  {supported && (
                    <button
                      className="sf-btn-ghost"
                      onClick={() => setTypeMode(false)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", padding: "2px 4px" }}
                    >
                      <Mic size={13} /> use the mic instead
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Balanced 3-column row keeps the mic visually centred while
                      the "type instead" affordance sits beside it. */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, width: "100%" }}>
                    <div style={{ width: 86, flexShrink: 0 }} aria-hidden="true" />
                    <button
                      onClick={toggleListen}
                      disabled={thinking}
                      className={listening ? "sf-mic--listening" : (!thinking ? "sf-mic-idle" : "")}
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: "50%",
                        border: "none",
                        cursor: !thinking ? "pointer" : "default",
                        background: listening ? T.accent : thinking ? T.border : T.text,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: listening ? undefined : thinking ? "none" : T.shadowMic,
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
                    <button
                      className="sf-btn-ghost"
                      onClick={() => setTypeMode(true)}
                      style={{ width: 86, flexShrink: 0, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: 12, fontWeight: 600, fontFamily: "inherit", padding: "4px 0" }}
                    >
                      <Keyboard size={15} />
                      type instead
                    </button>
                  </div>
                  <span style={{ fontSize: 13, color: T.textSub }}>
                    {listening
                      ? "Listening… tap to stop"
                      : thinking
                      ? "Thinking…"
                      : "Tap to speak"}
                  </span>
                </>
              )}
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
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.022em",
                lineHeight: 1.1,
                margin: "10px 0 32px",
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
                    padding: "24px 26px",
                    fontSize: 17,
                    lineHeight: 1.6,
                    color: T.text,
                    marginBottom: 32,
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
                          fontSize: 20,
                          fontWeight: 700,
                          color: T.accent,
                          marginBottom: 8,
                          letterSpacing: "-0.01em",
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
                        fontSize: 22,
                        lineHeight: 1.35,
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                        color: "#fff",
                      }}
                    >
                      {feedback.phrase}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CTAs */}
            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Mark as complete — only for logged-in users */}
              {user && (
                completions.has(scenario.id) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      background: T.knownTint,
                      border: `1.5px solid ${T.known}`,
                      borderRadius: T.pill,
                      padding: "14px 24px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: T.known,
                    }}
                  >
                    <Check size={16} /> Completed
                  </div>
                ) : (
                  <button
                    className="sf-btn-primary"
                    onClick={() => markComplete(scenario.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      background: T.known,
                      color: "#fff",
                      border: "none",
                      borderRadius: T.pill,
                      padding: "17px 24px",
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <Check size={17} /> Mark as complete
                  </button>
                )
              )}

              <button
                onClick={() => startScenario(scenario)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: user ? "none" : T.accent,
                  color: user ? T.text : "#fff",
                  border: user ? `1.5px solid ${T.border}` : "none",
                  borderRadius: T.pill,
                  padding: "15px 24px",
                  fontSize: 16,
                  fontWeight: user ? 600 : 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
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
            onBack={() => navigateScreen(user ? "home" : "landing")}
            onStartPracticing={handleStartPracticing}
          />
        )}

        {/* ── LEGAL PAGES (URL-routed) ──────────── */}
        {screen === "privacy" && <PrivacyPage />}
        {screen === "terms" && <TermsPage />}

        {/* Site-wide footer — omitted on the chat screen (fixed 100vh layout) */}
        {screen !== "chat" && <Footer />}
      </div>
    </div>
  );
}
