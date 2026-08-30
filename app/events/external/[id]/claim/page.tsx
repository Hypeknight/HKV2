import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { submitExternalEventClaim } from './actions';

export default async function ClaimExternalEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=${encodeURIComponent(`/events/external/${id}/claim`)}`);

  const [{ data: event }, { data: ownedEvents }, { data: existingClaim }] = await Promise.all([
    supabase.from('external_events').select('id,name,city,state,venue_name,event_start_at,source_code').eq('id', id).single(),
    supabase.from('events').select('id,name,city,state,event_start_at,status').eq('owner_id', user.id).order('event_start_at', { ascending: false }).limit(50),
    supabase.from('event_claims').select('id,status,created_at').eq('external_event_id', id).eq('claimant_user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!event) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <Link href={`/events/external/${id}`} className="text-sm font-semibold text-white/55 hover:text-accent">← Back to event</Link>
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111620] to-black p-6 sm:p-9">
        <p className="hk-kicker">Event Claim</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Is this your event?</h1>
        <p className="mt-4 leading-7 text-white/60">Claiming does not replace the original ticket provider. It verifies your relationship to the experience and lets HypeKnight connect the external listing to your managed event.</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4"><p className="font-black text-white">{event.name}</p><p className="mt-1 text-sm text-white/45">{event.venue_name || [event.city,event.state].filter(Boolean).join(', ')}</p></div>
      </section>

      {existingClaim && existingClaim.status === 'pending' ? (
        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5"><p className="font-black text-white">Claim already submitted</p><p className="mt-2 text-sm text-white/60">HypeKnight is reviewing your relationship to this event.</p></div>
      ) : (
        <form action={submitExternalEventClaim} className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <input type="hidden" name="external_event_id" value={id} />
          <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/45">Your role</span><select name="claim_role" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white"><option value="promoter">Promoter</option><option value="organizer">Organizer</option><option value="venue">Venue</option><option value="owner">Event owner</option><option value="other">Other authorized representative</option></select></label>
          <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/45">Connect to one of your HypeKnight events</span><select name="event_id" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white"><option value="">No HypeKnight version yet</option>{(ownedEvents || []).map((owned: any) => <option key={owned.id} value={owned.id}>{owned.name} — {[owned.city, owned.state].filter(Boolean).join(', ')}</option>)}</select><span className="mt-2 block text-xs leading-5 text-white/40">If you already posted the same event on HypeKnight, selecting it prevents duplicate identities after approval.</span></label>
          <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/45">How can we verify you?</span><textarea name="evidence_note" rows={5} placeholder="Example: I am the promoter. My name appears on the Eventbrite organizer profile and I can verify through our official Instagram/email." className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none focus:border-accent/40" /></label>
          <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-4 font-black text-black">Submit Claim</button>
        </form>
      )}
    </section>
  );
}
