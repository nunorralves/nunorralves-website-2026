import SearchBar from "app/components/SearchBar";
import { getAllPosts } from "lib/helpers";

export default async function searchPage() {
  const allPosts = await getAllPosts();

  return (
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Search</h1>
        {/* <p className='mb-6 font-normal'>This is the search page.</p> */}
        <SearchBar posts={allPosts} />
      </div>
    </div>
  );
}
