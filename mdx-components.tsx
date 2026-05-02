// // mdx-components.tsx (at root of project)

import type { MDXComponents } from 'mdx/types'
import Image from 'next/image'
import Link from 'next/link'

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-semibold mt-8 mb-4">{children}</h2>
  ),
  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  a: ({ href, children }) => (
    <Link href={href || '#'} className="text-blue-600 hover:underline">
      {children}
    </Link>
  ),
  img: (props: any) => (
    <Image
      {...props}
      alt={props.alt || ''}
      width={800}
      height={600}
      className="rounded-lg my-8"
    />
  ),
  Callout: ({ children, type = 'info' }: any) => (
    <div className={`callout callout-${type} p-4 my-4 rounded`}>{children}</div>
  ),
}

export function useMDXComponents(): MDXComponents {
  return components
}
