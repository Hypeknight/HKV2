import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues(
        id,
        name,
        slug,
        city,
        state,
        address
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .is('removed_at', null)
    .single();

  if (error || !event) notFound();

  const imageUrl = event.flyer_url || event.image_url || null;

  const locationLine = cleanJoin([
    event.venue_name || event.venue?.name,
    event.address || event.venue?.address,
    cleanJoin([event.city || event.venue?.city, event.state || event.venue?.state], ', '),
  ], ' • ');

  const music = Array.isArray(event.music_selection)
    ? event.music_selection
    : [];

  const vibes = Array.isArray(event.vibe_tags)
    ? event.vibe_tags
    : [];

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/events" className="text-sm text-white/60 hover:text-accent">
        ← Back to Events
      </Link>

      <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/5">
        {imageUrl ? (
          <div className="relative min-h-[320px] w-full overflow-hidden bg-black sm:min-h-[480px]">
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          </div>
        ) : null}

        <div className="p-8 sm:p-10">
          <div className="flex flex-wrap gap-2">
            <Chip label="HypeKnight Event" tone="accent" />
            {event.status ? <Chip label={event.status} tone="gray" /> : null}
            {event.event_type ? <Chip label={event.event_type} tone="gray" /> : null}
          </div>

          <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">
            {event.name}
          </h1>

          {event.description ? (
            <p className="mt-5 max-w-4xl text-lg text-white/75">
              {event.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {event.event_start_at ? (
              <InfoCard
                label="Starts"
                value={new Date(event.event_start_at).toLocaleString()}
              />
            ) : null}

            {event.event_end_at ? (
              <InfoCard
                label="Ends"
                value={new Date(event.event_end_at).toLocaleString()}
              />
            ) : null}

            {locationLine ? (
              <InfoCard label="Location" value={locationLine} />
            ) : null}

            {event.entry_price ? (
              <InfoCard label="Entry" value={event.entry_price} />
            ) : null}
          </div>
        </div>
      </section>

      {(music.length || vibes.length) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          {music.length ? (
            <Panel title="Music">
              <div className="flex flex-wrap gap-2">
                {music.map((item: string) => (
                  <Chip key={item} label={item} tone="gray" />
                ))}
              </div>
            </Panel>
          ) : null}

          {vibes.length ? (
            <Panel title="Vibe">
              <div className="flex flex-wrap gap-2">
                {vibes.map((item: string) => (
                  <Chip key={item} label={item} tone="gray" />
                ))}
              </div>
            </Panel>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <DetailPanel
          title="Event Details"
          items={[
            ['Dress Code', event.dress_code],
            ['Age Requirement', event.age_requirement],
            ['Smoking Policy', event.smoking_policy],
            ['Parking', event.parking_notes],
          ]}
        />

        <DetailPanel
          title="Venue"
          items={[
            ['Venue', event.venue_name || event.venue?.name],
            ['Address', event.address || event.venue?.address],
            ['City', cleanJoin([event.city || event.venue?.city, event.state || event.venue?.state], ', ')],
          ]}
        />

        <DetailPanel
          title="Notes"
          items={[
            ['Special Notes', event.special_notes],
            ['Linkd’N Mode', event.linkdn_mode && event.linkdn_mode !== 'none' ? event.linkdn_mode : null],
          ]}
        />
      </section>

      {(event.ticket_url || event.venue?.slug) ? (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white">Next Step</h2>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {event.ticket_url ? (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                Get Tickets
              </a>
            ) : null}

            {event.venue?.slug ? (
              <Link
                href={`/venues/${event.venue.slug}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-white hover:border-accent/40"
              >
                View Venue
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function cleanJoin(values: Array<string | null | undefined>, separator = ' ') {
  return values
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(separator);
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p className="mt-3 break-words text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DetailPanel({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string | null | undefined]>;
}) {
  const visibleItems = items.filter(([, value]) => value && String(value).trim());

  if (!visibleItems.length) return null;

  return (
    <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>

      <div className="mt-5 space-y-4">
        {visibleItems.map(([label, value]) => (
          <div key={label} className="border-b border-white/10 pb-4 last:border-0">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              {label}
            </p>
            <p className="mt-2 text-white/75">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: 'accent' | 'gray';
}) {
  const styles =
    tone === 'accent'
      ? 'border-accent/20 bg-accent/10 text-accent'
      : 'border-white/10 bg-white/5 text-white/65';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${styles}`}>
      {label}
    </span>
  );
}