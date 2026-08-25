// api/_guard.js — shared request guards for the serverless endpoints.
// Files prefixed with "_" are NOT exposed as routes by Vercel.
//
// Layers:
//   1. checkOrigin     — exact-match allow-list (no wildcards). 403 otherwise.
//   2. rateLimit       — per-key sliding window via Upstash Redis, with an
//                        in-process backstop so the paid endpoints are never
//                        completely unprotected (see failClosed below).
//   3. checkInputCaps  — bound message count and total characters.
//   4. requireUser     — verify a Supabase access token server-side.
//   5. safeEqual       — constant-time secret comparison.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

// ── 1. Origin ────────────────────────────────────────────────────────────────
// Exact matches only. The previous /speak-first[a-z0-9-]*\.vercel\.app/ wildcard
// also matched OTHER people's Vercel projects (anyone could register
// speak-first-x.vercel.app and call this API from their own page).
// Vercel injects the deployment's own hostnames, so previews stay allowed
// without a wildcard.
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Canonical production origin(s), kept in code as well as env so the API keeps
// working even if Vercel's system env vars aren't exposed to functions — if that
// happened with only env-derived origins, every request would 403.
// Extra domains (e.g. a www. host) go in the ALLOWED_ORIGINS env var.
const SITE_ORIGINS = ["https://speak-first.org"];

function allowedOrigins() {
  const fromEnv = [
    process.env.VERCEL_PROJECT_PRODUCTION_URL, // shortest production custom domain
    process.env.VERCEL_URL,                    // this exact deployment
    process.env.VERCEL_BRANCH_URL,             // branch alias for previews
  ]
    .filter(Boolean)
    .map((h) => `https://${h}`);

  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return [...SITE_ORIGINS, ...fromEnv, ...extra];
}

export function checkOrigin(req) {
  const origin = req.headers.origin || "";
  if (LOCAL_ORIGIN_RE.test(origin)) return true;
  return allowedOrigins().includes(origin);
}

