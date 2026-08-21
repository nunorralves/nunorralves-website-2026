import SearchBar from "app/components/SearchBar";
import { getSearchableItems } from "lib/helpers";

export default async function searchPage() {
  const items = await getSearchableItems();

  return (
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Search</h1>
        <SearchBar items={items} />
      </div>
    </div>
  );
}
