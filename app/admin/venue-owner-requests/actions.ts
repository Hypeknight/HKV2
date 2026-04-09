'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  return { supabase, user };
}

export async function approveVenueOwnerRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const requestId = String(formData.get('request_id') || '');

  const { data: request, error: requestError } = await supabase
    .from('venue_owner_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || 'Request not found');
  }

  const { error: roleError } = await supabase
    .from('profiles')
    .update({
      app_role: 'venue_owner',
    })
    .eq('id', request.user_id);

  if (roleError) throw new Error(roleError.message);

  const { error: updateError } = await supabase
    .from('venue_owner_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId);

  if (updateError) throw new Error(updateError.message);

  redirect('/admin/venue-owner-requests?approved=1');
}

export async function denyVenueOwnerRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const requestId = String(formData.get('request_id') || '');
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  const { error } = await supabase
    .from('venue_owner_requests')
    .update({
      status: 'denied',
      admin_notes: adminNotes || 'Denied by admin',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  redirect('/admin/venue-owner-requests?denied=1');
}