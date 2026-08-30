import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { eventSourceLabel } from '@/lib/event-sources/providers';
import {
  connectEventSource,
  retireEventSource,
  setPrimaryEventSource,
} from './actions';

export default async function EventSourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: event } = await supabase
    .from('events')
    .select('id,slug,name,owner_id,city,state,event_start_at')
    .eq('id', id)
    .single();

  if (!event || event.owner_id !== user.id) notFound();

  const { data: sources, error } = await supabase
    .from('event_sources')
    .select('*')
    .eq('event_id', id)
    .neq('relationship_status', 'retired')
    .order('is_primary_ticket_source', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/events" className="text-sm font-semibold text-white/55 hover:text-accent">← Events</Link>
        {event.slug ? <Link href={`/events/${event.slug}`} className="text-sm font-semibold text-white/55 hover:text-accent">View public event ↗</Link> : null}
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111620] to-black p-6 sm:p-9">
        <p className="hk-kicker">Distribution Network</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Connect where tickets already live.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/60">
          Keep HypeKnight as the discovery and experience layer while Eventbrite, Ticketmaster, or another provider handles checkout. One HypeKnight event can have multiple connected sources.
        </p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="font-bold text-white">{event.name}</p>
          <p className="mt-1 text-sm text-white/45">{[event.city, event.state].filter(Boolean).join(', ')}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <p className="hk-kicker">Connected Sources</p>
          <h2 className="mt-2 text-2xl font-black text-white">Ticket and registration links</h2>

          <div className="mt-5 space-y-3">
            {(sources || []).length ? (sources || []).map((source: any) => (
              <div key={source.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">{eventSourceLabel(source.provider)}</p>
                      {source.is_primary_ticket_source ? <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-black uppercase text-black">Primary</span> : null}
                      {source.is_verified ? <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-200">Verified</span> : <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white/40">Connected</span>}
                    </div>
                    <a href={source.provider_url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-white/50 hover:text-accent">{source.provider_url}</a>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!source.is_primary_ticket_source ? (
                    <form action={setPrimaryEventSource}>
                      <input type="hidden" name="event_id" value={id} /><input type="hidden" name="source_id" value={source.id} />
                      <button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/65 hover:border-accent/30">Make primary</button>
                    </form>
                  ) : null}
                  <form action={retireEventSource}>
                    <input type="hidden" name="event_id" value={id} /><input type="hidden" name="source_id" value={source.id} />
                    <button className="rounded-xl border border-red-400/15 px-3 py-2 text-xs font-bold text-red-200/70 hover:border-red-400/35">Disconnect</button>
                  </form>
                </div>
              </div>
            )) : <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-white/45">No external ticket source is connected yet.</p>}
          </div>
        </div>

        <form action={connectEventSource} className="rounded-[2rem] border border-accent/15 bg-accent/[0.055] p-5 sm:p-7">
          <input type="hidden" name="event_id" value={id} />
          <p className="hk-kicker">Add Source</p>
          <h2 className="mt-2 text-2xl font-black text-white">Paste the official event URL.</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">HypeKnight detects Eventbrite and Ticketmaster automatically. Other providers are accepted too.</p>
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/45">Event or ticket URL</span>
            <input name="provider_url" type="url" required placeholder="https://www.eventbrite.com/e/..." className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none focus:border-accent/40" />
          </label>
          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <input type="checkbox" name="is_primary_ticket_source" className="mt-1" />
            <span><span className="block font-bold text-white">Primary ticket source</span><span className="mt-1 block text-xs leading-5 text-white/45">Feature this provider first on the public event page.</span></span>
          </label>
          <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-4 font-black text-black hover:opacity-90">Connect Source</button>
        </form>
      </section>
    </section>
  );
}
