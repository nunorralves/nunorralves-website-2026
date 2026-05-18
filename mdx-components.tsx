// mdx-components.tsx (at root of project) - used by next-mdx-remote

import type { MDXComponents } from 'mdx/types'
import Image from 'next/image'
import Link from 'next/link'

const components: MDXComponents = {
  // ===== HEADINGS =====
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mt-10 mb-6">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-semibold mt-10 mb-4">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-2xl font-semibold mt-8 mb-3">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xl font-semibold mt-6 mb-2">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-lg font-medium mt-4 mb-2">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-base font-medium mt-4 mb-2">{children}</h6>
  ),

  // ===== PARAGRAPHS & TEXT =====
  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,

  // ===== LINKS =====
  a: ({ href, children }) => (
    <Link
      href={href || '#'}
      className="text-[var(--color-link)] hover:text-[var(--color-link-hover)] underline underline-offset-2"
    >
      {children}
    </Link>
  ),

  // ===== IMAGES =====
  img: (props: any) => (
    <Image
      {...props}
      alt={props.alt || ''}
      width={800}
      height={600}
      className="rounded-lg my-8"
    />
  ),

  // NOTE: pre/code are NOT overridden here - rehype-pretty-code handles
  // code block syntax highlighting directly on those elements.
  // Styling is done via CSS in globals.css.

  // ===== LISTS =====
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-4 space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-4 space-y-2">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // ===== TABLES =====
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table
        className="min-w-full border-collapse border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ backgroundColor: 'var(--color-card)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      className="px-4 py-3 text-left font-semibold border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-4 py-3 border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {children}
    </td>
  ),

  // ===== BLOCKQUOTES =====
  blockquote: ({ children }) => (
    <blockquote
      className="border-l-4 pl-4 my-6 italic"
      style={{
        borderColor: 'var(--color-link)',
        color: 'var(--color-secondary)',
      }}
    >
      {children}
    </blockquote>
  ),

  // ===== HORIZONTAL RULE =====
  hr: () => (
    <hr
      className="my-10 border-t"
      style={{ borderColor: 'var(--color-border)' }}
    />
  ),

  // ===== STRONG / EMPHASIS =====
  strong: ({ children }) => (
    <strong className="font-bold text-[var(--color-foreground)]">
      {children}
    </strong>
  ),

  // ===== CUSTOM: CALLOUT =====
  Callout: ({ children, type = 'info' }: any) => (
    <div
      className={`callout callout-${type} p-4 my-4 rounded`}
      style={{
        backgroundColor: 'var(--color-card)',
        borderLeft: '4px solid var(--color-link)',
      }}
    >
      {children}
    </div>
  ),
}

export function useMDXComponents(): MDXComponents {
  return components
}

export default components