import Link from 'next/link';
import { requireClaimUser } from '@/lib/venues/claims';
import { reviewVenueClaim, updateVenueManagerStatus } from './actions';

export default async function AdminVenueClaimsPage() {
  const { supabase } = await requireClaimUser(true);
  const [claims, managers, corrections] = await Promise.all([
    supabase.from('venue_claims').select('*,venue:venues(id,name,location_id,verification_state)').order('submitted_at', { ascending: true }),
    supabase.from('venue_managers').select('id,user_id,role,status,venue:venues(id,name)').order('created_at'),
    supabase.from('venue_corrections').select('*,venue:venues(id,name)').eq('status','pending').order('created_at'),
  ]);
  for (const result of [claims, managers, corrections]) if (result.error) throw new Error(result.error.message);
  return <section className="mx-auto max-w-5xl space-y-8 px-4 py-12 text-white">
    <h1 className="text-4xl font-bold">Venue Claims and Managers</h1>
    <p>Approval establishes management of the existing business. Verify the claimant relationship separately from venue verification. Review identity or location proposals separately.</p>
    <div className="space-y-4"><h2 className="text-2xl font-bold">Claims</h2>
      {(claims.data || []).map((claim: any) => <div key={claim.id} className="space-y-3 rounded-2xl border border-white/10 p-5">
        <h3 className="text-xl">{claim.venue?.name} · {claim.status}</h3>
        <p>Claimant: {claim.claimant_user_id} · Venue verification: {claim.venue?.verification_state}</p>
        <p>{String(claim.evidence?.role_title || '')} · {String(claim.evidence?.contact || '')}</p>
        <p className="whitespace-pre-wrap">{String(claim.evidence?.summary || '')}</p>
        {claim.status === 'pending' ? <form action={reviewVenueClaim} className="space-y-3">
          <input type="hidden" name="claim_id" value={claim.id} />
          <label className="block">Review note<textarea name="admin_note" maxLength={4000} className="mt-2 block w-full rounded-xl bg-black p-3" /></label>
          <button name="decision" value="approved" className="mr-3 rounded-xl bg-accent px-5 py-3 text-black">Approve management</button>
          <button name="decision" value="rejected" className="rounded-xl border border-red-400 px-5 py-3">Reject claim</button>
        </form> : <p>{claim.admin_note}</p>}
      </div>)}
    </div>
    <div className="space-y-4"><h2 className="text-2xl font-bold">Manager relationships</h2>
      {(managers.data || []).map((manager: any) => <form key={manager.id} action={updateVenueManagerStatus} className="space-y-3 rounded-2xl border border-white/10 p-5">
        <p>{manager.venue?.name} · {manager.user_id} · {manager.role} · {manager.status}</p>
        <input type="hidden" name="manager_id" value={manager.id} />
        <select name="status" defaultValue={manager.status === 'invited' ? 'suspended' : manager.status} className="mr-3 rounded-xl bg-black p-3">
          <option value="active">Active</option><option value="suspended">Suspended</option><option value="removed">Removed</option>
        </select><button className="rounded-xl border border-white/20 p-3">Update authority</button>
      </form>)}
    </div>
    <div className="space-y-4"><h2 className="text-2xl font-bold">Identity and location proposals</h2>
      <p>These proposals do not change the venue automatically. Review the continuing business identity and physical location before applying a canonical change.</p>
      {(corrections.data || []).map((c: any) => <div key={c.id} className="rounded-xl border border-white/10 p-4">
        <p>{c.venue?.name} · {c.field_name}: {JSON.stringify(c.proposed_value)}</p><p>{c.reason}</p>
        <Link href={'/admin/venues/' + c.venue_id} className="text-accent">Review venue</Link>
      </div>)}
    </div>
    <Link href="/admin/venue-owner-requests" className="text-accent">Legacy global-role request history</Link>
  </section>;
}
