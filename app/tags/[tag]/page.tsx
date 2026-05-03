import { getAllPostsMetadataWithSlug } from "lib/helpers";
import { PostMetadataWithSlug } from "lib/types";
import { PostCard } from "app/components/PostCard";

type Props = {
  params: { tag: string };
};

export default async function TagPage({ params }: Props) {
  const awaitedParams = await params;
  const rawTag = awaitedParams?.tag || "";
  const tag = decodeURIComponent(rawTag);

  const posts = await getAllPostsMetadataWithSlug();
  const filtered = posts.filter((p) => p.tags && p.tags.includes(tag));

  return (
    <div className="mx-auto w-2/3 py-8">
      <div className="bg-background text-foreground">
        <h1 className="my-4 text-3xl font-black">Tag: {tag}</h1>
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background text-sm">
            <span className="text-foreground">{tag}</span>
            <span className="text-muted-foreground text-xs bg-muted-foreground/5 px-2 py-0.5 rounded-full">{filtered.length}</span>
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="mb-6 font-normal">No posts found for this tag.</p>
        ) : (
          <div className="space-y-6">
            {filtered.map((post: PostMetadataWithSlug) => (
              <PostCard key={post.slug} {...post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
