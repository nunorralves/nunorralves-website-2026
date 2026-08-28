import Link from "next/link";
import { SocialLinks } from "./SocialLinks";

export default function Footer() {
  return (
    <footer className='border-t border-[var(--color-border)] mt-16'>
      {/* Same column as every page body, so the rule above it lines up with
          the content rather than running the full width of the window. */}
      <div className='footer container-page py-6'>
        {/* Two rows, not three. The feed used to need a text link of its own
            down here; it has an icon in SocialLinks now, so the row that
            carried it went, and Archive moved up next to the credit rather
            than being left alone on a line by itself. Archive is the by-date
            index behind /blog rather than a section of its own, which is why
            it is down here and not in the header. */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex flex-wrap items-center gap-4 text-sm'>
            <p>
              © 2026{" "}
              <Link href='/' className='text-foreground'>
                Nuno Alves
              </Link>
            </p>
            <Link
              href='/archive'
              className='text-[var(--color-secondary)] hover:text-foreground transition-colors'
            >
              Archive
            </Link>
          </div>
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
