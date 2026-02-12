import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className='top-0 left-0 px-4 py-4 mx-auto w-5/6'>
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
          <Link href='/archive' className='text-foreground'>
            Archive
          </Link>
          <Link href='/search' className='text-foreground'>
            Search
          </Link>
          <Link href='/tags' className='text-foreground'>
            Tags
          </Link>
          <ThemeToggle />
        </ul>
      </nav>
    </header>
  );
}
