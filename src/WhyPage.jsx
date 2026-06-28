import React from "react";
import {
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Unlock,
  Target,
} from "lucide-react";

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
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  card: 18,
  pill: 100,
  shadowCard: "0 1px 3px rgba(30,27,22,.05), 0 4px 12px rgba(30,27,22,.04)",
};
const OL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" };

const PILLARS = [
  {
    icon: <MessageSquare size={22} color={T.accent} />,
    tileBg: T.accentTint,
    heading: "Speaking practice, not vocabulary drills",
    body:
      "Speaking and vocabulary are different skills. You can know hundreds of Spanish words " +
      "and still freeze when someone actually talks to you. Speak First is a spoken conversation " +
      "app — you reply out loud, the AI responds in Spanish, and you keep going. " +
      "Feedback on what's worth fixing comes at the end, not mid-sentence.",
  },
  {
    icon: <Unlock size={22} color={T.support} />,
    tileBg: T.supportTint,
    heading: "No energy bar, no lockouts",
    body:
      "There's no limit on how many sessions you can do or how many mistakes you can make. " +
      "Practice as much as you want. We left out the mechanic where running out of attempts " +
      "locks you out until you wait or pay — it seemed backwards for a practice tool.",
  },
  {
    icon: <Target size={22} color={T.accent} />,
    tileBg: T.accentTint,
    heading: "No streaks, no daily targets",
    body:
      "There are no streaks to protect, no daily goals, no push reminders. " +
      "If you practice a lot one week and skip the next, that's fine. " +
      "We'd rather you actually learn to speak than rack up a streak — " +
      "so we built for the former and left out the latter.",
  },
];

export default function WhyPage({ onBack, onStartPracticing }) {
  return (
    <div className="sf-screen" style={{ paddingTop: 64, paddingBottom: 96 }}>

      {/* ── Top nav ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
        <button onClick={onBack} style={iconBtnStyle} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div style={{ ...OL, color: T.accent }}>Speak First</div>
      </div>

      {/* ── Hero ── */}
      <div className="sf-fade-up">
        <h1
          style={{
            fontSize: 44,
            lineHeight: 1.06,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "0 0 20px",
            color: T.text,
          }}
        >
          We built Speak First<br />around one idea.
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.7,
            color: T.textSub,
            margin: 0,
            maxWidth: 440,
          }}
        >
          You get better at speaking a language by speaking it — not just by studying
          vocabulary or translating sentences. Those help, but they don't directly train
          you to hold a conversation. So we made an app where you actually speak.
        </p>
      </div>

      {/* ── Divider ── */}
      <div
        className="sf-fade-up"
        style={{ height: 1, background: T.border, margin: "40px 0", animationDelay: ".06s" }}
      />

      {/* ── Three pillars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {PILLARS.map(({ icon, tileBg, heading, body }, i) => (
          <div
            key={i}
            className="sf-fade-up"
            style={{ animationDelay: `${0.1 + i * 0.07}s` }}
          >
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.card,
                padding: "28px 28px",
                boxShadow: T.shadowCard,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: tileBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {icon}
                </div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    margin: 0,
                    color: T.text,
                    letterSpacing: "-0.015em",
                    paddingTop: 4,
                  }}
                >
                  {heading}
                </h2>
              </div>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: T.textSub,
                  margin: 0,
                }}
              >
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Closing ── */}
      <div
        className="sf-fade-up"
        style={{
          marginTop: 40,
          background: T.surfaceWarm,
          border: `1px solid ${T.border}`,
          borderRadius: T.card,
          padding: "26px 28px",
          animationDelay: ".31s",
        }}
      >
        <p style={{ fontSize: 15, lineHeight: 1.65, color: T.text, margin: 0 }}>
          It's a low-stakes place to practice. Say what you can, get three things worth
          fixing, and try again.
        </p>
      </div>

      {/* ── CTA ── */}
      <div className="sf-fade-up" style={{ marginTop: 36, animationDelay: ".38s" }}>
        <button
          className="sf-cta-hero"
          onClick={onStartPracticing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: T.pill,
            padding: "17px 32px",
            fontSize: 17,
            fontWeight: 700,
            fontFamily: T.sans,
            cursor: "pointer",
          }}
        >
          Start practicing
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onBack}
          style={{
            marginLeft: 14,
            background: "none",
            border: "none",
            color: T.textSub,
            fontFamily: T.sans,
            fontSize: 14,
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          ← Back
        </button>
      </div>

    </div>
  );
}

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: T.textSub,
  display: "flex",
  alignItems: "center",
  padding: 4,
};
