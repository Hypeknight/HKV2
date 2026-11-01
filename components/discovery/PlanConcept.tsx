import Link from 'next/link';
export default function PlanConcept({ homeHref = '/' }: { homeHref?: string }) {
  return <section className="sc-home sc-plan-preview"><p className="sc-label">PERSONAL NIGHT CONCIERGE · CONCEPT PREVIEW</p><h1>A little intention.<br />A night that feels like you.</h1>
    <p className="sc-preview-label">Plan My Night is not available yet. This page does not generate itineraries or collect preferences.</p>
    <p className="sc-muted">The idea: help connect the time you have with the experiences you want, without making you do all the planning.</p>
    <h2>What a future planner could consider</h2><ul><li>Your time window and preferred area</li><li>Music, activities and interests you choose</li><li>Optional group context and spending preference</li><li>Event age requirements, without assuming anyone’s eligibility</li><li>Voluntary accessibility preferences, only if you choose to share them</li></ul>
    <p className="sc-small-note">These are proposed inputs, not an active feature. No sensitive attributes, itinerary engine or new profile storage are introduced here.</p>
    <div className="sc-plan-actions"><Link className="sc-button" href="/events">Explore existing events ↗</Link><Link href="/surprise">Use Surprise Me ↗</Link><Link href={homeHref}>Back to HypeKnight ↗</Link></div>
  </section>;
}
