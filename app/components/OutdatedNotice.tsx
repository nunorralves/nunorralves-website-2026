import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { Clock } from "lucide-react";
import type { MDXComponents } from "mdx/types";
import mdxComponents from "mdx-components";
import { OUTDATED_LISTING_MARKER, type OutdatedNotice as Notice } from "lib/outdated";

// A note is one sentence, and the shared `p` carries mb-4, which would leave
// a gap under it. Everything else stays on the shared map, so a link inside a
// note is styled like a link inside the post.
const noticeComponents: MDXComponents = {
  ...mdxComponents,
  p: ({ children }) => <p>{children}</p>,
};

// Rendered above the post body on /posts/[slug] only - never on cards, the
// blog index, tag pages or search. What it says and whether it appears at all
// is decided in lib/outdated.ts; this component only draws it.
export function OutdatedNotice({ notice }: { notice: Notice }) {
  return (
    // `aside` with an accessible name maps to the complementary landmark, so
    // it can be found or skipped deliberately. Deliberately not a live region:
    // role="alert" or aria-live here would interrupt reading the post.
    <aside aria-label='Note on the age of this post' className='post-notice'>
      <Clock className='w-3.5 h-3.5 mt-1 shrink-0' aria-hidden='true' />
      <div>
        {/* A custom note is an editor's aside; the generic wording already
            says "may be out of date" on its own, so the label repeats that
            listing marker rather than coining a second phrase for it. */}
        <span className='post-notice-label'>
          {notice.isCustom ? "Note" : OUTDATED_LISTING_MARKER}
        </span>
        {notice.isCustom ? (
          // Same pipeline as the body, minus rehype-pretty-code, which has
          // nothing to do on a sentence of prose
          <MDXRemote
            source={notice.text}
            components={noticeComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        ) : (
          <p>{notice.text}</p>
        )}
      </div>
    </aside>
  );
}
