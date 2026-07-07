// api/_guard.js — shared request guards for the serverless endpoints.
// Files prefixed with "_" are NOT exposed as routes by Vercel.
//
// Three layers:
//   1. checkOrigin  — browser requests must come from our own pages (403 otherwise)
//   2. rateLimit    — per-IP sliding-window limits via Upstash Redis.
//                     FAILS OPEN with a console warning when the Upstash env vars
//                     (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) are missing
//                     or the check itself errors — the API keeps working, just unlimited.
//   3. checkInputCaps — bound message count and total characters so a hostile
//                     client can't stuff huge prompts through the proxy.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Production + Vercel preview deployments for this project.
const PROD_ORIGIN_RE = /^https:\/\/speak-first[a-z0-9-]*\.vercel\.app$/;
// Local Vite dev server on any port.
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function checkOrigin(req) {
  const origin = req.headers.origin || "";
  // Optional extra origins (e.g. a custom domain), comma-separated env var.
  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    PROD_ORIGIN_RE.test(origin) ||
    LOCAL_ORIGIN_RE.test(origin) ||
    extra.includes(origin)
  );
}

export function clientIp(req) {
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// Limiter instances are cached at module level so warm invocations reuse them.
const limiters = {};

/**
 * @param {string} name    unique bucket name, e.g. "chat" or "demo"
 * @param {number} limit   max requests per window
 * @param {string} window  Upstash duration string, e.g. "1 m" or "1 h"
 * @returns {{success: boolean}} success=true when allowed (or failing open)
 */
export async function rateLimit(req, name, limit, window) {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    console.warn(
      `[rate-limit:${name}] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — failing open (no rate limiting).`
    );
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
    return await limiters[name].limit(clientIp(req));
  } catch (e) {
    console.warn(
      `[rate-limit:${name}] check failed — failing open:`,
      e?.message || e
    );
    return { success: true };
  }
}

const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 8000;

/** True when the payload is within bounds. `extraText` (e.g. the system
 *  prompt) counts toward the character budget too. */
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
