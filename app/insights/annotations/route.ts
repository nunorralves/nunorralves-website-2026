import { backToInsights } from "app/insights/annotations/back";
import { parseAnnotationInput } from "lib/analytics/annotations";
import { createManualAnnotation } from "lib/analytics/annotations-store";
import { isDbConfigured } from "lib/analytics/db";

// It writes, so there is nothing to prerender and nothing to cache.
export const dynamic = "force-dynamic";

// Under /insights rather than /api/insights, and that placement is the access
// control. Two things follow from the segment alone:
//
//   - proxy.ts matches "/insights/:path*", so this is behind the same session
//     check as the dashboard. There is no second copy of the auth to keep in
//     step with the first.
//   - the session cookie is scoped Path=/insights, so a form on the dashboard
//     posting to /api/... would arrive with no cookie at all and could never
//     have been authenticated in the first place.
//
// A route handler and a page cannot share a segment, which is why the login
// route sits under /api; a sibling segment like this one is fine.


/**
 * Add a manual marker.
 *
 * Everything is re-validated here rather than trusted from the form. The
 * request arrives with a valid session, which means it is me, and that is
 * still not the same as it being the form: `maxlength` and `type="date"` are
 * enforced by the browser and by nothing else, and a hand-rolled request with
 * the cookie attached bypasses all of them. See parseAnnotationInput for what
 * every field is held to.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return backToInsights(request, "failed");

  const parsed = parseAnnotationInput({
    at: form.get("at"),
    kind: form.get("kind"),
    label: form.get("label"),
    url: form.get("url"),
  });

  if (!parsed.ok) return backToInsights(request, parsed.error);

  if (!isDbConfigured()) return backToInsights(request, "failed");

  try {
    await createManualAnnotation(parsed.value);
  } catch (error) {
    // The message goes to the function log rather than into the redirect. It
    // can carry a constraint name and a row's contents, and the redirect ends
    // up in browser history.
    console.error("annotations: insert failed", error);
    return backToInsights(request, "failed");
  }

  return backToInsights(request, "added");
}
