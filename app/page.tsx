/*
import Link from 'next/link';
import { getFeaturedVenues, getLiveOrTonightEvents, getUpcomingEvents } from '@/lib/data';

export default async function HomePage() {
  const [liveEvents, upcomingEvents, featuredVenues] = await Promise.all([
    getLiveOrTonightEvents(),
    getUpcomingEvents(),
    getFeaturedVenues(),
  ]);

  return (
    <section className="space-y-16 pb-16">
      <Hero />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            Happening now
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Tonight’s energy, without the guesswork
          </h2>
          <p className="mt-4 max-w-2xl text-white/70">
            HypeKnight helps people find the venues and events that are actually active,
            visible, and ready right now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Live Tonight" value={String(liveEvents.length)} />
            <StatCard label="Upcoming Events" value={String(upcomingEvents.length)} />
            <StatCard label="Active Venues" value={String(featuredVenues.length)} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-accent/20 bg-accent/10 p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-accent">
            HypeKnight
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Hype Nights with HypeKnight
          </h2>
          <p className="mt-4 text-white/75">
            Built for the traveler, the free spirit, and the person who wants the right vibe
            without wasting time.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90"
            >
              Explore Events
            </Link>
            <Link
              href="/venues"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-white hover:border-accent/40"
            >
              Browse Venues
            </Link>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Live now"
          title="Events coming up soon"
          text="Only events that are public, approved, and currently inside their active HypeKnight window."
        />

        {liveEvents.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {liveEvents.map((event) => (
              <EventCard key={event.id} event={event} featured />
            ))}
          </div>
        ) : (
          <EmptyCard text="No live or near-term events are showing right now." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Venues"
          title="Active venues on HypeKnight"
          text="Only venues that are active and visible are shown here."
        />

        {featuredVenues.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : (
          <EmptyCard text="No active venues are available yet." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Next up"
          title="Upcoming events in motion"
          text="Approved, active, and currently searchable events scheduled ahead."
        />

        {upcomingEvents.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcomingEvents.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyCard text="No upcoming events are visible right now." />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <InfoPanel
          title="Find the right vibe"
          text="Filter toward what actually matters: energy, music, venue style, and what is happening now."
        />
        <InfoPanel
          title="Built for nightlife movement"
          text="HypeKnight focuses on active windows, live interaction, and venues that are ready to be discovered."
        />
        <InfoPanel
          title="Designed to grow into Linkd'N"
          text="Comments, music requests, presence, and live venue interaction are already shaping the next layer."
        />
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">Start moving</p>
        <h2 className="mt-3 text-4xl font-bold text-white">
          Discover the next spot before everyone else does
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          HypeKnight is built to connect people to the venues and events that actually fit
          their night.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            View Events
          </Link>
          <Link
            href="/venues"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40"
          >
            View Venues
          </Link>
        </div>
      </section>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-8 py-16 sm:px-12 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_28%)]" />

      <div className="relative max-w-4xl">
        <p className="text-sm uppercase tracking-[0.4em] text-accent">HypeKnight</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
          Find the night that fits you.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/75">
          HypeKnight helps people discover active events and venues with real energy,
          real timing, and a better shot at the perfect night out.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Explore Live Events
          </Link>
          <Link
            href="/venues"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white hover:border-accent/40"
          >
            Explore Active Venues
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm uppercase tracking-[0.35em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-white/70">{text}</p>
    </div>
  );
}

function EventCard({
  event,
  featured,
}: {
  event: any;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group block rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-accent/40 hover:bg-white/[0.07] ${
        featured ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.04)]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Event</p>
          <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
            {event.name}
          </h3>
        </div>

        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
          Active
        </div>
      </div>

      <p className="mt-4 text-white/65">
        {event.city}, {event.state}
      </p>

      <p className="mt-2 text-sm text-white/55">
        {event.event_start_at ? new Date(event.event_start_at).toLocaleString() : 'Date pending'}
      </p>

      {event.description ? (
        <p className="mt-4 line-clamp-3 text-sm text-white/70">{event.description}</p>
      ) : (
        <p className="mt-4 text-sm text-white/45">No description added yet.</p>
      )}

      <div className="mt-6 text-sm font-medium text-accent">Open event →</div>
    </Link>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Venue</p>
          <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">
            {venue.name}
          </h3>
        </div>

        {venue.is_featured ? (
          <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent">
            Featured
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-white/65">
        {venue.city}, {venue.state}
      </p>

      {venue.description ? (
        <p className="mt-4 line-clamp-3 text-sm text-white/70">{venue.description}</p>
      ) : (
        <p className="mt-4 text-sm text-white/45">Venue details coming soon.</p>
      )}

      <div className="mt-6 text-sm font-medium text-accent">Open venue →</div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
      <h3 className="text-2xl font-bold text-white">{title}</h3>
      <p className="mt-4 text-white/70">{text}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">
      {text}
    </div>
  );
}
  */
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ShareButton from '@/components/ShareButton';
import { getPlatformSettings } from '@/lib/settings';
import { normalizeState } from '@/lib/states';

