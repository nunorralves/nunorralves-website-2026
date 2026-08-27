import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProjectBySlug, getProjectsWithBody } from "lib/helpers";
import { Project, ProjectStatus } from "lib/types";
import { authorRef } from "lib/person";
import mdxComponents from "mdx-components";

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

// Only projects whose .mdx has a body get a page - the rest live entirely on the card
export async function generateStaticParams() {
  const projects = await getProjectsWithBody();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let project: Project;
  try {
    project = await getProjectBySlug(slug);
  } catch {
    return { title: "Project", description: "Project details" };
  }

  const title = project.metadata.title;
  const description = project.metadata.description || title;
  const canonicalUrl = `https://nunorralves.pt/projects/${slug}`;

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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectLayout({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let project: Project;
  try {
    project = await getProjectBySlug(slug);
  } catch {
    notFound();
  }

  // A project with no body has no page - its card on /projects is the whole thing
  if (!project.content.trim()) {
    notFound();
  }

  const { metadata } = project;
  const canonicalUrl = `https://nunorralves.pt/projects/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": metadata.repo ? "SoftwareSourceCode" : "CreativeWork",
    name: metadata.title,
    description: metadata.description || metadata.title,
    dateCreated: new Date(metadata.date).toISOString(),
    ...(metadata.repo ? { codeRepository: metadata.repo } : {}),
    author: authorRef,
    url: canonicalUrl,
  };

  return (
    <article className='mx-auto w-2/3 py-8'>
      <Link
        href='/projects'
        className='project-back inline-flex items-center gap-1.5 mb-6 text-sm transition-colors'
      >
        <ArrowLeft className='w-4 h-4' />
        Projects
      </Link>

      <header className='mb-8'>
        <h1 className='text-3xl font-bold mb-4'>{metadata.title}</h1>
        {metadata.description && (
          <p className='text-[var(--color-secondary)]'>
            {metadata.description}
          </p>
        )}
      </header>

      {metadata.image && (
        <div className='relative aspect-[16/10] rounded-lg overflow-hidden border border-[var(--color-border)] mb-8'>
          <Image
            src={metadata.image}
            alt={`${metadata.title} preview`}
            fill
            sizes='(max-width: 768px) 100vw, 66vw'
            className='object-cover'
            priority
          />
        </div>
      )}

      <div className='project-meta card p-6 mb-10'>
        <dl className='grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm items-baseline'>
          {metadata.repo && (
            <>
              <dt className='text-xs uppercase tracking-wider text-[var(--color-secondary)]'>
                Repository
              </dt>
              <dd>
                <a
                  href={metadata.repo}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='plink break-all'
                >
                  {metadata.repo.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </>
          )}

          {metadata.demo && (
            <>
              <dt className='text-xs uppercase tracking-wider text-[var(--color-secondary)]'>
                Live
              </dt>
              <dd>
                <a
                  href={metadata.demo}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='plink break-all'
                >
                  {metadata.demo.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </>
          )}

          {metadata.tags.length > 0 && (
            <>
              <dt className='text-xs uppercase tracking-wider text-[var(--color-secondary)]'>
                Stack
              </dt>
              <dd className='flex flex-wrap gap-2'>
                {metadata.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className='tag px-2 py-0.5 rounded-md text-xs hover:opacity-80 transition-opacity'
                  >
                    {tag}
                  </Link>
                ))}
              </dd>
            </>
          )}

          {metadata.status && (
            <>
              <dt className='text-xs uppercase tracking-wider text-[var(--color-secondary)]'>
                Status
              </dt>
              <dd className='flex items-center gap-2'>
                <span
                  aria-hidden='true'
                  className='w-2 h-2 rounded-full inline-block'
                  style={{ backgroundColor: STATUS_COLORS[metadata.status] }}
                />
                {STATUS_LABELS[metadata.status]}
              </dd>
            </>
          )}

          <dt className='text-xs uppercase tracking-wider text-[var(--color-secondary)]'>
            Started
          </dt>
          <dd>
            {new Date(metadata.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </dd>
        </dl>
      </div>

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className='prose max-w-none'>
        <MDXRemote
          source={project.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                [
                  rehypePrettyCode,
                  {
                    theme: "one-dark-pro",
                    keepBackground: false,
                  },
                ],
              ],
            },
          }}
        />
      </div>
    </article>
  );
}
