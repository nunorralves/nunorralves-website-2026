import { createHash } from "crypto";

/**
 * Turn a request into a session identifier that cannot be traced back to a
 * person.
 *
 * The shape of this is the whole privacy argument for the beacon, so it is
 * worth stating precisely rather than gesturing at "anonymised":
 *
 * - No cookie is ever set. Nothing is stored on the visitor's device, which
 *   is what keeps the site clear of consent banner rules in the EU.
 * - The raw IP and user agent are hashed together and then thrown away. Only
 *   the digest is written, and only 32 hex characters of it.
 * - The salt changes every day, so the same visitor on Monday and Tuesday
 *   produces two unrelated hashes. Behaviour cannot be stitched into a
 *   profile across days, by us or by anyone who later reads the table.
 *
 * One honest caveat about how the salt is derived. A random salt discarded at
 * midnight would be the strongest version, but serverless instances do not
 * share memory, so each cold start would invent its own and shatter every
 * session into fragments. Deriving it from a server-only secret plus the date
 * gives every instance the same answer without storing anything. The cost is
 * that the salt is reproducible by whoever holds ANALYTICS_SECRET, so this
 * resists disclosure of the database, which is the realistic risk, rather
 * than disclosure of the server itself.
 */
export function sessionIdFor(options: {
  ip: string;
  userAgent: string;
  now?: Date;
}): string {
  const { ip, userAgent, now = new Date() } = options;

  const secret = process.env.ANALYTICS_SECRET;
  if (!secret) {
    throw new Error("ANALYTICS_SECRET is not set. See .env.example.");
  }

  const day = now.toISOString().slice(0, 10);
  const salt = createHash("sha256").update(`${secret}:${day}`).digest();

  return createHash("sha256")
    .update(salt)
    .update(ip)
    .update(userAgent)
    .digest("hex")
    .slice(0, 32);
}

/**
 * The client address as Vercel reports it. The first entry in the forwarded
 * chain is the visitor; everything after it is proxy hops. Falls back to a
 * constant rather than throwing, because a missing header should degrade the
 * session grouping, not reject the event.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
