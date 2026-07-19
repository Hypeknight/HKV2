'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.app_role !== 'admin') {
    redirect('/dashboard');
  }

  return { supabase, user };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function refresh(eventId?: string) {
  revalidatePath('/admin/patron-pulse');

  if (eventId) {
    revalidatePath(
      `/admin/patron-pulse/${eventId}`
    );

    revalidatePath(
      `/dashboard/events/${eventId}/patron-pulse`
    );

    revalidatePath(
      `/dashboard/events/${eventId}/review`
    );
  }
}

export async function grantPatronPulseAccess(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const tierId = text(formData, 'tier_id');
  const qualificationStatus =
    text(formData, 'qualification_status') ||
    'not_required';

  if (!eventId || !tierId) {
    throw new Error(
      'Event and Patron Pulse tier are required.'
    );
  }

  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id')
      .eq('slug', 'patron-pulse')
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        'Patron Pulse system not found.'
    );
  }

  const { data: tier, error: tierError } =
    await supabase
      .from('system_tiers')
      .select('id, system_id')
      .eq('id', tierId)
      .eq('system_id', system.id)
      .single();

  if (tierError || !tier) {
    throw new Error(
      tierError?.message ||
        'Invalid Patron Pulse tier.'
    );
  }

  const nowIso = new Date().toISOString();

  const { data: purchase, error: purchaseError } =
    await supabase
      .from('event_system_purchases')
      .upsert(
        {
          event_id: eventId,
          system_id: system.id,
          tier_id: tierId,
          purchase_status: 'overridden',
          qualification_status:
            qualificationStatus,
          qualification_reason:
            'Administrative Patron Pulse grant.',
          paid_amount: 0,
          starts_at: nowIso,
          purchased_by: user.id,
          reviewed_by: user.id,
          reviewed_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: 'event_id,system_id',
        }
      )
      .select('id')
      .single();

  if (purchaseError || !purchase) {
    throw new Error(
      purchaseError?.message ||
        'Unable to grant Patron Pulse access.'
    );
  }

  const { error: activationError } =
    await supabase
      .from('event_system_activations')
      .upsert(
        {
          event_id: eventId,
          system_id: system.id,
          event_purchase_id: purchase.id,
          effective_tier_id: tierId,
          entitlement_source: 'admin_grant',
          status: 'configured',
          enabled: true,
          starts_at: nowIso,
          resolved_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: 'event_id,system_id',
        }
      );

  if (activationError) {
    throw new Error(activationError.message);
  }

  refresh(eventId);
}

export async function revokePatronPulseAccess(
  formData: FormData
) {
  const { supabase } = await requireAdmin();
  const eventId = text(formData, 'event_id');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id')
      .eq('slug', 'patron-pulse')
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        'Patron Pulse system not found.'
    );
  }

  const nowIso = new Date().toISOString();

  const { error: activationError } =
    await supabase
      .from('event_system_activations')
      .update({
        enabled: false,
        status: 'cancelled',
        ends_at: nowIso,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id);

  if (activationError) {
    throw new Error(activationError.message);
  }

  const { error: purchaseError } =
    await supabase
      .from('event_system_purchases')
      .update({
        purchase_status: 'cancelled',
        ends_at: nowIso,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id);

  if (purchaseError) {
    throw new Error(purchaseError.message);
  }

  await supabase
    .from('patron_pulse_sessions')
    .update({
      status: 'cancelled',
      closed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('event_id', eventId);

  refresh(eventId);
}

export async function updateAdminPulseSessionStatus(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const sessionId = text(formData, 'session_id');
  const status = text(formData, 'status');

  if (!eventId || !sessionId) {
    throw new Error('Missing session information.');
  }

  if (
    ![
      'scheduled',
      'open',
      'paused',
      'closed',
      'cancelled',
    ].includes(status)
  ) {
    throw new Error('Invalid session status.');
  }

  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    status,
    updated_at: nowIso,
  };

  if (status === 'open') {
    payload.opened_at = nowIso;
    payload.opened_by = user.id;
  }

  if (
    status === 'closed' ||
    status === 'cancelled'
  ) {
    payload.closed_at = nowIso;
    payload.closed_by = user.id;
  }

  const { error } = await supabase
    .from('patron_pulse_sessions')
    .update(payload)
    .eq('id', sessionId)
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId);
}

export async function updateAdminPulseStatus(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const pulseId = text(formData, 'pulse_id');
  const status = text(formData, 'status');

  if (!eventId || !pulseId) {
    throw new Error('Missing pulse information.');
  }

  if (
    ![
      'draft',
      'scheduled',
      'open',
      'closed',
      'cancelled',
    ].includes(status)
  ) {
    throw new Error('Invalid pulse status.');
  }

  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    status,
    updated_at: nowIso,
  };

  if (status === 'open') {
    payload.opened_at = nowIso;
    payload.opened_by = user.id;
  }

  if (
    status === 'closed' ||
    status === 'cancelled'
  ) {
    payload.closed_at = nowIso;
    payload.closed_by = user.id;
  }

  const { error } = await supabase
    .from('patron_pulses')
    .update(payload)
    .eq('id', pulseId)
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId);
}

export async function updateAdminAnnouncementStatus(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const announcementId = text(
    formData,
    'announcement_id'
  );
  const status = text(formData, 'status');

  if (!eventId || !announcementId) {
    throw new Error(
      'Missing announcement information.'
    );
  }

  if (
    ![
      'draft',
      'published',
      'expired',
      'cancelled',
    ].includes(status)
  ) {
    throw new Error(
      'Invalid announcement status.'
    );
  }

  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    status,
    updated_at: nowIso,
  };

  if (status === 'published') {
    payload.publish_at = nowIso;
    payload.published_at = nowIso;
    payload.published_by = user.id;
  }

  const { error } = await supabase
    .from('patron_pulse_announcements')
    .update(payload)
    .eq('id', announcementId)
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId);
}