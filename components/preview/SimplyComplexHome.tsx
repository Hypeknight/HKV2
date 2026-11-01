import Link from 'next/link';
import PreviewArtwork from '@/components/preview/PreviewArtwork';
import EventTime from '@/components/ui/EventTime';
import { inPreviewCity, previewCategories, type PreviewEvent, type PreviewInventory } from '@/lib/discovery/preview-home';
const BASE = '/preview/simply-complex';
const destinations = [['Tonight', '/events?when=tonight'], ['This weekend', '/events?when=weekend'], ['All upcoming', '/events']] as const;
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
    <aside className="sc-review" aria-label="Design preview"><span>UX-C1 · Design preview</span><span>Production homepage unchanged</span><Link href={BASE + '/review'}>Review layouts ↗</Link></aside>
    {demo ? <div className="sc-notice" role="status"><strong>State demonstration: {demo}.</strong> {demo === 'partial' ? 'Native results are deliberately withheld here; available external records remain real.' : 'This example does not describe current inventory.'} <Link href={BASE}>Return to real inventory</Link></div> : null}
    <section className="sc-hero" aria-labelledby="sc-heading">
      <div className="sc-hero-copy"><p className="sc-eyebrow">HypeKnight · Find your night</p><h1 id="sc-heading">Good nights<br />start with<br /><em>a little curiosity.</em></h1>
        <p className="sc-intro">What should you do tonight? Find your next concert, night out, or unexpected plan.</p>
        <div className="sc-market"><details><summary>{city ? city + (state ? ', ' + state : '') : 'Choose a city (optional)'} <span aria-hidden="true">⌄</span></summary><div><Link href={BASE}>Skip · Explore all locations</Link>{markets.map(market => <Link key={market.city + market.state} href={cityHref(market.city, market.state)}>{market.city}, {market.state}</Link>)}{!markets.length ? <p>{complete ? 'No locations in this inventory snapshot.' : 'Location choices are temporarily unavailable.'}</p> : null}</div></details></div>
        <form action="/events" method="get" className="sc-search" aria-label="Find an event"><label htmlFor="sc-search">Search events, artists or venues</label><div><input id="sc-search" name="q" placeholder="What are you in the mood for?" type="search" />{city ? <input name="city" type="hidden" value={city} /> : null}{state ? <input name="state" type="hidden" value={state} /> : null}<button type="submit">Find my night <span aria-hidden="true">↗</span></button></div></form>
        <nav className="sc-intents" aria-label="Discover by time">{destinations.map(([label, href]) => <Link key={label} href={city ? href + (href.includes('?') ? '&' : '?') + new URLSearchParams({ city, state }) : href}>{label} <span aria-hidden="true">↗</span></Link>)}</nav>
      </div>
      <div className="sc-hero-visual">{lead && demo !== 'loading' ? <><PreviewArtwork key={lead.image} image={lead.image} /><div className="sc-lead"><p className="sc-eyebrow">A night to explore</p><h2><Link href={lead.href}>{lead.name} <span aria-hidden="true">↗</span></Link></h2><p>{[lead.city, lead.state].filter(Boolean).join(', ')}</p><div className="sc-lead-time">{lead.start ? <EventTime value={lead.start} showStatus={false} /> : <p>Time unavailable</p>}</div><p className="sc-source">{lead.source === 'external' ? 'External listing · ' : 'HypeKnight event · '}{lead.provider}</p></div></> : <div className="sc-hero-empty"><img src="/hypeknight-logo.jpeg" alt="HypeKnight" width="88" height="88" /><p>The next great night<br />is yours to find.</p><Link href="/events">Explore Discovery ↗</Link></div>}</div>
    </section>
    <section className="sc-section" aria-labelledby="sc-events-title"><div className="sc-section-heading"><div><p className="sc-eyebrow">Go where the night takes you</p><h2 id="sc-events-title">{city ? 'Explore ' + city : 'On the horizon'}</h2></div><Link href={discoveryHref(city,state)}>Explore all events ↗</Link></div>
      {!complete ? <div className="sc-notice" role="status"><h3>{inventory.status === 'partial' ? 'A little of the picture is missing.' : 'Discovery is temporarily unavailable.'}</h3><p>{inventory.status === 'partial' ? 'One or more event sources could not be retrieved. Available results remain below; this is not the full inventory.' : 'We could not retrieve event listings. This does not mean there are no events.'}</p><a href={BASE + (city ? '?' + new URLSearchParams({ city, state }) : '')}>Try again ↻</a></div> : null}
      {demo === 'loading' ? <PreviewLoading /> : events.length ? <div className="sc-cards">{events.slice(0,6).map(event => <PreviewCard key={event.source + event.id} event={event} />)}</div> : complete ? <div className="sc-empty"><p className="sc-eyebrow">Room for a different plan</p><h3>{city ? 'No matching events in this snapshot.' : 'No eligible events returned in this snapshot.'}</h3><p>Try another location or browse Discovery for more options.</p><Link className="sc-button" href="/events">Explore Discovery ↗</Link><Link href={BASE}>Explore all locations</Link></div> : null}
      <p className="sc-provenance">Current eligible homepage inventory, up to 80 records per source. Native HypeKnight events appear first. External listings retain their provider and open a HypeKnight source-detail page.</p>
    </section>
    {categories.length ? <section className="sc-section" aria-labelledby="sc-vibe-title"><div className="sc-section-heading"><div><p className="sc-eyebrow">Follow your curiosity</p><h2 id="sc-vibe-title">Find your kind of night.</h2></div></div><div className="sc-categories">{categories.map(([value,label],index) => <Link key={value} href={discoveryHref(city,state,value)}><span className="sc-category-number" aria-hidden="true">0{index+1}</span><span>{label}</span><span aria-hidden="true">↗</span></Link>)}</div>{!complete ? <p className="sc-muted">Categories reflect the available results only.</p> : null}</section> : null}
    <section className="sc-surprise"><div><p className="sc-eyebrow">Leave a little room for unexpected</p><h2>No plan?<br />That’s a start.</h2><p>Let curiosity choose the first move.</p></div><Link className="sc-button" href="/surprise">Surprise me ↗</Link></section>
    <section className="sc-operators"><div><p className="sc-eyebrow">For the people behind the night</p><h2>Give your next event a place to be found.</h2><p>Post an event for free. Keep the ticket link you already use.</p></div><div><Link className="sc-button sc-button-secondary" href="/dashboard/events/new/step-1">Post an event ↗</Link><Link href="/venues">Explore venues ↗</Link><Link href="/promote">Organizer tools ↗</Link></div></section>
    <nav className="sc-state-tools" aria-label="Preview state demonstrations"><span>Review states:</span><Link href={BASE}>Real inventory</Link>{['empty','loading','unavailable','partial'].map(mode => <Link key={mode} href={BASE + '?demo=' + mode}>{mode}</Link>)}</nav>
  </div>;
}
