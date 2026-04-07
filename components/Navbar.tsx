'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        setRole(profile?.role || null);
      }
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-accent">
        HypeKnight
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/index">Home</Link>
        <Link href="/events">Events</Link>
        <Link href="/venues">Venues</Link>
        

        {!user && (
          <>
            <Link href="/auth/login">Login</Link>
            <Link
              href="/auth/sign-up"
              className="bg-accent text-black px-4 py-2 rounded-lg font-semibold"
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