import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { importTicketmasterEvents } from './actions';

export default async function AdminExternalEventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const { data: events, error } = await supabase
    .from('external_events')
    .select('*')
    .order('event_start_at', { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Admin</p>
        <h1 className="mt-3 text-4xl font-bold text-white">
          External Event Discovery
        </h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Search and import Ticketmaster events to supplement cities with low HypeKnight event inventory.
        </p>
      </div>

      <div className="mb-10 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Manual Ticketmaster Search</h2>

        <form action={importTicketmasterEvents} className="mt-6 grid gap-4 md:grid-cols-4">
          <input
            name="city"
            placeholder="City"
            required
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <input
            name="state"
            placeholder="State, e.g. MO"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <input
            name="keyword"
            placeholder="Keyword, optional"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
          >
            Import Events
          </button>
        </form>
      </div>

      <div className="space-y-5">
        {(events ?? []).map((event) => (
          <div
            key={event.id}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
          >
            <div className="grid gap-5 lg:grid-cols-[160px_1fr_220px]">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center text-white/40">
                    No image
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-accent">
                  {event.source_code}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">{event.name}</h2>
                <p className="mt-2 text-white/65">
                  {event.venue_name || 'Venue TBA'} • {event.city}, {event.state}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {event.event_start_at ? new Date(event.event_start_at).toLocaleString() : 'Date TBA'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {event.source_url ? (
                  <a
                    href={event.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-white hover:border-accent/40"
                  >
                    Source Event
                  </a>
                ) : null}

                <Link
                  href={`/events/external/${event.id}`}
                  className="rounded-2xl bg-accent px-4 py-3 text-center font-semibold text-black hover:opacity-90"
                >
                  View HypeKnight Page
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}