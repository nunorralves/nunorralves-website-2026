import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
// import rehypeMermaid from "rehype-mermaid";
import { getAllPosts, getPostBySlug } from "lib/helpers";
import { Calendar, Tag } from "lucide-react";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: any }) {
  let slug: string | undefined;

  if (params && typeof (params as Promise<any>)?.then === "function") {
    const awaited = await params;
    slug = awaited?.slug;
  } else if (params && typeof params === "object") {
    slug = params.slug;
  }

  if (!slug || typeof slug !== "string") {
    return {
      title: "Post",
      description: "Post details",
    } as any;
  }

  const post = await getPostBySlug(slug);
  const title = post.metadata.title;
  const description = post.metadata.description || title;
  const date = new Date(post.metadata.date).toISOString();
  const canonicalUrl = `https://nunorralves.pt/posts/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
      title,
      description,
      type: "article",
      publishedTime: date,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  } as any;
}

export default async function PostLayout({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ← Await here
  const post = await getPostBySlug(slug);
  const canonicalUrl = `https://nunorralves.pt/posts/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    headline: post.metadata.title,
    description: post.metadata.description || post.metadata.title,
    datePublished: new Date(post.metadata.date).toISOString(),
    author: {
      "@type": "Person",
      name: "Nuno R. Alves",
    },
    url: canonicalUrl,
  };

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
      <script
        type='application/ld+json'
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
