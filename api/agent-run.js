// api/agent-run.js — Speak First marketing agent. Vercel serverless, cron-triggered.
//
// Schedule (vercel.json cron hits this daily at 06:00 UTC with GET):
//   every day  : DRAFTS → DAILY EMAIL
//   Monday     : RESEARCH first (before drafts)
//   Sunday     : WEEKLY EMAIL after the daily one
//
// Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when the env var is named CRON_SECRET. Manual runs must send the same header.
//
// Manual testing (replace $CRON_SECRET and the domain):
//   curl -X POST https://speak-first.vercel.app/api/agent-run \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"force":"research"}'
//   curl -X POST … -d '{"force":"drafts"}'
//   curl -X POST … -d '{"force":"daily_email"}'
//   curl -X POST … -d '{"force":"weekly_email"}'
//   # No body / GET = the normal day-based routing:
//   curl https://speak-first.vercel.app/api/agent-run -H "Authorization: Bearer $CRON_SECRET"
//
// Required env vars (Vercel, server-side only, never in the client bundle):
//   ANTHROPIC_API_KEY, CRON_SECRET, RESEND_API_KEY, AGENT_RECIPIENT_EMAIL,
//   VITE_SUPABASE_URL (already set), SUPABASE_SERVICE_ROLE_KEY (already set)

import { createClient } from "@supabase/supabase-js";

const MODEL = "claude-sonnet-4-6";

const WATCHLIST = ["Duolingo", "Babbel", "Speak", "Praktika", "Loora", "Pimsleur"];

const POSITIONING = `Speak First positioning (use this, never contradict it):
- Voice-first Spanish practice: real spoken conversations with an AI partner.
- Feedback arrives ONLY at the end of a session — the partner never interrupts or corrects mid-sentence.
- Anti-Duolingo stance: "stop tapping, start talking." Drills and streaks don't make you conversational.
- Target user: adults who studied Spanish before (school, apps) but freeze when they have to actually speak.
- Tone: confident, a little irreverent, never corporate. No hashtag soup, no "language learning journey" clichés.`;

// ── Small helpers ─────────────────────────────────────────────────────────────

function supa() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
    throw new Error(`Anthropic ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();
}

// Strip markdown fences and any prose before the first bracket, then parse.
function parseJson(text) {
  const cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
  const firstBracket = cleaned.search(/[[{]/);
  return JSON.parse(firstBracket > 0 ? cleaned.slice(firstBracket) : cleaned);
}

async function logRun(sb, runType, summary) {
  await sb.from("agent_log").insert({ run_type: runType, summary: String(summary).slice(0, 2000) });
}

async function sendEmail({ subject, html }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: process.env.AGENT_RECIPIENT_EMAIL,
      subject,
      html,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Resend ${r.status}: ${body.slice(0, 300)}`);
  }
}

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Shared minimal email shell — system fonts, 600px column.
function emailShell(title, inner) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px;color:#1E1B16;">
    <div style="font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#E8654E;margin-bottom:6px;">Speak First — Marketing Agent</div>
    <h1 style="font-size:22px;margin:0 0 20px;">${esc(title)}</h1>
    ${inner}
  </div>`;
}

const sectionH = (label) =>
  `<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#6B6560;border-top:1px solid #EDE8E2;padding-top:16px;margin:24px 0 10px;">${label}</div>`;

// ── RESEARCH (Mondays) ────────────────────────────────────────────────────────

