'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/app/auth/actions';
import { authHref } from '@/lib/auth/return-path';

type NavbarUser = { id: string; email: string } | null;

const PUBLIC_LINKS = [
  { href: '/events', label: 'Discover' },
  { href: '/surprise', label: 'Surprise Me' },
  { href: '/venues', label: 'Venues' },
];

export default function HypeKnightNavigation({ initialUser, initialRole }: { initialUser: NavbarUser; initialRole: string | null }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const destination = pathname.startsWith('/auth/')
    ? search.get('next') ?? search.get('redirect')
    : pathname + (query ? '?' + query : '');
  const user = initialUser;
  const menuButton = useRef<HTMLButtonElement>(null);
  const loginHref = authHref('login', destination);
  const signupHref = authHref('sign-up', destination);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname, query]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const admin = initialRole === 'admin';

  return (
    <>
      <header onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); menuButton.current?.focus(); } }} className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080a0f]/92 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="flex h-9 w-9 overflow-hidden rounded-xl border border-white/10 bg-white/5"><img src="/hypeknight-logo.jpeg" alt="HypeKnight" className="h-full w-full object-cover" /></span>
            <div><span className="block text-base font-black leading-none tracking-tight text-white">HypeKnight</span><span className="mt-1 block text-[9px] font-black uppercase tracking-[0.22em] text-white/30">Find your night</span></div>
          </Link>

          <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 lg:flex">
            {PUBLIC_LINKS.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${active(item.href) ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:bg-white/[0.05] hover:text-white'}`}>{item.label}</Link>)}
            <Link href="/events?when=tonight" className="rounded-xl px-3 py-2 text-sm font-black text-accent hover:bg-accent/10">Tonight</Link>
          </nav>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                <Link href="/dashboard" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black">My Night</Link>
                <Link href="/dashboard/saved" className="rounded-xl px-3 py-2 text-sm font-bold text-white/50 hover:text-white">Saved</Link>
                {admin ? <Link href="/admin" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white/55 hover:text-white">Admin</Link> : null}
                <form action={signOut}><button type="submit" className="rounded-xl px-2 py-2 text-sm font-bold text-white/30 hover:text-white">Sign out</button></form>
              </>
            ) : (
              <><Link href={loginHref} className="rounded-xl px-3 py-2 text-sm font-bold text-white/50 hover:text-white">Log in</Link><Link href={signupHref} className="rounded-xl bg-accent px-4 py-2 text-sm font-black text-black">Join</Link></>
            )}
          </div>

          <button ref={menuButton} type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white lg:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? '×' : '☰'}</button>
        </div>

        {open ? (
          <nav id="mobile-navigation" aria-label="Mobile" onClick={event => { if ((event.target as Element).closest('a')) setOpen(false); }} className="border-t border-white/[0.07] bg-[#080a0f] px-4 py-4 lg:hidden">
            <div className="mx-auto grid max-w-[1500px] gap-2">
              <Link href="/events?when=tonight" className="rounded-2xl bg-accent px-4 py-3 font-black text-black">Tonight →</Link>
              {PUBLIC_LINKS.map((item) => <Link key={item.href} href={item.href} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/70">{item.label}</Link>)}
              <div className="mt-2 border-t border-white/[0.07] pt-3">
                {user ? <div className="grid gap-2"><Link href="/dashboard" className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-black">Open My Night</Link><Link href="/dashboard/saved" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white">Saved & Recent</Link>{admin ? <Link href="/admin" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white">Admin Control Center</Link> : null}<form action={signOut}><button type="submit" className="px-4 py-3 text-sm font-bold text-white/40">Sign out</button></form></div> : <div className="grid grid-cols-2 gap-2"><Link href={loginHref} className="rounded-2xl border border-white/10 px-4 py-3 text-center font-bold text-white">Log in</Link><Link href={signupHref} className="rounded-2xl bg-accent px-4 py-3 text-center font-black text-black">Join</Link></div>}
              </div>
            </div>
          </nav>
        ) : null}
      </header>

      {user && !pathname.startsWith('/admin') ? (
        <nav aria-label="My Night" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080a0f]/96 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            <MobileTab href="/events" label="Discover" icon="⌕" active={active('/events') && !active('/events/recommended')} />
            <MobileTab href="/dashboard" label="My Night" icon="✦" active={pathname === '/dashboard' || active('/events/recommended')} />
            <MobileTab href="/dashboard/saved" label="Saved" icon="♡" active={active('/dashboard/saved')} />
            <MobileTab href="/dashboard/profile" label="You" icon="♙" active={active('/dashboard/profile') || active('/dashboard/preferences')} />
          </div>
        </nav>
      ) : null}
    </>
  );
}

function MobileTab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return <Link href={href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[10px] font-bold ${active ? 'text-accent' : 'text-white/40'}`}><span className="text-lg leading-none">{icon}</span><span className="mt-1">{label}</span></Link>;
}
