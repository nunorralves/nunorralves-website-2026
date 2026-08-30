import { createHash, createHmac, timingSafeEqual } from "crypto";

// The whole access control story for /insights, in one file.
//
// The route is public knowledge - this repository is open, so the URL, the
// cookie name and the signing scheme are all readable by anyone. That is on
// purpose, and it means none of them are doing any work. Two things are
// keeping the dashboard closed: ANALYTICS_PASSWORD being long and random, and
// the login route refusing to answer fast enough for anyone to guess it. See
// app/api/insights/login/route.ts for the second half.

export const SESSION_COOKIE = "insights_session";

// Twelve hours. Long enough that looking at the numbers over a morning does
// not mean logging in twice, short enough that a cookie left behind on a
// borrowed machine expires the same day.
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

function requireSecret(): string {
  const secret = process.env.ANALYTICS_SECRET;
  if (!secret) {
    throw new Error("ANALYTICS_SECRET is not set. See .env.example.");
  }
  return secret;
}

// Both halves of every comparison in this file are hashed to a fixed 32 bytes
// before they meet. timingSafeEqual throws outright on buffers of different
// lengths, so the alternative is a length check first, and that length check
// is itself a side channel: it answers "is the password eleven characters?"
// in one request. Digesting first makes every comparison equal length by
// construction and leaks nothing about the input's size.
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function constantTimeEquals(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Whether a submitted password is the configured one.
 *
 * Returns false rather than throwing when ANALYTICS_PASSWORD is unset, so a
 * deployment that forgot the variable is locked shut instead of open. An empty
 * configured password is treated as unset for the same reason.
 */
export function passwordMatches(submitted: string): boolean {
  const expected = process.env.ANALYTICS_PASSWORD;
  if (!expected) return false;
  return constantTimeEquals(submitted, expected);
}

/**
 * Mint a session cookie value: an expiry, and an HMAC over it.
 *
 * The expiry travels in the clear inside the value rather than relying on the
 * cookie's own Max-Age, because Max-Age is set by the browser and can simply
 * be edited. Signing it means a stolen cookie cannot be extended, and it means
 * expiry is checked server side on every request.
 */
export function signSession(now = new Date()): string {
  const expiresAt = Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

function sign(expiresAt: number): string {
  return createHmac("sha256", requireSecret())
    .update(`insights.v1.${expiresAt}`)
    .digest("hex");
}

/**
 * Whether a cookie value was minted here and has not expired.
 *
 * Never throws. This runs in middleware on every request to /insights, and a
 * missing secret or a mangled cookie has to read as "not signed in" rather
 * than as a 500 on a route whose whole job is to be private.
 */
export function verifySession(
  value: string | undefined,
  now = new Date(),
): boolean {
  if (!value) return false;

  const separator = value.indexOf(".");
  if (separator < 0) return false;

  const expiresAt = Number(value.slice(0, separator));
  const signature = value.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || signature === "") return false;

  // Expiry is checked before the signature purely to avoid the HMAC work on an
  // obviously dead cookie. An attacker learning "that one was expired" is not
  // information they did not already have from the plaintext timestamp.
  if (expiresAt * 1000 <= now.getTime()) return false;

  try {
    return constantTimeEquals(signature, sign(expiresAt));
  } catch {
    return false;
  }
}
