'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useMemo, useState } from 'react';

type AdminNavItem = {
  label: string;
  href: string;
  icon: string;
  description: string;
  aliases?: string[];
};

type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

// Central inventory of the admin avenues that currently exist in the application.
// Keeping this in one place prevents useful admin pages from becoming "lost" as
// the platform grows. New admin areas should be added here when they are created.
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Command',
    items: [
      { label: 'Control Center', href: '/admin', icon: '⌂', description: 'Priority queues, platform health, and quick actions.' },
      { label: 'Activity Center', href: '/admin/activity', icon: '↻', description: 'Administrative audit trail and recent operations.' },
      { label: 'Calendar', href: '/admin/calendar', icon: '◫', description: 'Review the operating/event calendar.' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Events', href: '/admin/events', icon: '◉', description: 'Moderate, approve, revise, schedule, and manage events.', aliases: ['/admin/events/new'] },
      { label: 'Venues', href: '/admin/venues', icon: '⌂', description: 'Manage venue records, ownership, and visibility.' },
      { label: 'Venue Owner Requests', href: '/admin/venue-owner-requests', icon: '✓', description: 'Review requests to claim or manage venues.' },
      { label: 'DJs', href: '/admin/djs', icon: '♫', description: 'Review DJ records and requests.' },
      { label: 'External Events', href: '/admin/external-events', icon: '↗', description: 'Manage imported and partner event inventory.' },
      { label: 'Event Claims', href: '/admin/event-claims', icon: '✓', description: 'Review ownership and source-link claims for imported events.' },
    ],
  },
  {
    label: 'Experience Systems',
    items: [
      { label: 'Patron Pulse', href: '/admin/patron-pulse', icon: '♥', description: 'Operate live patron feedback and Pulse sessions.' },
      { label: 'Linkd’N', href: '/admin/linkdn', icon: '⇄', description: 'Manage venue connections, rooms, and opportunities.' },
      { label: 'Intelligence Lab', href: '/admin/intelligence', icon: '◇', description: 'Review signals, market behavior, and developing intelligence.' },
      { label: 'Market Registry', href: '/admin/intelligence/markets', icon: '◎', description: 'Create markets and manage linked metro areas.' },
      { label: 'Discovery Center', href: '/admin/discovery', icon: '⌕', description: 'Search demand, supply gaps, and discovery activity.' },
      { label: 'AI Recommendations', href: '/admin/discovery/ai', icon: '✦', description: 'Review generated discovery opportunities.' },
    ],
  },
  {
    label: 'People & Growth',
    items: [
      { label: 'Users', href: '/admin/users', icon: '♙', description: 'Manage accounts, roles, and user records.' },
      { label: 'Ambassadors', href: '/admin/ambassadors', icon: '⚑', description: 'Applications, referrals, coupons, and ambassador performance.' },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Payments', href: '/admin/payments', icon: '$', description: 'Payment exceptions, refunds, overrides, and transaction operations.' },
      { label: 'Commerce', href: '/admin/commerce', icon: '¤', description: 'Event Builder products, pricing, venue matching, coupons, and receipt controls.' },
      { label: 'Coupons', href: '/admin/coupons', icon: '%', description: 'Discounts, campaigns, and ambassador codes.' },
      { label: 'Venue Plans', href: '/admin/venue-plans', icon: '▤', description: 'Manage venue plan definitions and pricing.' },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: '▥', description: 'Traffic, engagement, event, and revenue reporting.' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: '⚙', description: 'Pricing, workflow rules, homepage controls, and program settings.' },
      { label: 'Configuration', href: '/admin/configuration', icon: '≡', description: 'Manage event types, vibes, music, amenities, and selectable values.' },
      { label: 'Lookups', href: '/admin/lookups', icon: '⌗', description: 'Maintain lookup categories, imports, exports, and values.' },
      { label: 'System Health', href: '/admin/system', icon: '◌', description: 'Cron activity, automation, diagnostics, and system health.' },
    ],
  },
];

function isItemActive(pathname: string, item: AdminNavItem) {
  if (item.href === '/admin') return pathname === '/admin';
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)) ?? false;
}

export default function AdminControlShell({
  children,
  displayName,
}: {
  children: ReactNode;
  displayName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const [query, setQuery] = useState('');

  const allItems = useMemo(() => ADMIN_NAV_GROUPS.flatMap((group) => group.items), []);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allItems;
    return allItems.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(normalized)
    );
  }, [allItems, query]);

  const currentItem = allItems
    .filter((item) => isItemActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const navigation = (
    <>
      <div className="border-b border-white/10 px-4 py-5">
        <Link href="/admin" onClick={() => setMobileOpen(false)} className="block rounded-2xl p-3 transition hover:bg-white/5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">HypeKnight</p>
          <p className="mt-1 text-lg font-black text-white">Admin Control</p>
          <p className="mt-1 text-xs text-white/45">Operations · Intelligence · Growth</p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">{group.label}</p>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-accent text-black shadow-[0_0_24px_rgba(255,255,255,0.05)]'
                        : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm ${active ? 'border-black/10 bg-black/10' : 'border-white/10 bg-black/20 text-white/70'}`}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 truncate font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
        <p className="mt-1 text-xs text-white/40">Administrator</p>
        <Link href="/" className="mt-3 inline-flex text-xs font-semibold text-accent hover:underline">
          View public site →
        </Link>
      </div>
    </>
  );

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -my-10 min-h-[calc(100vh-73px)] w-screen bg-[#070809]">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#0b0d10] lg:flex">
          {navigation}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <aside className="relative flex h-full w-[88vw] max-w-sm flex-col border-r border-white/10 bg-[#0b0d10] shadow-2xl">
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  Close
                </button>
              </div>
              {navigation}
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070809]/90 backdrop-blur-xl">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-white lg:hidden"
                aria-label="Open admin navigation"
              >
                ☰
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Admin</p>
                <p className="truncate text-sm font-bold text-white sm:text-base">{currentItem?.label ?? 'Control Center'}</p>
              </div>

              <button
                type="button"
                onClick={() => setFinderOpen((value) => !value)}
                className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-accent/40 hover:text-white sm:inline-flex"
              >
                Find admin tool
              </button>

              <Link href="/admin/events?status=submitted" className="rounded-xl bg-accent px-4 py-2 text-sm font-black text-black">
                Review queue
              </Link>
            </div>

            {finderOpen ? (
              <div className="border-t border-white/10 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl">
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search admin tools…"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/50"
                  />
                  <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                    {filteredItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setFinderOpen(false);
                          setQuery('');
                        }}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-accent/30 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-accent">{item.icon}</span>
                          <span className="text-sm font-bold text-white">{item.label}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </header>

          <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
