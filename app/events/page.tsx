import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: events, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('status', 'active')
    .eq('is_public', true)
    .is('removed_at', null)
    .gte('event_start_at', now)
    .order('event_start_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <section className="space-y-10">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Events</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Active Events on HypeKnight</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Browse events that are approved, public, and currently active inside their HypeKnight visibility window.
        </p>
      </div>

      {events?.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group block rounded-[2rem] border border-white/10 bg-white/5 p-6 hover:border-accent/40 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-accent">Event</p>
                  <h2 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
                    {event.name}
                  </h2>
                </div>

                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/60">
                  {event.status}
                </div>
              </div>

              <p className="mt-4 text-white/65">
                {event.city}, {event.state}
              </p>

              <p className="mt-2 text-sm text-white/55">
                {event.event_start_at
                  ? new Date(event.event_start_at).toLocaleString()
                  : 'Date pending'}
              </p>

              {event.description ? (
                <p className="mt-4 line-clamp-3 text-sm text-white/70">{event.description}</p>
              ) : (
                <p className="mt-4 text-sm text-white/45">No description added yet.</p>
              )}

              <div className="mt-6 text-sm font-medium text-accent">Open event →</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
          No active events are available right now.
        </div>
      )}
    </section>
  );
}