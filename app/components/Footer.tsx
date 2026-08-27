import Link from "next/link";
import { SocialLinks } from "./SocialLinks";

export default function Footer() {
  return (
    <footer className='border-t border-[var(--color-border)] mt-16'>
      {/* Same w-2/3 column as every page body, so the rule above it lines up
          with the content rather than running the full width of the window. */}
      <div className='footer mx-auto w-2/3 py-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <p className='text-sm'>
            © 2026{" "}
            <Link href='/' className='text-foreground'>
              Nuno Alves
            </Link>
          </p>
          <SocialLinks size='w-5 h-5' />
        </div>
        {/* Its own row rather than hyphenated onto the copyright line: it is a
            sentence, not a credit, and it used to wrap into an uneven mess. */}
        <p className='text-sm mt-4'>
          Written on my own time. Views here are mine, not my employer&apos;s.
        </p>
      </div>
    </footer>
  );
}
