import Fuse from "fuse.js";
import type { SearchableItem } from "./types";

export interface SearchResult {
  item: SearchableItem;
  score: number;
}

// Fuzzy matching only covers the short frontmatter fields. Running it over the
// body as well made every short query match nearly everything: bitap allows one
// edit per ~4 characters, so across tens of thousands of characters "books"
// finds "hooks"/"block"/"boots" in almost any post, and the field-length norm
// then squashed those hits to ~0.99 - indistinguishable from each other, but
// still returned. The body is matched literally instead (see below).
const metadataOptions = {
  //Whether the score should be included in the result set.
  // A score of 0 indicates a perfect match, while a score of 1 indicates a complete mismatch
  includeScore: true,
  // Whether to sort the result list, by score.
  shouldSort: true,
  // At what point does the match algorithm give up.
  // A threshold of 0.0 requires a perfect match (of both letters and location), a threshold of 1.0 would match anything.
  threshold: 0.3,
  // Determines approximately where in the text is the pattern expected to be found.
  location: 0,
  ignoreLocation: true,
  // Without this a match in the (longer) description scores far worse than the
  // same match in the title, which compresses every score up against 1.
  ignoreFieldNorm: true,
  // Only the matches whose length exceeds this value will be returned.
  // (For instance, if you want to ignore single character matches in the result, set it to 2).
  minMatchCharLength: 2,
  // List of keys that will be searched.
  // This supports nested paths, weighted search, searching in arrays of strings and objects.
  keys: [
    { name: "metadata.title", weight: 0.8 },
    { name: "metadata.description", weight: 0.5 },
    { name: "metadata.tags", weight: 0.3 },
  ],
};

// Single characters match too much body text to be worth searching for.
const MIN_CONTENT_TOKEN_LENGTH = 2;

// Body-only hits rank below every frontmatter hit. `metadataOptions.threshold`
// keeps those strictly under 1, so this sorts last without a separate tier.
const CONTENT_ONLY_SCORE = 1;

function keyOf(item: SearchableItem): string {
  return `${item.kind}:${item.slug}`;
}

// Searches posts and projects from the same index - each result carries the
// `kind` discriminator so the UI can render the right card.
export function searchItems(
  items: SearchableItem[],
  query: string,
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed === "") return [];

  const results = new Map<string, SearchResult>();

  // Frontmatter: fuzzy, so a typo in a title or tag still finds the post.
  const fuse = new Fuse(items, metadataOptions);
  for (const { item, score } of fuse.search(trimmed)) {
    results.set(keyOf(item), { item, score: score ?? 0 });
  }

  // Body: literal, and every term has to be present. Fuzziness here only ever
  // produced false positives, and a body search is a "does this post talk
  // about X" question, which substring matching answers exactly.
  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= MIN_CONTENT_TOKEN_LENGTH);

  if (tokens.length > 0) {
    for (const item of items) {
      const key = keyOf(item);
      if (results.has(key)) continue;

      const content = item.content.toLowerCase();
      if (tokens.every((token) => content.includes(token))) {
        results.set(key, { item, score: CONTENT_ONLY_SCORE });
      }
    }
  }

  // Insertion order is already fuse-ranked then date-ordered, and sort is
  // stable, so equal scores keep that ordering.
  return [...results.values()].sort((a, b) => a.score - b.score);
}
