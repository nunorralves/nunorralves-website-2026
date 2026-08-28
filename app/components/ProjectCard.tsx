import Link from "next/link";
import { ArrowRight, ExternalLink, Github } from "lucide-react";
import { ProjectMetadataWithSlug, ProjectStatus } from "lib/types";
import { getProjectDetailHref } from "lib/links";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  maintained: "Maintained",
  archived: "Archived",
  "on-hold": "On hold",
};

// Typographic row, matching the home page's Selected work treatment - no
// cover image, no card shadow. Status is a fact about the project, not a
// warning, so it renders the same way for an active project as for an
// archived one rather than only surfacing when something is off.
export function ProjectCard(project: ProjectMetadataWithSlug) {
  const detailHref = getProjectDetailHref(project);
  const detailLabel = project.post ? "Write-up" : "Read more";
  const status = project.status ?? "active";
  const year = new Date(project.date).getFullYear();

  return (
    <article className='projectcard border-t border-[var(--color-border)] first:border-t-0 py-6'>
      <div className='flex items-baseline gap-3 flex-wrap mb-2'>
        <h2 className='font-serif text-xl font-semibold text-[var(--color-foreground)]'>
          {detailHref ? (
            <Link href={detailHref} className='transition-colors'>
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </h2>
        <span className='font-mono text-[0.65rem] uppercase tracking-wide px-1.5 py-0.5 border border-[var(--color-border)] rounded text-muted-foreground whitespace-nowrap'>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {project.description && (
        <p className='font-serif text-[0.99rem] leading-relaxed text-[var(--color-secondary)] mb-3'>
          {project.description}
        </p>
      )}

      {project.tags.length > 0 && (
        <div className='flex flex-wrap gap-2 mb-3'>
          {project.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className='tag px-2 py-0.5 rounded-md text-xs hover:opacity-80 transition-opacity'
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      <div className='flex flex-wrap items-center gap-4 text-sm'>
        {project.repo && (
          <a
            href={project.repo}
            target='_blank'
            rel='noopener noreferrer'
            className='plink flex items-center gap-1.5 transition-colors'
          >
            <Github className='w-4 h-4' />
            Source
          </a>
        )}

        {project.demo && (
          <a
            href={project.demo}
            target='_blank'
            rel='noopener noreferrer'
            className='plink flex items-center gap-1.5 transition-colors'
          >
            <ExternalLink className='w-4 h-4' />
            Live
          </a>
        )}

        {detailHref && (
          <Link
            href={detailHref}
            className='plink flex items-center gap-1.5 transition-colors'
          >
            {detailLabel}
            <ArrowRight className='w-4 h-4' />
          </Link>
        )}

        <span className='font-mono text-muted-foreground'>{year}</span>
      </div>
    </article>
  );
}
