'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordSignal } from '@/lib/signals/server';
import {
  detectEventSourceProvider,
  extractProviderEventId,
  normalizeProviderUrl,
} from '@/lib/event-sources/providers';

async function requireOwner(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: event, error } = await supabase
    .from('events')
    .select('id,slug,name,owner_id')
    .eq('id', eventId)
    .single();

  if (error || !event) throw new Error(error?.message || 'Event not found.');
  if (event.owner_id !== user.id) throw new Error('You do not manage this event.');

  return { supabase, user, event };
}

export async function connectEventSource(formData: FormData) {
  const eventId = String(formData.get('event_id') || '').trim();
  const rawUrl = String(formData.get('provider_url') || '').trim();
  const primary = String(formData.get('is_primary_ticket_source') || '') === 'on';
  if (!eventId) throw new Error('Missing event id.');

  const { supabase, user, event } = await requireOwner(eventId);
  const admin = createAdminClient();
  const providerUrl = normalizeProviderUrl(rawUrl);
  const provider = detectEventSourceProvider(providerUrl);
  const providerEventId = extractProviderEventId(provider, providerUrl);

  if (primary) {
    const { error: clearError } = await admin
      .from('event_sources')
      .update({ is_primary_ticket_source: false, updated_at: new Date().toISOString() })
      .eq('event_id', eventId);
    if (clearError) throw new Error(clearError.message);
  }

  const { error } = await admin.from('event_sources').insert({
    event_id: eventId,
    provider,
    provider_event_id: providerEventId,
    provider_url: providerUrl,
    source_type: 'connected',
    relationship_status: 'connected',
    is_primary_ticket_source: primary,
    is_verified: false,
    connected_by: user.id,
    metadata: { connected_from: 'owner_source_manager' },
  });

  if (error) {
    if (error.code === '23505') throw new Error('That source is already connected to this event.');
    throw new Error(error.message);
  }

  await recordSignal(supabase, {
    signalType: 'event_source_connected',
    subjectType: 'event',
    subjectId: eventId,
    eventId,
    source: provider,
    surface: 'event_source_manager',
    verificationLevel: 'declared',
    metadata: { provider_event_id: providerEventId, is_primary_ticket_source: primary },
  });

  revalidatePath(`/dashboard/events/${eventId}/sources`);
  if (event.slug) revalidatePath(`/events/${event.slug}`);
}

export async function setPrimaryEventSource(formData: FormData) {
  const eventId = String(formData.get('event_id') || '').trim();
  const sourceId = String(formData.get('source_id') || '').trim();
  if (!eventId || !sourceId) throw new Error('Missing source information.');

  const { event } = await requireOwner(eventId);
  const admin = createAdminClient();

  const { error: clearError } = await admin
    .from('event_sources')
    .update({ is_primary_ticket_source: false, updated_at: new Date().toISOString() })
    .eq('event_id', eventId);
  if (clearError) throw new Error(clearError.message);

  const { error } = await admin
    .from('event_sources')
    .update({ is_primary_ticket_source: true, updated_at: new Date().toISOString() })
    .eq('id', sourceId)
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/sources`);
  if (event.slug) revalidatePath(`/events/${event.slug}`);
}

export async function retireEventSource(formData: FormData) {
  const eventId = String(formData.get('event_id') || '').trim();
  const sourceId = String(formData.get('source_id') || '').trim();
  if (!eventId || !sourceId) throw new Error('Missing source information.');

  const { event } = await requireOwner(eventId);
  const admin = createAdminClient();
  const { error } = await admin
    .from('event_sources')
    .update({
      relationship_status: 'retired',
      is_primary_ticket_source: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/sources`);
  if (event.slug) revalidatePath(`/events/${event.slug}`);
}
