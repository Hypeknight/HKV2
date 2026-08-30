import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeState } from '@/lib/states';
import { recordSignal } from '@/lib/signals/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();

    const payload = {
      event_id: body.event_id || null,
      external_event_id: body.external_event_id || null,
      source_type: body.source_type || 'page',
      page_type: body.page_type || null,
      city: body.city || null,
      state: body.state ? normalizeState(String(body.state)) : null,
      path: body.path || null,
      referrer: body.referrer || null,
      user_id: user?.id || null,
    };

    const { error } = await supabase.from('event_view_logs').insert(payload);

    if (error) {
      console.error('Analytics insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // SIGNAL BRIDGE: event_view_logs remains untouched for compatibility with
    // the current analytics page. The same observation is also normalized into
    // the signal stream so future intelligence does not depend on legacy tables.
    await recordSignal(supabase, {
      signalType: payload.event_id
        ? 'event_view'
        : body.venue_id
          ? 'venue_view'
          : 'page_view',
      subjectType: payload.event_id
        ? 'event'
        : body.venue_id
          ? 'venue'
          : 'page',
      subjectId: payload.event_id || body.venue_id || payload.path || payload.page_type,
      eventId: payload.event_id,
      venueId: body.venue_id || null,
      city: payload.city,
      state: payload.state,
      source: payload.source_type,
      surface: payload.page_type,
      verificationLevel: 'observed',
      anonymousSessionId: body.anonymous_session_id || null,
      metadata: {
        path: payload.path,
        referrer: payload.referrer,
        external_event_id: payload.external_event_id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown analytics error';

    console.error('Analytics route error:', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}