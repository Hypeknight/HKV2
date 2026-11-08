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
      { label: 'Venue Claims', href: '/admin/venue-claims', icon: '✓', description: 'Review venue-specific claims and management authority.' },
      { label: 'DJs', href: '/admin/djs', icon: '♫', description: 'Review DJ records and requests.' },
      { label: 'External Events', href: '/admin/external-events', icon: '↗', description: 'Manage imported and partner event inventory.' },
      { label: 'Event Claims', href: '/admin/event-claims', icon: '✓', description: 'Review ownership and source-link claims for imported events.' },
    ],
  },
  {
    label: 'Participation & Intelligence',
    items: [
      { label: 'Community Pulse', href: '/admin/community-pulse', icon: '♥', description: 'Publish independent community questions and manage their homepage selection.' },
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
      { label: 'Venue Owner Requests', href: '/admin/venue-owner-requests', icon: '✓', description: 'Legacy owner requests, separate from venue-specific claims.' },
      { label: 'Users', href: '/admin/users', icon: '♙', description: 'Manage accounts, roles, and user records.' },
      { label: 'Ambassadors', href: '/admin/ambassadors', icon: '⚑', description: 'Applications, referrals, coupons, and ambassador performance.' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Payments', href: '/admin/payments', icon: '$', description: 'Payment exceptions, refunds, overrides, and transaction operations.' },
      { label: 'Commerce', href: '/admin/commerce', icon: '¤', description: 'Event Builder products, pricing, venue matching, coupons, and receipt controls.' },
      { label: 'Coupons', href: '/admin/coupons', icon: '%', description: 'Discounts, campaigns, and ambassador codes.' },
      { label: 'Venue Plans', href: '/admin/venue-plans', icon: '▤', description: 'Manage venue plan definitions and pricing.' },
    ],
  },
  {
    label: 'Evidence & Reporting',
    items: [
      { label: 'Signal Evidence', href: '/admin/signals', icon: '◇', description: 'Canonical signals, action counts, availability and measurement boundaries.' },
      { label: 'Legacy View Logs', href: '/admin/analytics', icon: '▥', description: 'Legacy view-log diagnostics; excluded from canonical signal totals.' },
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
  return item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(item.href + '/');
}
export default function AdminControlShell({ children, displayName }: { children: ReactNode; displayName: string }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const allItems = useMemo(() => ADMIN_NAV_GROUPS.flatMap(group => group.items), []);
  const current = allItems.filter(item => isItemActive(pathname, item)).sort((a,b) => b.href.length - a.href.length)[0];
  const filtered = allItems.filter(item => (item.label + ' ' + item.description).toLowerCase().includes(query.trim().toLowerCase()));
  const navigation = <nav aria-label="Administrative workspaces" className="hk-admin-nav">{ADMIN_NAV_GROUPS.map(group => <section key={group.label}><h2>{group.label}</h2>{group.items.map(item => <Link key={item.href} href={item.href} aria-current={current?.href === item.href ? 'page' : undefined}>{item.label}</Link>)}</section>)}</nav>;
  return <div className="hk-admin-shell">
    <aside className="hk-admin-sidebar"><Link href="/admin" className="block pb-6"><p className="hk-admin-eyebrow">HypeKnight</p><p className="mt-2 text-lg font-bold">Control Center</p><p className="mt-2 text-xs text-white/70">{displayName} · Administrator</p></Link>{navigation}</aside>
    <div className="hk-admin-body"><header className="hk-admin-toolbar"><p>{current?.label || 'Control Center'}</p><Link href="/">View public site ↗</Link></header>
      <details key={'mobile-' + pathname} className="hk-admin-mobile"><summary>Admin workspaces</summary>{navigation}</details>
      <details key={'finder-' + pathname} className="hk-admin-finder"><summary>Find an admin tool</summary><label htmlFor="admin-tool-search">Search administrative workspaces</label><input id="admin-tool-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Events, signals, venues…" /><ul>{filtered.map(item => <li key={item.href}><Link href={item.href}><strong>{item.label}</strong><p>{item.description}</p></Link></li>)}</ul>{!filtered.length ? <p role="status" className="hk-admin-detail">No tools match. Try a different search.</p> : null}</details>
      <div className="hk-admin-content">{children}</div>
    </div>
  </div>;
}
