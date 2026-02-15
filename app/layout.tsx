import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "nunorralves.pt",
  description:
    "nunorralves.pt - Blog about SW Engineering, Leadership, Management, Electronics, IoT and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className='flex flex-col mx-0 '>
        <div className='flex-1 w-full'>
          <Header />
          <div className='main'>
            <main>{children}</main>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
