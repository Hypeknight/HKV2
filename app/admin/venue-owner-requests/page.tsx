import Link from 'next/link';
import { requireClaimUser } from '@/lib/venues/claims';
export default async function LegacyVenueOwnerRequestsPage() {
  const { supabase } = await requireClaimUser(true);
  const { data, error } = await supabase.from('venue_owner_requests').select('id,venue_business_name,status,created_at').order('created_at');
  if (error) throw new Error(error.message);
  return <section className="mx-auto max-w-4xl space-y-6 px-4 py-12 text-white">
    <h1 className="text-3xl font-bold">Legacy Venue Owner Request History</h1>
    <p>These historical global-role requests do not grant management of a specific venue.</p>
    <Link href="/admin/venue-claims" className="text-accent">Review venue claims</Link>
    {(data || []).map(r => <p key={r.id}>{r.venue_business_name} · {r.status} · {r.created_at}</p>)}
  </section>;
}
