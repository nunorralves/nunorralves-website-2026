import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  passwordMatches,
  signSession,
} from "lib/analytics/auth";
import { clientIpFrom } from "lib/analytics/session";

// Writes a cookie and reads an env var, so there is nothing here to prerender.
export const dynamic = "force-dynamic";

// It lives under /api rather than at /insights/login because a route handler
// and a page cannot share a segment, and putting it here has the useful side
// effect of inheriting the existing `Disallow: /api/` in robots.txt.

// --- rate limiting ---------------------------------------------------------
//
// The threat this is sized against: the repository is public, so the URL, the
// form field name and this file are all readable, and the password is the only
// secret. Left unthrottled, a script could try a few hundred candidates a
// second against a route that answers in single digit milliseconds.
//
// Two windows, because they stop different things. The per-IP one stops the
// ordinary case of somebody grinding from one machine. The global one is the
// one that matters against a botnet, where every request arrives from a fresh
// address and the per-IP counter never climbs above one; it is a blunt
// instrument, and locking myself out for fifteen minutes while an attack runs
// is a trade I will take on a dashboard only I read.
//
// The honest caveat, the same one app/api/collect/route.ts carries: these
// counters live in one serverless instance's memory and are lost on a cold
// start, so an attacker spread across instances gets a multiple of these
// numbers rather than these numbers. That is still four orders of magnitude
// short of brute forcing anything with real entropy in it, which is why
// .env.example insists the password be long and random. This throttle buys
// the password time; it is not a substitute for the password being good.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_GLOBAL = 40;

type Window = { count: number; resetAt: number };

const perIp = new Map<string, Window>();
let global: Window = { count: 0, resetAt: 0 };

function hit(window: Window | undefined, now: number, max: number) {
  if (!window || now > window.resetAt) {
    return { window: { count: 1, resetAt: now + WINDOW_MS }, blocked: false };
  }
  window.count += 1;
  return { window, blocked: window.count > max };
}

function throttled(ip: string, now: number): boolean {
  const ipResult = hit(perIp.get(ip), now, MAX_PER_IP);
  perIp.set(ip, ipResult.window);

  // Opportunistic sweep so a long lived instance under attack cannot grow the
  // map without bound. Same shape as the beacon endpoint's.
  if (perIp.size > 5_000) {
    for (const [key, value] of perIp) if (now > value.resetAt) perIp.delete(key);
  }

  const globalResult = hit(global, now, MAX_GLOBAL);
  global = globalResult.window;

  return ipResult.blocked || globalResult.blocked;
}

// A floor on how long a wrong answer takes. Not a defence on its own, since
// requests run in parallel, but it turns "a few hundred guesses a second" into
// something a rate limiter can see coming, and it costs a human nothing.
function pause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 400));
}

function back(request: Request, params: Record<string, string>) {
  const url = new URL("/insights/login", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 303);
}

/**
 * Exchange the password for a signed session cookie.
 *
 * Answers with redirects rather than JSON because the form on the login page
 * is a plain HTML form with no JavaScript behind it. The rest of this site
 * ships almost no client script and the page guarding it should not be the
 * exception.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return back(request, { error: "1" });

  const password = form.get("password");
  // Where the visitor was originally headed, handed back by the proxy.
  // Only same-site paths under /insights are honoured: anything else, and this
  // becomes an open redirect that any phishing page could point at.
  const requested = form.get("next");
  const next =
    typeof requested === "string" && /^\/insights(\/|\?|$)/.test(requested)
      ? requested
      : "/insights";

  if (throttled(clientIpFrom(request.headers), Date.now())) {
    await pause();
    return back(request, { error: "rate" });
  }

  if (typeof password !== "string" || !passwordMatches(password)) {
    await pause();
    return back(request, { error: "1" });
  }

  let value: string;
  try {
    value = signSession();
  } catch {
    // ANALYTICS_SECRET is missing. Nothing can be signed, so nobody gets in,
    // which is the correct failure direction for a private route.
    return back(request, { error: "config" });
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    // Off over plain http so the cookie is not silently dropped during local
    // work on http://localhost. Production is https, so this is on there.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/insights",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
