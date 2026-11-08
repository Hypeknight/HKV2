import { loadHomeCommunityPulse } from '@/lib/community-pulse/home';
import CommunityPulseCard from './CommunityPulseCard';

export function CommunityPulseLoading() {
  return <aside id="community-pulse" className="sc-community sc-community-early" aria-busy="true">
    <p className="sc-label">COMMUNITY PULSE</p><h2>Your city has a Pulse.<br /><em>Add yours.</em></h2>
    <p role="status">Loading the community question…</p>
  </aside>;
}

export default async function CommunityPulseSection({ city, state }: { city: string; state: string }) {
  const result = await loadHomeCommunityPulse(city, state);
  if (result.state !== 'available') return <aside id="community-pulse" className="sc-community sc-community-early">
    <div className="sc-community-heading"><p className="sc-label">COMMUNITY PULSE</p>
      <h2>Your city has a Pulse.<br /><em>Add yours.</em></h2></div>
    <p role="status">{result.state === 'empty' ? 'There is no community question available for this location yet.' :
      result.state === 'disabled' ? 'Community questions are not open yet.' : 'The community question is temporarily unavailable.'}</p>
    {result.state === 'unavailable' ? <a className="sc-button sc-button-secondary" href={city || state ? '/?' + new URLSearchParams({ city, state }) + '#community-pulse' : '/#community-pulse'}>Try again</a> : null}
  </aside>;
  return <CommunityPulseCard key={result.question.id} question={result.question} scopeLabel={result.scopeLabel} city={city} state={state} />;
}
