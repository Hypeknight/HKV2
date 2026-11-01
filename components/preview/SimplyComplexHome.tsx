import Link from 'next/link';
import CityPulseSection from '@/components/preview/CityPulseSection';
import PreviewArtwork from '@/components/preview/PreviewArtwork';
import EventTime from '@/components/ui/EventTime';
import { inPreviewCity, previewCategories, type PreviewEvent, type PreviewInventory } from '@/lib/discovery/preview-home';
const BASE = '/preview/simply-complex';

function cityHref(city: string, state: string) { return BASE + '?' + new URLSearchParams({ city, state }); }
function discoveryHref(city: string, state: string, category?: string) {
  const query = new URLSearchParams();
  if (city) query.set('city', city);
  if (state) query.set('state', state);
  if (category) query.set('category', category);
  return '/events' + (query.size ? '?' + query : '');
}
export function PreviewCard({ event }: { event: PreviewEvent }) {
  return <article className="sc-card"><Link href={event.href} className="sc-card-link">
    <PreviewArtwork key={event.image} image={event.image} />
    <div className="sc-card-copy"><p className="sc-source">{event.source === 'external' ? 'External · ' : 'Native · '}{event.provider}</p>
      <h3>{event.name}</h3><p className="sc-place">{[event.venue, event.city, event.state].filter(Boolean).join(' · ') || 'Location unavailable'}</p>
      {event.start ? <EventTime value={event.start} showStatus={false} /> : <p className="sc-muted">Time unavailable</p>}
      <span className="sc-card-action">Explore event <span aria-hidden="true">↗</span></span>
    </div></Link></article>;
}
export function PreviewLoading() {
  return <div role="status" aria-live="polite"><p className="sc-muted">Finding your next night…</p><div className="sc-cards sc-skeleton" aria-hidden="true">{[1, 2, 3].map(key => <div key={key}><div /><span /><span /></div>)}</div></div>;
}
export default function SimplyComplexHome({ inventory, city = '', state = '', demo = null }: { inventory: PreviewInventory; city?: string; state?: string; demo?: string | null }) {
  const events = inventory.events.filter(event => inPreviewCity(event, city, state));
  const lead = events[0];
  const markets = Array.from(new Map(inventory.events.filter(event => event.city && event.state).map(event => [event.city.toLowerCase() + ',' + event.state, { city: event.city, state: event.state }])).values()).sort((a,b) => a.city.localeCompare(b.city));
  const categories = previewCategories.filter(([value]) => events.some(event => event.categories.includes(value)));
  const complete = inventory.status === 'success';
  return <div className="sc-home">
    <aside className="sc-review" aria-label="Design preview"><span>UX-C1B · Design preview</span><span>Production homepage unchanged</span><Link href={BASE + '/review'}>Review layouts ↗</Link></aside>
    {demo ? <div className="sc-notice" role="status"><strong>State demonstration: {demo}.</strong> {demo === 'insufficient' ? 'Only the community-result state is illustrative; event listings remain real.' : demo === 'partial' ? 'Native results are deliberately withheld here; available external records remain real.' : 'This example does not describe current inventory.'} <Link href={BASE}>Return to real inventory</Link></div> : null}
    <section className="sc-hero" aria-labelledby="sc-heading">
      <div className="sc-hero-copy"><p className="sc-eyebrow">HypeKnight · Find your night</p><h1 id="sc-heading">Your night<br /><em>starts here.</em></h1>
        <p className="sc-intro">The stage. The dance floor. Something unexpected. Find your way into the night.</p>
        <div className="sc-market" id="sc-location"><details><summary>{city ? city + (state ? ', ' + state : '') : 'Choose a city (optional)'} <span aria-hidden="true">⌄</span></summary><div><Link href={BASE}>Skip · Explore all locations</Link>{markets.map(market => <Link key={market.city + market.state} href={cityHref(market.city, market.state)}>{market.city}, {market.state}</Link>)}{!markets.length ? <p>{complete ? 'No locations in this inventory snapshot.' : 'Location choices are temporarily unavailable.'}</p> : null}</div></details></div>
        <form action="/events" method="get" className="sc-search" aria-label="Find an event"><label htmlFor="sc-search">Search events, artists or venues</label><div><input id="sc-search" name="q" placeholder="What are you in the mood for?" type="search" />{city ? <input name="city" type="hidden" value={city} /> : null}{state ? <input name="state" type="hidden" value={state} /> : null}<button type="submit">Find my night <span aria-hidden="true">↗</span></button></div></form>
        <nav className="sc-intents sc-night-paths" aria-label="Find your night"><Link href={discoveryHref(city,state) + (city || state ? '&' : '?') + 'when=tonight'}>Explore Tonight <span aria-hidden="true">↗</span></Link><details><summary>More ways to explore <span aria-hidden="true">＋</span></summary><div><Link href="/surprise">Surprise Me <span>Let the existing discovery experience choose a starting point.</span></Link><Link href={BASE + '/plan'}>Plan My Night <span>Concept preview · Not available yet</span></Link><a href="#city-pulse">Explore your city’s Pulse <span>Listing facts and a participation preview.</span></a><Link href={discoveryHref(city,state)}>All upcoming events ↗</Link></div></details></nav>
      </div>
      <div className="sc-hero-visual">{lead && demo !== 'loading' ? <><PreviewArtwork key={lead.image} image={lead.image} /><div className="sc-lead"><p className="sc-eyebrow">From the current listings</p><h2><Link href={lead.href}>{lead.name} <span aria-hidden="true">↗</span></Link></h2><p>{[lead.city, lead.state].filter(Boolean).join(', ')}</p><div className="sc-lead-time">{lead.start ? <EventTime value={lead.start} showStatus={false} /> : <p>Time unavailable</p>}</div><p className="sc-source">{lead.source === 'external' ? 'External listing · ' : 'HypeKnight event · '}{lead.provider}</p></div></> : <div className="sc-hero-empty"><img src="/hypeknight-logo.jpeg" alt="HypeKnight" width="88" height="88" /><p>The next great night<br />is yours to find.</p><Link href="/events">Explore Discovery ↗</Link></div>}</div>
    </section>
    <section className="sc-section" aria-labelledby="sc-events-title"><div className="sc-section-heading"><div><p className="sc-eyebrow">LIVING CITY · DISCOVERY</p><h2 id="sc-events-title">{city ? 'The ' + city + ' edit' : 'Find your next story'}</h2></div><Link href={discoveryHref(city,state)}>Explore all events ↗</Link></div>
      {!complete ? <div className="sc-notice" role="status"><h3>{inventory.status === 'partial' ? 'A little of the picture is missing.' : 'Discovery is temporarily unavailable.'}</h3><p>{inventory.status === 'partial' ? 'One or more event sources could not be retrieved. Available results remain below; this is not the full inventory.' : 'We could not retrieve event listings. This does not mean there are no events.'}</p><a href={BASE + (city ? '?' + new URLSearchParams({ city, state }) : '')}>Try again ↻</a></div> : null}
      {demo === 'loading' ? <PreviewLoading /> : events.length ? <div className="sc-cards">{events.slice(0,6).map(event => <PreviewCard key={event.source + event.id} event={event} />)}</div> : complete ? <div className="sc-empty"><p className="sc-eyebrow">Room for a different plan</p><h3>{city ? 'No matching events in this snapshot.' : 'No eligible events returned in this snapshot.'}</h3><p>Try another location or browse Discovery for more options.</p><Link className="sc-button" href="/events">Explore Discovery ↗</Link><Link href={BASE}>Explore all locations</Link></div> : null}
      <p className="sc-provenance">Current eligible homepage inventory, up to 80 records per source. Native HypeKnight events appear first. External listings retain their provider and open a HypeKnight source-detail page.</p>
    </section>
    {categories.length ? <section className="sc-section" aria-labelledby="sc-vibe-title"><div className="sc-section-heading"><div><p className="sc-eyebrow">THE CULTURE EDIT · DISCOVERY PATHS</p><h2 id="sc-vibe-title">Follow what moves you.</h2></div></div><div className="sc-categories">{categories.map(([value,label],index) => <Link key={value} href={discoveryHref(city,state,value)}><span className="sc-category-number" aria-hidden="true">0{index+1}</span><span>{label}</span><span aria-hidden="true">↗</span></Link>)}</div>{!complete ? <p className="sc-muted">Categories reflect the available results only.</p> : null}</section> : null}
    <CityPulseSection inventory={inventory} city={city} state={state} demo={demo} />
    <section className="sc-concierge" aria-labelledby="sc-concierge-title"><div className="sc-surprise"><div><p className="sc-eyebrow">PERSONAL NIGHT CONCIERGE · DISCOVERY</p><span className="sc-surprise-mark" aria-hidden="true">✳</span><h2 id="sc-concierge-title">Your next move?<br /><em>Leave room for surprise.</em></h2><p>A starting point, not a promise. Explore an event through the existing Surprise Me experience.</p><Link className="sc-button" href="/surprise">Surprise Me ↗</Link></div></div><aside className="sc-plan-teaser"><p className="sc-eyebrow">COMING INTO FOCUS</p><h3>A whole night.<br />Less planning.</h3><p>Plan My Night is a concept, not an active itinerary service.</p><Link href={BASE + '/plan'}>Explore the concept <span className="sc-preview-tag">Preview</span> ↗</Link></aside></section>
    <section className="sc-operators"><div><p className="sc-eyebrow">For the people behind the night</p><h2>Make room for your next audience.</h2><p>Post an event for free. Explore venue pages, organizer tools and event-based Patron Pulse capabilities.</p></div><div><Link className="sc-button sc-button-secondary" href="/dashboard/events/new/step-1">Post an event ↗</Link><Link href="/venues">Explore venues ↗</Link><Link href="/promote">Organizer tools ↗</Link><Link href="/pricing">Explore plans &amp; Patron Pulse ↗</Link></div></section>
    <nav className="sc-state-tools" aria-label="Preview state demonstrations"><span>Review states:</span><Link href={BASE}>Real inventory</Link>{['empty','loading','unavailable','partial','insufficient'].map(mode => <Link key={mode} href={BASE + '?' + new URLSearchParams({demo:mode,...(city?{city,state}:{})})}>{mode}</Link>)}</nav>
  </div>;
}
