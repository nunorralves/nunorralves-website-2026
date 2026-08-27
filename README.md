# Nuno Alves Website @ 2026

[![E2E Tests](https://github.com/nunorralves/nunorralves-website-2026/actions/workflows/e2e.yml/badge.svg)](https://github.com/nunorralves/nunorralves-website-2026/actions/workflows/e2e.yml)
![GitHub repo size](https://img.shields.io/github/repo-size/nunorralves/nunorralves-website-2026)
![GitHub contributors](https://img.shields.io/github/contributors/nunorralves/nunorralves-website-2026)
![GitHub stars](https://img.shields.io/github/stars/nunorralves/nunorralves-website-2026)
![GitHub downloads](https://img.shields.io/github/downloads/nunorralves/nunorralves-website-2026/total)
![GitHub forks](https://img.shields.io/github/forks/nunorralves/nunorralves-website-2026)
![GitHub License](https://img.shields.io/github/license/nunorralves/nunorralves-website-2026)

My personal site and blog: writing on AI coding agents, platform engineering,
engineering leadership, and the occasional electronics project, plus the side
projects and experiments behind them.

Live at [nunorralves.pt](https://nunorralves.pt).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) with React 19 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4, with CSS custom properties for theming |
| Content | MDX files on disk, rendered by `next-mdx-remote/rsc` |
| Frontmatter | `gray-matter` |
| Code blocks | `rehype-pretty-code` (Shiki), plus `remark-gfm` for tables |
| Search | `fuse.js`, client side over a prebuilt index |
| Tests | Playwright end to end |
| Analytics | Vercel Analytics |

## Content model

All content lives in `content/` as `.mdx`. There is no CMS and no database.
Adding a file and pushing it is the whole publishing workflow.

```
content/
  posts/     YYYY-MM-DD-<slug>.mdx
  projects/  <slug>.mdx
```

**The filename is the slug.** `lib/helpers.ts` strips the `.mdx` extension and
uses what is left as the URL segment. Nothing derives the slug from
frontmatter, so renaming a file changes its public URL.

Post filenames must start with a `YYYY-MM-DD` prefix, and that prefix has to
match the frontmatter `date`. Those two drifted apart once, which put a post
under the wrong month in the archive while its URL said otherwise, so
`tests/e2e/content-dates.spec.ts` now fails the suite if they disagree.

### Post frontmatter

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | |
| `date` | yes | Must match the filename prefix. Drives display, ordering, archive grouping and JSON-LD |
| `tags` | yes | Normalized to lowercase with spaces as hyphens, so `Typescript` and `typescript` share one tag page |
| `published` | yes | `false` hides the post everywhere, including the sitemap |
| `description` | no | Used for the meta description, cards and Open Graph |
| `featured` | no | Opts the post into the "Selected work" strip on the home page |
| `outdated` | no | `false` suppresses the age notice, `true` forces it on. Omitted lets the date decide |
| `outdatedNote` | no | Custom notice text replacing the generic age wording. Inline markdown, links included |

### The age notice

Posts older than a threshold get a quiet aside above the body saying so. All of
it lives in `lib/outdated.ts`: the threshold (`OUTDATED_AFTER_YEARS`, 3), the
generic wording, and the precedence between the two frontmatter fields. Changing
any of it is a one file edit.

`outdated: false` wins over everything, including a note left behind. Otherwise
an `outdatedNote` replaces the generic wording, `outdated: true` forces the
generic wording on regardless of age, and failing all three the date decides.

The threshold is evaluated at build time, so a post crosses it on the next
deploy rather than on its anniversary. Nothing about the notice reaches the
meta description, the JSON-LD or `robots` - these posts still get traffic and
the notice is for the humans who land on them.

The full notice renders on `/posts/[slug]` only. Listings get a muted marker
next to the date instead, reading "may be out of date": a date says when a
post was written, which is a fact the reader already has, while the marker
says whether it still holds, which is the judgment the frontmatter encodes.
Without it the two old posts that are still fine and the three that are
superseded look identical in every listing.

Both read the same `getOutdatedNotice`, so a post cannot be marked in a
listing and bare on its own page. `lib/outdated.ts` therefore has no `fs`
import and only a type import from `lib/types`: `PostCard` renders inside the
client-side `SearchBar`, so anything it reaches ships to the browser. Same
constraint as `lib/links.ts`.

### Project frontmatter

Projects take everything above, minus the date prefix rule, plus:

| Field | Notes |
| --- | --- |
| `image` | Cover image relative to `/public` |
| `repo` | Source repository URL |
| `demo` | Live site or app URL |
| `status` | One of `active`, `maintained`, `archived`, `on-hold`. Omitted means active |
| `post` | Slug of a blog post that serves as this project's write-up |

A project only gets its own `/projects/[slug]` page if its `.mdx` has a body.
Without one, the card on `/projects` is the whole thing, and `post` can point
it at a blog post instead. See `getProjectDetailHref` in `lib/links.ts`.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing page: short intro, "Selected work", recent posts |
| `/about` | The longer background, and what this site is for |
| `/blog` | All writing, paginated, plus a tag cloud and a full index by date |
| `/posts/[slug]` | A post |
| `/projects` | Project cards |
| `/projects/[slug]` | A project, for those with a body |
| `/tags/[tag]` | Everything carrying one tag, posts and projects alike |
| `/search` | Client side search across both |
| `/sitemap.xml` | Generated from the filesystem by `app/sitemap.ts` |

`/archive` and `/tags` were folded into `/blog` and survive only as redirects.

## Redirects

**Do not delete the `redirects()` block in `next.config.ts`.** The previous
version of this site was a Next.js pages router app that served posts at
`/blog/<slug>`, with different slugs from the ones used today. Those URLs are
indexed and still get traffic, and every one of them 404'd until the redirects
were added. The rules are order sensitive: the `/blog/:slug+` catch-all has to
stay last, and it has to be `:slug+` rather than `:slug*`, which would also
match `/blog` itself and redirect it to itself forever.

`tests/e2e/redirects.spec.ts` covers all of it, including that loop.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Node.JS
- You have installed npm or yarn
- You have a Linux / Mac / Windows. Any OS is supported

## Running Locally

```bash
git clone https://github.com/nunorralves/nunorralves-website-2026.git
cd nunorralves-website-2026
npm install --legacy-peer-deps
npm run dev
```

The site comes up on [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright suite, starting the dev server if one is not already up |
| `npm run test:e2e:headed` | The same, in a visible browser |

## Tests

`tests/e2e/` holds the Playwright suite, which runs in CI on every push.
`npm run test:e2e` is enough: the config builds the site and serves it with
`next start` on its own.

**The suite runs against a production build, not `next dev`.** Under the dev
server every route compiles on first request, and with the suite fully
parallel the first worker to reach a cold page waits on Turbopack while the
others queue behind it. That blew the 30s test timeout often enough that two
consecutive runs failed four and then five different specs, always an `h1`
that never appeared, and never the same set twice. Nothing was wrong with the
pages. Serving a build removes on-demand compilation, and means the suite
exercises what actually ships.

If a dev server is already running on port 3000 it is reused instead, which
keeps the fast edit-and-rerun loop available at the cost of those same compile
races. `retries` is 1 locally and 2 in CI to absorb them. CI always builds.

Three of the specs exist to stop regressions that already happened once:

- `redirects.spec.ts` checks every legacy `/blog/<slug>` URL still lands on its
  post, and that `/blog` does not redirect to itself
- `links.spec.ts` crawls every page in the sitemap and fails on a dead internal
  link, or on any link back to the retired `/blog/<slug>` scheme
- `content-dates.spec.ts` checks each post's filename prefix against its
  frontmatter `date`

## License

This project uses the following license: [GNU GPLv3](https://github.com/nunorralves/nunorralves-website-2026/blob/main/LICENSE.md).
