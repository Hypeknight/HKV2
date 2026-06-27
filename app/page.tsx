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

const LOGO_URL = '/hypeknight-logo.jpeg';

export default async function HomePage() {
  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const nextThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const startOfWeekend = new Date(now);
  startOfWeekend.setDate(startOfWeekend.getDate() + ((5 - startOfWeekend.getDay() + 7) % 7));
  startOfWeekend.setHours(0, 0, 0, 0);

  const endOfWeekend = new Date(startOfWeekend);
  endOfWeekend.setDate(endOfWeekend.getDate() + 3);

  const defaultCity = String(settings.homepage_default_city || 'Kansas City');
  const defaultState = String(settings.homepage_default_state || 'MO');

  const { data: hypeEvents } = await supabase
    .from('events')
    .select('*')
    .in('status', ['scheduled', 'active'])
    .eq('is_public', true)
    .is('removed_at', null)
    .lte('promotion_start_at', now.toISOString())
    .gte('promotion_end_at', now.toISOString())
    .order('event_start_at', { ascending: true })
    .limit(40);

  const { data: externalEvents } = await supabase
    .from('external_events')
    .select('*')
    .eq('status', 'active')
    .not('event_start_at', 'is', null)
    .or(
      `event_end_at.gte.${now.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
    )
    .order('event_start_at', { ascending: true })
    .limit(40);

  const allEvents = [
    ...(hypeEvents ?? []).map((event: any) => normalizeEvent(event, 'hypeknight')),
    ...(externalEvents ?? []).map((event: any) => normalizeEvent(event, 'external')),
  ].sort(sortByStartTime);

  const localEvents = allEvents.filter(
    (event) =>
      String(event.city || '').toLowerCase() === defaultCity.toLowerCase() &&
      String(event.state || '').toLowerCase() === defaultState.toLowerCase()
  );

  const discoverableEvents = localEvents.length ? localEvents : allEvents;

  const liveNowEvents = discoverableEvents
    .filter((event) => isLiveNow(event, now))
    .slice(0, Number(settings.homepage_live_now_limit || 6));

  const startingSoonEvents = discoverableEvents
    .filter((event) => {
      if (!event.event_start_at) return false;
      const start = new Date(event.event_start_at);
      return start > now && start <= nextThreeHours;
    })
    .slice(0, Number(settings.homepage_starting_soon_limit || 6));

  const recentlyAddedEvents = [...discoverableEvents]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, Number(settings.homepage_recently_added_limit || 6));

  const weekendEvents = discoverableEvents
    .filter((event) => isSameWindow(event.event_start_at, startOfWeekend, endOfWeekend))
    .slice(0, Number(settings.homepage_weekend_limit || 6));

  const cities = new Set(
    allEvents
      .map((event: any) => [event.city, event.state].filter(Boolean).join(', '))
      .filter(Boolean)
  );

  return (
    <section className="space-y-14 pb-16">
      <Hero
        settings={settings}
        defaultCity={defaultCity}
        defaultState={defaultState}
        liveCount={liveNowEvents.length}
        startingSoonCount={startingSoonEvents.length}
        totalCount={discoverableEvents.length}
      />

      {settings.homepage_use_location_prompt ? (
        <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">
                Showing events around {defaultCity}, {defaultState}
              </p>
              <p className="mt-1 text-white/65">
                Location-based discovery can be expanded later. For now, HypeKnight is using your default city from admin settings.
              </p>
            </div>

            <Link
              href={`/events?city=${encodeURIComponent(defaultCity)}&state=${encodeURIComponent(defaultState)}`}
              className="rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90"
            >
              Explore {defaultCity}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {settings.homepage_show_live_now ? (
          <FunMetric label="Live Now" value={String(liveNowEvents.length)} text="Events happening right now." />
        ) : null}

        {settings.homepage_show_starting_soon ? (
          <FunMetric label="Starting Soon" value={String(startingSoonEvents.length)} text="Events starting in the next 3 hours." />
        ) : null}

        {settings.homepage_show_hype_cities ? (
          <FunMetric label="Cities Showing" value={String(cities.size)} text="Places with event energy." />
        ) : null}

        {settings.homepage_show_recently_added ? (
          <FunMetric label="Recently Added" value={String(recentlyAddedEvents.length)} text="Fresh listings added to discovery." />
        ) : null}
      </section>

      <QuickSearch />

      <section className="grid gap-6 lg:grid-cols-3">
        <FeatureCard
          title="Find Events"
          text="Explore live, tonight, tomorrow, this week, and upcoming events around your area."
          href="/events"
          action="Explore Events"
        />

        <FeatureCard
          title="Promote Events"
          text="Create an event listing, submit it for review, and place it into HypeKnight discovery."
          href="/dashboard/events/new/step-1"
          action="Add an Event"
        />

        {settings.ambassador_program_enabled ? (
          <FeatureCard
            title="Ambassador Program"
            text="Approved ambassadors can request coupon codes, promote HypeKnight, and track eligible performance."
            href="/ambassadors"
            action="View Program"
          />
        ) : null}
      </section>

      {settings.homepage_show_live_now ? (
        <EventSection
          eyebrow="Here & Now"
          title="Live right now"
          text="Events currently happening. If no end time was provided, HypeKnight keeps it live for 4 hours after start."
          events={liveNowEvents}
          emptyText="Nothing is marked live right now."
          featured
        />
      ) : null}

      {settings.homepage_show_starting_soon ? (
        <EventSection
          eyebrow="Next Up"
          title="Starting soon"
          text="Events starting in the next few hours."
          events={startingSoonEvents}
          emptyText="No events are starting soon right now."
        />
      ) : null}

      {settings.homepage_show_recently_added ? (
        <EventSection
          eyebrow="Fresh"
          title="Recently added"
          text="New events added into HypeKnight discovery."
          events={recentlyAddedEvents}
          emptyText="No recently added events yet."
        />
      ) : null}

      {settings.homepage_show_weekend ? (
        <EventSection
          eyebrow="Weekend"
          title="This weekend"
          text="A quick look at what is coming up this weekend."
          events={weekendEvents}
          emptyText="No weekend events are showing yet."
        />
      ) : null}

      {settings.ambassador_program_enabled ? (
        <AmbassadorBanner settings={settings} />
      ) : null}

      <section className="rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">
          Hype Nights with HypeKnight
        </p>
        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black text-white">
          The night starts with knowing where to go.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          Explore what’s live, what’s starting soon, what’s coming next, and what matches your vibe.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/events" className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90">
            Start Discovering
          </Link>
          <Link href="/auth/sign-up" className="rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-white hover:border-accent/40">
            Create Profile
          </Link>
        </div>
      </section>
    </section>
  );
}

function Hero({
  settings,
  defaultCity,
  defaultState,
  liveCount,
  startingSoonCount,
  totalCount,
}: {
  settings: any;
  defaultCity: string;
  defaultState: string;
  liveCount: number;
  startingSoonCount: number;
  totalCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-8 py-16 sm:px-12 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.07),transparent_28%)]" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_380px] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-accent">
            HypeKnight • {defaultCity}, {defaultState}
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-7xl">
            What’s happening right now?
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-white/75">
            Discover what is live, starting soon, newly added, and coming up around your city.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/events" className="rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-black hover:opacity-90">
              Explore Events
            </Link>

            <Link href="/dashboard/events/new/step-1" className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-white hover:border-accent/40">
              Promote an Event
            </Link>

            <ShareButton title="HypeKnight" text="Find what’s happening here and now on HypeKnight." path="/" />
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
          <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
            <img src={LOGO_URL} alt="HypeKnight logo" className="h-full w-full object-contain p-4" />
          </div>

          <div className="mt-6 grid gap-3">
            <MiniStat label="Live Now" value={String(liveCount)} />
            <MiniStat label="Starting Soon" value={String(startingSoonCount)} />
            <MiniStat label="Discoverable Events" value={String(totalCount)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickSearch() {
  return (
    <section className="rounded-[2.75rem] border border-white/10 bg-white/5 p-8">
      <p className="text-sm uppercase tracking-[0.35em] text-accent">Quick Search</p>
      <h2 className="mt-3 text-3xl font-bold text-white">Find your move faster</h2>
      <p className="mt-3 max-w-3xl text-white/70">
        Search by city, nickname, state, music, venue, vibe, or event name.
      </p>

      <form action="/events" className="mt-8 grid gap-3 lg:grid-cols-[1fr_220px_160px_140px]">
        <input name="q" placeholder="Music, venue, vibe..." className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50" />
        <input name="city" placeholder="City or nickname: KC, STL..." className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50" />
        <input name="state" placeholder="State" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-accent/50" />
        <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90">Search</button>
      </form>
    </section>
  );
}

function EventSection({
  eyebrow,
  title,
  text,
  events,
  emptyText,
  featured = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  events: any[];
  emptyText: string;
  featured?: boolean;
}) {
  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.35em] text-accent">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-white/70">{text}</p>
      </div>

      {events.length ? (
        <div className={featured ? 'mt-8 grid gap-5 md:grid-cols-2' : 'mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3'}>
          {events.map((event: any) => (
            <EventCard key={`${event.source}-${event.id}`} event={event} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/60">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <Link href={event.href} className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:border-accent/40 hover:bg-white/[0.07]">
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} className="h-52 w-full object-cover" />
      ) : null}

      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">{event.source_label}</p>
        <h3 className="mt-3 text-2xl font-bold text-white group-hover:text-accent">{event.name}</h3>
        <p className="mt-3 text-white/60">{[event.city, event.state].filter(Boolean).join(', ') || event.venue_name || 'Location TBA'}</p>
        {event.event_start_at ? <p className="mt-2 text-sm text-white/50">{new Date(event.event_start_at).toLocaleString()}</p> : null}
        {event.description ? <p className="mt-4 line-clamp-3 text-sm text-white/65">{event.description}</p> : null}
        <p className="mt-6 text-sm font-medium text-accent">Open event →</p>
      </div>
    </Link>
  );
}

function AmbassadorBanner({ settings }: { settings: any }) {
  return (
    <section className="rounded-[2.75rem] border border-accent/20 bg-accent/10 p-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-accent">HypeKnight Ambassador Program</p>
          <h2 className="mt-3 text-4xl font-black text-wh