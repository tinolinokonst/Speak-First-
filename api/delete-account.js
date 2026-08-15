// api/delete-account.js — Vercel serverless function.
// Account deletion requires admin (service-role) privileges — the anon key cannot
// delete users. This function runs server-side, verifies the caller's identity via
// their Bearer access token, then deletes only that user from Supabase.
//
// Required environment variable (set in Vercel, NEVER hardcoded here):
//   SUPABASE_SERVICE_ROLE_KEY  — found in Supabase → Project Settings → API → service_role key
//   VITE_SUPABASE_URL          — already set for the frontend; reused here

import { createClient } from "@supabase/supabase-js";
import { checkOrigin, rateLimit, requireUser } from "./_guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Defense in depth: a valid token is already required below, but this bounds
  // token-guessing and repeated-deletion attempts from a single source.
  const { success } = await rateLimit(req, "delete-account", 5, "1 h", {
    failClosed: true,
  });
  if (!success) {
    return res.status(429).json({ error: "Too many requests — try again later." });
  }

  // Verify the token server-side — never trust the client to say who they are.
  const user = await requireUser(req);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  // Admin client — uses the service role key, never leaves the server.
  // Deleting the auth user cascades to public.completions via its FK
  // (see supabase/migrations/completions_table.sql).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete only the verified user — not any user ID the client might send.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error("Delete user error:", deleteErr.message);
    return res.status(500).json({ error: "Failed to delete account" });
  }

  return res.status(200).json({ ok: true });
}
