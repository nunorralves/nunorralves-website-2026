import { PostCard } from "./components/PostCard";
import { FeaturedCard } from "./components/FeaturedCard";
import Link from "next/link";
import { SocialLinks } from "./components/SocialLinks";
import { getAllPostsMetadataWithSlug, getFeaturedItems } from "../lib/helpers";

const RECENT_POSTS = 3;

export default async function Home() {
  const [featured, posts] = await Promise.all([
    getFeaturedItems(3),
    getAllPostsMetadataWithSlug(),
  ]);

  const recentPosts = posts.slice(0, RECENT_POSTS);

  return (
    <div className='mx-auto w-11/12 md:w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Nuno Alves</h1>
        <p className='mb-4 text-lg'>
          Engineering leader. Twenty-five years in software, twenty of them
          leading teams, currently Senior Director of Engineering, Platform at
          Entrust in identity verification.
        </p>
        <p className='mb-6 font-normal'>
          This site is the workshop, not the CV. I build agent systems and small
          tools here, and write about what actually breaks when you do.
        </p>
        {/* The biography this intro used to carry now lives on /about, which
            lets the landing page be a hook rather than both at once. The
            "views are my own" line went with it: under a two sentence intro a
            disclaimer read as a third of the page, and the footer carries it
            site wide anyway. */}
        <p className='mb-6'>
          <Link
            href='/about'
            className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
          >
            More about me and how I got here
          </Link>
        </p>
        <div className='pt-4 mb-12'>
          <SocialLinks />
        </div>

        {featured.length > 0 && (
          <section className='mb-12'>
            <h2 className='text-xl font-semibold mb-4'>Selected work</h2>
            <div className='grid gap-6 sm:grid-cols-3 mb-6'>
              {featured.map((item) => (
                <FeaturedCard key={`${item.kind}-${item.slug}`} {...item} />
              ))}
            </div>
            <Link
              href='/projects'
              className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
            >
              All projects
            </Link>
          </section>
        )}

        {recentPosts.length > 0 && (
          <section>
            <h2 className='text-xl font-semibold mb-4'>Recent writing</h2>
            {recentPosts.map((post) => (
              <PostCard key={post.slug} {...post} />
            ))}
            <Link
              href='/blog'
              className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
            >
              All posts
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
