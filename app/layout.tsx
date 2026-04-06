import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Shell } from 'components/shell';
import { siteConfig } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {/* NAVBAR */}
        <header className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-accent">HypeKnight</h1>
          <nav className="flex gap-6 text-sm">
            <a href="/">Home</a>
            <a href="/events">Events</a>
            <a href="/venues">Venues</a>
            <a href="/auth/login">Login</a>
            <a href="/auth/sign-up">Sign Up</a>
          </nav>
        </header>

        {/* PAGE WRAPPER */}
        <main className="max-w-6xl mx-auto px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
