import type { ReactNode } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/data';
import Footer from '@/components/Footer';

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