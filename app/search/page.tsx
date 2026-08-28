import type { Metadata } from "next";
import SearchBar from "app/components/SearchBar";
import { getSearchableItems } from "lib/helpers";

export const metadata: Metadata = {
  title: "Search",
  description: "Search across posts and projects on nunorralves.pt.",
  alternates: {
    canonical: "https://nunorralves.pt/search",
  },
};

export default async function searchPage() {
  const items = await getSearchableItems();

  return (
    <div className='container-page py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Search</h1>
        <SearchBar items={items} />
      </div>
    </div>
  );
}
