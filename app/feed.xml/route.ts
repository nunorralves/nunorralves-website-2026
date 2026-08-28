import {
  getAllPostsMetadataWithSlug,
  getAllProjectsMetadataWithSlug,
} from "lib/helpers";
import { SITE_URL } from "lib/person";

// Static, like sitemap.ts: read from the filesystem at build time rather
// than on every request.
export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface FeedItem {
  title: string;
  href: string;
  date: Date;
  description?: string;
}

export async function GET() {
  const [posts, projects] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getAllProjectsMetadataWithSlug(),
  ]);

  // Only projects with their own generated page get an entry - a project
  // whose write-up is a post is already covered by that post, and one with
  // neither has nowhere for the feed to send a reader.
  const items: FeedItem[] = [
    ...posts.map((post) => ({
      title: post.title,
      href: `${SITE_URL}/posts/${post.slug}`,
      date: post.date,
      description: post.description,
    })),
    ...projects
      .filter((project) => project.hasBody)
      .map((project) => ({
        title: project.title,
        href: `${SITE_URL}/projects/${project.slug}`,
        date: project.date,
        description: project.description,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.href}</link>
      <guid isPermaLink="true">${item.href}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>${
        item.description
          ? `\n      <description><![CDATA[${item.description}]]></description>`
          : ""
      }
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>nunorralves.pt</title>
    <link>${SITE_URL}</link>
    <description>Posts and projects from Nuno Alves - agent systems, platform engineering, and the occasional piece of hardware.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
