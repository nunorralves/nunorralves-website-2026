import {
  getAllPostsMetadataWithSlug,
  getAllProjectsMetadataWithSlug,
  normalizeTag,
} from "lib/helpers";
import { PostListItem, ProjectMetadataWithSlug } from "lib/types";
import { PostRow } from "app/components/PostRow";
import { ProjectCard } from "app/components/ProjectCard";

type Props = {
  params: { tag: string };
};

export default async function TagPage({ params }: Props) {
  const awaitedParams = await params;
  const rawTag = awaitedParams?.tag || "";
  // Normalize the incoming param too, so older mixed-case URLs still resolve
  const tag = normalizeTag(decodeURIComponent(rawTag));

  const [allPosts, allProjects] = await Promise.all([
    getAllPostsMetadataWithSlug(),
    getAllProjectsMetadataWithSlug(),
  ]);

  const posts = allPosts.filter((p) => p.tags && p.tags.includes(tag));
  const projects = allProjects.filter((p) => p.tags && p.tags.includes(tag));
  const total = posts.length + projects.length;

  return (
    <div className='container-page py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Tag: {tag}</h1>
        <div className='mb-4'>
          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background text-sm'>
            <span className='text-foreground'>{tag}</span>
            <span className='text-muted-foreground text-xs bg-muted-foreground/5 px-2 py-0.5 rounded-full'>
              {total}
            </span>
          </span>
        </div>

        {total === 0 ? (
          <p className='mb-6 font-normal'>No posts or projects found for this tag.</p>
        ) : (
          <div className='space-y-10'>
            {projects.length > 0 && (
              <section>
                <h2 className='text-lg font-semibold mb-4'>
                  Projects ({projects.length})
                </h2>
                <div className='space-y-6'>
                  {projects.map((project: ProjectMetadataWithSlug) => (
                    <ProjectCard key={project.slug} {...project} />
                  ))}
                </div>
              </section>
            )}

            {posts.length > 0 && (
              <section>
                {projects.length > 0 && (
                  <h2 className='text-lg font-semibold mb-4'>
                    Posts ({posts.length})
                  </h2>
                )}
                <div>
                  {posts.map((post: PostListItem) => (
                    <PostRow key={post.slug} {...post} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
