import { test, expect, type APIRequestContext } from '@playwright/test';

// Crawls every page in the sitemap and checks the internal links it renders.
// The dynamic-sitemap post shipped with a /blog/create-simple-blog-nextjs-markdown
// link in its body that 404'd for years; nothing in the build noticed.

const ASSET = /\.(png|jpe?g|gif|svg|ico|webmanifest|xml|txt|css|js|json)$/i;

// href -> the sitemap pages that link to it, so a failure names the file to fix
type LinkMap = Map<string, Set<string>>;

function internalHrefs(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"#]*)"/g)]
    .map((m) => m[1])
    .filter((href) => !href.startsWith('//') && !href.startsWith('/_next'))
    .filter((href) => !ASSET.test(href.split('?')[0]));
}

async function crawl(request: APIRequestContext): Promise<LinkMap> {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(0);

  const links: LinkMap = new Map();
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const page = await request.get(path);
    expect(page.status(), `${path} is in the sitemap but does not return 200`).toBe(200);
    for (const href of internalHrefs(await page.text())) {
      if (!links.has(href)) links.set(href, new Set());
      links.get(href)!.add(path);
    }
  }
  return links;
}

test.describe('links', () => {
  let links: LinkMap;

  // One crawl for both checks. Against the dev server each page compiles on
  // demand, so doing this per-test pushes well past the default timeout.
  test.beforeAll(async ({ request }) => {
    test.setTimeout(180_000);
    links = await crawl(request);
    expect(links.size).toBeGreaterThan(0);
  });

  test('no internal link on any indexed page is dead', async ({ request }) => {
    test.setTimeout(120_000);

    const dead: string[] = [];
    for (const [href, from] of links) {
      // maxRedirects: 0 so a redirect is not mistaken for a healthy link
      const res = await request.get(href, { maxRedirects: 0 });
      if (res.status() >= 400) {
        dead.push(`${href} -> ${res.status()} (linked from ${[...from].join(', ')})`);
      }
    }

    expect(dead, `dead internal links:\n${dead.join('\n')}`).toEqual([]);
  });

  // The /blog/:slug+ catch-all sends anything unmatched to the index, so a
  // stale in-content link no longer 404s - it quietly drops the reader on a
  // listing instead. That is worse to debug, so fail on the old scheme directly.
  test('no page links to the retired /blog/<slug> scheme', async () => {
    const legacy = [...links.entries()]
      .filter(([href]) => /^\/blog\/.+/.test(href))
      .map(([href, from]) => `${href} (linked from ${[...from].join(', ')})`);

    expect(legacy, `legacy /blog/ links:\n${legacy.join('\n')}`).toEqual([]);
  });
});
