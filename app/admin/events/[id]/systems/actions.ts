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

function refresh(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/systems`);
  revalidatePath(`/dashboard/events/${eventId}/review`);
  revalidatePath(`/dashboard/events/${eventId}/patron-pulse`);
  revalidatePath(`/dashboard/events/${eventId}/linkdn`);
  revalidatePath('/admin/patron-pulse');
  revalidatePath('/admin/linkdn');
  revalidatePath('/admin/linkdn/opportunities');
}

async function getSystemAndTier({
  supabase,
  systemSlug,
  tierId,
}: {
  supabase: any;
  systemSlug: string;
  tierId: string;
}) {
  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id, slug, name')
      .eq('slug', systemSlug)
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        `System ${systemSlug} was not found.`
    );
  }

  const { data: tier, error: tierError } =
    await supabase
      .from('system_tiers')
      .select('id, system_id, name, slug, rank')
      .eq('id', tierId)
      .eq('system_id', system.id)
      .single();

  if (tierError || !tier) {
    throw new Error(
      tierError?.message ||
        `Invalid ${system.name} tier.`
    );
  }

  return { system, tier };
}

export async function grantEventSystemAccess(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const systemSlug = text(formData, 'system_slug');
  const tierId = text(formData, 'tier_id');
  const source =
    text(formData, 'entitlement_source') ||
    'admin_grant';

  if (!eventId || !systemSlug || !tierId) {
    throw new Error(
      'Event, system, and tier are required.'
    );
  }

  const { system, tier } =
    await getSystemAndTier({
      supabase,
      systemSlug,
      tierId,
    });

  const nowIso = new Date().toISOString();

  const { data: purchase, error: purchaseError } =
    await supabase
      .from('event_system_purchases')
      .upsert(
        {
          event_id: eventId,
          system_id: system.id,
          tier_id: tier.id,
          purchase_status: 'overridden',
          qualification_status: 'not_required',
          qualification_reason:
            `Administrative ${system.name} grant.`,
          paid_amount: 0,
          starts_at: nowIso,
          ends_at: null,
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
        `Unable to grant ${system.name}.`
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
          effective_tier_id: tier.id,
          entitlement_source: source,
          status:
            systemSlug === 'linkdn'
              ? 'pending_readiness'
              : 'configured',
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

  if (systemSlug === 'patron-pulse') {
    const { error: settingsError } =
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

    if (settingsError) {
      throw new Error(settingsError.message);
    }
  }

  refresh(eventId);
}

export async function changeEventSystemTier(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const systemSlug = text(formData, 'system_slug');
  const tierId = text(formData, 'tier_id');

  if (!eventId || !systemSlug || !tierId) {
    throw new Error(
      'Event, system, and tier are required.'
    );
  }

  const { system, tier } =
    await getSystemAndTier({
      supabase,
      systemSlug,
      tierId,
    });

  const nowIso = new Date().toISOString();

  const [
    { error: purchaseError },
    { error: activationError },
  ] = await Promise.all([
    supabase
      .from('event_system_purchases')
      .update({
        tier_id: tier.id,
        purchase_status: 'overridden',
        qualification_status: 'not_required',
        qualification_reason:
          `Administrative tier change to ${tier.name}.`,
        reviewed_by: user.id,
        reviewed_at: nowIso,
        ends_at: null,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id),

    supabase
      .from('event_system_activations')
      .update({
        effective_tier_id: tier.id,
        enabled: true,
        status:
          systemSlug === 'linkdn'
            ? 'pending_readiness'
            : 'configured',
        ends_at: null,
        resolved_at: nowIso,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id),
  ]);

  if (purchaseError) {
    throw new Error(purchaseError.message);
  }

  if (activationError) {
    throw new Error(activationError.message);
  }

  refresh(eventId);
}

export async function setEventSystemEnabled(
  formData: FormData
) {
  const { supabase, user } = await requireAdmin();

  const eventId = text(formData, 'event_id');
  const systemSlug = text(formData, 'system_slug');
  const enabled = text(formData, 'enabled') === 'true';

  if (!eventId || !systemSlug) {
    throw new Error(
      'Event and system are required.'
    );
  }

  const { data: system, error: systemError } =
    await supabase
      .from('platform_systems')
      .select('id, name')
      .eq('slug', systemSlug)
      .single();

  if (systemError || !system) {
    throw new Error(
      systemError?.message ||
        'System was not found.'
    );
  }

  const nowIso = new Date().toISOString();

  const [
    { error: activationError },
    { error: purchaseError },
  ] = await Promise.all([
    supabase
      .from('event_system_activations')
      .update({
        enabled,
        status: enabled
          ? systemSlug === 'linkdn'
            ? 'pending_readiness'
            : 'configured'
          : 'cancelled',
        starts_at: enabled ? nowIso : undefined,
        ends_at: enabled ? null : nowIso,
        resolved_at: nowIso,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id),

    supabase
      .from('event_system_purchases')
      .update({
        purchase_status: enabled
          ? 'overridden'
          : 'cancelled',
        starts_at: enabled ? nowIso : undefined,
        ends_at: enabled ? null : nowIso,
        reviewed_by: user.id,
        reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('event_id', eventId)
      .eq('system_id', system.id),
  ]);

  if (activationError) {
    throw new Error(activationError.message);
  }

  if (purchaseError) {
    throw new Error(purchaseError.message);
  }

  if (systemSlug === 'patron-pulse') {
    const { error: settingsError } =
      await supabase
        .from('event_patron_pulse_settings')
        .upsert(
          {
            event_id: eventId,
            enabled,
            updated_by: user.id,
            updated_at: nowIso,
          },
          {
            onConflict: 'event_id',
          }
        );

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    if (!enabled) {
      await supabase
        .from('patron_pulse_sessions')
        .update({
          status: 'cancelled',
          closed_at: nowIso,
          closed_by: user.id,
          updated_at: nowIso,
        })
        .eq('event_id', eventId)
        .not('status', 'in', '("closed","cancelled")');
    }
  }

  refresh(eventId);
}