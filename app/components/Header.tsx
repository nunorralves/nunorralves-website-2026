"use client";

import { useState } from "react";
import Link from "next/link";
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
const NAV_LINKS = [
  // Home carries the weight it had before this file grew a mobile menu. It is
  // unconditional, not an active-page marker, which is worth a second look.
  { href: "/", label: "Home", className: "font-medium" },
  { href: "/blog", label: "Writing" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
            take. Only the text links collapse. */}
        <div className='flex items-center gap-1 md:gap-6 lg:gap-8'>
          <ul className='hidden md:flex items-center gap-6 lg:gap-8'>
            {NAV_LINKS.map(({ href, label, className }) => (
              <li key={href}>
                <Link href={href} className={`text-foreground ${className ?? ""}`}>
                  {label}
                </Link>
              </li>
            ))}
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
          {NAV_LINKS.map(({ href, label, className }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 text-foreground ${className ?? ""}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
