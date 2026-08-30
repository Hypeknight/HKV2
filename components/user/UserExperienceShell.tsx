'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const USER_LINKS = [
  { href: '/dashboard', label: 'My Night', exact: true },
  { href: '/events/recommended', label: 'For You' },
  { href: '/dashboard/saved', label: 'Saved' },
  { href: '/dashboard/preferences', label: 'Preferences' },
  { href: '/dashboard/profile', label: 'Profile' },
];

export default function UserExperienceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function active(link: (typeof USER_LINKS)[number]) {
    return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="sticky top-16 z-30 border-b border-white/[0.07] bg-[#080a0f]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          <span className="mr-2 hidden shrink-0 text-[10px] font-black uppercase tracking-[0.24em] text-white/30 sm:inline">Your HypeKnight</span>
          {USER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${active(link) ? 'bg-white text-black' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'}`}>
              {link.label}
            </Link>
          ))}
          <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
            <Link href="/events" className="rounded-xl px-3 py-2 text-xs font-bold text-white/50 hover:text-white">Discover</Link>
            <Link href="/surprise" className="rounded-xl bg-accent/10 px-3 py-2 text-xs font-black text-accent">Surprise me</Link>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
