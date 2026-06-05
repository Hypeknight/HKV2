import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExternalEventPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('external_events')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !event) notFound();

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          External Event
        </p>

        <h1 className="mt-3 text-5xl font-black text-white">{event.name}</h1>

        <p className="mt-4 text-white/70">
          {event.venue_name || 'Venue TBA'} • {event.city}, {event.state}
        </p>

        <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100">
          This event was discovered from {event.source_code}. It is not originally hosted or managed by HypeKnight.
        </div>

        {event.image_url ? (
          <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10">
            <img src={event.image_url} alt={event.name} className="w-full object-cover" />
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Info label="Date" value={event.event_start_at ? new Date(event.event_start_at).toLocaleString() : 'TBA'} />
          <Info label="Venue" value={event.venue_name} />
          <Info label="City / State" value={`${event.city}, ${event.state}`} />
          <Info label="Source" value={event.source_code} />
          <Info label="Genre" value={event.genre} />
          <Info label="Classification" value={event.classification} />
        </div>

        {event.description ? (
          <p className="mt-8 whitespace-pre-wrap text-white/75">
            {event.description}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {event.source_url ? (
            <a
              href={event.source_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              View on Source
            </a>
          ) : null}

          <Link
            href="/events"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 text-white">{value || '—'}</p>
    </div>
  );
}