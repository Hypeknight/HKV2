'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const BLOCKED_WORDS = [
  'nigger',
  'faggot',
  'kike',
  'chink',
  'rape',
  'kill yourself',
];

const REVIEW_WORDS = [
  'bitch',
  'fuck',
  'shit',
  'asshole',
  'hoe',
  'whore',
];

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function moderateComment(text: string): {
  status: 'live' | 'pending_review' | 'rejected';
  filterResult: 'allowed' | 'review' | 'blocked';
  hiddenReason: string | null;
} {
  const normalized = normalizeText(text);

  if (BLOCKED_WORDS.some((word) => normalized.includes(word))) {
    return {
      status: 'rejected',
      filterResult: 'blocked',
      hiddenReason: 'blocked_by_filter',
    };
  }

  if (REVIEW_WORDS.some((word) => normalized.includes(word))) {
    return {
      status: 'pending_review',
      filterResult: 'review',
      hiddenReason: 'requires_review',
    };
  }

  return {
    status: 'live',
    filterResult: 'allowed',
    hiddenReason: null,
  };
}

async function getActivePresenceCheckin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  venueId: string,
  userId: string
) {
  const { data } = await supabase
    .from('venue_presence_checkins')
    .select('*')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .maybeSingle();

  return data;
}

export async function submitVenueComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const venueId = String(formData.get('venue_id') || '');
  const venueSlug = String(formData.get('venue_slug') || '');
  const commentText = String(formData.get('comment_text') || '').trim();

  if (!commentText) {
    redirect(`/venues/${venueSlug}?comment_error=empty`);
  }

  const { data: settings, error: settingsError } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  if (!settings?.comments_enabled) {
    redirect(`/venues/${venueSlug}?comment_error=disabled`);
  }

  let presenceSessionId: string | null = null;

  if (settings.comments_require_presence) {
    const activeCheckin = await getActivePresenceCheckin(supabase, venueId, user.id);

    if (!activeCheckin) {
      redirect(`/venues/${venueSlug}?comment_error=presence_required`);
    }

    presenceSessionId = activeCheckin.venue_presence_session_id;
  }

  const moderation = settings.comments_auto_filter_enabled
    ? moderateComment(commentText)
    : {
        status: 'live' as const,
        filterResult: 'allowed' as const,
        hiddenReason: null,
      };

  const retentionHours = Number(settings.comment_retention_hours || 24);
  const expiresAt = new Date(Date.now() + retentionHours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('venue_comments').insert({
    venue_id: venueId,
    user_id: user.id,
    comment_text: commentText,
    status: moderation.status,
    filter_result: moderation.filterResult,
    hidden_reason: moderation.hiddenReason,
    expires_at: expiresAt,
    presence_session_id: presenceSessionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/venues/${venueSlug}?comment_submitted=1`);
}

export async function flagVenueComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const commentId = String(formData.get('comment_id') || '');
  const venueSlug = String(formData.get('venue_slug') || '');
  const reason = String(formData.get('reason') || 'other');
  const notes = String(formData.get('notes') || '').trim();

  const { error } = await supabase.from('venue_comment_flags').insert({
    comment_id: commentId,
    user_id: user.id,
    reason,
    notes: notes || null,
  });

  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw new Error(error.message);
  }

  redirect(`/venues/${venueSlug}?comment_flagged=1`);
}

export async function submitVenueMusicRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const venueId = String(formData.get('venue_id') || '');
  const venueSlug = String(formData.get('venue_slug') || '');
  const artistName = String(formData.get('artist_name') || '').trim();
  const songTitle = String(formData.get('song_title') || '').trim();
  const requestNote = String(formData.get('request_note') || '').trim();

  if (!songTitle) {
    redirect(`/venues/${venueSlug}?music_error=empty`);
  }

  const { data: settings, error: settingsError } = await supabase
    .from('venue_interaction_settings')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (settingsError) throw new Error(settingsError.message);

  if (!settings?.music_requests_enabled) {
    redirect(`/venues/${venueSlug}?music_error=disabled`);
  }

  let presenceSessionId: string | null = null;

  if (settings.music_requests_require_presence) {
    const activeCheckin = await getActivePresenceCheckin(supabase, venueId, user.id);

    if (!activeCheckin) {
      redirect(`/venues/${venueSlug}?music_error=presence_required`);
    }

    presenceSessionId = activeCheckin.venue_presence_session_id;
  }

  const { error } = await supabase.from('venue_music_requests').insert({
    venue_id: venueId,
    user_id: user.id,
    artist_name: artistName || null,
    song_title: songTitle,
    request_note: requestNote || null,
    status: 'pending',
    presence_session_id: presenceSessionId,
  });

  if (error) throw new Error(error.message);

  redirect(`/venues/${venueSlug}?music_submitted=1`);
}

export async function voteVenueMusicRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const requestId = String(formData.get('request_id') || '');
  const venueSlug = String(formData.get('venue_slug') || '');
  const voteType = String(formData.get('vote_type') || 'up');

  const { data: existing } = await supabase
    .from('venue_music_request_votes')
    .select('id, vote_type')
    .eq('request_id', requestId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('venue_music_request_votes').insert({
      request_id: requestId,
      user_id: user.id,
      vote_type: voteType,
    });

    if (error) throw new Error(error.message);
  } else if (existing.vote_type === voteType) {
    const { error } = await supabase
      .from('venue_music_request_votes')
      .delete()
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('venue_music_request_votes')
      .update({ vote_type: voteType })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
  }

  redirect(`/venues/${venueSlug}?music_voted=1`);
}

export async function flagVenueMusicRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const requestId = String(formData.get('request_id') || '');
  const venueSlug = String(formData.get('venue_slug') || '');
  const reason = String(formData.get('reason') || 'other');
  const notes = String(formData.get('notes') || '').trim();

  const { error } = await supabase.from('venue_music_request_flags').insert({
    request_id: requestId,
    user_id: user.id,
    reason,
    notes: notes || null,
  });

  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw new Error(error.message);
  }

  redirect(`/venues/${venueSlug}?music_flagged=1`);
}

export async function ownerUpdateVenueMusicRequestStatus(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const requestId = String(formData.get('request_id') || '');
  const venueSlug = String(formData.get('venue_slug') || '');
  const status = String(formData.get('status') || 'pending');

  const { data: request, error: requestError } = await supabase
    .from('venue_music_requests')
    .select('id, venue_id')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || 'Music request not found');
  }

  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', request.venue_id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!venue) {
    redirect(`/venues/${venueSlug}`);
  }

  const payload: Record<string, any> = {
    status,
    moderated_at: new Date().toISOString(),
    moderated_by: user.id,
  };

  if (status === 'played') {
    payload.played_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('venue_music_requests')
    .update(payload)
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  redirect(`/venues/${venueSlug}?music_status_updated=1`);
}