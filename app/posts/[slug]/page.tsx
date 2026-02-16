import Image from "app/components/Image";
import { allPosts } from "contentlayer/generated";
import { Calendar, Tag } from "lucide-react";
import { getMDXComponent } from "next-contentlayer/hooks";
import { MDXComponents } from "mdx/types";
import Link from "next/link";

// Explicitly type the return type for clarity
export const generateStaticParams = async (): Promise<{ slug: string }[]> => {
  const slugs = allPosts.map((post) => ({
    slug: post._raw.flattenedPath,
  }));
  return slugs;
};

export const generateMetadata = async ({
  params,
}: {
  params: { slug: string };
}) => {
  // Resolve params if it's a promise
  const resolvedParams = await Promise.resolve(params);

  if (!resolvedParams || !resolvedParams.slug) {
    return { title: "Post Not Found" };
  }

  const post = allPosts.find(
    (post) => post._raw.flattenedPath === resolvedParams.slug,
  );
  if (!post) {
    return { title: "Post Not Found" };
  }

  return { title: post.title };
};

const PostLayout = async ({ params }: { params: { slug: string } }) => {
  // Resolve params if it's a promise
  const resolvedParams = await Promise.resolve(params);

  if (!resolvedParams || !resolvedParams.slug) {
    return <div>Invalid post slug</div>;
  }

  const post = allPosts.find(
    (post) => post._raw.flattenedPath === resolvedParams.slug,
  );

  if (!post) {
    return <div>Post not found: {resolvedParams.slug}</div>;
  }

  // Define your custom MDX components.
  const mdxComponents: MDXComponents = {
    // Override the default <a> element to use the next/link component.
    a: ({ href, children }) => <Link href={href as string}>{children}</Link>,
    // Add a custom component.
    Image,
  };

  // Render MDX content
  const MDXContent = getMDXComponent(post.body.code);

  return (
    <article className='mx-auto w-2/3 py-8'>
      <header className='mb-12'>
        <h1 className='text-3xl font-bold mb-4'>{post.title}</h1>

        <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
          <time className='flex items-center gap-1'>
            <Calendar className='w-4 h-4' />
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          {post.tags && post.tags.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {post.tags.map((tag) => (
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
        <MDXContent components={mdxComponents} />
      </div>
    </article>
  );
};

export default PostLayout;
