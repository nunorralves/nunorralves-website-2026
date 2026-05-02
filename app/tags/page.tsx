import Link from "next/link";
import { getAllPostsMetadataWithSlug } from "lib/helpers";

export default async function TagsPage() {
  const posts = await getAllPostsMetadataWithSlug();

  const tagCounts = posts.reduce<Record<string, number>>((acc, post) => {
    if (!post.tags) return acc;
    post.tags.forEach((t) => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {});

  const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

  return (
    <div className="mx-auto w-2/3 py-8">
      <div className="bg-background text-foreground">
        <h1 className="my-4 text-3xl font-black">Tags</h1>
        {tags.length === 0 ? (
          <p className="mb-6 font-normal">No tags found.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-border bg-background hover:shadow-sm transition-colors"
              >
                <span className="text-foreground text-sm">{tag}</span>
                <span className="text-muted-foreground text-xs bg-muted-foreground/5 px-2 py-0.5 rounded-full">{tagCounts[tag]}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
