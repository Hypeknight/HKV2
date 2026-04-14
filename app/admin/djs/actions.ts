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

export async function reviewDjRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const requestId = String(formData.get('request_id') || '');
  const userId = String(formData.get('user_id') || '');
  const status = String(formData.get('status') || 'denied');
  const reviewNotes = String(formData.get('review_notes') || '').trim();

  const { error } = await supabase
    .from('dj_role_requests')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  if (status === 'approved') {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        app_role: 'dj',
      })
      .eq('id', userId);

    if (profileError) throw new Error(profileError.message);
  }

  redirect('/admin/djs?reviewed=1');
}

export async function assignDjToVenue(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const djUserId = String(formData.get('dj_user_id') || '');
  const venueId = String(formData.get('venue_id') || '');
  const notes = String(formData.get('notes') || '').trim();

  const { data: existing } = await supabase
    .from('venue_dj_assignments')
    .select('id')
    .eq('dj_user_id', djUserId)
    .eq('venue_id', venueId)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from('venue_dj_assignments')
        .update({
          status: 'active',
          removed_at: null,
          notes: notes || null,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    : await supabase.from('venue_dj_assignments').insert({
        dj_user_id: djUserId,
        venue_id: venueId,
        status: 'active',
        notes: notes || null,
        assigned_by: user.id,
      });

  if (result.error) throw new Error(result.error.message);

  redirect('/admin/djs?assigned=1');
}