// api/chat.js — Vercel serverless function.
// The browser NEVER sees your Anthropic key. It calls /api/chat; this file
// attaches the secret key (stored as an env var in Vercel) and forwards to Claude.
//
// Two modes, set by `kind` in the request body:
//   "conversation" -> the in-character partner (never corrects)
//   "coach"        -> the end-of-session reviewer (returns JSON feedback)
//
// Hardening: origin allow-list (403), per-IP rate limit via Upstash
// (20 req/min, fails open when env vars are missing), and input caps
// (max 40 messages / 8000 total chars → 400). See api/_guard.js.

import { checkOrigin, rateLimit, checkInputCaps } from "./_guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { success } = await rateLimit(req, "chat", 20, "1 m");
  if (!success) {
    return res.status(429).json({ error: "Too many requests — slow down a little." });
  }

  const { kind, system, messages } = req.body || {};
  if (!system || !messages) {
    return res.status(400).json({ error: "Missing system or messages" });
  }

  if (!checkInputCaps(messages, system)) {
    return res.status(400).json({ error: "Payload too large" });
  }

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
        max_tokens: { coach: 1024, translate: 150, word: 60, hint: 150, warmup: 350 }[kind] ?? 300,
        // Prompt caching: the client still sends `system` as a plain string;
        // wrapping it in a cache_control block here lets Anthropic reuse the
        // prompt prefix across calls (persona prompts repeat every turn of a
        // conversation, and the coach prompt repeats across sessions).
        system: [
          {
            type: "text",
            text: system,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Anthropic error:", data);
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
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
