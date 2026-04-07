'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

type AppUser = {
  id: string;
  email?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ? { id: user.id, email: user.email } : null);

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Navbar profile load error:', error.message);
          setRole('user');
        } else {
          setRole(profile?.app_role || 'user');
        }
      } else {
        setRole(null);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;

      setUser(
        sessionUser
          ? { id: sessionUser.id, email: sessionUser.email }
          : null
      );

      if (sessionUser) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('app_role')
          .eq('id', sessionUser.id)
          .single();

        if (error) {
          console.error('Navbar profile load error:', error.message);
          setRole('user');
        } else {
          setRole(profile?.app_role || 'user');
        }
      } else {
        setRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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