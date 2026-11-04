import { readRows, readValue, combinedState, hasIdentity, isRecord, isEventRecord } from '@/lib/interface-state/data';
import DataNotice from '@/components/interface-state/DataNotice';
import { classifyDiscoveryEvent, isPublicNativeDiscoveryRecord } from '@/lib/discovery/classification';
import { nativeEventDestination, externalEventDestination } from '@/lib/discovery/destinations';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/settings';
import { normalizeState } from '@/lib/states';
import TrackView from '@/components/analytics/TrackView';
import SimplyComplexHome from '@/components/preview/SimplyComplexHome';
import { previewInventory, inPreviewCity } from '@/lib/discovery/preview-home';
import './preview/simply-complex/preview.css';
import DiscoveryCommandBar from '@/components/discovery/DiscoveryCommandBar';
import DeviceLocationBadge from '@/components/location/DeviceLocationBadge';
import { getRecommendedEventsForUser } from '@/lib/discovery/recommend-events';
import { EventRail, SectionHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function HomePage(props: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await props?.searchParams ?? {};
  const telemetry = process.env.HYPEKNIGHT_HOMEPAGE_PREVIEW !== '1';
  const city = typeof params.city === 'string' ? params.city.slice(0,100) : '';
  const state = typeof params.state === 'string' ? params.state.slice(0,50) : '';
  const supabase = await createClient();
  const settings = await getPlatformSettings();
  const { data: { user } } = await supabase.auth.getUser();

  const serverNow = new Date();
  const fourHoursAgo = new Date(serverNow.getTime() - 4 * 60 * 60 * 1000);

  const [hypeResult, externalResult, specialResult] = await Promise.all([
    readRows('homepage.native', () =>
    supabase
      .from('events')
      .select('*')
      .in('status', ['scheduled', 'active'])
      .eq('is_public', true)
      .is('removed_at', null)
      .lte('promotion_start_at', serverNow.toISOString())
      .gte('promotion_end_at', serverNow.toISOString())
      .order('event_start_at', { ascending: true })
      .limit(80), isEventRecord),
    readRows('homepage.external', () => supabase
      .from('external_events')
      .select('*')
      .eq('status', 'active')
      .not('event_start_at', 'is', null)
      .lte('event_start_at', new Date(serverNow.getTime() + 14 * 86400000).toISOString())
      .or(
        `event_end_at.gte.${serverNow.toISOString()},and(event_end_at.is.null,event_start_at.gte.${fourHoursAgo.toISOString()})`
      )
      .order('event_start_at', { ascending: true })
      .limit(80), isEventRecord),
    readRows('homepage.calendar', () => supabase
      .from('special_days')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('starts_on', { ascending: true })
      .limit(Number(settings.homepage_special_days_limit || 6)), hasIdentity),
  ]);

  const hypeEvents = hypeResult.data;
  const externalEvents = externalResult.data;
  const specialDays = specialResult.data;
  const inventoryState = combinedState([hypeResult, externalResult]);
  const complete = inventoryState === 'success';
  const inventory = previewInventory(hypeResult, externalResult);
  const selectedIds = new Set(inventory.events.filter(event => inPreviewCity(event,city,state)).map(event => event.source + ':' + event.id));

  const allEvents = [
    ...(hypeEvents ?? []).filter(isPublicNativeDiscoveryRecord).map((event: any) => normalizeEvent(event, 'hypeknight')),
    ...(externalEvents ?? []).map((event: any) => normalizeEvent(event, 'external')),
  ].filter(event => event.href !== null && selectedIds.has(event.source + ':' + event.id)).sort(sortByStartTime);

  const liveNowEvents = allEvents.filter(isLiveNow).slice(0, 8);
  const startingSoonEvents = allEvents.filter(isStartingSoon).slice(0, 8);
  const tonightEvents = allEvents.filter(isTodayInEventTime).slice(0, 8);
  const weekendEvents = allEvents.filter(isWeekendInEventTime).slice(0, 8);
  const recentlyAddedEvents = [...allEvents]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 8);

  const personalized = user ? await readValue<any>('homepage.recommendations', () => getRecommendedEventsForUser(user.id), value => isRecord(value) && Array.isArray(value.recommendations)) : null;
  const personalizedEvents = personalized?.data?.recommendations.slice(0, 6).map((item: any) => item.event) || [];


  const discoverySections = [
    { id:'live', title:'Live right now', text:'Scheduled events whose current time window says they are happening now.', events:liveNowEvents, empty:'Nothing is showing as live right now.', href:'/events?when=live', action:'See live' },
    { id:'soon', title:'Starting soon', text:'Events beginning in the next three hours.', events:startingSoonEvents, empty:'Nothing is starting soon right now.', href:'/events?when=soon', action:'See what’s next' },
    { id:'tonight', title:'Tonight', text:'Tonight’s eligible event inventory.', events:tonightEvents, empty:'No events are currently showing for tonight.', href:'/events?when=tonight', action:'Browse tonight' },
    { id:'fresh', title:'Recently added', text:'New inventory entering HypeKnight discovery.', events:recentlyAddedEvents, empty:'No recently added events yet.', href:'/events', action:'View all' },
    { id:'weekend', title:'This weekend', text:'What is already lining up for the weekend.', events:weekendEvents, empty:'No weekend events are showing yet.', href:'/events?when=weekend', action:'Plan the weekend' },
  ];
  const withMarket = (href:string) => href + (city || state ? (href.includes('?') ? '&' : '?') + new URLSearchParams({city,state}) : '');
  return <>
    {telemetry ? <TrackView pageType="homepage" path="/" /> : null}
    <SimplyComplexHome inventory={inventory} city={city} state={state} production tracking={telemetry}>
      {personalized?.status === 'unavailable' ? <DataNotice message="Personal recommendations are temporarily unavailable." /> : null}
      {personalizedEvents.length ? <section className="sc-section"><EventRail signalSurface={telemetry ? "homepage" : undefined} eyebrow="For you" title="From your preferences" text="Your existing personalized recommendations, across locations." events={personalizedEvents} href="/events/recommended" action="See all recommendations" /></section> : null}
      <section className="sc-section sc-additional-discovery" aria-labelledby="sc-more-discovery">
        <div className="sc-section-heading"><div><p className="sc-eyebrow">Keep exploring</p><h2 id="sc-more-discovery">More ways into the night.</h2></div></div>
        <details className="sc-discovery-disclosure"><summary>Advanced search &amp; device location</summary><div className="sc-advanced-search"><DeviceLocationBadge /><DiscoveryCommandBar key={city + "," + state} tracking={telemetry} initialCity={city} initialState={state} /></div></details>
        {discoverySections.map(section => <details key={section.id} className="sc-discovery-disclosure"><summary>{section.title}</summary><EventRail signalSurface={telemetry ? "homepage" : undefined} id={section.id} title={section.title} text={section.text} events={section.events} emptyText={complete ? section.empty : 'Event data is temporarily unavailable for this section.'} href={withMarket(section.href)} action={section.action} /></details>)}
      </section>
      {settings.homepage_show_special_days && specialResult.status === 'unavailable' ? <DataNotice message="Calendar highlights are temporarily unavailable." /> : null}
      {settings.homepage_show_special_days ? <section className="sc-section"><SpecialDaysSection specialDays={specialDays ?? []} /></section> : null}
    </SimplyComplexHome>
  </>;
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
    href: source === 'hypeknight' ? nativeEventDestination(event.slug) : externalEventDestination(event.id),
    categories: classifyDiscoveryEvent(event, source),
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
