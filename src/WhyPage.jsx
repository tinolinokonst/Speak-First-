import React from "react";
import {
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Unlock,
  Target,
} from "lucide-react";

// Design tokens — kept in sync with App.jsx.
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
    heading: "Speaking, not just vocabulary",
    belief:
      "You learn a language by speaking it — under real pressure, in real situations. " +
      "There is no shortcut that skips the part where you open your mouth and try.",
    contrast:
      "Most popular apps train you to recognise and translate words in isolation. " +
      "You can finish hundreds of lessons and still freeze the moment you have to actually talk. " +
      "Speak First puts you in a real spoken conversation from the very first session.",
  },
  {
    icon: <Unlock size={22} color={T.support} />,
    tileBg: T.supportTint,
    heading: "Learn as much as you want — no lockouts",
    belief:
      "Mistakes are how you learn. You should be able to make as many as you need, " +
      "whenever you need to, without anything stopping you.",
    contrast:
      "Many apps use a \"hearts\" or \"energy\" system that limits how many mistakes " +
      "you can make before locking you out until you wait, pay, or grind through easier content. " +
      "We don't do that. Practice freely; mess up freely. There's nothing to run out of.",
  },
  {
    icon: <Target size={22} color={T.accent} />,
    tileBg: T.accentTint,
    heading: "Built for learning, not for keeping you hooked",
    belief:
      "Success means you can hold a real conversation — not that you opened the app " +
      "fifty days in a row. Those are very different things.",
    contrast:
      "A lot of language apps are designed around engagement metrics: streaks, " +
      "notifications, daily loops engineered to bring you back regardless of whether " +
      "you're actually learning. We'd rather optimise for the moment you realise you can " +
      "hold a real conversation in Spanish. We're not trying to be a game you can't put down. " +
      "We're trying to make you someone who can speak.",
  },
];

export default function WhyPage({ onBack, onStartPracticing }) {
  return (
    <div className="sf-screen" style={{ paddingTop: 52, paddingBottom: 88 }}>

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
            fontSize: 36,
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: "-0.022em",
            margin: "0 0 18px",
            color: T.text,
          }}
        >
          We believe you learn a language<br />
          by speaking it.
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.7,
            color: T.textSub,
            margin: "0 0 0",
            maxWidth: 440,
          }}
        >
          Not by studying it. Not by translating flash cards. By actually talking —
          imperfectly, out loud, in situations that feel real. Everything about Speak
          First follows from that belief.
        </p>
      </div>

      {/* ── Divider ── */}
      <div
        className="sf-fade-up"
        style={{
          height: 1,
          background: T.border,
          margin: "44px 0",
          animationDelay: ".06s",
        }}
      />

      {/* ── Three pillars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {PILLARS.map(({ icon, tileBg, heading, belief, contrast }, i) => (
          <div
            key={i}
            className="sf-fade-up"
            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
          >
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.card,
                padding: "24px 24px",
                boxShadow: T.shadowCard,
              }}
            >
              {/* Icon tile + heading row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
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
                    fontSize: 17,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    margin: 0,
                    color: T.text,
                    letterSpacing: "-0.01em",
                    paddingTop: 4,
                  }}
                >
                  {heading}
                </h2>
              </div>

              {/* Belief statement */}
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: T.text,
                  margin: "0 0 12px",
                }}
              >
                {belief}
              </p>

              {/* Contrast — quieter, inset */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: T.textSub,
                  background: T.surfaceWarm,
                  borderRadius: 12,
                  padding: "12px 14px",
                  borderLeft: `3px solid ${T.border}`,
                }}
              >
                {contrast}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Closing ── */}
      <div
        className="sf-fade-up"
        style={{
          marginTop: 48,
          background: T.surfaceWarm,
          border: `1px solid ${T.border}`,
          borderRadius: T.card,
          padding: "24px 26px",
          animationDelay: ".34s",
        }}
      >
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: T.text,
            margin: 0,
          }}
        >
          Learning to speak a new language is uncomfortable — and that's exactly the point.
          Speak First gives you a low-pressure place to be uncomfortable, make mistakes,
          and get a little better every time.
        </p>
      </div>

      {/* ── CTA ── */}
      <div
        className="sf-fade-up"
        style={{ marginTop: 40, animationDelay: ".40s" }}
      >
        <button
          onClick={onStartPracticing}
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
            fontFamily: T.sans,
            cursor: "pointer",
            transition: "opacity .15s ease",
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
