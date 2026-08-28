import type { Metadata } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Header from "./components/Header";
import Footer from "./components/Footer";

// Three faces, one job each: Source Serif 4 for anything that reads as
// writing (headings, the article body), Inter for UI chrome (nav, buttons,
// page furniture), JetBrains Mono for dates and other small, data-like text.
// Loaded here and exposed as CSS variables on <html>, so globals.css can wire
// each into a real fallback stack (--font-serif/--font-sans/--font-mono)
// instead of next/font's own metric-matched one.
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "nunorralves.pt",
  description:
    "Nuno Alves. Notes and projects on AI coding agents, platform engineering, and engineering leadership. The workshop, not the CV.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={`${sourceSerif4.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta charSet='utf-8' />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/favicons/favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/favicons/favicon-16x16.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/favicons/apple-touch-icon.png'
        />
        <link rel='manifest' href='/favicons/site.webmanifest' />
        {/* Feed autodiscovery. This is a raw tag rather than
            `metadata.alternates` because page level metadata replaces the
            root `alternates` object wholesale, and /blog, /about and the
            rest already set their own canonical. Via metadata the feed link
            would vanish from exactly the pages a reader is most likely to
            paste into their feed reader. */}
        <link
          rel='alternate'
          type='application/rss+xml'
          title='nunorralves.pt'
          href='/feed.xml'
        />
        <link
          rel='mask-icon'
          href='/favicons/safari-pinned-tab.svg'
          color='#5bbad5'
        />
      </head>
      <body className='flex flex-col min-h-screen mx-0'>
        <Header />
        {/* flex-1 keeps the footer at the bottom of short pages. This used to
            be a min-height calc against fixed header and footer heights, which
            silently broke the moment the footer wrapped to a second line. */}
        <main className='flex-1'>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
