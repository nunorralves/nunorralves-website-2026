import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next matches these top-down, so the /blog/:slug+ catch-all has to stay last
  // or it would swallow the named post redirects above it.
  async redirects() {
    return [
      // /blog absorbed both of these. /tags/[tag] is untouched - it is linked
      // from every post card, project card and project detail page.
      { source: "/archive", destination: "/blog", permanent: true },
      { source: "/tags", destination: "/blog", permanent: true },

      // The 2020/2021 posts came from the old pages-router site, which served
      // them at /blog/<slug>. They now live at /posts/<date>-<slug>, and the
      // slugs were rewritten in the same move, so each one needs naming.
      {
        source: "/blog/create-simple-blog-nextjs-markdown",
        destination: "/posts/2020-10-22-nextjs-markdown-blog",
        permanent: true,
      },
      {
        source: "/blog/create-dynamic-sitemap-nextjs",
        destination: "/posts/2020-10-24-dynamic-sitemap",
        permanent: true,
      },
      {
        source: "/blog/top-5-nextjs-10-new-features",
        destination: "/posts/2020-11-02-top-nextjs10-features",
        permanent: true,
      },
      {
        source: "/blog/recommended-management-books",
        destination: "/posts/2021-03-27-management-books",
        permanent: true,
      },
      {
        source: "/blog/how-to-build-bench-power-supply-from-atx-part1",
        destination: "/posts/2021-06-08-power-supply-1",
        permanent: true,
      },

      // Everything else under the old prefix - the 2020 scaffolding slugs, the
      // pt/ and en/ variants, mistyped links - lands on the index rather than a
      // 404. ":slug+" and not ":slug*", which would also match /blog and loop.
      { source: "/blog/:slug+", destination: "/blog", permanent: true },
    ];
  },
};

export default nextConfig;
