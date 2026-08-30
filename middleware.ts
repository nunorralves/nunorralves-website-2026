import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "lib/analytics/auth";

// The first middleware in this repository, and it exists for exactly one
// route. Everything else on the site is public and static, so the matcher is
// kept as narrow as it can be: middleware that runs on every request is a
// tax on every page, and none of the others need it.
export const config = {
  matcher: "/insights/:path*",
  // Node, not the default edge runtime. lib/analytics/auth.ts signs with
  // node:crypto, which the edge runtime does not provide, and reimplementing
  // the same HMAC against Web Crypto would mean two copies of the one piece
  // of code that must never disagree with itself.
  runtime: "nodejs",
};

// noindex on the response as well as in robots.txt. robots.txt is a request
// not to crawl; this header is a request not to index something already
// fetched, which is the case that matters if the URL ever leaks into a
// referrer log or somebody's browser sync.
function sealed(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page is inside the matcher, and has to be, or its response would
  // go out without the noindex header. It just cannot require the cookie it
  // exists to hand out.
  if (pathname === "/insights/login") {
    return sealed(NextResponse.next());
  }

  if (verifySession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return sealed(NextResponse.next());
  }

  const login = new URL("/insights/login", request.url);
  // Where they were headed, so the login form can send them back rather than
  // dumping everyone on the default range. Only the path and query are kept,
  // and only from this origin, so this cannot be turned into an open redirect.
  if (pathname !== "/insights") {
    login.searchParams.set("next", pathname + request.nextUrl.search);
  }
  return sealed(NextResponse.redirect(login));
}
