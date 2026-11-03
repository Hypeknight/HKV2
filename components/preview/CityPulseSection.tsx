import { citySnapshot, communityExample } from '@/lib/discovery/city-pulse';
import type { PreviewInventory } from '@/lib/discovery/preview-home';
const choices = ['Live music', 'Dancing', 'A relaxed atmosphere', 'Something different'];
export default function CityPulseSection({ inventory, city, state, demo, includeCommunity = true }: { inventory: PreviewInventory; city: string; state: string; demo: string | null; includeCommunity?: boolean }) {
  const facts = citySnapshot(inventory, city, state);
  return <section id="city-pulse" className="sc-section sc-city-pulse" aria-labelledby="sc-pulse-title">
    <div className="sc-section-heading"><div><p className="sc-eyebrow">The city, in perspective</p><h2 id="sc-pulse-title">Your city has a Pulse.</h2></div><a href="#sc-location">Choose your city ↗</a></div>
    <div className={includeCommunity ? "sc-city-grid" : "sc-city-grid sc-city-facts-only"}>
      <div className="sc-city-facts"><p className="sc-label">FACTS · EVENT INVENTORY</p><h3>{city && state ? city + ', ' + state : 'Start with a place.'}</h3>
        <p className="sc-muted">A look at eligible listings in this discovery snapshot. Listings are not people, attendance, or community responses.</p>
        {demo === 'loading' ? <p className="sc-fact-state" role="status">Loading inventory counts — state example only.</p> : facts.state === 'select_city' ? <p className="sc-fact-state">Choose a city and state to see its snapshot, or keep exploring all locations.</p>
          : facts.state === 'partial' || facts.state === 'unavailable' ? <div role="status" className="sc-fact-state"><strong>Inventory counts unavailable.</strong><p>{facts.state === 'partial' ? 'Available event cards are still shown. Missing sources prevent a complete snapshot count.' : 'The listings could not be retrieved; unavailable does not mean zero.'}</p></div>
          : <><dl className="sc-city-numbers"><div><dt>Native listings</dt><dd>{facts.native}</dd></div><div><dt>External listings</dt><dd>{facts.external}</dd></div></dl>
            {facts.state === 'empty' ? <p className="sc-fact-state">No eligible listings matched this location in the loaded snapshot. Try another location or Discovery.</p> : null}
            {facts.categories.length ? <details className="sc-category-facts"><summary>Listings by category <span aria-hidden="true">⌄</span></summary><dl>{facts.categories.map(category => <div key={category.key}><dt>{category.label}</dt><dd>{category.count} listings</dd></div>)}</dl><p>Categories may overlap. Listings may describe the same experience across providers.</p></details> : null}</>}
        <p className="sc-small-note">Up to 80 listings per source before location filtering. Loaded with this page, not a real-time activity feed.</p>
        <p className="sc-small-note">Interest signals and community response measurements are unavailable here.</p>
      </div>
      {includeCommunity ? <CommunityPulse demo={demo} /> : null}
    </div>
  </section>;
}


export function CommunityPulse({demo,compact=false}:{demo:string|null;compact?:boolean}) {
  const Heading = compact ? 'h2' : 'h3';
  const example = communityExample(demo);
  const message = example === 'insufficient_sample'
    ? 'Insufficient sample — option counts and percentages are withheld. At least five effective responses would be needed for display.'
    : example === 'loading' ? 'Loading community results — state example only.'
    : example === 'empty' ? 'No response sample to display in this example.'
    : example === 'partial' ? 'An incomplete response sample cannot support public percentages.'
    : example === 'unavailable' ? 'Community results unavailable in this state example.'
    : 'Public community results are not available yet.';
  return <aside id="community-pulse" className={compact ? "sc-community sc-community-early" : "sc-community"} aria-labelledby="sc-community-title">
        <div className="sc-community-heading"><p className="sc-label">PATRON PULSE · PARTICIPATION PREVIEW</p><Heading id="sc-community-title">Your city has a Pulse.<br /><em>Add yours.</em></Heading>
        <p className="sc-preview-label">Not open for responses. No answers are collected or stored.</p>
        </div><div className="sc-community-question"><fieldset disabled aria-describedby="sc-pulse-preview-note"><legend>What’s your ideal Friday night?</legend><div className="sc-question-options">{choices.map((choice, index) => <label key={choice} htmlFor={'sc-community-option-' + index}><input type="radio" id={'sc-community-option-' + index} name="community-preview-choice" value={choice} disabled /><span>{choice}</span></label>)}</div></fieldset>
        <p id="sc-pulse-preview-note" className={compact ? "sr-only" : "sc-small-note"}>A general HypeKnight community question, independent of any event or venue. This is a non-submittable design preview.</p>
        </div><div className="sc-community-result" role="status"><p>{message}</p>{example !== 'preview' ? <span>State example only. No production response sample is connected.</span> : null}</div>
        <details className="sc-results-explainer"><summary>About public results</summary><p>Future results require a complete, authorized sample of latest effective responses. Small-sample results will be withheld. A display threshold is not a promise of anonymity or protection from inference.</p><p>No city voting or public response reporting is active in this prototype.</p></details>
      </aside>;
}
