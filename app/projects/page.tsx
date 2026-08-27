import type { Metadata } from "next";
import { ProjectCard } from "app/components/ProjectCard";
import { getAllProjectsMetadataWithSlug } from "lib/helpers";
import { ProjectMetadataWithSlug } from "lib/types";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Things Nuno Alves builds outside of work. Agent systems, small tools, and the occasional piece of hardware. Most of them are open source.",
  alternates: {
    canonical: "https://nunorralves.pt/projects",
  },
};

export default async function ProjectsPage() {
  const projects: ProjectMetadataWithSlug[] =
    await getAllProjectsMetadataWithSlug();

  return (
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Projects</h1>
        <p className='mb-6 font-normal'>
          Things I build outside of work - side projects, experiments, and the
          occasional piece of hardware. Most of them are open source.
        </p>

        {projects.length > 0 ? (
          <div className='space-y-6'>
            {projects.map((project) => (
              <ProjectCard key={project.slug} {...project} />
            ))}
          </div>
        ) : (
          <div className='text-center py-12 text-muted-foreground'>
            <p className='text-lg'>No projects found.</p>
            <p className='text-sm'>
              Add your first project in the content/projects directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
