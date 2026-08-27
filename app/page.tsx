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
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>Nuno Alves</h1>
        <p className='mb-4 text-lg'>
          Engineering leader. Twenty years building platforms and the teams
          behind them, from embedded systems to cloud.<br></br>
          Currently Senior Director of Engineering, Platform at Entrust
          (formerly Onfido).
        </p>
        <p className='mb-3 font-normal'>
          By day I run Platform engineering at Entrust in the identity
          verification space: workflow orchestration, APIs, reliability, and
          more recently agentic AI and EU digital identity. Twenty years of
          leading engineering teams before that, from embedded systems to cloud
          platforms, most of it spent on the parts where the architecture and
          the org chart refuse to line up.<br></br>
          This site is the other half. It is where I build things myself, mostly
          agent systems and small tools, and write about what actually breaks
          when you do. If you came from LinkedIn, that is the record of the
          work. This is the workshop: rougher, more current, and more honest
          about the parts that did not work.
        </p>
        {/* Last line of the intro rather than woven into it: at the end it
            reads as a footnote instead of a defensive opening. Also in the
            footer, since posts get read without anyone passing through here. */}
        <p className='mb-6 text-sm'>
          Written on my own time. Views here are mine, not my employer&apos;s.
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
