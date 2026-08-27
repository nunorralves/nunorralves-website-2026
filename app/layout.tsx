import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Header from "./components/Header";
import Footer from "./components/Footer";

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
    <html lang='en'>
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
