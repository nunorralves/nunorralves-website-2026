import Link from "next/link";
import { Search } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className='header top-0 left-0 px-4 py-4 mx-auto w-5/6'>
      <nav className='nav flex flex-row justify-between items-center'>
        <Link
          href='/'
          className='flex justify-start items-center text-2xl font-bold text-foreground'
        >
          nunorralves.pt
        </Link>
        <ul className='flex justify-end items-center space-x-8'>
          <Link href='/' className='font-medium text-foreground'>
            Home
          </Link>
          <Link href='/blog' className='text-foreground'>
            Writing
          </Link>
          <Link href='/projects' className='text-foreground'>
            Projects
          </Link>
          {/* Last of the text links rather than second. The site's whole
              position is that it is the workshop and LinkedIn is the CV, and
              nav order is a claim about priority. Anyone who wants the bio is
              already one click from it via the intro on the landing page. */}
          <Link href='/about' className='text-foreground'>
            About
          </Link>
          <Link href='/search' aria-label='Search' className='text-foreground'>
            <Search className='w-5 h-5' />
          </Link>
          <ThemeToggle />
        </ul>
      </nav>
    </header>
  );
}
