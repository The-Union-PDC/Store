import NavbarClient from 'components/layout/navbar/navbar-client';
import { Inter, Teko } from 'next/font/google';
import localFont from 'next/font/local';
import { ReactNode } from 'react';
import './globals.css';

const { TWITTER_CREATOR, TWITTER_SITE } = process.env;
const siteName = 'The Union Muay Thai & Boxing Gym';
const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${siteName} — Official Store`,
    template: `%s | ${siteName}`
  },
  description: 'Official merch store for The Union Muay Thai & Boxing Gym in Playa del Carmen. Est. 2012. Old-School Muay Thai & Boxing.',
  robots: {
    follow: true,
    index: true
  },
  ...(TWITTER_CREATOR &&
    TWITTER_SITE && {
      twitter: {
        card: 'summary_large_image',
        creator: TWITTER_CREATOR,
        site: TWITTER_SITE
      }
    })
};

const teko = Teko({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-teko',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const banditos = localFont({
  src: './fonts/ifc_los_banditos.woff2',
  variable: '--font-banditos',
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${teko.variable} ${inter.variable} ${banditos.variable}`}>
      <body className="bg-neutral-950 text-white selection:bg-muay-red selection:text-white font-sans antialiased">
        <NavbarClient />
        <main>{children}</main>
      </body>
    </html>
  );
}
