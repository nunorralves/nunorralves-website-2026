import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-2/3 py-24 text-center">
      <h1 className="text-4xl font-black mb-4">404 - Not Found</h1>
      <p className="text-muted-foreground mb-6">The page you are looking for does not exist.</p>
      <Link href="/" className="inline-block px-4 py-2 bg-primary text-white rounded-md">Return home</Link>
    </div>
  );
}
