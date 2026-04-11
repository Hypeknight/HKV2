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

export async function updateVenueAdminState(formData: FormData) {
  const { supabase } = await requireAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const status = String(formData.get('status') || '');
  const isVisible = String(formData.get('is_visible') || '') === 'yes';
  const isFeatured = String(formData.get('is_featured') || '') === 'yes';

  const { error } = await supabase
    .from('venues')
    .update({
      status,
      is_visible: isVisible,
      is_featured: isFeatured,
    })
    .eq('id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/venues/${venueId}?saved=1`);
}

export async function updateVenueInteractionOverrides(formData: FormData) {
  const { supabase } = await requireAdmin();

  const venueId = String(formData.get('venue_id') || '');

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

  redirect(`/admin/venues/${venueId}?interactions_saved=1`);
}

export async function updateVenueSubscriptionAdmin(formData: FormData) {
  const { supabase } = await requireAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const subscriptionId = String(formData.get('subscription_id') || '');
  const subscriptionStatus = String(formData.get('subscription_status') || '');
  const billingMode = String(formData.get('billing_mode') || '');
  const lockIn = String(formData.get('lock_in') || '') === 'yes';
  const isActive = String(formData.get('is_active') || '') === 'yes';
  const adminNotes = String(formData.get('admin_notes') || '').trim();

  const { error } = await supabase
    .from('venue_subscriptions')
    .update({
      subscription_status: subscriptionStatus,
      billing_mode: billingMode,
      lock_in: lockIn,
      is_active: isActive,
      activated_at: isActive ? new Date().toISOString() : null,
      admin_notes: adminNotes || null,
    })
    .eq('id', subscriptionId)
    .eq('venue_id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/venues/${venueId}?subscription_saved=1`);
}

export async function resolveVenueRemovalRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const venueId = String(formData.get('venue_id') || '');
  const action = String(formData.get('action_type') || '');
  const refundDecision = String(formData.get('refund_decision') || 'not_applicable');

  const updatePayload: Record<string, unknown> = {
    refund_decision: refundDecision,
  };

  if (action === 'approve_remove') {
    updatePayload.status = 'removed';
    updatePayload.is_visible = false;
    updatePayload.removed_at = new Date().toISOString();
    updatePayload.removed_by = user.id;
  }

  if (action === 'deny_remove') {
    updatePayload.removal_requested_at = null;
    updatePayload.removal_reason = null;
    updatePayload.refund_requested = false;
    updatePayload.refund_decision = 'denied';
  }

  const { error } = await supabase
    .from('venues')
    .update(updatePayload)
    .eq('id', venueId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/venues/${venueId}?removal_resolved=1`);
}