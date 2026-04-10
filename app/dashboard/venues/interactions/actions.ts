'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireVenueOwnerOrAdminForVenue(venueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) redirect('/dashboard');

  const isAdmin = profile.app_role === 'admin';

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id, slug')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    throw new Error(venueError?.message || 'Venue not found');
  }

  if (!isAdmin && venue.owner_id !== user.id) {
    redirect('/dashboard');
  }

  return { supabase, user, venue, isAdmin };
}

export async function updateVenueInteractionSettings(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const { supabase, venue } = await requireVenueOwnerOrAdminForVenue(venueId);

  const commentsEnabled = String(formData.get('comments_enabled') || '') === 'yes';
  const commentRetentionHours = Number(formData.get('comment_retention_hours') || 24);
  const commentsRequirePresence =
    String(formData.get('comments_require_presence') || '') === 'yes';
  const commentsAutoFilterEnabled =
    String(formData.get('comments_auto_filter_enabled') || '') === 'yes';

  const musicRequestsEnabled =
    String(formData.get('music_requests_enabled') || '') === 'yes';
  const musicRequestsRequirePresence =
    String(formData.get('music_requests_require_presence') || '') === 'yes';

  const payload = {
    venue_id: venueId,
    comments_enabled: commentsEnabled,
    comment_retention_hours: commentRetentionHours,
    comments_require_presence: commentsRequirePresence,
    comments_auto_filter_enabled: commentsAutoFilterEnabled,
    music_requests_enabled: musicRequestsEnabled,
    music_requests_require_presence: musicRequestsRequirePresence,
  };

  const { data: existing } = await supabase
    .from('venue_interaction_settings')
    .select('id')
    .eq('venue_id', venueId)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from('venue_interaction_settings')
        .update(payload)
        .eq('venue_id', venueId)
    : await supabase.from('venue_interaction_settings').insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  redirect(`/dashboard/venues/${venueId}/interactions?saved=1`);
}

export async function moderateVenueComment(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const commentId = String(formData.get('comment_id') || '');
  const status = String(formData.get('status') || 'live');
  const hiddenReason = String(formData.get('hidden_reason') || '').trim();

  const { supabase, user, venue } = await requireVenueOwnerOrAdminForVenue(venueId);

  const payload: Record<string, unknown> = {
    status,
    moderated_at: new Date().toISOString(),
    moderated_by: user.id,
  };

  if (status === 'hidden' || status === 'rejected' || status === 'removed') {
    payload.hidden_reason = hiddenReason || status;
  } else {
    payload.hidden_reason = null;
  }

  const { error } = await supabase
    .from('venue_comments')
    .update(payload)
    .eq('id', commentId)
    .eq('venue_id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/venues/${venue.slug}?comment_moderated=1`);
}

export async function pinVenueComment(formData: FormData) {
  const venueId = String(formData.get('venue_id') || '');
  const commentId = String(formData.get('comment_id') || '');
  const isPinned = String(formData.get('is_pinned') || '') === 'yes';

  const { supabase, venue } = await requireVenueOwnerOrAdminForVenue(venueId);

  const { error } = await supabase
    .from('venue_comments')
    .update({
      is_pinned: isPinned,
    })
    .eq('id', commentId)
    .eq('venue_id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/venues/${venue.slug}?comment_pinned=1`);
}