async function runResearch(sb) {
  const text = await claude({
    system:
      "You are a sharp social-media competitive intelligence analyst for a language-learning startup. You research with the web_search tool, then report ONLY strict JSON — no prose, no markdown fences.",
    prompt: `Research the CURRENT organic social presence of these language-learning competitors: ${WATCHLIST.join(", ")}.

Look for (prioritize the last 2-3 weeks):
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

  const rows = findings.map((f) => ({
    competitor: String(f.competitor ?? "").slice(0, 200),
    channel: String(f.channel ?? "other").slice(0, 50),
    finding: String(f.finding ?? "").slice(0, 2000),
    source_url: String(f.source_url ?? "").slice(0, 500),
    tactic_score: Math.min(5, Math.max(1, parseInt(f.tactic_score, 10) || 3)),
  }));

  const { error } = await sb.from("agent_research").insert(rows);
  if (error) throw new Error(`Insert agent_research failed: ${error.message}`);

  await logRun(sb, "research", `OK: ${rows.length} findings across ${new Set(rows.map((r) => r.competitor)).size} competitors`);
  return { count: rows.length };
}

// ── DRAFTS (daily) ────────────────────────────────────────────────────────────

async function runDrafts(sb) {
  const { data: research, error: qErr } = await sb
    .from("agent_research")
    .select("id, competitor, channel, finding, tactic_score")
    .order("tactic_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(15);
  if (qErr) throw new Error(`Query agent_research failed: ${qErr.message}`);

  const researchBlock = (research || [])
    .map((r) => `- [${r.id}] (${r.competitor}, ${r.channel}, score ${r.tactic_score}): ${r.finding}`)
    .join("\n");

  const text = await claude({
    system: `You are the growth content lead for Speak First.\n\n${POSITIONING}\n\nYou output ONLY strict JSON — no prose, no markdown fences.`,
    prompt: `Here are our latest competitive research findings (id in brackets):

${researchBlock || "- (no research yet — draft from positioning alone)"}

Produce EXACTLY 3 drafts for today:
1. One TikTok/Reels script: hook line, numbered beats, shot list, spoken lines. Max 45 seconds of content.
2. One X post (under 280 chars).
3. One wildcard: a thread outline, a reply-bait question, a duet/stitch idea, or similar.

Each draft must name which research finding/tactic it replicates (use the bracketed id, or null if none).

Also give 2-3 short bullet ideas for TOMORROW.

Return strict JSON exactly in this shape:
{"drafts":[{"channel":"tiktok|reels|x","draft_type":"script|post|hook|thread|other","content":"the full draft as one string, newlines allowed","based_on_research":"<id or null>","tactic":"one line naming the tactic replicated"}],"plan":["idea 1","idea 2"]}`,
    maxTokens: 3072,
  });

  const parsed = parseJson(text);
  const drafts = Array.isArray(parsed.drafts) ? parsed.drafts.slice(0, 3) : [];
  if (drafts.length === 0) throw new Error("Drafts call returned no parseable drafts");

  const validIds = new Set((research || []).map((r) => r.id));
  const allowedChannels = new Set(["tiktok", "reels", "x"]);
  const rows = drafts.map((d) => ({
    channel: allowedChannels.has(d.channel) ? d.channel : "x",
    draft_type: String(d.draft_type ?? "post").slice(0, 50),
    // Keep the tactic label with the content so the DB row is self-explanatory.
    content: `${String(d.content ?? "")}\n\n[tactic: ${String(d.tactic ?? "n/a")}]`.slice(0, 8000),
    based_on_research: validIds.has(d.based_on_research) ? d.based_on_research : null,
  }));

  const { error: insErr } = await sb.from("agent_drafts").insert(rows);
  if (insErr) throw new Error(`Insert agent_drafts failed: ${insErr.message}`);

  const plan = Array.isArray(parsed.plan) ? parsed.plan.slice(0, 3).map(String) : [];
  await logRun(sb, "drafts", `OK: ${rows.length} drafts (${rows.map((r) => r.channel).join(", ")})`);
  return { drafts, plan, research: research || [] };
}

// ── DAILY EMAIL ───────────────────────────────────────────────────────────────

async function runDailyEmail(sb, draftsCtx, errors) {
  const date = new Date().toISOString().slice(0, 10);

  // If the drafts job ran this invocation we have full context; otherwise
  // (forced email test, or drafts failed) fall back to what's in the DB.
  let drafts = draftsCtx?.drafts;
  let research = draftsCtx?.research;
  const plan = draftsCtx?.plan || [];

  if (!drafts) {
    const startOfDay = `${date}T00:00:00Z`;
    const { data } = await sb
      .from("agent_drafts")
      .select("channel, draft_type, content")
      .gte("created_at", startOfDay)
      .order("created_at", { ascending: false })
      .limit(3);
    drafts = (data || []).map((d) => ({ ...d, tactic: "" }));
  }
  if (!research) {
    const { data } = await sb
      .from("agent_research")
      .select("competitor, finding, tactic_score")
      .order("tactic_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    research = data || [];
  }

  const intel = (research || [])
    .slice(0, 5)
    .map(
      (r) =>
        `<div style="margin-bottom:10px;"><strong>${esc(r.competitor)}</strong> — ${esc(r.finding)}<br>
         <span style="color:#6B6560;font-size:13px;">replicability ${esc(r.tactic_score)}/5</span></div>`
    )
    .join("");

  const draftHtml = (drafts || [])
    .map(
      (d) =>
        `<div style="background:#FDF9F5;border:1px solid #EDE8E2;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
           <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#E8654E;margin-bottom:6px;">${esc(d.channel)} · ${esc(d.draft_type)}${d.tactic ? ` · ${esc(d.tactic)}` : ""}</div>
           <div style="font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(d.content)}</div>
         </div>`
    )
    .join("");

  const planHtml = plan.length
    ? `<ul style="font-size:14px;line-height:1.6;padding-left:18px;">${plan.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : `<p style="font-size:14px;color:#6B6560;">No plan generated (drafts job did not run in this invocation).</p>`;

  const errHtml = errors.length
    ? sectionH("Errors this run") +
      `<ul style="font-size:13px;color:#C0392B;padding-left:18px;">${errors.map((e) => `<li><strong>${esc(e.job)}</strong>: ${esc(e.message)}</li>`).join("")}</ul>`
    : "";

  const html = emailShell(
    `Daily briefing — ${date}`,
    sectionH("Intelligence") + (intel || `<p style="font-size:14px;color:#6B6560;">No research findings yet.</p>`) +
    sectionH("Drafts") + (draftHtml || `<p style="font-size:14px;color:#6B6560;">No drafts today.</p>`) +
    sectionH("Plan for tomorrow") + planHtml +
    errHtml
  );

  await sendEmail({ subject: `Speak First Marketing — ${date}`, html });
  await logRun(sb, "daily_email", `OK: sent (${(drafts || []).length} drafts, ${errors.length} upstream errors)`);
}

// ── WEEKLY EMAIL (Sundays) ────────────────────────────────────────────────────

async function runWeeklyEmail(sb) {
  const date = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [{ data: logs }, { data: drafts }] = await Promise.all([
    sb.from("agent_log").select("created_at, run_type, summary").gte("created_at", weekAgo).order("created_at"),
    sb.from("agent_drafts").select("created_at, channel, draft_type, content").gte("created_at", weekAgo).order("created_at"),
  ]);

  const perChannel = {};
  for (const d of drafts || []) perChannel[d.channel] = (perChannel[d.channel] || 0) + 1;

  const synthesis = await claude({
    system: `You are the growth lead for Speak First writing a weekly review for the founder.\n\n${POSITIONING}\n\nWrite tight, concrete, plain text. No markdown headers, no fences.`,
    prompt: `Here is this week's agent activity.

Run log:
${(logs || []).map((l) => `- ${l.created_at.slice(0, 10)} ${l.run_type}: ${l.summary}`).join("\n") || "- (empty)"}

Drafts produced per channel: ${JSON.stringify(perChannel)}

Draft excerpts:
${(drafts || []).slice(0, 12).map((d) => `- [${d.channel}/${d.draft_type}] ${d.content.slice(0, 160).replace(/\n/g, " ")}`).join("\n") || "- (none)"}

Write four short sections, each a paragraph or tight bullet list, separated by blank lines, in this order:
1. WHAT WE RESEARCHED — themes from the week's intelligence.
2. WHAT WE PRODUCED — volume and spread per channel, notable drafts.
3. RECURRING THEMES — patterns across research and drafts.
4. NEXT WEEK'S FOCUS — which 2-3 tactics to double down on, and why.`,
    maxTokens: 2048,
  });

  const html = emailShell(
    `Weekly review — ${date}`,
    `<div style="font-size:14px;line-height:1.65;white-space:pre-wrap;">${esc(synthesis)}</div>`
  );

  await sendEmail({ subject: `Speak First Marketing — Weekly Review ${date}`, html });
  await logRun(sb, "weekly_email", `OK: sent (${(drafts || []).length} drafts, ${(logs || []).length} log rows reviewed)`);
}

// ── Handler ───────────────────────────────────────────────────────────────────

const JOB_NAMES = new Set(["research", "drafts", "daily_email", "weekly_email"]);

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || (req.headers.authorization || "") !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const force = req.method === "POST" ? req.body?.force : null;
  if (force && !JOB_NAMES.has(force)) {
    return res.status(400).json({ error: `Unknown job "${force}"` });
  }

  const day = new Date().getUTCDay(); // 0 = Sunday, 1 = Monday
  const jobs = force
    ? [force]
    : [
        ...(day === 1 ? ["research"] : []),
        "drafts",
        "daily_email",
        ...(day === 0 ? ["weekly_email"] : []),
      ];

  let sb;
  try {
    sb = supa();
  } catch (e) {
    console.error("[agent-run] Supabase client init failed:", e);
    return res.status(500).json({ error: "Server misconfiguration: Supabase env vars missing" });
  }

  const errors = [];
  const results = {};
  let draftsCtx = null;

  for (const job of jobs) {
    try {
      if (job === "research") {
        results.research = await runResearch(sb);
      } else if (job === "drafts") {
        draftsCtx = await runDrafts(sb);
        results.drafts = { count: draftsCtx.drafts.length };
      } else if (job === "daily_email") {
        await runDailyEmail(sb, draftsCtx, errors);
        results.daily_email = "sent";
      } else if (job === "weekly_email") {
        await runWeeklyEmail(sb);
        results.weekly_email = "sent";
      }
    } catch (e) {
      console.error(`[agent-run] ${job} failed:`, e);
      errors.push({ job, message: e.message || String(e) });
      // Log the failure but never let logging itself break the loop.
      await logRun(sb, job, `FAILED: ${e.message || e}`).catch(() => {});
    }
  }

  return res.status(errors.length ? 207 : 200).json({ jobs, results, errors });
}
