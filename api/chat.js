// api/chat.js — Vercel serverless function.
// The browser NEVER sees your Anthropic key. It calls /api/chat; this file
// attaches the secret key (stored as an env var in Vercel) and forwards to Claude.
//
// Two modes, set by `kind` in the request body:
//   "conversation" -> the in-character partner (never corrects)
//   "coach"        -> the end-of-session reviewer (returns JSON feedback)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { kind, system, messages } = req.body || {};
  if (!system || !messages) {
    return res.status(400).json({ error: "Missing system or messages" });
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
        max_tokens: { coach: 1024, translate: 150, word: 60, hint: 150 }[kind] ?? 300,
        system,
        messages,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Anthropic error:", data);
      return res.status(502).json({ error: "Upstream error" });
    }

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