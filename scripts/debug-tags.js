const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(process.cwd(), 'content/posts');

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

const posts = files.map(f => {
  const slug = f.replace(/\.mdx$/, '');
  const full = path.join(POSTS_DIR, f);
  const raw = fs.readFileSync(full, 'utf8');
  const { data } = matter(raw);
  return { slug, data };
});

console.log('Found posts:', posts.length);
posts.forEach(p => {
  console.log(p.slug, '-> tags:', p.data.tags, 'type:', typeof p.data.tags);
});

const testTags = Array.from(new Set(posts.flatMap(p => (Array.isArray(p.data.tags) ? p.data.tags : []))));
console.log('Unique tags:', testTags);

testTags.forEach(tag => {
  const t = String(tag);
  const filtered = posts.filter(p => {
    const tags = p.data.tags;
    if (!tags) return false;
    if (Array.isArray(tags)) return tags.includes(t);
    return String(tags).includes(t);
  });
  console.log(`Tag '${t}' -> ${filtered.length} posts`);
});
