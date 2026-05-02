import Fuse from "fuse.js";
import type { Post } from "./types";

export interface SearchResult {
  item: Post;
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
  // threshold: 1.0,
  // Determines approximately where in the text is the pattern expected to be found.
  location: 0,
  // Determines how close the match must be to the fuzzy location (specified by location).
  // distance: 100,
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
    // { name: "title", path: ["metadata", "title"], weight: 0.8 },
    // { name: "description", path: ["metadata", "description"], weight: 0.5 },
    // { name: "tags", path: ["metadata", "tags"], weight: 0.3 },
    // { name: "content", weight: 1.0 },
  ],
};

export function searchPosts(posts: Post[], query: string): SearchResult[] {
  const fuse = new Fuse(posts, fuseOptions);
  const results = fuse.search(query);
  return results as SearchResult[];
}

// export function searchPosts(posts: Post[], query: string): SearchResult[] {
//   const fuse = new Fuse(posts, {
//     keys: ["content"],
//     threshold: 1.0,
//     ignoreLocation: true,
//   });

//   const results = fuse.search(query);
//   console.log("»»» results:", results);
//   console.log("total posts:", posts.length);
//   console.log("first post content:", posts[0]?.content);
//   return results as SearchResult[];
// }
