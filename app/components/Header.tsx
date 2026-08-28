"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

// One list, rendered twice - as the inline row on desktop and as the dropdown
// panel on mobile. Two hand-maintained copies of the same four links is how
// they drift apart.
//
// About is last of the text links rather than second. The site's whole
// position is that it is the workshop and LinkedIn is the CV, and nav order is
// a claim about priority. Anyone who wants the bio is already one click from
// it via the intro on the landing page.
//
// Archive is not here. It is a utility - the by-date index behind /blog - not
// a section of its own, and it was the fifth link forcing the burger menu
// down to lg. It is still linked from /blog and from the footer.
const NAV_LINKS = [
  { href: "/", label: "Home" },
  // A post lives under /posts, not /blog, but it is the thing /blog lists, so
  // reading one should light up Writing rather than nothing at all. Same for a
  // project detail page, which /projects already covers by prefix.
  { href: "/blog", label: "Writing", also: ["/posts"] },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
];

// "/" would prefix-match every route, so it is the one that has to be exact.
// /tags/* deliberately matches nothing: a tag page mixes posts and projects,
// so neither link owns it.
function isActive(pathname: string, href: string, also: string[] = []) {
  if (href === "/") return pathname === "/";
  return [href, ...also].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    // Not px-4 on mobile: the body columns are a bare w-11/12, so padding here
    // would indent the wordmark past the headings it sits above.
    <header className='header relative py-4 mx-auto w-11/12 md:w-5/6 md:px-4'>
      <nav className='nav flex flex-row justify-between items-center'>
        <Link
          href='/'
          className='flex justify-start items-center text-xl md:text-2xl font-bold text-foreground'
        >
          nunorralves.pt
        </Link>

        {/* Search and the theme toggle stay on the bar at every width - they
            are one tap each, and burying them costs more than the room they
            take. Only the text links collapse.

            md, not lg: with Archive gone, four text links fit inside the
            bar's ~595px at 768px, but only at the tighter gap-4 - gap-8 there
            still ran the row about 36px past its own box. Desktop has room
            to spare, so gap-8 comes back at lg. */}
        <div className='flex items-center gap-1 md:gap-4 lg:gap-8'>
          <ul className='hidden md:flex items-center gap-4 lg:gap-8'>
            {NAV_LINKS.map(({ href, label, also }) => {
              const active = isActive(pathname, href, also);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`text-foreground ${active ? "font-medium" : ""}`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link href='/search' aria-label='Search' className='text-foreground p-2.5'>
            <Search className='w-5 h-5' />
          </Link>

          <ThemeToggle />

          <button
            type='button'
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls='mobile-menu'
            className='md:hidden p-2 text-foreground'
          >
            {menuOpen ? (
              <X className='w-6 h-6' />
            ) : (
              <Menu className='w-6 h-6' />
            )}
          </button>
        </div>
      </nav>

      {/* Absolute rather than in flow, so opening the menu overlays the page
          instead of shoving it down and moving the link you are reaching for. */}
      {menuOpen && (
        <ul
          id='mobile-menu'
          className='card md:hidden absolute left-0 right-0 top-full z-50 py-2'
        >
          {NAV_LINKS.map(({ href, label, also }) => {
            const active = isActive(pathname, href, also);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`block px-4 py-3 text-foreground ${
                    active ? "font-medium" : ""
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
