// api/chat.js — Vercel serverless function.
// The browser NEVER sees your Anthropic key. It calls /api/chat; this file
// attaches the secret key (stored as an env var in Vercel) and forwards to Claude.
//
// SECURITY MODEL (hardened):
//   1. Origin allow-list      — exact matches only (403).
//   2. Authentication         — a valid Supabase access token is REQUIRED (401).
//                               Previously this endpoint was fully anonymous.
//   3. Server-side prompts    — the client sends { kind, scenarioId, messages };
//                               it can no longer supply `system`. This is what
//                               stops the endpoint being used as a general
//                               purpose Claude proxy on our API key.
//   4. Rate limit             — 20/min PER USER (not per IP), fail-closed onto an
//                               in-process limiter if Upstash is unavailable.
//   5. Input caps             — max 40 messages / 8000 chars, content truncated.

import {
  checkOrigin,
  rateLimit,
  checkInputCaps,
  sanitizeMessages,
  requireUser,
} from "./_guard.js";
import { buildSystem, MAX_TOKENS } from "./_prompts.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const user = await requireUser(req);
  if (!user) {
    return res.status(401).json({ error: "Sign in to continue" });
  }

  // Two ceilings, checked in parallel so this adds no latency:
  //   per user — the meaningful limit for a legitimate session;
  //   per IP   — stops one machine farming N accounts to multiply its quota.
  // Without the IP ceiling, allowance scaled linearly with account count.
  const [perUser, perIp] = await Promise.all([
    rateLimit(req, "chat", 20, "1 m", { key: user.id, failClosed: true }),
    rateLimit(req, "chat-ip", 60, "1 m", { failClosed: true }),
  ]);
  if (!perUser.success || !perIp.success) {
    return res.status(429).json({ error: "Too many requests — slow down a little." });
  }

  const { kind, scenarioId, messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing messages" });
  }

  // The system prompt is chosen here, never supplied by the caller. An unknown
  // kind (or a conversation for an unknown scenario) is rejected outright.
  const system = buildSystem(kind, scenarioId);
  if (!system) {
    return res.status(400).json({ error: "Unknown request kind" });
  }

  if (!checkInputCaps(messages, system)) {
    return res.status(400).json({ error: "Payload too large" });
  }

  const clean = sanitizeMessages(messages);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY, // set this in Vercel, never in code
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: MAX_TOKENS[kind] ?? 300,
        // Prompt caching: wrapping the system prompt in a cache_control block
        // lets Anthropic reuse the prefix across calls (persona prompts repeat
        // every turn; the coach prompt repeats across sessions).
        system: [
          {
            type: "text",
            text: system,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: clean,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      // Log the upstream error type only — never the payload, which contains
      // the learner's conversation.
      console.error("Anthropic error:", r.status, data?.error?.type || "unknown");
      return res.status(502).json({ error: "Upstream error" });
    }

    // Cache performance check — cache_read_input_tokens > 0 means a hit.
    console.log("Anthropic usage:", JSON.stringify(data.usage));

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    return res.status(200).json({ text });
  } catch (e) {
    console.error("[chat] request failed:", e?.message || e);
    return res.status(500).json({ error: "Server error" });
  }
}
