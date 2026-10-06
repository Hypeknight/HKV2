'use server';
import { redirect } from 'next/navigation';
import { requireClaimUser } from '@/lib/venues/claims';

export async function reviewVenueClaim(formData: FormData) {
  const { supabase } = await requireClaimUser(true);
  const id = String(formData.get('claim_id') || '');
  const decision = String(formData.get('decision') || '');
  const note = String(formData.get('admin_note') || '').trim();
  if (!id || !['approved', 'rejected'].includes(decision) || note.length > 4000) throw new Error('Invalid claim review');
  const { data, error } = await supabase.from('venue_claims')
    .update({ status: decision, admin_note: note || null })
    .eq('id', id).eq('status', 'pending').select('id').single();
  if (error || !data) throw new Error(error?.message || 'Claim is no longer pending');
  // 0028 binds the reviewer and atomically creates authority on approval.
  redirect('/admin/venue-claims?reviewed=1');
}
export async function updateVenueManagerStatus(formData: FormData) {
  const { supabase } = await requireClaimUser(true);
  const id = String(formData.get('manager_id') || '');
  const status = String(formData.get('status') || '');
  if (!id || !['active','suspended','removed'].includes(status)) throw new Error('Invalid manager lifecycle action');
  const { data, error } = await supabase.from('venue_managers')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Manager not found');
  redirect('/admin/venue-claims?manager_updated=1');
}