const LOGO_URL = '/hypeknight-logo.jpeg';

const VIBES = [
  { label: 'Live Music', emoji: '🎸', terms: ['music', 'concert', 'live music', 'rock', 'jazz', 'blues'] },
  { label: 'Country', emoji: '🤠', terms: ['country'] },
  { label: 'Hip-Hop', emoji: '🎤', terms: ['hip-hop', 'hip hop', 'rap'] },
  { label: 'Sports', emoji: '🏟️', terms: ['sports', 'soccer', 'football', 'baseball', 'basketball'] },
  { label: 'Theater', emoji: '🎭', terms: ['theater', 'arts', 'broadway'] },
  { label: 'Festivals', emoji: '🎡', terms: ['festival', 'fair', 'fairs'] },
  { label: 'Comedy', emoji: '😂', terms: ['comedy'] },
  { label: 'Family', emoji: '👨‍👩‍👧', terms: ['family', 'kids'] },
];

export default async function HomePage() {
  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const serverNow = new Date();
  const fourHoursAgo = new Date(serverNow.getTime() - 4 * 60 * 60 * 1000);

  const { data: hypeEvents } = await supabase
    .from('events')
    .select('*')
    .in('status', ['scheduled', 'active'])
    .eq('is_public', true)
    .is('removed_at', null)
    .lte('promotion_start_at', serverNow.toISOString())
    .gte('promotion_end_at', serverNow.toISOString())
    .order('event_start_at', { ascending: true })
    .limit(60);

  const { data: externalEvents } = await supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .not('event_start_at', 'is', null)
    .or(
      `event_end_at.gte.${serverNow.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
    )
    .order('event_start_at', { ascending: true })
    .limit(60);

  const { data: specialDays } = await supabase
    .from('special_days')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('starts_on', { ascending: true })
    .limit(Number(settings.homepage_special_days_limit || 6));

  const allEvents = [
    ...(hypeEvents ?? []).map((event: any) => normalizeEvent(event, 'hypeknight')),
    ...(externalEvents ?? []).map((event: any) => normalizeEvent(event, 'external')),
  ].sort(sortByStartTime);

  const cityCounts = buildCityCounts(allEvents);
  const liveNowEvents = allEvents.filter((event) => isLiveNow(event)).slice(0, 8);
  const startingSoonEvents = allEvents.filter((event) => isStartingSoon(event)).slice(0, 8);
  const weekendEvents = allEvents.filter((event) => isWeekendInEventTime(event)).slice(0, 8);
  const recentlyAddedEvents = [...allEvents]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 8);

  const vibeCards = VIBES.map((vibe) => ({
    ...vibe,
    count: allEvents.filter((event) => eventMatchesTerms(event, vibe.terms)).length,
    href: `/events?q=${encodeURIComponent(vibe.terms[0])}`,
  })).filter((vibe) => vibe.count > 0);

  const surpriseEvent = allEvents.length
    ? allEvents[Math.floor(allEvents.length / 2)]
    : null;

  return (
    <section className="space-y-8 pb-12 sm:space-y-12 sm:pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-5 py-8 sm:rounded-[3rem] sm:px-10 sm:py-14 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              HypeKnight Discovery
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Tonight starts here.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Find live events, fresh drops, city vibes, themed moments, and
              what’s starting soon — without digging through five different apps.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row [&_a]:w-full sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
              <Link
                href="/events"
                className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                Explore Tonight
              </Link>

              {surpriseEvent ? (
                <Link
                  href={surpriseEvent.href}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40"
                >
                  🎲 Surprise Me
                </Link>
              ) : null}

              <ShareButton
                title="HypeKnight"
                text="Find what’s happening here and now on HypeKnight."
                path="/"
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.5rem] sm:p-8">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 sm:h-36 sm:w-36 sm:rounded-[2rem]">
              <img
                src={LOGO_URL}
                alt="HypeKnight logo"
                className="h-full w-full object-contain p-3"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Live" value={String(liveNowEvents.length)} />
              <MiniStat label="Soon" value={String(startingSoonEvents.length)} />
              <MiniStat label="Cities" value={String(cityCounts.length)} />
              <MiniStat label="Events" value={String(allEvents.length)} />
            </div>
          </div>
        </div>
      </section>

      <QuickSearch />

      {vibeCards.length ? (
        <DiscoveryVibes vibes={vibeCards} />
      ) : null}

      {cityCounts.length ? (
        <ActiveCities cityCounts={cityCounts} />
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <FunMetric label="Live Now" value={String(liveNowEvents.length)} text="Happening now." />
        <FunMetric label="Starting Soon" value={String(startingSoonEvents.length)} text="Next 3 hours." />
        <FunMetric label="Active Cities" value={String(cityCounts.length)} text="Places with energy." />
        <FunMetric label="Fresh Drops" value={String(recentlyAddedEvents.length)} text="Recently added." />
      </section>

      {liveNowEvents.length ? (
        <EventRail
          eyebrow="Here & Now"
          title="Live right now"
          text="Events currently happening based on each event city’s local time."
          events={liveNowEvents}
        />
      ) : null}

      {startingSoonEvents.length ? (
        <EventRail
          eyebrow="Next Up"
          title="Starting soon"
          text="Events starting in the next few hours."
          events={startingSoonEvents}
        />
      ) : null}

      {recentlyAddedEvents.length ? (
        <EventRail
          eyebrow="Fresh"
          title="Recently added"
          text="New events added into HypeKnight discovery."
          events={recentlyAddedEvents}
        />
      ) : null}

      {weekendEvents.length ? (
        <EventRail
          eyebrow="Weekend"
          title="This weekend"
          text="A quick look at what is coming up this weekend."
          events={weekendEvents}
        />
      ) : null}

      {settings.homepage_show_special_days ? (
        <SpecialDaysSection specialDays={specialDays ?? []} />
      ) : null}

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-accent/15 to-white/5 p-6 sm:rounded-[2.75rem] sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
              Build the map with us
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
              Know about an event? Put it on HypeKnight.
            </h2>
            <p className="mt-4 max-w-3xl text-sm text-white/75 sm:text-base">
              During beta, event posting helps us build a better way to find
              what’s happening. Use code <span className="font-bold text-accent">HYPEKC</span> to post free where available.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/events/new/step-1"
                className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90"
              >
                Post an Event
              </Link>
              <Link
                href="/ambassadors"
                className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-white hover:border-accent/40"
              >
                Become an Ambassador
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 text-center">
            <p className="text-5xl font-black text-white">Beta</p>
            <p className="mt-2 text-white/65">Help nightlife get easier to find.</p>
          </div>
        </div>
      </section>
    </section>
  );
}

function QuickSearch() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2.75rem] sm:p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
        Quick Search
      </p>
      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
        Search less. Discover faster.
      </h2>

      <form
        action="/events"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_160px_140px]"
      >
        <input
          name="q"
          placeholder="Music, venue, vibe..."
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
        />
        <input
          name="city"
          placeholder="City or nickname..."
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
        />
        <input
          name="state"
          placeholder="State"
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50"
        />
        <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 sm:col-span-2 lg:col-span-1">
          Search
        </button>
      </form>
    </section>
  );
}

function DiscoveryVibes({ vibes }: { vibes: any[] }) {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            What’s your vibe?
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
            Browse by what you feel like doing.
          </h2>
        </div>
        <Link href="/events" className="text-sm text-white/55 hover:text-accent">
          View all events →
        </Link>
      </div>

      <div className="mt-5 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {vibes.map((vibe) => (
          <Link
            key={vibe.label}
            href={vibe.href}
            className="min-w-[72%] rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:border-accent/40 sm:min-w-0"
          >
            <p className="text-4xl">{vibe.emoji}</p>
            <h3 className="mt-4 text-xl font-black text-white">{vibe.label}</h3>
            <p className="mt-2 text-sm text-white/60">{vibe.count} events</p>
            <p className="mt-5 text-sm font-semibold text-accent">Explore →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActiveCities({ cityCounts }: { cityCounts: any[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
        Active Cities
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
        Pick a city. Find the move.
      </h2>

      <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
        {cityCounts.slice(0, 12).map((item) => (
          <Link
            key={`${item.city}-${item.state}`}
            href={`/events?city=${encodeURIComponent(item.city)}&state=${encodeURIComponent(item.state)}`}
            className="shrink-0 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70 hover:border-accent/40 hover:text-accent"
          >
            {item.city}, {item.state}
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-black">
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventRail({
  eyebrow,
  title,
  text,
  events,
}: {
  eyebrow: string;
  title: string;
  text: string;
  events: any[];
}) {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm text-white/70 sm:text-base">{text}</p>
        </div>
        <p className="text-sm text-white/45">{events.length} showing • Swipe →</p>
      </div>

      <div className="relative">
        <div className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={`${event.source}-${event.id}`} event={event} />
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-5 h-[calc(100%-1.25rem)] w-12 bg-gradient-to-l from-black to-transparent sm:hidden" />
      </div>
    </section>
  );
}

function EventCard({ event }: { event: any }) {
  const live = isLiveNow(event);

  return (
    <Link
      href={event.href}
      className="group block min-w-[78vw] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07] sm:min-w-0 sm:rounded-[2rem]"
    >
      <div className="relative">
        {event.image_url ? (
          <img src={event.image_url} alt={event.name} className="h-44 w-full object-cover sm:h-52" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-black/30 text-white/40 sm:h-52">
            No image
          </div>
        )}

        {live ? (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Live
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent sm:text-xs">
          {event.source_label}
        </p>
        <h3 className="mt-3 text-xl font-black leading-tight text-white group-hover:text-accent sm:text-2xl">
          {event.name}
        </h3>
        <p className="mt-3 text-sm text-white/60">
          {[event.city, event.state].filter(Boolean).join(', ') || event.venue_name || 'Location TBA'}
        </p>
        {event.event_start_at ? (
          <p className="mt-2 text-sm text-white/50">{formatEventTime(event)}</p>
        ) : null}
        {event.description ? (
          <p className="mt-4 line-clamp-2 text-sm text-white/65">{event.description}</p>
        ) : null}
        <p className="mt-5 text-sm font-semibold text-accent">Open event →</p>
      </div>
    </Link>
  );
}

function normalizeEvent(event: any, source: 'hypeknight' | 'external') {
  return {
    id: event.id,
    name: event.name,
    city: event.city,
    state: normalizeState(String(event.state || '')),
    description: event.description,
    event_start_at: event.event_start_at,
    event_end_at: event.event_end_at,
    image_url: event.flyer_url || event.image_url,
    href: source === 'hypeknight' ? `/events/${event.slug}` : `/events/external/${event.id}`,
    source,
    source_label:
      source === 'hypeknight'
        ? 'HypeKnight Event'
        : event.source_code === 'ticketmaster'
        ? 'Ticketmaster'
        : event.source_code || 'External Event',
    venue_name: event.venue_name,
    genre: event.genre || event.event_type,
    classification: event.classification || event.segment,
    created_at: event.created_at,
  };
}

function eventMatchesTerms(event: any, terms: string[]) {
  const haystack = [
    event.name,
    event.description,
    event.genre,
    event.classification,
    event.source_label,
    event.venue_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function buildCityCounts(events: any[]) {
  const map = new Map<string, { city: string; state: string; count: number }>();

  for (const event of events) {
    const city = String(event.city || '').trim();
    const state = normalizeState(String(event.state || ''));

    if (!city || !state) continue;

    const key = `${city.toLowerCase()}-${state}`;
    const existing = map.get(key);

    if (existing) existing.count += 1;
    else map.set(key, { city, state, count: 1 });
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function getTimeZoneForEvent(event: any) {
  const city = String(event.city || '').toLowerCase();
  const state = normalizeState(String(event.state || ''));

  if (state === 'MO' || state === 'KS' || state === 'IL' || state === 'TX') return 'America/Chicago';
  if (state === 'NY' || state === 'GA' || state === 'FL') return 'America/New_York';
  if (state === 'NV' || state === 'CA') return 'America/Los_Angeles';
  if (city.includes('denver')) return 'America/Denver';

  return 'America/Chicago';
}

function getZonedNow(timeZone: string) {
  return new Date(new Date().toLocaleString('en-US', { timeZone }));
}

function getZonedDate(value: string | null | undefined, timeZone: string) {
  if (!value) return null;
  return new Date(new Date(value).toLocaleString('en-US', { timeZone }));
}

function getEventWindow(event: any) {
  const timeZone = getTimeZoneForEvent(event);
  const now = getZonedNow(timeZone);
  const start = getZonedDate(event.event_start_at, timeZone);

  if (!start) return null;

  const end =
    getZonedDate(event.event_end_at, timeZone) ||
    new Date(start.getTime() + 4 * 60 * 60 * 1000);

  return { now, start, end };
}

function isLiveNow(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;
  return window.now >= window.start && window.now <= window.end;
}

function isStartingSoon(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const nextThreeHours = new Date(window.now.getTime() + 3 * 60 * 60 * 1000);
  return window.start > window.now && window.start <= nextThreeHours;
}

function isWeekendInEventTime(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;

  const start = new Date(window.now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + ((5 - start.getDay() + 7) % 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  return window.start >= start && window.start < end;
}

function sortByStartTime(a: any, b: any) {
  const aTime = a.event_start_at ? new Date(a.event_start_at).getTime() : Infinity;
  const bTime = b.event_start_at ? new Date(b.event_start_at).getTime() : Infinity;
  return aTime - bTime;
}

function formatEventTime(event: any) {
  if (!event.event_start_at) return null;

  return new Date(event.event_start_at).toLocaleString('en-US', {
    timeZone: getTimeZoneForEvent(event),
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 sm:text-xs">{label}</p>
      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">{value}</p>
    </div>
  );
}

function FunMetric({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2rem] sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 sm:text-xs">{label}</p>
      <p className="mt-3 text-3xl font-black text-white sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs text-white/60 sm:text-sm">{text}</p>
    </div>
  );
}

function SpecialDaysSection({ specialDays }: { specialDays: any[] }) {
  if (!specialDays.length) return null;

  return (
    <section>
      <p className="text-xs uppercase tracking-[0.3em] text-accent sm:text-sm">
        HypeKnight Calendar
      </p>
      <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
        Browse by special days and themes.
      </h2>

      <div className="mt-5 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
        {specialDays.map((day) => (
          <Link
            key={day.id}
            href={`/calendar/${day.slug}`}
            className="block min-w-[78vw] rounded-[1.75rem] border border-accent/20 bg-accent/10 p-5 transition hover:border-accent/40 sm:min-w-0 sm:rounded-[2rem]"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent sm:text-xs">
              {day.category || 'Theme'}
            </p>
            <h3 className="mt-3 text-xl font-black leading-tight text-white sm:text-2xl">
              {day.name}
            </h3>
            <p className="mt-3 text-sm text-white/55">
              {formatCalendarDate(day.starts_on)}
              {day.ends_on ? ` – ${formatCalendarDate(day.ends_on)}` : ''}
            </p>
            <p className="mt-5 text-sm font-semibold text-accent">
              View themed events →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatCalendarDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}