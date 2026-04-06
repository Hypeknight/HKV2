import type { ReactNode } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';

export async function Shell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-black tracking-wide text-accent">
            {siteConfig.name}
          </Link>
          <nav className="flex items-center gap-5 text-sm text-white/80">
            <Link href="/events">Events</Link>
            <Link href="/venues">Venues</Link>
            <Link href="/dashboard">Dashboard</Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-full border border-white/10 px-4 py-2 hover:border-accent/50 hover:text-accent"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full border border-white/10 px-4 py-2 hover:border-accent/50 hover:text-accent"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/10 py-10 text-center text-sm text-white/50">
        <p>{siteConfig.name} • nightlife discovery rebuilt for GitHub, Supabase, and Render.</p>
      </footer>
    </div>
  );
}
