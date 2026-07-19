'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requirePatronPulseCapability } from '@/lib/patron-pulse/service';
import { resolvePatronPulseSettings } from '@/lib/patron-pulse/resolve-settings';

async function requireEventOwner(eventId: string) {
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

  const [{ data: event, error: eventError }, { data: profile }] =
    await Promise.all([
      supabase
        .from('events')
        .select('id, slug, name, owner_id')
        .eq('id', eventId)
        .single(),

      supabase
        .from('profiles')
        .select('app_role')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

  if (eventError || !event) {
    throw new Error(
      eventError?.message || 'Event not found.'
    );
  }

  const isOwner = event.owner_id === user.id;
  const isAdmin = profile?.app_role === 'admin';

  if (!isOwner && !isAdmin) {
    redirect('/dashboard/events');
  }

  return {
    supabase,
    user,
    event,
    isAdmin,
  };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function numberValue(
  formData: FormData,
  key: string,
  fallback: number
) {
  const parsed = Number(formData.get(key));

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function refresh(eventId: string, slug?: string | null) {
  revalidatePath(
    `/dashboard/events/${eventId}/patron-pulse`
  );

  revalidatePath(
    `/dashboard/events/${eventId}/review`
  );

  if (slug) {
    revalidatePath(`/events/${slug}`);
  }
}

export async function createPatronPulseSession(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const title =
    value(formData, 'title') ||
    'Live Event Experience';

  if (!eventId) {
    throw new Error('Missing event id.');
  }

  const { supabase, user, event } =
    await requireEventOwner(eventId);

  const settings =
    await resolvePatronPulseSettings({
      supabase,
      eventId,
    });

  if (!settings.enabled) {
    throw new Error(
      'Patron Pulse is disabled for this event.'
    );
  }

  await requirePatronPulseCapability({
    supabase,
    eventId,
    capability: 'guest-check-in',
  });

  const { data: existing, error: existingError } =
    await supabase
      .from('patron_pulse_sessions')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    redirect(
      `/dashboard/events/${eventId}/patron-pulse`
    );
  }

  const { error } = await supabase
    .from('patron_pulse_sessions')
    .insert({
      event_id: eventId,
      title,
      status: 'scheduled',
      check_in_enabled: true,
      announcements_enabled: true,
      responses_visible: true,
      created_by: user.id,
    });

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId, event.slug);

  redirect(
    `/dashboard/events/${eventId}/patron-pulse?created=1`
  );
}

export async function updatePatronPulseSessionStatus(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const sessionId = value(formData, 'session_id');
  const status = value(formData, 'status');

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

  const { supabase, user, event, isAdmin } =
    await requireEventOwner(eventId);

  const settings =
    await resolvePatronPulseSettings({
      supabase,
      eventId,
    });

  if (!settings.enabled) {
    throw new Error(
      'Patron Pulse is disabled for this event.'
    );
  }

  if (
    status === 'open' &&
    !isAdmin &&
    !settings.ownerCanOpenSession
  ) {
    throw new Error(
      'Event owners are not permitted to open this Pulse session.'
    );
  }

  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    status,
    updated_at: nowIso,
  };

  if (status === 'open') {
    payload.opened_at = nowIso;
    payload.opened_by = user.id;
    payload.closed_at = null;
    payload.closed_by = null;
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

  refresh(eventId, event.slug);
}

export async function updatePatronPulseSessionSettings(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const sessionId = value(formData, 'session_id');
  const title = value(formData, 'title');

  if (!eventId || !sessionId) {
    throw new Error('Missing session information.');
  }

  const { supabase, event } =
    await requireEventOwner(eventId);

  const { error } = await supabase
    .from('patron_pulse_sessions')
    .update({
      title: title || 'Live Event Experience',
      check_in_enabled:
        formData.get('check_in_enabled') === 'on',
      announcements_enabled:
        formData.get('announcements_enabled') === 'on',
      responses_visible:
        formData.get('responses_visible') === 'on',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId, event.slug);
}

export async function createPatronPulse(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const sessionId = value(formData, 'session_id');
  const pulseType = value(formData, 'pulse_type');
  const title = value(formData, 'title');
  const prompt = value(formData, 'prompt');
  const description = value(
    formData,
    'description'
  );

  const options = [
    value(formData, 'option_1'),
    value(formData, 'option_2'),
    value(formData, 'option_3'),
    value(formData, 'option_4'),
  ].filter(Boolean);

  if (!eventId || !sessionId || !title) {
    throw new Error(
      'Event, session, and pulse title are required.'
    );
  }

  if (
    ![
      'poll',
      'announcement',
      'rating',
      'yes_no',
      'dj_request',
      'challenge',
      'feedback',
    ].includes(pulseType)
  ) {
    throw new Error('Invalid pulse type.');
  }

  const { supabase, user, event, isAdmin } =
    await requireEventOwner(eventId);

  const settings =
    await resolvePatronPulseSettings({
      supabase,
      eventId,
    });

  if (!settings.enabled) {
    throw new Error(
      'Patron Pulse is disabled for this event.'
    );
  }

  if (
    !isAdmin &&
    !settings.ownerCanCreatePulses
  ) {
    throw new Error(
      'Event owners are not permitted to create pulses.'
    );
  }

  if (
    pulseType === 'dj_request' &&
    !settings.djRequestsEnabled
  ) {
    throw new Error(
      'DJ requests are disabled for this event.'
    );
  }

  if (
    pulseType === 'challenge' &&
    !settings.challengesEnabled
  ) {
    throw new Error(
      'Challenges are disabled for this event.'
    );
  }

  await requirePatronPulseCapability({
    supabase,
    eventId,
    capability:
      pulseType === 'dj_request'
        ? 'song-requests'
        : pulseType === 'challenge'
          ? 'challenges'
          : 'live-polls',
  });

  const requiresOptions = [
    'poll',
    'yes_no',
    'rating',
    'challenge',
  ].includes(pulseType);

  if (requiresOptions && options.length < 2) {
    throw new Error(
      'This pulse type requires at least two response options.'
    );
  }

  const { data: pulse, error: pulseError } =
    await supabase
      .from('patron_pulses')
      .insert({
        session_id: sessionId,
        event_id: eventId,
        pulse_type: pulseType,
        title,
        prompt: prompt || null,
        description: description || null,
        status: 'draft',
        results_visibility:
          value(
            formData,
            'results_visibility'
          ) ||
          settings.defaultResultsVisibility,
        allow_multiple_responses:
          formData.get(
            'allow_multiple_responses'
          ) === 'on',
        sort_order: numberValue(
          formData,
          'sort_order',
          100
        ),
        created_by: user.id,
      })
      .select('id')
      .single();

  if (pulseError || !pulse) {
    throw new Error(
      pulseError?.message ||
        'Unable to create pulse.'
    );
  }

  if (options.length) {
    const { error: optionError } = await supabase
      .from('patron_pulse_options')
      .insert(
        options.map((label, index) => ({
          pulse_id: pulse.id,
          label,
          sort_order: (index + 1) * 10,
          is_active: true,
        }))
      );

    if (optionError) {
      await supabase
        .from('patron_pulses')
        .delete()
        .eq('id', pulse.id);

      throw new Error(optionError.message);
    }
  }

  refresh(eventId, event.slug);
}

export async function updatePatronPulseStatus(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const pulseId = value(formData, 'pulse_id');
  const status = value(formData, 'status');

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

  const { supabase, user, event } =
    await requireEventOwner(eventId);

  const settings =
    await resolvePatronPulseSettings({
      supabase,
      eventId,
    });

  if (!settings.enabled) {
    throw new Error(
      'Patron Pulse is disabled for this event.'
    );
  }

  if (status === 'open') {
    const { count, error: countError } =
      await supabase
        .from('patron_pulses')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('event_id', eventId)
        .eq('status', 'open')
        .neq('id', pulseId);

    if (countError) {
      throw new Error(countError.message);
    }

    if (
      Number(count || 0) >=
      settings.maxOpenPulses
    ) {
      throw new Error(
        `Only ${settings.maxOpenPulses} pulse${
          settings.maxOpenPulses === 1
            ? ''
            : 's'
        } may be open at once.`
      );
    }
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

  refresh(eventId, event.slug);
}

export async function createPatronPulseAnnouncement(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const sessionId = value(formData, 'session_id');
  const title = value(formData, 'title');
  const message = value(formData, 'message');
  const priority =
    value(formData, 'priority') || 'normal';
  const publishNow =
    formData.get('publish_now') === 'on';

  if (
    !eventId ||
    !sessionId ||
    !title ||
    !message
  ) {
    throw new Error(
      'Announcement title and message are required.'
    );
  }

  if (
    !['low', 'normal', 'high', 'urgent'].includes(
      priority
    )
  ) {
    throw new Error(
      'Invalid announcement priority.'
    );
  }

  const { supabase, user, event, isAdmin } =
    await requireEventOwner(eventId);

  const settings =
    await resolvePatronPulseSettings({
      supabase,
      eventId,
    });

  if (!settings.enabled) {
    throw new Error(
      'Patron Pulse is disabled for this event.'
    );
  }

  if (!settings.announcementsEnabled) {
    throw new Error(
      'Announcements are disabled for this event.'
    );
  }

  if (
    !isAdmin &&
    !settings.ownerCanPublishAnnouncements
  ) {
    throw new Error(
      'Event owners are not permitted to publish announcements.'
    );
  }

  await requirePatronPulseCapability({
    supabase,
    eventId,
    capability: 'announcements',
  });

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('patron_pulse_announcements')
    .insert({
      session_id: sessionId,
      event_id: eventId,
      title,
      message,
      priority,
      status: publishNow
        ? 'published'
        : 'draft',
      publish_at: publishNow
        ? nowIso
        : null,
      published_at: publishNow
        ? nowIso
        : null,
      published_by: publishNow
        ? user.id
        : null,
      created_by: user.id,
    });

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId, event.slug);
}

export async function updatePatronPulseAnnouncementStatus(
  formData: FormData
) {
  const eventId = value(formData, 'event_id');
  const announcementId = value(
    formData,
    'announcement_id'
  );
  const status = value(formData, 'status');

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

  const { supabase, user, event } =
    await requireEventOwner(eventId);

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('patron_pulse_announcements')
    .update({
      status,
      publish_at:
        status === 'published'
          ? nowIso
          : undefined,
      published_at:
        status === 'published'
          ? nowIso
          : undefined,
      published_by:
        status === 'published'
          ? user.id
          : undefined,
      updated_at: nowIso,
    })
    .eq('id', announcementId)
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId, event.slug);
}