export function clientIp(req) {
  // On Vercel, x-forwarded-for is set by the platform and cannot be spoofed by
  // the client. If this ever runs behind a different proxy, revisit this.
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ── 2. Rate limiting ─────────────────────────────────────────────────────────
const limiters = {};

// ── Mode signalling ──────────────────────────────────────────────────────────
// Upstash returns { success, limit, remaining, reset }; the in-process fallback
// below returns only { success }. That difference is the discriminator used to
// report which backend actually served a check — so "Upstash is configured" is
// never mistaken for "Upstash is working".
//
// Emitted once per bucket on first use and again on every mode CHANGE, so an
// Upstash outage shows up in the logs without spamming one line per request.
// Never logs the URL or token; error text is redacted before it is printed.
const UPSTASH_CONFIGURED = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const lastMode = new Map();

// Cold-start signal. Presence booleans only — no values.
console.log(
  `[rate-limit] init upstashConfigured=${UPSTASH_CONFIGURED} ` +
    `(url=${process.env.UPSTASH_REDIS_REST_URL ? "set" : "MISSING"}, ` +
    `token=${process.env.UPSTASH_REDIS_REST_TOKEN ? "set" : "MISSING"})`
);

/** Strips URLs and long token-like strings out of text before logging.
 *  The Upstash SDK echoes the configured URL in its "invalid URL" error. */
function redact(input) {
  return String(input?.message ?? input ?? "")
    .replace(/https?:\/\/\S+/gi, "[url-redacted]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted]")
    .slice(0, 200);
}

function signalMode(name, mode, reason) {
  if (lastMode.get(name) === mode) return; // only first use + changes
  lastMode.set(name, mode);
  const tail = reason ? ` reason=${reason}` : "";
  if (mode === "redis") {
    console.log(`[rate-limit] bucket=${name} mode=redis backend=upstash durable=true${tail}`);
  } else if (mode === "memory") {
    console.warn(
      `[rate-limit] bucket=${name} mode=memory durable=false (per-instance counters only)${tail}`
    );
  } else {
    console.warn(`[rate-limit] bucket=${name} mode=disabled durable=false (no limiting)${tail}`);
  }
}

/** Snapshot of limiter state for diagnostics/tests. Contains no secrets. */
export function rateLimiterStatus() {
  return {
    upstashConfigured: UPSTASH_CONFIGURED,
    buckets: Object.fromEntries(lastMode),
  };
}

// Per-instance fallback. Serverless instances are ephemeral so this is weaker
// than Redis, but it turns "completely unlimited" into "bounded per instance"
// when Upstash is unset or erroring — which matters for endpoints that spend
// money on every call.
const memBuckets = new Map();

function windowMs(window) {
  const [n, unit] = String(window).trim().split(/\s+/);
  const mult = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[unit?.[0]] ?? 6e4;
  return (parseInt(n, 10) || 1) * mult;
}

function memoryLimit(key, limit, window) {
  const now = Date.now();
  const ms = windowMs(window);
  const b = memBuckets.get(key);
  if (!b || now > b.resetAt) {
    memBuckets.set(key, { count: 1, resetAt: now + ms });
    if (memBuckets.size > 5000) {
      for (const [k, v] of memBuckets) if (now > v.resetAt) memBuckets.delete(k);
    }
    return { success: true };
  }
  b.count += 1;
  return { success: b.count <= limit };
}

/**
 * @param {string} name        bucket name, e.g. "chat"
 * @param {number} limit       max requests per window
 * @param {string} window      Upstash duration string, e.g. "1 m" / "1 h"
 * @param {object} [opts]
 * @param {string} [opts.key]        identity to limit on (defaults to client IP).
 *                                   Pass a user id for authenticated routes —
 *                                   far more meaningful than an IP.
 * @param {boolean} [opts.failClosed] when Upstash is unavailable, fall back to
 *                                   the in-process limiter instead of allowing
 *                                   everything. Use on any endpoint that costs
 *                                   money per request.
 */
export async function rateLimit(req, name, limit, window, opts = {}) {
  const key = opts.key || clientIp(req);
  const bucketKey = `${name}:${key}`;

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    if (opts.failClosed) {
      signalMode(name, "memory", "upstash-not-configured");
      return memoryLimit(bucketKey, limit, window);
    }
    signalMode(name, "disabled", "upstash-not-configured");
    return { success: true };
  }

  try {
    if (!limiters[name]) {
      limiters[name] = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: `rl:${name}`,
      });
    }
    const res = await limiters[name].limit(key);
    // Upstash returns limit/remaining/reset; the memory fallback never does.
    // Checking the response rather than just the env vars means a silently
    // broken Upstash can't masquerade as a working one.
    signalMode(name, typeof res?.limit === "number" ? "redis" : "memory");
    return res;
  } catch (e) {
    signalMode(name, opts.failClosed ? "memory" : "disabled", "upstash-error");
    console.warn(`[rate-limit] bucket=${name} upstash check failed: ${redact(e)}`);
    // Degrade to the in-process limiter rather than dropping all limits.
    return opts.failClosed
      ? memoryLimit(bucketKey, limit, window)
      : { success: true };
  }
}

// ── 3. Input caps ────────────────────────────────────────────────────────────
const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 8000;

export function checkInputCaps(messages, extraText = "") {
  if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) return false;
  let total = typeof extraText === "string" ? extraText.length : 0;
  for (const m of messages) {
    const c =
      typeof m?.content === "string"
        ? m.content
        : JSON.stringify(m?.content ?? "");
    total += c.length;
    if (total > MAX_TOTAL_CHARS) return false;
  }
  return true;
}

/** Normalize to Anthropic's shape and drop anything else the client sent. */
export function sanitizeMessages(messages, maxLen = 4000) {
  return messages.map((m) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? "").slice(0, maxLen),
  }));
}

// ── 4. Auth ──────────────────────────────────────────────────────────────────
let adminClient = null;

function admin() {
  if (!adminClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env vars missing");
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/** Verifies the Bearer access token. Returns the user object, or null when the
 *  token is missing/invalid. Never trust a client-supplied user id. */
export async function requireUser(req) {
  const token = (req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return null;
  try {
    const { data: { user }, error } = await admin().auth.getUser(token);
    return error || !user ? null : user;
  } catch (e) {
    console.error("[auth] token verification failed:", e?.message || e);
    return null;
  }
}

// ── 5. Constant-time secret comparison ───────────────────────────────────────
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ""), "utf8");
  const bufB = Buffer.from(String(b ?? ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
