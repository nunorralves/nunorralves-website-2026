import Fuse from "fuse.js";
import type { SearchableItem } from "./types";

export interface SearchResult {
  item: SearchableItem;
  score: number;
}

const fuseOptions = {
  //Whether the score should be included in the result set.
  // A score of 0 indicates a perfect match, while a score of 1 indicates a complete mismatch
  includeScore: true,
  // Whether the matches should be included in the result set.
  // When true, each record in the result set will include the indices of the matched characters.
  // These can consequently be used for highlighting purposes.
  includeMatches: true,
  // Whether to sort the result list, by score.
  shouldSort: true,
  // At what point does the match algorithm give up.
  // A threshold of 0.0 requires a perfect match (of both letters and location), a threshold of 1.0 would match anything.
  threshold: 0.3,
  // Determines approximately where in the text is the pattern expected to be found.
  location: 0,
  ignoreLocation: true,
  // Only the matches whose length exceeds this value will be returned.
  // (For instance, if you want to ignore single character matches in the result, set it to 2).
  minMatchCharLength: 2,
  // List of keys that will be searched.
  // This supports nested paths, weighted search, searching in arrays of strings and objects.
  keys: [
    { name: "metadata.title", weight: 0.8 },
    { name: "metadata.description", weight: 0.5 },
    { name: "metadata.tags", weight: 0.3 },
    { name: "content", weight: 0.2 },
  ],
};

// Searches posts and projects from the same index - each result carries the
// `kind` discriminator so the UI can render the right card.
export function searchItems(
  items: SearchableItem[],
  query: string,
): SearchResult[] {
  const fuse = new Fuse(items, fuseOptions);
  const results = fuse.search(query);
  return results as SearchResult[];
}
