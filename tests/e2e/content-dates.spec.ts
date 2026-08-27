import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// The slug is the filename and the displayed date is frontmatter `date`, so
// nothing forces them to agree. 2026-06-03-pi-skills-part-2 shipped reading
// "2026-05-29", which put it under May in the archive with a June URL.
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

const filenames = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

test('content dates: at least one post is present to check', () => {
  expect(filenames.length).toBeGreaterThan(0);
});

for (const filename of filenames) {
  test(`content dates: ${filename} frontmatter matches its slug`, () => {
    const slug = filename.replace(/\.mdx$/, '');
    const prefix = slug.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
    expect(prefix, `${filename} should start with a YYYY-MM-DD prefix`).toBeTruthy();

    const { data } = matter(fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8'));

    // Frontmatter carries a mix of quoted strings and bare YAML dates, so
    // normalize through Date rather than comparing the raw value.
    const frontmatterDate = new Date(data.date).toISOString().slice(0, 10);
    expect(frontmatterDate, `${filename} date should match its slug prefix`).toBe(prefix);
  });
}
