import { backToInsights } from "app/insights/annotations/back";
import { deleteManualAnnotation } from "lib/analytics/annotations-store";
import { isDbConfigured } from "lib/analytics/db";

export const dynamic = "force-dynamic";

// A separate segment rather than a DELETE on the parent, because the caller is
// a plain HTML form and a form can only send GET or POST. The rest of this
// dashboard ships no client JavaScript and the one destructive control on it
// is not where that should start.


/**
 * Delete one manual marker.
 *
 * The id is the only input and it is checked to be a positive integer before
 * it reaches the query, but the guard that actually matters is in the SQL:
 * `source = 'manual'` in the WHERE clause. Content-derived rows are read-only
 * by construction, not because the button beside them is disabled, so an id
 * typed by hand into a request cannot detach a marker from the frontmatter it
 * is a projection of.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return backToInsights(request, "failed");

  const raw = form.get("id");
  const id = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) return backToInsights(request, "not-found");

  if (!isDbConfigured()) return backToInsights(request, "failed");

  try {
    const deleted = await deleteManualAnnotation(id);
    return backToInsights(request, deleted ? "deleted" : "not-found");
  } catch (error) {
    console.error("annotations: delete failed", error);
    return backToInsights(request, "failed");
  }
}
