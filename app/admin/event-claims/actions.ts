'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');
  const { data: profile } = await supabase.from('profiles').select('app_role').eq('id', user.id).single();
  if (profile?.app_role !== 'admin') throw new Error('Admin access required.');
  return user;
}

export async function reviewEventClaim(formData: FormData) {
  const adminUser = await requireAdmin();
  const claimId = String(formData.get('claim_id') || '').trim();
  const decision = String(formData.get('decision') || '').trim();
  const reviewerNote = String(formData.get('reviewer_note') || '').trim();
  if (!claimId || !['approved','rejected'].includes(decision)) throw new Error('Invalid review request.');

  const admin = createAdminClient();
  const { data: claim, error } = await admin.from('event_claims').select('*').eq('id', claimId).single();
  if (error || !claim) throw new Error(error?.message || 'Claim not found.');

  if (decision === 'approved' && claim.event_id && claim.external_event_id) {
    const { data: externalEvent, error: externalError } = await admin
      .from('external_events')
      .select('id,source_code,source_event_id,source_url,url,ticket_url,provider_url')
      .eq('id', claim.external_event_id)
      .single();
    if (externalError || !externalEvent) throw new Error(externalError?.message || 'External event not found.');

    const providerUrl = externalEvent.source_url || externalEvent.url || externalEvent.ticket_url || externalEvent.provider_url || claim.source_url;
    if (providerUrl) {
      const provider = externalEvent.source_code || claim.source_provider || 'other';
      const [{ data: importedSource }, { data: canonicalSource }] = await Promise.all([
        admin
          .from('event_sources')
          .select('id')
          .eq('external_event_id', claim.external_event_id)
          .eq('provider', provider)
          .eq('provider_url', providerUrl)
          .neq('relationship_status', 'retired')
          .maybeSingle(),
        admin
          .from('event_sources')
          .select('id')
          .eq('event_id', claim.event_id)
          .eq('provider', provider)
          .eq('provider_url', providerUrl)
          .neq('relationship_status', 'retired')
          .maybeSingle(),
      ]);

      const sourcePayload = {
        event_id: claim.event_id,
        external_event_id: claim.external_event_id,
        provider,
        provider_event_id: externalEvent.source_event_id || null,
        provider_url: providerUrl,
        source_type: 'claimed',
        relationship_status: 'verified',
        is_verified: true,
        connected_by: claim.claimant_user_id,
        verified_by: adminUser.id,
        verified_at: new Date().toISOString(),
        metadata: { claim_id: claim.id },
        updated_at: new Date().toISOString(),
      };

      let linkError = null;

      if (canonicalSource && importedSource && canonicalSource.id !== importedSource.id) {
        const { error: retireError } = await admin
          .from('event_sources')
          .update({ relationship_status: 'retired', updated_at: new Date().toISOString() })
          .eq('id', importedSource.id);
        if (retireError) throw new Error(retireError.message);

        const result = await admin
          .from('event_sources')
          .update(sourcePayload)
          .eq('id', canonicalSource.id);
        linkError = result.error;
      } else if (canonicalSource || importedSource) {
        const result = await admin
          .from('event_sources')
          .update(sourcePayload)
          .eq('id', (canonicalSource || importedSource)!.id);
        linkError = result.error;
      } else {
        const result = await admin.from('event_sources').insert(sourcePayload);
        linkError = result.error;
      }

      if (linkError) throw new Error(linkError.message);
    }
  }

  const { error: updateError } = await admin.from('event_claims').update({
    status: decision,
    reviewer_note: reviewerNote || null,
    reviewed_by: adminUser.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', claimId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath('/admin/event-claims');
  if (claim.external_event_id) revalidatePath(`/events/external/${claim.external_event_id}`);
}
