import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEventBySlug } from '@/lib/data';
import { formatDateTime } from '@/lib/utils';

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">{formatDateTime(event.start_at)}</p>
        <h1 className="mt-3 text-4xl font-bold text-white">{event.name}</h1>
        <p className="mt-4 text-white/70">{event.excerpt || event.description}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold text-white">Venue</h2>
            {event.venue ? (
              <Link href={`/venues/${event.venue.slug}`} className="mt-2 block text-accent hover:underline">
                {event.venue.name}
              </Link>
            ) : (
              <p className="mt-2 text-white/60">Independent event</p>
            )}
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold text-white">Location</h2>
            <p className="mt-2 text-white/70">{event.address || `${event.city}, ${event.state}`}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold text-white">Age</h2>
            <p className="mt-2 text-white/70">{event.age_requirement || 'See venue policy'}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold text-white">Pricing</h2>
            <p className="mt-2 text-white/70">
              {event.price_min != null ? `$${event.price_min}` : 'TBD'}
              {event.price_max != null ? ` - $${event.price_max}` : ''}
            </p>
          </div>
        </div>
        {event.ticket_url ? (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 font-semibold text-black"
          >
            Get tickets
          </a>
        ) : null}
      </div>
    </section>
  );
}
