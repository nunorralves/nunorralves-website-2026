import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "lib/analytics/auth";

export const dynamic = "force-dynamic";

/**
 * Drop the session cookie.
 *
 * POST rather than GET, and a form rather than a link, for the ordinary
 * reason: a GET that changes state gets fetched by prefetchers, scanners and
 * the browser's own speculative loads, and being signed out by a link
 * preview is a silly way to lose a session.
 *
 * The cookie is cleared by overwriting it with an empty value and Max-Age 0.
 * Every attribute that scopes a cookie has to match the one that set it or the
 * browser treats it as a different cookie and leaves the original in place, so
 * the path here is the same "/insights" that login writes.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(
    new URL("/insights/login", request.url),
    303,
  );

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/insights",
    maxAge: 0,
  });

  return response;
}
