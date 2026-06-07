import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: targets, error: targetsError } = await supabase
    .from('discovery_ai_city_targets')
    .select('*')
    .eq('is_enabled', true);

  if (targetsError) {
    return NextResponse.json({ error: targetsError.message }, { status: 500 });
  }

  let created = 0;

  for (const target of targets ?? []) {
    const city = target.city;
    const state = target.state;

    const { data: searches } = await supabase
      .from('discovery_search_logs')
      .select('id, user_id')
      .ilike('city', city)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: hypeEvents } = await supabase
      .from('events')
      .select('id')
      .ilike('city', city)
      .in('status', ['scheduled', 'active', 'paid_awaiting_approval']);

    const { data: externalEvents } = await supabase
      .from('external_events')
      .select('id')
      .ilike('city', city)
      .eq('status', 'active');

    const searchCount = searches?.length ?? 0;
    const uniqueUsers = new Set((searches ?? []).map((s) => s.user_id).filter(Boolean)).size;
    const hypeCount = hypeEvents?.length ?? 0;
    const externalCount = externalEvents?.length ?? 0;

    const minHype = Number(target.min_hypeknight_events || 3);
    const hasDemand = searchCount >= 3 || uniqueUsers >= 2;
    const lowInventory = hypeCount < minHype;

    if (!hasDemand && !lowInventory) continue;

    const recommendationType = lowInventory
      ? 'import_external_events'
      : 'watch_trend';

    const priority =
      target.priority_level === 'critical' || (hasDemand && lowInventory && searchCount >= 10)
        ? 'critical'
        : hasDemand && lowInventory
        ? 'high'
        : target.priority_level || 'normal';

    const reason = lowInventory
      ? `${city}${state ? `, ${state}` : ''} has ${hypeCount} HypeKnight events, below the target of ${minHype}. Recent search demand: ${searchCount}.`
      : `${city}${state ? `, ${state}` : ''} is receiving search activity. Monitor for trend movement.`;

    const { data: existing } = await supabase
      .from('discovery_ai_recommendations')
      .select('id')
      .eq('city', city)
      .eq('state', state)
      .eq('recommendation_type', recommendationType)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) continue;

    const { error: insertError } = await supabase
      .from('discovery_ai_recommendations')
      .insert({
        city,
        state,
        recommendation_type: recommendationType,
        priority_level: priority,
        reason,
        search_count: searchCount,
        hypeknight_event_count: hypeCount,
        external_event_count: externalCount,
        suggested_keyword: target.preferred_keywords?.[0] || 'concert',
        status: 'open',
      });

    if (!insertError) created += 1;
  }

  return NextResponse.json({
    ok: true,
    created,
  });
}