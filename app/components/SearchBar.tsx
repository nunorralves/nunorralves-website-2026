"use client";

import { searchPosts } from "lib/search";
import { Post } from "lib/types";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "./PostCard";

export default function SearchBar({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);

  useEffect(() => {
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const results = searchPosts(posts, query);
    setSearchResults(results.map((result) => result.item));
  }, [query, posts]);

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
          placeholder='Search posts...'
          value={query}
          onChange={handleChange}
        />
      </div>

      {searchResults.length > 0 ? (
        <div className='space-y-8 mt-4'>
          <p className='text-muted-foreground'>
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""}
          </p>

          {searchResults.map((post) => (
            <PostCard key={post.slug} {...post.metadata} slug={post.slug} />
          ))}
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
