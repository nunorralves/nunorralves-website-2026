import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /blog absorbed both of these. /tags/[tag] is untouched - it is linked from
  // every post card, project card and project detail page.
  async redirects() {
    return [
      { source: "/archive", destination: "/blog", permanent: true },
      { source: "/tags", destination: "/blog", permanent: true },
    ];
  },
};

export default nextConfig;
