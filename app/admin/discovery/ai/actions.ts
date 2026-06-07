'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  normalizeTicketmasterEvent,
  searchTicketmasterEvents,
} from '@/lib/external-events/ticketmaster';

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

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  return user;
}

export async function acceptRecommendation(formData: FormData) {
  await requireAdmin();

  const recommendationId = String(formData.get('recommendation_id') || '');

  if (!recommendationId) throw new Error('Missing recommendation id');

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('discovery_ai_recommendations')
    .update({
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  if (error) throw new Error(error.message);

  redirect('/admin/discovery/ai');
}

export async function dismissRecommendation(formData: FormData) {
  await requireAdmin();

  const recommendationId = String(formData.get('recommendation_id') || '');

  if (!recommendationId) throw new Error('Missing recommendation id');

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('discovery_ai_recommendations')
    .update({
      status: 'dismissed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  if (error) throw new Error(error.message);

  redirect('/admin/discovery/ai');
}

export async function importFromRecommendation(formData: FormData) {
  await requireAdmin();

  const recommendationId = String(formData.get('recommendation_id') || '');

  if (!recommendationId) throw new Error('Missing recommendation id');

  const supabase = createAdminClient();

  const { data: recommendation, error: recommendationError } = await supabase
    .from('discovery_ai_recommendations')
    .select('*')
    .eq('id', recommendationId)
    .single();

  if (recommendationError || !recommendation) {
    throw new Error(recommendationError?.message || 'Recommendation not found');
  }

  const events = await searchTicketmasterEvents({
    city: recommendation.city,
    stateCode: recommendation.state || undefined,
    keyword: recommendation.suggested_keyword || undefined,
    size: 10,
  });

  const rows = events.map(normalizeTicketmasterEvent);

  if (rows.length) {
    const { error: upsertError } = await supabase
      .from('external_events')
      .upsert(rows, {
        onConflict: 'source_code,source_event_id',
      });

    if (upsertError) throw new Error(upsertError.message);
  }

  const { error: updateError } = await supabase
    .from('discovery_ai_recommendations')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  if (updateError) throw new Error(updateError.message);

  redirect('/admin/discovery/ai?imported=1');
}

export async function runDiscoveryRecommendationScan() {
  await requireAdmin();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    throw new Error('Missing NEXT_PUBLIC_SITE_URL or CRON_SECRET');
  }

  const response = await fetch(`${siteUrl}/api/cron/discovery-ai-recommendations`, {
    method: 'GET',
    headers: {
      'x-cron-secret': cronSecret,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to run discovery recommendation scan');
  }

  redirect('/admin/discovery/ai?scanned=1');
}