"use client";

import { searchItems } from "lib/search";
import { SearchableItem } from "lib/types";
import { getReadingTimeMinutes } from "lib/reading-time";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PostRow } from "./PostRow";
import { ProjectCard } from "./ProjectCard";

export default function SearchBar({ items }: { items: SearchableItem[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Only the timer touches state, so nothing is set synchronously during the
  // effect - that is what made this cascade renders on every keystroke.
  useEffect(() => {
    if (query.trim() === "") return;

    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Emptying the input clears the list on the next render instead of 300ms
  // later, without needing a second setState to reset it.
  const activeQuery = query.trim() === "" ? "" : debouncedQuery;

  const searchResults: SearchableItem[] = useMemo(
    () =>
      activeQuery === ""
        ? []
        : searchItems(items, activeQuery).map((result) => result.item),
    [items, activeQuery],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className='mb-8'>
      <div className='relative'>
        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
          <Search className='h-5 w-5 text-muted-foreground' />
        </div>
        <input
          type='text'
          className='block w-full pl-10 pr-3 py-3 border border-border rounded-lg leading-5 bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors'
          placeholder='Search posts and projects...'
          value={query}
          onChange={handleChange}
        />
      </div>

      {searchResults.length > 0 ? (
        <div className='space-y-6 mt-4'>
          <p className='text-muted-foreground'>
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""}
          </p>

          {searchResults.map((result) =>
            result.kind === "project" ? (
              <div key={`project-${result.slug}`}>
                <span className='inline-block mb-2 text-[0.65rem] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-link)] text-[var(--color-link)]'>
                  Project
                </span>
                <ProjectCard
                  {...result.metadata}
                  slug={result.slug}
                  hasBody={result.hasBody}
                />
              </div>
            ) : (
              <div key={`post-${result.slug}`}>
                <span className='inline-block mb-2 text-[0.65rem] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-secondary)]'>
                  Post
                </span>
                <PostRow
                  {...result.metadata}
                  slug={result.slug}
                  readingTimeMinutes={getReadingTimeMinutes(result.content)}
                />
              </div>
            ),
          )}
        </div>
      ) : query.trim() !== "" ? (
        <div className='text-center py-12 text-muted-foreground'>
          <p className='text-lg'>No results found.</p>
          <p className='text-sm'>Try searching for different keywords.</p>
        </div>
      ) : null}
    </div>
  );
}
