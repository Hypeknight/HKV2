import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/data';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://hypeknight.fun'),
  title: {
    default: 'HypeKnight | Find What’s Happening Tonight',
    template: '%s | HypeKnight',
  },
  description:
    'HypeKnight helps people discover live events, nightlife, promoters, venues, and what is happening here and now.',
  openGraph: {
    title: 'HypeKnight | Find What’s Happening Tonight',
    description:
      'Discover live events, nightlife, promoters, venues, and what is happening here and now.',
    url: 'https://hypeknight.fun',
    siteName: 'HypeKnight',
    images: [
      {
        url: '/icon.jpeg',
        width: 1200,
        height: 630,
        alt: 'HypeKnight',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HypeKnight | Find What’s Happening Tonight',
    description:
      'Discover live events, nightlife, promoters, venues, and what is happening here and now.',
    images: ['/icon.jpeg'],
  },
  icons: {
    icon: '/icon.jpeg',
    apple: '/apple-icon.png',
  },
};


export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfile() : null;
  const role = profile?.app_role || null;

  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Navbar
          initialUser={user ? { id: user.id, email: user.email ?? '' } : null}
          initialRole={role}
        />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}