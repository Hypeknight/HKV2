import Link from 'next/link';
import { getVenueCommandContext } from '@/lib/venues/command-center';
import { getVenueManagerRoster } from '@/lib/venues/authority';
import { VENUE_MANAGER_ROLES, VENUE_MANAGER_STATUSES } from '@/lib/venues/managers';
import { changeVenueManager, proposeVenueCorrection } from './actions';

export default async function VenueManagement({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ manager_updated?: string; correction_submitted?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const { supabase, authority, user, venue } = await getVenueCommandContext(id);
  const isAdmin = authority.source === 'admin';
  const [managers, claims, corrections] = await Promise.all([
    getVenueManagerRoster(id),
    supabase.from('venue_claims').select('id,status,submitted_at,admin_note').eq('venue_id', id).order('submitted_at', { ascending: false }),
    supabase.from('venue_corrections').select('id,field_name,proposed_value,status,reason').eq('venue_id', id).order('created_at', { ascending: false }),
  ]);
  for (const result of [claims, corrections]) if (result.error) throw new Error(result.error.message);
  const activeCount = managers.filter(manager => manager.status === 'active').length;
  return <section className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-white">
    <h1 className="text-3xl font-bold">Management</h1>
    <p>Claim: {venue.claim_state} · Verification: {venue.verification_state}. Claiming never creates or replaces a venue.</p>
    {query.manager_updated && <p role="status">Manager relationship updated.</p>}
    {query.correction_submitted && <p role="status">Correction submitted for review. Canonical identity and location are unchanged.</p>}
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Managers</h2>
      <p>Only administrators can grant, change or revoke management under 0028. Active owner, manager and staff labels currently grant the same venue authority; custom permissions are not yet enforced or editable.</p>
      <p>{activeCount} active relationship{activeCount === 1 ? '' : 's'}. If none remain, HypeKnight retains administrative stewardship and the venue remains valid.</p>
      {managers.map(manager => <article key={manager.id} className="space-y-3 rounded-xl border border-white/10 p-4">
        <p>Account: {manager.user_id}{manager.user_id === user.id ? ' (you)' : ''} · {manager.role} · {manager.status}</p>
        {isAdmin && <form action={changeVenueManager} className="space-y-3">
          <input type="hidden" name="venue_id" value={id} />
          <input type="hidden" name="manager_id" value={manager.id} />
          <input type="hidden" name="expected_updated_at" value={manager.updated_at} />
          <label className="block">Relationship label<select name="role" defaultValue={manager.role} className="ml-3 rounded bg-black p-2">{VENUE_MANAGER_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
          <label className="block">Authority status<select name="status" defaultValue={manager.status === 'invited' ? 'suspended' : manager.status} className="ml-3 rounded bg-black p-2">{VENUE_MANAGER_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label>
          <label className="block"><input required type="checkbox" name="confirm_authority_change" value="yes" /> I authorize this change. Revocation may leave this venue under HypeKnight stewardship if no active managers remain.</label>
          <button className="rounded border border-white/20 px-4 py-2">Update manager</button>
        </form>}
      </article>)}
      {!managers.length && <p>No active managers are recorded.</p>}
      {isAdmin ? <form action={changeVenueManager} className="space-y-3 rounded-xl border border-white/10 p-4">
        <h3 className="text-xl">Add an existing account</h3>
        <p>Verify the business relationship before granting access. This is not a new account invitation or venue creation flow.</p>
        <input type="hidden" name="venue_id" value={id} /><input type="hidden" name="status" value="active" />
        <label className="block">Account UUID<input required name="target_user_id" className="ml-3 rounded bg-black p-2" /></label>
        <label className="block">Relationship label<select name="role" defaultValue="manager" className="ml-3 rounded bg-black p-2">{VENUE_MANAGER_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
        <label className="block"><input required type="checkbox" name="confirm_authority_change" value="yes" /> I verified and authorize this account to manage the venue.</label>
        <button className="rounded border border-white/20 px-4 py-2">Add manager</button>
      </form> : <p>Contact HypeKnight for manager changes; venue authority does not include delegating access.</p>}
    </div>
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">Claims and correction state</h2>
      <p>{isAdmin ? 'All claims and corrections for this venue.' : 'Your own submissions are shown under existing RLS privacy rules.'}</p>
      {(claims.data || []).map(claim => <p key={claim.id}>Claim · {claim.status} · {claim.admin_note || 'No review note'}</p>)}
      {(corrections.data || []).map(correction => <p key={correction.id}>{correction.field_name} · {correction.status} · {JSON.stringify(correction.proposed_value)}</p>)}
      {!claims.data?.length && !corrections.data?.length && <p>No submissions visible to your account.</p>}
      <Link className="text-accent" href={'/dashboard/venues/claims?venue_id=' + id}>Your claim history</Link>
      {isAdmin && <Link className="ml-4 text-accent" href="/admin/venue-claims">Administrative review queue</Link>}
    </div>
    <form action={proposeVenueCorrection} className="space-y-4 rounded-xl border border-white/10 p-5">
      <h2 className="text-2xl font-bold">Propose a material correction</h2>
      <p>Identity, address, closure, rebrand or a new business at this location require review. Never transfer history based on an address match.</p>
      <input type="hidden" name="venue_id" value={id} />
      <label className="block">Change type<select required name="field_name" className="ml-3 rounded bg-black p-2">
        <option value="name">Venue name</option><option value="address">Street address</option><option value="city">City</option><option value="state">State</option>
        <option value="lifecycle_review">Closure / lifecycle review</option><option value="identity_review">Rebrand / new business identity review</option>
      </select></label>
      <label className="block">Proposed information<textarea required name="proposed_value" maxLength={2000} className="mt-2 block w-full rounded bg-black p-3" /></label>
      <label className="block">Reason / evidence<textarea required name="reason" maxLength={4000} className="mt-2 block w-full rounded bg-black p-3" /></label>
      <button className="rounded border border-white/20 px-4 py-2">Submit for review</button>
    </form>
  </section>;
}
