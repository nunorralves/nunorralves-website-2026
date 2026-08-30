import { NextResponse } from "next/server";
import type { AnnotationMessage } from "lib/analytics/annotations";

/**
 * Send the browser back to the dashboard, carrying the outcome.
 *
 * Shared by both write routes so the two cannot answer differently. The
 * outcome travels as a code, never as prose: see ANNOTATION_MESSAGES for why
 * a message in the query string is a phishing page I would have built myself.
 */
export function backToInsights(
  request: Request,
  message: AnnotationMessage,
): NextResponse {
  const target = new URL("/insights", request.url);

  // Back to the view I was looking at, range and dimension intact, rather than
  // to the default. Only a same-origin /insights URL is honoured, and only its
  // query, so a forged Referer cannot turn this into an open redirect.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (
        parsed.origin === new URL(request.url).origin &&
        parsed.pathname === "/insights"
      ) {
        target.search = parsed.search;
      }
    } catch {
      // A mangled Referer is not worth an error page. Fall through to the
      // default view.
    }
  }

  target.searchParams.set("ann", message);
  // 303, so the browser follows with a GET. A 307 would replay the POST, and
  // a reload would then add the marker a second time.
  return NextResponse.redirect(target, 303);
}
