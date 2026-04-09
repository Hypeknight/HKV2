'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function submitVenueOwnerRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const legalName = String(formData.get('legal_name') || '').trim();
  const venueBusinessName = String(formData.get('venue_business_name') || '').trim();
  const roleTitle = String(formData.get('role_title') || '').trim();
  const businessEmail = String(formData.get('business_email') || '').trim();
  const businessPhone = String(formData.get('business_phone') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const websiteOrSocial = String(formData.get('website_or_social') || '').trim();
  const summary = String(formData.get('summary') || '').trim();
  const acknowledgementAccepted =
    String(formData.get('acknowledgement_accepted') || '') === 'yes';

  if (!acknowledgementAccepted) {
    redirect('/dashboard/venue-owner-request?error=acknowledgement_required');
  }

  const { data: existingPending } = await supabase
    .from('venue_owner_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) {
    redirect('/dashboard/venue-owner-request?message=request_already_pending');
  }

  const { error } = await supabase
    .from('venue_owner_requests')
    .insert({
      user_id: user.id,
      legal_name: legalName,
      venue_business_name: venueBusinessName,
      role_title: roleTitle,
      business_email: businessEmail,
      business_phone: businessPhone || null,
      city,
      state,
      website_or_social: websiteOrSocial || null,
      summary: summary || null,
      acknowledgement_accepted: true,
      status: 'pending',
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/dashboard/venue-owner-request?submitted=1');
}