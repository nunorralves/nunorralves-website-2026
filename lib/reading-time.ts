// No `fs` import and no frontmatter field: this takes a post body directly,
// so the estimate is computed from whatever the content actually is at build
// time and can never drift the way a hand-typed number would.

// Average adult silent-reading speed. Not tuned to this author's prose - a
// "true" figure would need eye-tracking data neither of us has.
const WORDS_PER_MINUTE = 200;

// Strips the markup a reader does not read at prose speed: fenced and inline
// code, images, and raw HTML/MDX tags, and unwraps links to their text. A
// post heavy on code fences should not be rated as though someone reads the
// code at the same pace as the paragraphs around it.
function stripNonProse(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ");
}

// Minutes to read a post body, rounded up so "1 min read" never means the 20
// seconds it took to read a title and a code snippet.
export function getReadingTimeMinutes(
  content: string,
  wordsPerMinute: number = WORDS_PER_MINUTE,
): number {
  const words = stripNonProse(content)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return Math.max(1, Math.ceil(words.length / wordsPerMinute));
}
