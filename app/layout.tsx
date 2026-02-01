import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ThemeToggle from "./components/ThemeToggle";

export const metadata: Metadata = {
  title: "nunorralves.pt",
  description:
    "nunorralves.pt - Blog about SW Engineering, Management and Electronics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body>
        <Header />
        <div>
          <ThemeToggle />
          <div className='mt-4 bg-code-block-bg text-content p-4 rounded'>
            Content here
          </div>
        </div>
        {children}
        <Footer />
      </body>
    </html>
  );
}
