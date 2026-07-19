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

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function optionalBoolean(
  formData: FormData,
  key: string
) {
  const value = text(formData, key);

  if (value === 'inherit' || !value) {
    return null;
  }

  return value === 'true';
}

function optionalNumber(
  formData: FormData,
  key: string
) {
  const value = text(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${key}.`);
  }

  return parsed;
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


export async function updateGlobalPatronPulseSettings(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const maxOpenPulses = Number(
    text(formData, 'patron_pulse_max_open_pulses') || 1
  );

  const defaultDurationMinutes = Number(
    text(
      formData,
      'patron_pulse_default_duration_minutes'
    ) || 5
  );

  const maxResponseLength = Number(
    text(
      formData,
      'patron_pulse_max_response_length'
    ) || 500
  );

  const defaultResultsVisibility =
    text(
      formData,
      'patron_pulse_default_results_visibility'
    ) || 'after_close';

  if (
    ![
      'hidden',
      'live',
      'after_response',
      'after_close',
    ].includes(defaultResultsVisibility)
  ) {
    throw new Error(
      'Invalid default results visibility.'
    );
  }

  if (maxOpenPulses < 1) {
    throw new Error(
      'At least one open pulse must be allowed.'
    );
  }

  if (
    defaultDurationMinutes < 1 ||
    defaultDurationMinutes > 1440
  ) {
    throw new Error(
      'Default duration must be between 1 and 1440 minutes.'
    );
  }

  if (
    maxResponseLength < 1 ||
    maxResponseLength > 5000
  ) {
    throw new Error(
      'Maximum response length must be between 1 and 5000 characters.'
    );
  }

  const { error } = await supabase
    .from('platform_settings')
    .update({
      patron_pulse_enabled: checkbox(
        formData,
        'patron_pulse_enabled'
      ),
      patron_pulse_sales_enabled: checkbox(
        formData,
        'patron_pulse_sales_enabled'
      ),
      patron_pulse_beta_enabled: checkbox(
        formData,
        'patron_pulse_beta_enabled'
      ),
      patron_pulse_default_tier:
        text(
          formData,
          'patron_pulse_default_tier'
        ) || 'core',

      patron_pulse_checkin_enabled: checkbox(
        formData,
        'patron_pulse_checkin_enabled'
      ),
      patron_pulse_require_checkin: checkbox(
        formData,
        'patron_pulse_require_checkin'
      ),
      patron_pulse_allow_anonymous_view: checkbox(
        formData,
        'patron_pulse_allow_anonymous_view'
      ),
      patron_pulse_allow_guest_results: checkbox(
        formData,
        'patron_pulse_allow_guest_results'
      ),

      patron_pulse_announcements_enabled: checkbox(
        formData,
        'patron_pulse_announcements_enabled'
      ),
      patron_pulse_dj_requests_enabled: checkbox(
        formData,
        'patron_pulse_dj_requests_enabled'
      ),
      patron_pulse_challenges_enabled: checkbox(
        formData,
        'patron_pulse_challenges_enabled'
      ),
      patron_pulse_rewards_enabled: checkbox(
        formData,
        'patron_pulse_rewards_enabled'
      ),

      patron_pulse_max_open_pulses:
        maxOpenPulses,
      patron_pulse_default_duration_minutes:
        defaultDurationMinutes,
      patron_pulse_max_response_length:
        maxResponseLength,
      patron_pulse_default_results_visibility:
        defaultResultsVisibility,

      patron_pulse_owner_can_open_session:
        checkbox(
          formData,
          'patron_pulse_owner_can_open_session'
        ),
      patron_pulse_owner_can_create_pulses:
        checkbox(
          formData,
          'patron_pulse_owner_can_create_pulses'
        ),
      patron_pulse_owner_can_publish_announcements:
        checkbox(
          formData,
          'patron_pulse_owner_can_publish_announcements'
        ),
      patron_pulse_admin_approval_required:
        checkbox(
          formData,
          'patron_pulse_admin_approval_required'
        ),

      patron_pulse_public_label:
        text(
          formData,
          'patron_pulse_public_label'
        ) || 'Patron Pulse',
      patron_pulse_public_description:
        text(
          formData,
          'patron_pulse_public_description'
        ) || null,
      patron_pulse_beta_notice:
        text(
          formData,
          'patron_pulse_beta_notice'
        ) || null,

      updated_at: new Date().toISOString(),
    })
    .eq('id', 'global');

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/patron-pulse');
}

export async function updateEventPatronPulseSettings(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const resultsVisibility =
    text(
      formData,
      'default_results_visibility'
    ) || null;

  if (
    resultsVisibility &&
    ![
      'hidden',
      'live',
      'after_response',
      'after_close',
    ].includes(resultsVisibility)
  ) {
    throw new Error(
      'Invalid event results visibility.'
    );
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('event_patron_pulse_settings')
    .upsert(
      {
        event_id: eventId,
        enabled:
          text(formData, 'enabled') !== 'false',

        require_checkin: optionalBoolean(
          formData,
          'require_checkin'
        ),
        allow_anonymous_view: optionalBoolean(
          formData,
          'allow_anonymous_view'
        ),
        allow_guest_results: optionalBoolean(
          formData,
          'allow_guest_results'
        ),

        announcements_enabled: optionalBoolean(
          formData,
          'announcements_enabled'
        ),
        dj_requests_enabled: optionalBoolean(
          formData,
          'dj_requests_enabled'
        ),
        challenges_enabled: optionalBoolean(
          formData,
          'challenges_enabled'
        ),
        rewards_enabled: optionalBoolean(
          formData,
          'rewards_enabled'
        ),

        max_open_pulses: optionalNumber(
          formData,
          'max_open_pulses'
        ),
        default_duration_minutes: optionalNumber(
          formData,
          'default_duration_minutes'
        ),
        max_response_length: optionalNumber(
          formData,
          'max_response_length'
        ),
        default_results_visibility:
          resultsVisibility,

        owner_can_open_session: optionalBoolean(
          formData,
          'owner_can_open_session'
        ),
        owner_can_create_pulses: optionalBoolean(
          formData,
          'owner_can_create_pulses'
        ),
        owner_can_publish_announcements:
          optionalBoolean(
            formData,
            'owner_can_publish_announcements'
          ),
        admin_approval_required: optionalBoolean(
          formData,
          'admin_approval_required'
        ),

        public_label:
          text(formData, 'public_label') || null,
        public_description:
          text(formData, 'public_description') ||
          null,
        admin_note:
          text(formData, 'admin_note') || null,

        created_by: user.id,
        updated_by: user.id,
        updated_at: nowIso,
      },
      {
        onConflict: 'event_id',
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId);
}

export async function clearEventPatronPulseSettings(
  formData: FormData
) {
  const { supabase } = await requireAdmin();

  const eventId = text(formData, 'event_id');

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const { error } = await supabase
    .from('event_patron_pulse_settings')
    .delete()
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId);
}


export async function restorePatronPulseAccess(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

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

  const { data: purchase, error: purchaseError } =
    await supabase
      .from('event_system_purchases')
      .update({
        purchase_status: 'overridden',
        qualification_status: 'not_required',
        qualification_reason:
          'Patron Pulse access restored by administrator.',
        starts_at: nowIso,
        ends_at: null,
        reviewed_by: user.id,
        reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id)
      .select('id, tier_id')
      .maybeSingle();

  if (purchaseError) {
    throw new Error(purchaseError.message);
  }

  if (!purchase) {
    throw new Error(
      'No Patron Pulse purchase or administrative grant exists to restore.'
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
          effective_tier_id: purchase.tier_id,
          entitlement_source: 'admin_grant',
          status: 'active',
          enabled: true,
          starts_at: nowIso,
          ends_at: null,
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

  const { error: overrideError } =
    await supabase
      .from('event_patron_pulse_settings')
      .upsert(
        {
          event_id: eventId,
          enabled: true,
          updated_by: user.id,
          updated_at: nowIso,
        },
        {
          onConflict: 'event_id',
        }
      );

  if (overrideError) {
    throw new Error(overrideError.message);
  }

  const { error: sessionError } =
    await supabase
      .from('patron_pulse_sessions')
      .update({
        status: 'scheduled',
        opened_at: null,
        opened_by: null,
        closed_at: null,
        closed_by: null,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .in('status', ['cancelled', 'closed']);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  refresh(eventId);
}