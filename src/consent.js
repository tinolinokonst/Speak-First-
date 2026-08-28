import { supabase } from "./supabase.js";

// ── Policy version ───────────────────────────────────────────────────────────
// BUMP THIS whenever the Privacy Policy or Terms of Service change materially.
// Every consent row is stamped with the value that was live when the user
// agreed, so you can tell who accepted which version.
export const POLICY_VERSION = "2026-08-16";

// Marker carried across the Google OAuth redirect. The consent box is ticked
// before we hand off to Google, but the component is destroyed by the
// navigation — this survives it so the consent can be recorded on return.
// sessionStorage (not localStorage): scoped to the tab, cleared when it closes,
// and removed as soon as it is read. Disclosed in the Cookie Notice.
const PENDING_KEY = "sf-pending-consent";

export function markConsentPending() {
  try {
    sessionStorage.setItem(PENDING_KEY, POLICY_VERSION);
  } catch {
    /* storage blocked — the email path still records via user_metadata */
  }
}

/** Reads and clears the marker. Returns the version consented to, or null. */
export function takePendingConsent() {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    if (v) sessionStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return null;
  }
}

// ── Verification ─────────────────────────────────────────────────────────────
/**
 * Does this user have a consent record for the given policy version?
 *
 * Returns { consented: true | false | null }. `null` means we could not tell —
 * the query itself failed (table missing, network down, RLS misconfigured).
 *
 * Callers MUST treat null differently from false. Blocking the whole app on an
 * infrastructure error would make a missing table look like a total outage for
 * every user; a genuine "query worked, no row" is the only safe reason to gate
 * someone. The unknown case is logged loudly instead.
 */
export async function hasConsentRecord(userId, version = POLICY_VERSION) {
  if (!userId) return { consented: null, reason: "no-user" };
  try {
    const { data, error } = await supabase
      .from("user_consents")
      .select("id")
      .eq("user_id", userId)
      .eq("policy_version", version)
      .limit(1);
    if (error) {
      console.error(
        "[consent] cannot verify consent — allowing access so a broken table " +
          "doesn't lock everyone out. Run supabase/migrations/user_consents_table.sql. " +
          `(${error.code}: ${error.message})`
      );
      return { consented: null, reason: error.code };
    }
    return { consented: (data?.length ?? 0) > 0 };
  } catch (e) {
    console.error("[consent] cannot verify consent:", e?.message || e);
    return { consented: null, reason: "exception" };
  }
}

// ── Recording ────────────────────────────────────────────────────────────────
/**
 * Writes the consent row for a freshly signed-up user.
 *
 * Idempotent: the table has a unique (user_id, policy_version) constraint and
 * this upserts with ignoreDuplicates, so repeated SIGNED_IN events can't create
 * duplicate rows.
 *
 * NEVER throws and never blocks sign-up. If the table is missing or RLS rejects
 * the write, it warns and returns { ok: false } — a failed audit write must not
 * cost someone their account.
 */
export async function recordConsent(userId, version = POLICY_VERSION) {
  if (!userId) return { ok: false, reason: "no-user" };
  try {
    const { error } = await supabase
      .from("user_consents")
      .upsert(
        { user_id: userId, policy_version: version },
        { onConflict: "user_id,policy_version", ignoreDuplicates: true }
      );
    if (error) {
      console.warn("[consent] could not record consent:", error.code, error.message);
      return { ok: false, reason: error.code };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[consent] could not record consent:", e?.message || e);
    return { ok: false, reason: "exception" };
  }
}
