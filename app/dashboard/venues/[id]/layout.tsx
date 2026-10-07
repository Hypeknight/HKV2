import Link from 'next/link';
import type { ReactNode } from 'react';
import { getVenueCommandContext } from '@/lib/venues/command-center';

export default async function VenueCommandLayout({ children, params }: {
  children: ReactNode; params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { venue } = await getVenueCommandContext(id);
  const root = '/dashboard/venues/' + id;
  const sections = [
    ['Overview', root], ['Profile', root + '/profile'], ['Events', root + '/events'],
    ['Presence', root + '/presence'], ['Analytics', root + '/analytics'],
    ['Management', root + '/management'], ['Intelligence', root + '/intelligence'],
  ];
  return <div>
    <header className="mx-auto max-w-7xl space-y-4 px-4 pt-8 text-white">
      <Link href="/dashboard/venues" className="text-accent">← My Venues</Link>
      <p className="text-sm uppercase tracking-widest">Venue Command Center · {venue.name}</p>
      <nav aria-label="Venue Command Center" className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
        {sections.map(([label, href]) => <Link key={label} href={href} className="rounded-xl border border-white/20 px-4 py-2 hover:border-accent">{label}</Link>)}
      </nav>
    </header>
    {children}
  </div>;
}
