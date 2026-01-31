import { format, parseISO } from "date-fns";
import { allPosts } from "contentlayer/generated";

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

  return (
    <article className='mx-auto max-w-xl py-8'>
      <div className='mb-8 text-center'>
        <time dateTime={post.date} className='mb-1 text-xs text-gray-600'>
          {format(parseISO(post.date), "LLLL d, yyyy")}
        </time>
        <h1 className='text-3xl font-bold'>{post.title}</h1>
      </div>
      <div
        className='[&>*]:mb-3 [&>*:last-child]:mb-0'
        dangerouslySetInnerHTML={{ __html: post.body.html }}
      />
    </article>
  );
};

export default PostLayout;
