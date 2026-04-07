'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

type NavUser = {
  id: string;
  email?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);
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
    const loadUserAndRole = async () => {
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
          console.error('Navbar profile error:', error.message);
          setRole('user');
        } else {
          setRole(profile?.app_role || 'user');
        }
      } else {
        setRole(null);
      }
    };

    loadUserAndRole();

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
          console.error('Navbar profile error:', error.message);
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
    <header className="flex justify-between items-center border-b border-white/10 px-6 py-4">
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