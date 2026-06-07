import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeDiscoverySignals } from '@/lib/discovery/ai-analyzer';

type DiscoverySignal = {
  city: string;
  state: string | null;
  searchCount: number;
  uniqueUsers: number;
  hypeknightEventCount: number;
  externalEventCount: number;
  priorityLevel: string;
  preferredKeywords: string[];
};

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from('discovery_ai_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (settings && settings.is_enabled === false) {
    return NextResponse.json({
      ok: true,
      created: 0,
      message: 'AI discovery is disabled.',
    });
  }

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

  const signals: DiscoverySignal[] = [];
  let created = 0;

  for (const target of targets ?? []) {
    const city = String(target.city || '').trim();
    const state = target.state ? String(target.state).trim() : null;

    if (!city) continue;

    let searchQuery = supabase
      .from('discovery_search_logs')
      .select('id, user_id')
      .ilike('city', city)
      .gte('created_at', thirtyDaysAgo.toISOString());

    let hypeQuery = supabase
      .from('events')
      .select('id')
      .ilike('city', city)
      .in('status', ['scheduled', 'active', 'paid_awaiting_approval']);

    let externalQuery = supabase
      .from('external_events')
      .select('id')
      .ilike('city', city)
      .eq('status', 'active');

    if (state) {
      searchQuery = searchQuery.ilike('state', state);
      hypeQuery = hypeQuery.ilike('state', state);
      externalQuery = externalQuery.ilike('state', state);
    }

    const [
      { data: searches },
      { data: hypeEvents },
      { data: externalEvents },
    ] = await Promise.all([searchQuery, hypeQuery, externalQuery]);

    const searchCount = searches?.length ?? 0;
    const uniqueUsers = new Set(
      (searches ?? []).map((search) => search.user_id).filter(Boolean)
    ).size;

    const hypeCount = hypeEvents?.length ?? 0;
    const externalCount = externalEvents?.length ?? 0;

    signals.push({
      city,
      state,
      searchCount,
      uniqueUsers,
      hypeknightEventCount: hypeCount,
      externalEventCount: externalCount,
      priorityLevel: target.priority_level || 'normal',
      preferredKeywords: target.preferred_keywords || [],
    });
  }

  if (!signals.length) {
    return NextResponse.json({
      ok: true,
      created: 0,
      message: 'No enabled discovery targets found.',
    });
  }

  try {
    const aiResult = await analyzeDiscoverySignals(signals);

    const limitedRecommendations = aiResult.recommendations.slice(
      0,
      Number(settings?.max_recommendations_per_run || 10)
    );

    for (const rec of limitedRecommendations) {
      const matchingSignal = signals.find(
        (signal) =>
          signal.city.toLowerCase() === rec.city.toLowerCase() &&
          (signal.state || '') === (rec.state || '')
      );

      if (!matchingSignal) continue;

      const { data: existing } = await supabase
        .from('discovery_ai_recommendations')
        .select('id')
        .eq('city', rec.city)
        .eq('state', rec.state)
        .eq('recommendation_type', rec.recommendation_type)
        .eq('status', 'open')
        .maybeSingle();

      if (existing) continue;

      const { error: insertError } = await supabase
        .from('discovery_ai_recommendations')
        .insert({
          city: rec.city,
          state: rec.state,
          recommendation_type: rec.recommendation_type,
          priority_level: rec.priority_level,
          reason: rec.reason,
          search_count: matchingSignal.searchCount,
          hypeknight_event_count: matchingSignal.hypeknightEventCount,
          external_event_count: matchingSignal.externalEventCount,
          suggested_keyword:
            rec.suggested_keyword ||
            matchingSignal.preferredKeywords?.[0] ||
            'concert',
          status: 'open',
        });

      if (!insertError) created += 1;
    }

    return NextResponse.json({
      ok: true,
      created,
      analyzed: signals.length,
      mode: 'ai',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'AI discovery recommendation scan failed.',
      },
      { status: 500 }
    );
  }
}