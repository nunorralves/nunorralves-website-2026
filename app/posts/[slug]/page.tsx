import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
// import rehypeMermaid from "rehype-mermaid";
import { getAllPosts, getPostBySlug } from "lib/helpers";
import { Calendar, Tag } from "lucide-react";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostLayout({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ← Await here
  const post = await getPostBySlug(slug);

  return (
    <article className='mx-auto w-2/3 py-8'>
      <header className='mb-12'>
        <h1 className='text-3xl font-bold mb-4'>{post.metadata.title}</h1>

        <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
          <time className='flex items-center gap-1'>
            <Calendar className='w-4 h-4' />
            {new Date(post.metadata.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {post.metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className='flex items-center gap-1 tag px-2 py-0.5 rounded-md'
                >
                  <Tag className='w-3 h-3' />
                  <span className='text-xs'>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className='[&>*]:mb-3 [&>*:last-child]:mb-0'>
        <MDXRemote
          source={post.content}
          options={{
            mdxOptions: {
              rehypePlugins: [
                [
                  rehypePrettyCode,
                  {
                    // theme: "github-dark",
                    theme: "one-dark-pro",
                    keepBackground: false,
                  },
                ],
                // rehypeMermaid,
              ],
            },
          }}
        />
      </div>
    </article>
  );
}
