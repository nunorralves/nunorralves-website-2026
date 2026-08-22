import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink, Github } from "lucide-react";
import { ProjectMetadataWithSlug, ProjectStatus } from "lib/types";
import { getProjectDetailHref } from "lib/links";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  maintained: "Maintained",
  archived: "Archived",
  "on-hold": "On hold",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#3fb950",
  maintained: "#d29922",
  archived: "var(--color-secondary)",
  "on-hold": "var(--color-secondary)",
};

export function ProjectCard(project: ProjectMetadataWithSlug) {
  const detailHref = getProjectDetailHref(project);
  const detailLabel = project.post ? "Write-up" : "Read more";

  return (
    <article className='projectcard card p-6 flex flex-col sm:flex-row gap-6 items-start hover:shadow-md transition-all'>
      {project.image && (
        <div className='w-full sm:w-[210px] shrink-0'>
          <div className='relative aspect-[16/10] rounded-md overflow-hidden border border-[var(--color-border)]'>
            <Image
              src={project.image}
              alt={`${project.title} preview`}
              fill
              sizes='(max-width: 640px) 100vw, 210px'
              className='object-cover'
            />
          </div>
        </div>
      )}

      <div className='flex-1 min-w-0'>
        <h2 className='text-xl font-bold mb-2 text-[var(--color-foreground)]'>
          {detailHref ? (
            <Link
              href={detailHref}
              className='transition-colors'
            >
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </h2>

        {project.description && (
          <p className='mb-3 text-[var(--color-secondary)]'>
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

          <ProjectStatusBadge status={project.status} date={project.date} />
        </div>
      </div>
    </article>
  );
}

// Status is only rendered when explicitly set - "active" everywhere would be noise
export function ProjectStatusBadge({
  status,
  date,
}: {
  status?: ProjectStatus;
  date: Date;
}) {
  const year = new Date(date).getFullYear();

  return (
    <span className='flex items-center gap-1.5 text-[var(--color-secondary)]'>
      {status && (
        <>
          <span
            aria-hidden='true'
            className='w-2 h-2 rounded-full inline-block'
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          {STATUS_LABELS[status]}
          <span aria-hidden='true'>·</span>
        </>
      )}
      {year}
    </span>
  );
}
