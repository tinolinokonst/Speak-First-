// api/waitlist.js — mobile app waitlist signups from the landing page.
//
// POST { email, consent } → 200 {ok:true} | 200 {ok:true, already:true}
// Duplicate emails return the SAME success shape as new ones so the endpoint
// never leaks whether an address is already registered.
//
// Guards (shared with the other routes via _guard.js): origin allow-list,
// per-IP Upstash rate limit (5/hour, fail-open when env vars are missing).
// After the format check, the domain must resolve MX (or A as a fallback) —
// the rejection message is identical to a format failure, so nothing reveals
// that DNS was consulted. DNS slower than 3s fails OPEN: never lose a real
// signup to slow DNS. Inserts use the service role key — server-side only.
//
// Manual cleanup of test rows (paste into the Supabase SQL editor, edit the list):
//   delete from public.waitlist where email in ('test1@example.com', 'test2@example.com');

import { checkOrigin, rateLimit } from "./_guard.js";
import { createClient } from "@supabase/supabase-js";
import { promises as dns } from "node:dns";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INVALID_EMAIL_MSG = "Please enter a valid email address";

// true  = domain can receive mail (MX, or A-record fallback)
// false = definitively cannot
// On timeout (>3s) returns true — fail open.
async function domainAcceptsMail(domain) {
  const lookup = (async () => {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx && mx.length > 0) return true;
    } catch {
      /* fall through to A-record check */
    }
    try {
      // Some small domains receive mail directly on an A record.
      const a = await dns.resolve4(domain);
      return Array.isArray(a) && a.length > 0;
    } catch {
      return false;
    }
  })();

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve("timeout"), 3000);
  });
  const result = await Promise.race([lookup, timeout]);
  clearTimeout(timer);
  return result === "timeout" ? true : result;
}

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
  if (consent !== true) {
    return res.status(400).json({ error: "Invalid request" });
  }
  if (typeof email !== "string" || email.length > 320 || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: INVALID_EMAIL_MSG });
  }

  // MX/A lookup on the domain — same error copy as a format failure.
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!(await domainAcceptsMail(domain))) {
    return res.status(400).json({ error: INVALID_EMAIL_MSG });
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
