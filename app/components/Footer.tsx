import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className='footer flex flex-row justify-center items-center py-4 mx-auto'>
        <p className='text-sm'>
          © 2026 {" "}
          <span>
            <Link
              href='https://nunorralves.pt'
              className='text-sm text-foreground'
            >
              nunorralves.pt
            </Link>
          </span>
          {" "}-{" "}Written on my own time. Views here are mine, not my employer's.
        </p>
      </div>
    </footer>
  );
}
