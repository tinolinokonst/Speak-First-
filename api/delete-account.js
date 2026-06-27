// api/delete-account.js — Vercel serverless function.
// Account deletion requires admin (service-role) privileges — the anon key cannot
// delete users. This function runs server-side, verifies the caller's identity via
// their Bearer access token, then deletes only that user from Supabase.
//
// Required environment variable (set in Vercel, NEVER hardcoded here):
//   SUPABASE_SERVICE_ROLE_KEY  — found in Supabase → Project Settings → API → service_role key
//   VITE_SUPABASE_URL          — already set for the frontend; reused here

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  // Extract the user's access token from the Authorization header.
  const authHeader = req.headers["authorization"] || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  // Admin client — uses the service role key, never leaves the server.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the token and get the user identity — never trust the client to say who they are.
  const { data: { user }, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Delete only the verified user — not any user ID the client might send.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error("Delete user error:", deleteErr);
    return res.status(500).json({ error: "Failed to delete account" });
  }

  return res.status(200).json({ ok: true });
}
