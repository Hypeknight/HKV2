'use client';

import { useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

type NavbarUser = {
  id: string;
  email: string;
} | null;

export default function Navbar({
  initialUser,
  initialRole,
}: {
  initialUser: NavbarUser;
  initialRole: string | null;
}) {
  const [user, setUser] = useState<NavbarUser>(initialUser);
  const [role] = useState<string | null>(initialRole);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <Link href="/" className="text-xl font-bold text-accent">
        HypeKnight
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/">Home</Link>
        <Link href="/events">Events</Link>
        <Link href="/venues">Venues</Link>

        {!user && (
          <>
            <Link href="/auth/login">Login</Link>
            <Link
              href="/auth/sign-up"
              className="rounded-lg bg-accent px-4 py-2 font-semibold text-black"
            >
              Sign Up
            </Link>
          </>
        )}

        {user && (
          <>
            <Link href="/dashboard">Dashboard</Link>

            {(role === 'admin' || role === 'venue_owner') && (
              <Link href="/admin">Admin</Link>
            )}

            <button onClick={handleLogout} className="hover:text-accent">
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}