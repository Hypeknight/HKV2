import Link from 'next/link';
import { requireClaimUser } from '@/lib/venues/claims';
import { submitVenueClaim } from './actions';

type Props = { searchParams?: Promise<{ venue_id?: string; submitted?: string; correction_submitted?: string }> };
export default async function VenueClaimsPage({ searchParams }: Props) {
  const { supabase, user } = await requireClaimUser();
  const query = searchParams ? await searchParams : {};
  const [venuesResult, claimsResult, correctionsResult] = await Promise.all([
    supabase.from('venues').select('id,name,city,state').order('name'),
    supabase.from('venue_claims').select('id,venue_id,status,submitted_at,admin_note')
      .eq('claimant_user_id', user.id).order('submitted_at', { ascending: false }),
    supabase.from('venue_corrections').select('id,venue_id,field_name,status')
      .eq('submitted_by', user.id).order('created_at', { ascending: false }),
  ]);
  for (const result of [venuesResult, claimsResult, correctionsResult]) if (result.error) throw new Error(result.error.message);
  const venues = venuesResult.data || [];
  const name = (id: string) => venues.find(v => v.id === id)?.name || id;
  return <section className="mx-auto max-w-4xl space-y-8 px-4 py-12 text-white">
    <h1 className="text-4xl font-bold">Venue Claims</h1>
    <p>Request management of an existing business. HypeKnight reviews your relationship to that venue. Claim approval does not change its location, history or verification.</p>
    {query.submitted && <p role="status">Your claim is awaiting review.</p>}
    {query.correction_submitted && <p role="status">Your proposed identity or address changes are awaiting HypeKnight review.</p>}
    <form action={submitVenueClaim} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <label className="block">Existing venue<select required name="venue_id" defaultValue={query.venue_id || ''} className="mt-2 block w-full rounded-xl bg-black p-3">
        <option value="">Select the business you manage</option>
        {venues.map(v => <option key={v.id} value={v.id}>{v.name} — {v.city}, {v.state}</option>)}
      </select></label>
      <label className="block">Your role<input required maxLength={200} name="role_title" className="mt-2 block w-full rounded-xl bg-black p-3" /></label>
      <label className="block">Business contact<input required maxLength={500} name="contact" className="mt-2 block w-full rounded-xl bg-black p-3" /></label>
      <label className="block">Evidence of your relationship<textarea required maxLength={4000} name="summary" rows={5} className="mt-2 block w-full rounded-xl bg-black p-3" /></label>
      <button className="rounded-xl bg-accent px-5 py-3 font-semibold text-black">Submit Claim</button>
    </form>
    <div className="space-y-3"><h2 className="text-2xl font-bold">Your claims</h2>
      {(claimsResult.data || []).map(c => <div key={c.id} className="rounded-xl border border-white/10 p-4">
        <p>{name(c.venue_id)} · {c.status}</p><p>{c.admin_note}</p>
      </div>)}
      {!claimsResult.data?.length && <p>No claims submitted.</p>}
    </div>
    <div className="space-y-3"><h2 className="text-2xl font-bold">Your proposed corrections</h2>
      {(correctionsResult.data || []).map(c => <p key={c.id}>{name(c.venue_id)} · {c.field_name} · {c.status}</p>)}
    </div>
    <Link href="/dashboard/venues" className="text-accent">Managed venues</Link>
  </section>;
}
