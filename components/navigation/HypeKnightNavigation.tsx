'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import SignalLink from '@/components/analytics/SignalLink';

type NavbarUser = {
  id: string;
  email: string;
} | null;

const PUBLIC_LINKS = [
  { href: '/events', label: 'Discover' },
  { href: '/venues', label: 'Venues' },
  { href: '/calendar', label: 'Calendar' },
];

export default function HypeKnightNavigation({
  initialUser,
  initialRole,
}: {
  initialUser: NavbarUser;
  initialRole: string | null;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<NavbarUser>(initialUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080a0f]/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg">
              <img src="/hypeknight-logo.jpeg" alt="" className="h-full w-full object-cover" />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Live discovery</span>
              <span className="block text-base font-black leading-none tracking-tight text-white group-hover:text-accent">HypeKnight</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {PUBLIC_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive(item.href)
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/55 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <SignalLink
              href="/events?when=tonight"
              signal={{
                signalType: 'time_intent_selected',
                subjectType: 'search',
                subjectId: 'tonight',
                source: 'global_navigation',
                surface: 'desktop_nav',
                verificationLevel: 'declared',
                metadata: { when: 'tonight' },
              }}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Tonight
            </SignalLink>
          </nav>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                {initialRole === 'admin' ? (
                  <Link href="/admin" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
                    Admin
                  </Link>
                ) : null}
                <Link href="/dashboard" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
                  My HypeKnight
                </Link>
                <button onClick={handleLogout} className="rounded-xl px-3 py-2 text-sm font-semibold text-white/45 hover:text-white">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/60 hover:text-white">
                  Log in
                </Link>
                <Link href="/auth/sign-up" className="rounded-xl bg-accent px-4 py-2 text-sm font-black text-black hover:brightness-110">
                  Join HypeKnight
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-white sm:ml-0 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? '×' : '☰'}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/[0.07] bg-[#080a0f] px-4 py-4 lg:hidden">
            <nav className="mx-auto grid max-w-[1500px] gap-2">
              <SignalLink
                href="/events?when=tonight"
                signal={{
                  signalType: 'time_intent_selected',
                  subjectType: 'search',
                  subjectId: 'tonight',
                  source: 'global_navigation',
                  surface: 'mobile_menu',
                  verificationLevel: 'declared',
                  metadata: { when: 'tonight' },
                }}
                className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 font-black text-accent"
              >
                Tonight →
              </SignalLink>
              {PUBLIC_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75"
                >
                  {item.label}
                </Link>
              ))}

              <div className="mt-2 border-t border-white/[0.07] pt-3">
                {user ? (
                  <div className="grid gap-2">
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-black">
                      Open My HypeKnight
                    </Link>
                    {initialRole === 'admin' ? (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white">
                        Admin Control Center
                      </Link>
                    ) : null}
                    <button onClick={handleLogout} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/50">
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white">
                      Log in
                    </Link>
                    <Link href="/auth/sign-up" onClick={() => setMobileOpen(false)} className="rounded-2xl bg-accent px-4 py-3 text-center text-sm font-black text-black">
                      Join
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      {user && !pathname.startsWith('/admin') ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080a0f]/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            <MobileTab href="/events" label="Discover" icon="⌕" active={isActive('/events')} />
            <MobileTab href="/dashboard" label="My Night" icon="✦" active={isActive('/dashboard')} />
            <MobileTab href="/venues" label="Venues" icon="◎" active={isActive('/venues')} />
            <MobileTab href="/dashboard/profile" label="Profile" icon="♙" active={isActive('/dashboard/profile')} />
          </div>
        </nav>
      ) : null}
    </>
  );
}

function MobileTab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[10px] font-semibold ${active ? 'text-accent' : 'text-white/45'}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="mt-1">{label}</span>
    </Link>
  );
}
