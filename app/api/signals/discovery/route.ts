import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseDiscoveryObservation } from '@/lib/signals/discovery';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: 'Observation too large' }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const observation = parseDiscoveryObservation(body);
    if (!observation) return NextResponse.json({ error: 'Invalid discovery observation' }, { status: 400 });
    // Session-bound SSR client; the database resolves auth.uid(). No supplied actor
    // or service-role credential participates in collection.
    const supabase = await createClient();
    const { error } = await supabase.rpc('record_discovery_observation', {
      p_observation_id: observation.observationId, p_signal_type: observation.signalType,
      p_subject_id: observation.subjectId ?? null, p_inventory_source: observation.inventorySource ?? null,
      p_surface: observation.surface, p_placement: observation.placement,
      p_anonymous_session_id: observation.anonymousSessionId ?? null, p_metadata: observation.metadata,
    });
    if (error) { console.error('Discovery collection unavailable', error.code); return NextResponse.json({ error: 'Collection unavailable' }, { status: 503 }); }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Collection unavailable' }, { status: 503 }); }
}
