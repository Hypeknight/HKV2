/*
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle();

    viewerRole = profile?.app_role || 'user';
  }

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !event) notFound();

  const isOwner = !!user && event.owner_id === user.id;
  const isAdmin = viewerRole === 'admin';

  const canView =
    (event.is_public === true && event.status !== 'removed') ||
    isOwner ||
    isAdmin;

  if (!canView) notFound();

  const venue = event.venue_id
    ? (
        await supabase
          .from('venues')
          .select('id, name, slug, city, state, address')
          .eq('id', event.venue_id)
          .maybeSingle()
      ).data
    : null;

  const formattedStart = event.event_start_at
    ? new Date(event.event_start_at).toLocaleString()
    : 'Date pending';

  const formattedEnd = event.event_end_at
    ? new Date(event.event_end_at).toLocaleString()
    : null;

  const musicSelection = Array.isArray(event.music_selection)
    ? event.music_selection
    : [];

  const vibeTags = Array.isArray(event.vibe_tags)
    ? event.vibe_tags
    : [];

  const hasVenue = !!(venue?.name || event.venue_name);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_28%)]" />

            <div className="relative">
              <p className="text-sm uppercase tracking-[0.35em] text-accent">Event</p>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {event.name}
              </h1>

              <p className="mt-4 max-w-3xl text-white/75">
                {event.city}, {event.state}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <HeroStat label="Starts" value={formattedStart} />

                {hasVenue ? (
                  <>
                    <HeroStat
                      label="Venue"
                      value={venue?.name || event.venue_name || '—'}
                    />
                    <HeroStat
                      label="Address"
                      value={venue?.address || event.address || '—'}
                    />
                  </>
                ) : (
                  <HeroStat
                    label="Address"
                    value={event.address || '—'}
                  />
                )}
              </div>
            </div>
          </div>

          {event.flyer_url ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
              <img
                src={event.flyer_url}
                alt={event.name}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">About This Event</h2>
            <p className="mt-4 whitespace-pre-wrap text-white/75">
              {event.description || 'Event details coming soon.'}
            </p>
          </div>

          {(musicSelection.length > 0 || vibeTags.length > 0) && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">The Vibe</h2>

              <div className="mt-6 space-y-6">
                {musicSelection.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                      Music
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {musicSelection.map((item: string) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </div>
                  </div>
                )}

                {vibeTags.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                      Vibe Tags
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {vibeTags.map((item: string) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Event Details</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info label="Date / Time" value={formattedStart} />
              <Info label="Ends" value={formattedEnd || '—'} />
              <Info label="Age Requirement" value={event.age_requirement} />
              <Info label="Dress Code" value={event.dress_code} />
              <Info label="Entry" value={event.entry_price} />
              <Info label="Venue" value={venue?.name || event.venue_name} />
              <Info label="Address" value={venue?.address || event.address} />
              <Info label="City / State" value={`${event.city}, ${event.state}`} />
              <Info label="Smoking Policy" value={event.smoking_policy} />
              <Info label="Parking Notes" value={event.parking_notes} />
            </div>

            {event.special_notes ? (
              <Block label="Special Notes" value={event.special_notes} />
            ) : null}
          </div>

          {venue?.slug ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Venue Connection</h2>
              <p className="mt-4 text-white/75">
                This event is connected to {venue.name}. Explore the venue profile for more details,
                live interaction features, and future event history.
              </p>

              <div className="mt-6">
                <Link
                  href={`/venues/${venue.slug}`}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
                >
                  View Venue
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-white">Quick Look</h2>

            <div className="mt-6 space-y-4">
              <QuickRow label="When" value={formattedStart} />
              <QuickRow label="Where" value={venue?.name || event.venue_name || 'TBA'} />
              <QuickRow label="Location" value={`${event.city}, ${event.state}`} />
              <QuickRow label="Type" value={event.event_type || '—'} />
              <QuickRow label="Age" value={event.age_requirement || '—'} />
              <QuickRow label="Dress" value={event.dress_code || '—'} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-accent">Night Outlook</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Built for the right crowd</h2>
            <p className="mt-4 text-white/75">
              HypeKnight is designed to help users find events that match their energy,
              mood, and movement for the night.
            </p>
          </div>

          {(isOwner || isAdmin) && (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold text-white">Management Access</h2>

              <div className="mt-6 space-y-3">
                {isOwner && (
                  <Link
                    href={`/events/${event.slug}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                  >
                    Owner View
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-white hover:border-accent/40"
                  >
                    Open Admin Review
                  </Link>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-sm font-semibold text-white">{value || '—'}</p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 break-words text-white">{value || '—'}</p>
    </div>
  );
}

function Block({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-white">{value || '—'}</p>
    </div>
  );
}

function QuickRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-right text-white">{value || '—'}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
      {children}
    </span>
  );
}
  */

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
    .in('status', ['active', 'scheduled'])
    .neq('status', 'removed')
    .maybeSingle();

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