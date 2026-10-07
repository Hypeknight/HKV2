'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { saveVenueManager } from '@/lib/venues/managers';
import { requireVenueManagement } from '@/lib/venues/require-management';

export async function changeVenueManager(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  await saveVenueManager({
    venueId, managerId: String(formData.get('manager_id') || '') || undefined,
    targetUserId: String(formData.get('target_user_id') || '') || undefined,
    role: String(formData.get('role') || ''), status: String(formData.get('status') || ''),
    expectedUpdatedAt: String(formData.get('expected_updated_at') || '') || undefined,
    confirmed: formData.get('confirm_authority_change') === 'yes',
  });
  revalidatePath('/dashboard/venues/' + venueId);
  revalidatePath('/admin/venue-claims');
  redirect('/dashboard/venues/' + venueId + '/management?manager_updated=1');
}

export async function proposeVenueCorrection(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const { supabase, user } = await requireVenueManagement(venueId);
  const field = String(formData.get('field_name') || '');
  const value = String(formData.get('proposed_value') || '').trim();
  const reason = String(formData.get('reason') || '').trim();
  if (!['name', 'address', 'city', 'state', 'lifecycle_review', 'identity_review'].includes(field)
      || !value || !reason || value.length > 2000 || reason.length > 4000) throw new Error('Invalid correction proposal');
  const { error } = await supabase.from('venue_corrections').insert({
    venue_id: venueId, submitted_by: user.id, field_name: field,
    proposed_value: value, reason, status: 'pending',
  });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/venues/' + venueId + '/management');
  redirect('/dashboard/venues/' + venueId + '/management?correction_submitted=1');
}
