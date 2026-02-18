import { getPostsGroupedByMonth } from "lib/helpers";
import { PostMetadataWithSlug } from "lib/types";
import Link from "next/link";

export default async function archive() {
  const postsByMonth: Map<
    string,
    Map<string, PostMetadataWithSlug[]>
  > = await getPostsGroupedByMonth();

  return (
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Archive</h1>

        {postsByMonth.size > 0 ? (
          <div className='space-y-8'>
            {[...postsByMonth.entries()].map(([year, months]) => (
              <div key={year} className='space-y-4'>
                <h2 className='text-xl font-semibold'>{year}</h2>

                {[...months.entries()].map(([month, posts]) => (
                  <div key={month} className='pl-4 border-l border-border'>
                    <h3 className='text-lg font-medium text-muted-foreground mb-2'>
                      {month} ({posts.length})
                    </h3>

                    <ul className='space-y-2'>
                      {posts.map((post) => (
                        <li key={post.title}>
                          <Link
                            href={`/posts/${post.slug}`}
                            className='text-foreground hover:text-primary transition-colors'
                          >
                            {post.title}
                          </Link>
                          <span className='text-sm text-muted-foreground ml-2'>
                            (
                            {new Date(post.date).toLocaleDateString("en-US", {
                              day: "numeric",
                            })}
                            )
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-12 text-muted-foreground'>
            <p className='text-lg'>No posts found in archive.</p>
            <p className='text-sm'>
              Start writing your first post in content/posts directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
