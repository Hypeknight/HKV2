import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import { normalizeState } from '@/lib/states';
import TrackView from '@/components/analytics/TrackView';
import SignalLink from '@/components/analytics/SignalLink';
import DiscoveryCommandBar from '@/components/discovery/DiscoveryCommandBar';
import { EventRail, SectionHeader } from '@/components/ui';

const VIBES = [
  { label: 'Turn Up', emoji: '✦', value: 'turn-up', terms: ['club', 'party', 'dance', 'nightlife', 'dj'] },
  { label: 'Hip-Hop', emoji: '♫', value: 'hip-hop', terms: ['hip-hop', 'hip hop', 'rap'] },
  { label: 'Live Music', emoji: '♪', value: 'music', terms: ['music', 'concert', 'live music', 'rock', 'jazz', 'blues'] },
  { label: 'Date Night', emoji: '♡', value: 'date-night', terms: ['date', 'romance', 'dinner', 'lounge'] },
  { label: 'Sports', emoji: '◉', value: 'sports', terms: ['sports', 'soccer', 'football', 'baseball', 'basketball'] },
  { label: 'Comedy', emoji: '☺', value: 'comedy', terms: ['comedy'] },
  { label: 'Festivals', emoji: '◇', value: 'festivals', terms: ['festival', 'fair', 'fairs'] },
  { label: 'Family', emoji: '☆', value: 'family', terms: ['family', 'kids'] },
];

