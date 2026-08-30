import { createAdminClient } from '@/lib/supabase/admin';
import { reviewEventClaim } from './actions';

export default async function AdminEventClaimsPage() {
  const admin = createAdminClient();
  const { data: claims, error } = await admin.from('event_claims').select(`*, external_event:external_events(id,name,city,state,source_code), event:events(id,name,slug,owner_id)`).order('status', { ascending: false }).order('created_at', { ascending: true }).limit(100);
  if (error) throw new Error(error.message);

  return (
    <section className="space-y-6">
      <div><p className="hk-kicker">Source Network</p><h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Event claims</h1><p className="mt-3 max-w-3xl text-white/55">Verify promoters, organizers, venues, and owners before connecting imported inventory to managed HypeKnight events.</p></div>
      <div className="space-y-4">
        {(claims || []).map((claim: any) => (
          <div key={claim.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-wrap justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{claim.status}</p><h2 className="mt-2 text-xl font-black text-white">{claim.external_event?.name || claim.event?.name || 'Event claim'}</h2><p className="mt-1 text-sm text-white/45">{claim.claimant_user_id} · {claim.claim_role}</p></div>
              <div className="text-right text-sm text-white/45"><p>{claim.source_provider || 'Unknown source'}</p><p>{[claim.external_event?.city, claim.external_event?.state].filter(Boolean).join(', ')}</p></div>
            </div>
            {claim.event ? <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">Requested HypeKnight connection: <strong className="text-white">{claim.event.name}</strong></p> : null}
            {claim.evidence_note ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/60">{claim.evidence_note}</p> : null}
            {claim.status === 'pending' ? (
              <form action={reviewEventClaim} className="mt-5 space-y-3"><input type="hidden" name="claim_id" value={claim.id} /><textarea name="reviewer_note" rows={2} placeholder="Optional reviewer note" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" /><div className="flex gap-2"><button name="decision" value="approved" className="rounded-xl bg-accent px-4 py-3 text-sm font-black text-black">Approve & connect</button><button name="decision" value="rejected" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100">Reject</button></div></form>
            ) : claim.reviewer_note ? <p className="mt-4 text-sm text-white/45">Review note: {claim.reviewer_note}</p> : null}
          </div>
        ))}
        {!claims?.length ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-white/45">No event claims yet.</p> : null}
      </div>
    </section>
  );
}
