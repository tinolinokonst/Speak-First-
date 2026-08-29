// api/agent-run.js — weekly competitor research email.
//
// ONE output: a single email. Nothing is written to the database, no drafts
// are generated, no digests are stored. Research runs, the findings are
// formatted into an email, the email is sent. That's the whole job.
//
// Schedule: vercel.json runs this Saturday at 21:00 UTC. Vercel cron is ALWAYS
// UTC (there is no timezone setting) and fires anywhere within the given hour,
// so expect it between 21:00 and 21:59 UTC on Saturday.
//
// Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when the env var is named CRON_SECRET. Manual runs must send the same header.
//
// Manual test (sends a real email):
//   curl -X POST https://speak-first.org/api/agent-run \
//     -H "Authorization: Bearer $CRON_SECRET"
//
// Required env vars (Vercel, server-side only):
//   ANTHROPIC_API_KEY, CRON_SECRET, RESEND_API_KEY
//   AGENT_RECIPIENT_EMAIL — optional; defaults to the address below.

import { rateLimit, safeEqual } from "./_guard.js";

const MODEL = "claude-sonnet-4-6";

const WATCHLIST = ["Duolingo", "Babbel", "Speak", "Praktika", "Loora", "Pimsleur"];

// Where the report goes. An env var overrides this if set in Vercel.
const DEFAULT_RECIPIENT = "tinolind066@gmail.com";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function claude({ system, prompt, maxTokens, webSearch = false }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  };
  if (webSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }];
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(`Anthropic ${r.status}: ${data?.error?.type || "unknown"}`);
  }
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();
}

/** Strips markdown fences and any prose before the first bracket, then parses. */
function parseJson(text) {
  const cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
  const first = cleaned.search(/[[{]/);
  return JSON.parse(first > 0 ? cleaned.slice(first) : cleaned);
}

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Only render a source as a link when it is a real http(s) URL — the value
 *  comes from model output, so javascript: and data: URIs must never survive. */
function safeUrl(u) {
  const s = String(u ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

async function sendEmail({ subject, html }) {
  const to = process.env.AGENT_RECIPIENT_EMAIL || DEFAULT_RECIPIENT;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: "onboarding@resend.dev", to, subject, html }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Resend ${r.status}: ${body.slice(0, 300)}`);
  }
  return to;
}

// ── Research ─────────────────────────────────────────────────────────────────

async function runResearch() {
  const text = await claude({
    system:
      "You are a sharp social-media competitive intelligence analyst for a language-learning startup. You research with the web_search tool, then report ONLY strict JSON — no prose, no markdown fences.",
    prompt: `Research the CURRENT organic social presence of these language-learning competitors: ${WATCHLIST.join(", ")}.

Look for (prioritize the last 7 days, and anything notable from the last month):
1. Organic social tactics on TikTok, Instagram Reels, and X that are visibly working.
2. Content formats getting high engagement (POV skits, duets, founder content, memes, challenges…).
3. New feature launches or positioning shifts.
4. Anything visible about their paid creative in the Meta Ad Library.

Return a strict JSON array (8-14 items). Each item exactly:
{"competitor": "...", "channel": "tiktok|reels|x|ads|other", "finding": "one concrete, specific observation", "source_url": "https://…", "tactic_score": 1-5}

tactic_score = how cheaply and quickly a 2-person startup could replicate the tactic (5 = tonight with a phone, 1 = needs budget/brand). Use real URLs from your searches for source_url. Output ONLY the JSON array.`,
    maxTokens: 4096,
    webSearch: true,
  });

  const findings = parseJson(text);
  if (!Array.isArray(findings) || findings.length === 0) {
    throw new Error("Research returned no parseable findings");
  }
  return findings
    .map((f) => ({
      competitor: String(f.competitor ?? "").slice(0, 200),
      channel: String(f.channel ?? "other").slice(0, 50),
      finding: String(f.finding ?? "").slice(0, 2000),
      source_url: safeUrl(f.source_url),
      tactic_score: Math.min(5, Math.max(1, parseInt(f.tactic_score, 10) || 3)),
    }))
    .sort((a, b) => b.tactic_score - a.tactic_score); // easiest wins first
}

// ── Email ────────────────────────────────────────────────────────────────────

function renderEmail(findings, date) {
  const rows = findings
    .map(
      (f) => `
      <div style="border-top:1px solid #EDE8E2;padding:16px 0;">
        <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#E8654E;margin-bottom:6px;">
          ${esc(f.competitor)} · ${esc(f.channel)} · replicability ${esc(f.tactic_score)}/5
        </div>
        <div style="font-size:15px;line-height:1.55;color:#1E1B16;">${esc(f.finding)}</div>
        ${
          f.source_url
            ? `<div style="margin-top:6px;"><a href="${esc(f.source_url)}" style="font-size:13px;color:#6B6560;">source</a></div>`
            : ""
        }
      </div>`
    )
    .join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px;color:#1E1B16;">
    <div style="font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#E8654E;margin-bottom:6px;">Speak First — Competitor Research</div>
    <h1 style="font-size:22px;margin:0 0 6px;">Week ending ${esc(date)}</h1>
    <p style="font-size:14px;line-height:1.6;color:#6B6560;margin:0 0 8px;">
      ${findings.length} findings across ${new Set(findings.map((f) => f.competitor)).size} competitors,
      sorted by how cheaply you could copy them.
    </p>
    ${rows}
    <p style="border-top:1px solid #EDE8E2;padding-top:16px;margin-top:8px;font-size:12px;color:#6B6560;">
      Watchlist: ${esc(WATCHLIST.join(", "))}. Sent weekly, Saturday night.
    </p>
  </div>`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Bound brute-force attempts against CRON_SECRET. No origin check: Vercel
  // cron requests carry no Origin header.
  const { success } = await rateLimit(req, "agent-run", 10, "1 h", { failClosed: true });
  if (!success) return res.status(429).json({ error: "Too many requests" });

  // Constant-time comparison — a plain !== leaks secret length/prefix via timing.
  if (
    !process.env.CRON_SECRET ||
    !safeEqual(req.headers.authorization || "", `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const date = new Date().toISOString().slice(0, 10);
  try {
    const findings = await runResearch();
    const to = await sendEmail({
      subject: `Speak First — Competitor Research, week ending ${date}`,
      html: renderEmail(findings, date),
    });
    console.log(`[agent-run] sent ${findings.length} findings to ${to}`);
    return res.status(200).json({ ok: true, findings: findings.length });
  } catch (e) {
    console.error("[agent-run] failed:", e?.message || e);
    // Try to get the failure in front of a human rather than only into the logs.
    try {
      await sendEmail({
        subject: `Speak First — Research run FAILED (${date})`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px;">
          <h1 style="font-size:18px;">The weekly research run failed</h1>
          <p style="font-size:14px;line-height:1.6;color:#6B6560;">${esc(e?.message || String(e))}</p>
        </div>`,
      });
    } catch {
      /* if the mailer itself is down, the console error above is all we have */
    }
    return res.status(500).json({ ok: false, error: e?.message || "failed" });
  }
}
