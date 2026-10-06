'use server';
import { redirect } from 'next/navigation';
import { requireClaimUser } from '@/lib/venues/claims';

export async function submitVenueClaim(formData: FormData) {
  const { supabase, user } = await requireClaimUser();
  const venueId = String(formData.get('venue_id') || '');
  const roleTitle = String(formData.get('role_title') || '').trim();
  const contact = String(formData.get('contact') || '').trim();
  const summary = String(formData.get('summary') || '').trim();
  if (!venueId || !roleTitle || !contact || !summary || summary.length > 4000
      || contact.length > 500 || roleTitle.length > 200) {
    throw new Error('Select an existing venue and provide your role, contact and evidence summary.');
  }
  // No submitted user ID, canonical changes, review state or verification fields.
  const { error } = await supabase.from('venue_claims').insert({
    venue_id: venueId, claimant_user_id: user.id, status: 'pending',
    evidence: { role_title: roleTitle, contact, summary },
  });
  if (error) throw new Error(error.code === '23505' ? 'A claim for this venue is already pending.' : error.message);
  redirect('/dashboard/venues/claims?submitted=1');
}
