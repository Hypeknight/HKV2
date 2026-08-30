'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { recordSignal } from '@/lib/signals/server';

export async function submitExternalEventClaim(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const externalEventId = String(formData.get('external_event_id') || '').trim();
  const eventId = String(formData.get('event_id') || '').trim() || null;
  const claimRole = String(formData.get('claim_role') || 'promoter');
  const evidenceNote = String(formData.get('evidence_note') || '').trim();

  if (!externalEventId) throw new Error('Missing external event.');
  if (!['promoter','venue','organizer','owner','other'].includes(claimRole)) throw new Error('Invalid claim role.');

  const { data: externalEvent, error: externalError } = await supabase
    .from('external_events')
    .select('id,source_code,source_url,url,ticket_url,provider_url')
    .eq('id', externalEventId)
    .single();
  if (externalError || !externalEvent) throw new Error(externalError?.message || 'External event not found.');

  if (eventId) {
    const { data: owned } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!owned) throw new Error('You can only connect a HypeKnight event you manage.');
  }

  const sourceUrl = externalEvent.source_url || externalEvent.url || externalEvent.ticket_url || externalEvent.provider_url || null;

  const { error } = await supabase.from('event_claims').insert({
    claimant_user_id: user.id,
    event_id: eventId,
    external_event_id: externalEventId,
    claim_role: claimRole,
    status: 'pending',
    source_provider: externalEvent.source_code || 'other',
    source_url: sourceUrl,
    evidence_note: evidenceNote || null,
  });
  if (error) throw new Error(error.message);

  await recordSignal(supabase, {
    signalType: 'event_claim_submitted',
    subjectType: 'event',
    subjectId: externalEventId,
    eventId: eventId,
    source: externalEvent.source_code || 'external',
    surface: 'external_event_claim',
    verificationLevel: 'declared',
    metadata: { external_event_id: externalEventId, claim_role: claimRole, requested_event_link: Boolean(eventId) },
  });

  redirect(`/events/external/${externalEventId}?claim=submitted`);
}
