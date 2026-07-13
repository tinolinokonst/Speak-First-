// api/waitlist.js — mobile app waitlist signups from the landing page.
//
// POST { email, consent } → 200 {ok:true} | 200 {ok:true, already:true}
// Duplicate emails return the SAME success shape as new ones so the endpoint
// never leaks whether an address is already registered.
//
// Guards (shared with the other routes via _guard.js): origin allow-list,
// per-IP Upstash rate limit (5/hour, fail-open when env vars are missing).
// Inserts use the service role key — server-side only, never in the client.

import { checkOrigin, rateLimit } from "./_guard.js";
import { createClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { success } = await rateLimit(req, "waitlist", 5, "1 h");
  if (!success) {
    return res.status(429).json({ error: "Too many requests — try again later." });
  }

  const { email, consent } = req.body || {};
  if (
    typeof email !== "string" ||
    email.length > 320 ||
    !EMAIL_RE.test(email.trim()) ||
    consent !== true
  ) {
    return res.status(400).json({ error: "Invalid request" });
  }

  let sb;
  try {
    sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (e) {
    console.error("[waitlist] Supabase client init failed:", e);
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const { error } = await sb.from("waitlist").insert({
    email: email.trim().toLowerCase(),
    consent: true,
    source: "landing_page",
  });

  if (error) {
    // 23505 = unique_violation — treat as success, indistinguishable to the client.
    if (error.code === "23505") {
      return res.status(200).json({ ok: true, already: true });
    }
    console.error("[waitlist] insert failed:", error);
    return res.status(500).json({ error: "Server error" });
  }

  return res.status(200).json({ ok: true });
}