export default async function HomePage() {
  const supabase = await createClient();
  const settings = await getPlatformSettings();

  const serverNow = new Date();
  const fourHoursAgo = new Date(serverNow.getTime() - 4 * 60 * 60 * 1000);

  const [{ data: hypeEvents }, { data: externalEvents }, { data: specialDays }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .in('status', ['scheduled', 'active'])
      .eq('is_public', true)
      .is('removed_at', null)
      .lte('promotion_start_at', serverNow.toISOString())
      .gte('promotion_end_at', serverNow.toISOString())
      .order('event_start_at', { ascending: true })
      .limit(80),
    supabase
      .from('external_events')
      .select('*')
      .eq('status', 'active')
      .not('event_start_at', 'is', null)
      .or(
        `event_end_at.gte.${serverNow.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
      )
      .order('event_start_at', { ascending: true })
      .limit(80),
    supabase
      .from('special_days')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('starts_on', { ascending: true })
      .limit(Number(settings.homepage_special_days_limit || 6)),
  ]);

  const allEvents = [
    ...(hypeEvents ?? []).map((event: any) => normalizeEvent(event, 'hypeknight')),
    ...(externalEvents ?? []).map((event: any) => normalizeEvent(event, 'external')),
  ].sort(sortByStartTime);

  const cityCounts = buildCityCounts(allEvents);
  const liveNowEvents = allEvents.filter(isLiveNow).slice(0, 8);
  const startingSoonEvents = allEvents.filter(isStartingSoon).slice(0, 8);
  const tonightEvents = allEvents.filter(isTodayInEventTime).slice(0, 8);
  const weekendEvents = allEvents.filter(isWeekendInEventTime).slice(0, 8);
  const recentlyAddedEvents = [...allEvents]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 8);

  const vibeCards = VIBES.map((vibe) => ({
    ...vibe,
    count: allEvents.filter((event) => eventMatchesTerms(event, vibe.terms)).length,
    href: `/events?vibe=${encodeURIComponent(vibe.value)}`,
  })).filter((vibe) => vibe.count > 0);

  const surpriseEvent = allEvents.length ? allEvents[Math.floor(allEvents.length / 2)] : null;
  const primaryMarket = cityCounts[0] ?? null;

  return (
    <>
      <TrackView pageType="homepage" path="/" />

      <div className="space-y-10 pb-20 sm:space-y-14 sm:pb-16">
        <section className="relative -mx-4 overflow-hidden border-b border-white/[0.07] px-4 pb-8 pt-5 sm:-mx-6 sm:px-6 sm:pb-12 lg:-mx-8 lg:px-8 lg:pt-8">
          <div className="hk-hero-orb hk-hero-orb-one" />
          <div className="hk-hero-orb hk-hero-orb-two" />

          <div className="relative mx-auto grid max-w-[1500px] gap-8 xl:grid-cols-[minmax(0,1.15fr)_420px] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="hk-kicker">HypeKnight Discovery</span>
                {primaryMarket ? (
                  <SignalLink
                    href={`/events?city=${encodeURIComponent(primaryMarket.city)}&state=${encodeURIComponent(primaryMarket.state)}`}
                    signal={{
                      signalType: 'market_selected',
                      subjectType: 'market',
                      subjectId: `${primaryMarket.city},${primaryMarket.state}`,
                      city: primaryMarket.city,
                      state: primaryMarket.state,
                      source: 'homepage',
                      surface: 'hero_market_context',
                      verificationLevel: 'declared',
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/55 hover:border-accent/30 hover:text-white"
                  >
                    ◎ {primaryMarket.city}, {primaryMarket.state}
                  </SignalLink>
                ) : null}
              </div>

              <h1 className="mt-5 max-w-5xl text-[clamp(3rem,8vw,7.4rem)] font-black leading-[0.86] tracking-[-0.055em] text-white">
                What are you
                <span className="block bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent">
                  doing tonight?
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
                Find the event, venue, music, crowd, and vibe that fit your night — then let HypeKnight get smarter from the choices people actually make.
              </p>

              <div className="mt-7 max-w-5xl">
                <DiscoveryCommandBar />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <IntentChip label="Live now" href="/events?when=live" signalId="live" />
                <IntentChip label="Starting soon" href="/events?when=soon" signalId="soon" />
                <IntentChip label="Tonight" href="/events?when=tonight" signalId="tonight" />
                <IntentChip label="This weekend" href="/events?when=weekend" signalId="weekend" />
                {surpriseEvent ? (
                  <SignalLink
                    href={surpriseEvent.href}
                    signal={{
                      signalType: 'surprise_requested',
                      subjectType: 'event',
                      subjectId: surpriseEvent.id,
                      eventId: surpriseEvent.source === 'hypeknight' ? surpriseEvent.id : null,
                      source: 'homepage',
                      surface: 'hero_intents',
                      verificationLevel: 'declared',
                      metadata: {
                        presented_event_id: surpriseEvent.id,
                        presented_source: surpriseEvent.source,
                      },
                    }}
                    className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-black text-accent hover:bg-accent/15"
                  >
                    🎲 Surprise me
                  </SignalLink>
                ) : null}
              </div>
            </div>

            <aside className="hk-glass-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="hk-kicker">Right now</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">The night at a glance</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <img src="/hypeknight-logo.jpeg" alt="HypeKnight" className="h-full w-full object-cover" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <SnapshotMetric label="Live now" value={liveNowEvents.length} note="confirmed by schedule" tone="live" />
                <SnapshotMetric label="Starting soon" value={startingSoonEvents.length} note="next 3 hours" />
                <SnapshotMetric label="Tonight" value={tonightEvents.length} note="active inventory" />
                <SnapshotMetric label="Markets" value={cityCounts.length} note="with visible events" />
              </div>

              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_20px_rgba(244,180,0,.55)]" />
                  <div>
                    <p className="text-sm font-bold text-white">Signal-ready discovery</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">
                      Searches, vibes, saves, Going, directions, Pulse, and other meaningful choices help HypeKnight learn what the market is actually considering.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {liveNowEvents.length || startingSoonEvents.length ? (
          <section className="hk-glass-panel overflow-hidden">
            <div className="grid md:grid-cols-[220px_1fr]">
              <div className="border-b border-white/[0.07] bg-accent/[0.08] p-5 md:border-b-0 md:border-r md:p-6">
                <p className="hk-kicker">Here & now</p>
                <h2 className="mt-2 text-2xl font-black text-white">Move with the night.</h2>
                <p className="mt-2 text-sm leading-6 text-white/48">Start with what is live or almost live instead of scrolling everything.</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-white/[0.07] sm:grid-cols-4">
                <SignalStat label="Live" value={liveNowEvents.length} href="/events?when=live" signalId="live" />
                <SignalStat label="Soon" value={startingSoonEvents.length} href="/events?when=soon" signalId="soon" />
                <SignalStat label="Tonight" value={tonightEvents.length} href="/events?when=tonight" signalId="tonight" />
                <Link href="/events" className="bg-[#0c0f14] p-5 transition hover:bg-white/[0.04] sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">All discovery</p>
                  <p className="mt-3 text-2xl font-black text-white">{allEvents.length}</p>
                  <p className="mt-1 text-xs text-white/40">visible events →</p>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {vibeCards.length ? <DiscoveryVibes vibes={vibeCards} /> : null}
        {cityCounts.length ? <ActiveMarkets cityCounts={cityCounts} /> : null}

        <EventRail
          id="live"
          eyebrow="Here & Now"
          title="Live right now"
          text="Scheduled events whose current time window says they are happening now."
          events={liveNowEvents}
          emptyText="Nothing is showing as live right now."
          href="/events?when=live"
          action="See live"
        />

        <EventRail
          id="soon"
          eyebrow="Next move"
          title="Starting soon"
          text="Events beginning in the next three hours."
          events={startingSoonEvents}
          emptyText="Nothing is starting soon right now."
          href="/events?when=soon"
          action="See what’s next"
        />

        <EventRail
          id="tonight"
          eyebrow="Tonight"
          title="Build your night"
          text="A wider view of tonight’s active event inventory."
          events={tonightEvents}
          emptyText="No events are currently showing for tonight."
          href="/events?when=tonight"
          action="Browse tonight"
        />

        <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="hk-glass-panel p-6 sm:p-8">
            <p className="hk-kicker">Experience intelligence</p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">Discovery is only the beginning.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
              HypeKnight is being built to understand the full path from discovery to intent to live experience. As evidence grows, Hype, Momentum, and Pulse can become useful signals instead of empty popularity numbers.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <IntelligenceStage number="01" label="Discover" text="What catches attention." />
              <IntelligenceStage number="02" label="Intent" text="What people choose." />
              <IntelligenceStage number="03" label="Experience" text="How the night actually feels." />
            </div>
          </div>

          <div className="rounded-[2rem] border border-accent/20 bg-gradient-to-br from-accent/15 via-white/[0.04] to-transparent p-6 sm:p-8">
            <p className="hk-kicker">Know the move?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Help build the map.</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Promoters and venues can put real local experiences into discovery and begin building measurable demand history.
            </p>
            <div className="mt-6 grid gap-2">
              <Link href="/dashboard/events/new/step-1" className="rounded-2xl bg-accent px-5 py-3 text-center text-sm font-black text-black hover:brightness-110">
                Post an event
              </Link>
              <Link href="/promote" className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-sm font-bold text-white/75 hover:border-accent/30 hover:text-white">
                See promoter tools
              </Link>
            </div>
          </div>
        </section>

        <EventRail
          id="fresh"
          eyebrow="Fresh drops"
          title="Recently added"
          text="New inventory entering HypeKnight discovery."
          events={recentlyAddedEvents}
          emptyText="No recently added events yet."
          href="/events"
          action="View all"
        />

        <EventRail
          id="weekend"
          eyebrow="Plan ahead"
          title="This weekend"
          text="What is already lining up for the weekend."
          events={weekendEvents}
          emptyText="No weekend events are showing yet."
          href="/events?when=weekend"
          action="Plan the weekend"
        />

        {settings.homepage_show_special_days ? <SpecialDaysSection specialDays={specialDays ?? []} /> : null}
      </div>
    </>
  );
}

function IntentChip({ label, href, signalId }: { label: string; href: string; signalId: string }) {
  return (
    <SignalLink
      href={href}
      signal={{
        signalType: 'time_intent_selected',
        subjectType: 'search',
        subjectId: signalId,
        source: 'homepage',
        surface: 'hero_intents',
        verificationLevel: 'declared',
        metadata: { when: signalId },
      }}
      className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-semibold text-white/55 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
    >
      {label}
    </SignalLink>
  );
}

function SnapshotMetric({ label, value, note, tone }: { label: string; value: number; note: string; tone?: 'live' }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
      <div className="flex items-center gap-2">
        {tone === 'live' ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[11px] text-white/35">{note}</p>
    </div>
  );
}

function SignalStat({ label, value, href, signalId }: { label: string; value: number; href: string; signalId: string }) {
  return (
    <SignalLink
      href={href}
      signal={{
        signalType: 'time_intent_selected',
        subjectType: 'search',
        subjectId: signalId,
        source: 'homepage',
        surface: 'here_now_summary',
        verificationLevel: 'declared',
        metadata: { when: signalId },
      }}
      className="bg-[#0c0f14] p-5 transition hover:bg-white/[0.04] sm:p-6"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-accent">Explore →</p>
    </SignalLink>
  );
}

function DiscoveryVibes({ vibes }: { vibes: any[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Choose your energy" title="What’s your vibe tonight?" text="Every choice makes discovery more useful without asking you to fill out a profile first." href="/events" action="Explore everything" />
      <div className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        {vibes.slice(0, 8).map((vibe) => (
          <SignalLink
            key={vibe.label}
            href={vibe.href}
            signal={{
              signalType: 'vibe_selected',
              subjectType: 'search',
              subjectId: vibe.value,
              source: 'homepage',
              surface: 'vibe_grid_v3',
              verificationLevel: 'declared',
              metadata: { vibe: vibe.value, label: vibe.label },
            }}
            className="group min-w-[68vw] rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-accent/30 hover:bg-white/[0.055] sm:min-w-0"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xl text-accent">{vibe.emoji}</span>
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-white/35">{vibe.count} found</span>
            </div>
            <h3 className="mt-6 text-xl font-black tracking-tight text-white group-hover:text-accent">{vibe.label}</h3>
            <p className="mt-1 text-xs text-white/40">Show me this energy →</p>
          </SignalLink>
        ))}
      </div>
    </section>
  );
}

function ActiveMarkets({ cityCounts }: { cityCounts: any[] }) {
  return (
    <section className="hk-glass-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hk-kicker">Market discovery</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Where the inventory is moving.</h2>
          <p className="mt-2 text-sm text-white/45">Event locations remain specific while HypeKnight increasingly understands their larger metro market.</p>
        </div>
        <Link href="/events" className="text-sm font-bold text-accent">All markets →</Link>
      </div>

      <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {cityCounts.slice(0, 12).map((item) => (
          <SignalLink
            key={`${item.city}-${item.state}`}
            href={`/events?city=${encodeURIComponent(item.city)}&state=${encodeURIComponent(item.state)}`}
            signal={{
              signalType: 'market_selected',
              subjectType: 'market',
              subjectId: `${item.city},${item.state}`,
              city: item.city,
              state: item.state,
              source: 'homepage',
              surface: 'market_discovery_v3',
              verificationLevel: 'declared',
            }}
            className="shrink-0 rounded-full border border-white/[0.08] bg-black/25 px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:border-accent/30 hover:text-white"
          >
            {item.city}, {item.state}
            <span className="ml-2 text-accent">{item.count}</span>
          </SignalLink>
        ))}
      </div>
    </section>
  );
}

function IntelligenceStage({ number, label, text }: { number: string; label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
      <p className="text-[10px] font-black tracking-[0.2em] text-accent">{number}</p>
      <p className="mt-3 text-sm font-black text-white">{label}</p>
      <p className="mt-1 text-xs leading-5 text-white/40">{text}</p>
    </div>
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
  const haystack = [event.name, event.description, event.genre, event.classification, event.source_label, event.venue_name]
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

function parseWallTime(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return new Date(value);
  const [, year, month, day, hour, minute, second = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function getEventWindow(event: any) {
  const now = new Date();
  const start = parseWallTime(event.event_start_at);
  if (!start) return null;
  const end = parseWallTime(event.event_end_at) || new Date(start.getTime() + 4 * 60 * 60 * 1000);
  return { now, start, end };
}

function isLiveNow(event: any) {
  const window = getEventWindow(event);
  return Boolean(window && window.now >= window.start && window.now <= window.end);
}

function isStartingSoon(event: any) {
  const window = getEventWindow(event);
  if (!window) return false;
  const nextThreeHours = new Date(window.now.getTime() + 3 * 60 * 60 * 1000);
  return window.start > window.now && window.start <= nextThreeHours;
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameWindow(value: string | null | undefined, start: Date, end: Date) {
  const date = parseWallTime(value);
  return Boolean(date && date >= start && date < end);
}

function isTodayInEventTime(event: any) {
  const start = startOfToday();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return isSameWindow(event.event_start_at, start, end);
}

function isWeekendInEventTime(event: any) {
  const start = startOfToday();
  start.setDate(start.getDate() + ((5 - start.getDay() + 7) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return isSameWindow(event.event_start_at, start, end);
}

function sortByStartTime(a: any, b: any) {
  const aTime = parseWallTime(a.event_start_at)?.getTime() ?? Infinity;
  const bTime = parseWallTime(b.event_start_at)?.getTime() ?? Infinity;
  return aTime - bTime;
}

function SpecialDaysSection({ specialDays }: { specialDays: any[] }) {
  if (!specialDays.length) return null;
  return (
    <section>
      <SectionHeader eyebrow="Calendar" title="Special nights deserve their own lane." text="Browse holidays, themes, and moments that shape where people want to be." href="/calendar" action="Open calendar" />
      <div className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 xl:grid-cols-3">
        {specialDays.map((day) => (
          <Link key={day.id} href={`/calendar/${day.slug}`} className="group min-w-[78vw] rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5 transition hover:border-accent/30 sm:min-w-0">
            <p className="hk-kicker">{day.category || 'Theme'}</p>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white group-hover:text-accent sm:text-2xl">{day.name}</h3>
            <p className="mt-3 text-sm text-white/40">
              {formatCalendarDate(day.starts_on)}{day.ends_on ? ` – ${formatCalendarDate(day.ends_on)}` : ''}
            </p>
            <p className="mt-5 text-xs font-black text-accent">Explore this moment →</p>
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
