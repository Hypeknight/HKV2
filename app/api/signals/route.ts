import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordSignal } from '@/lib/signals/server';
import {
  SIGNAL_TYPES,
  SUBJECT_TYPES,
  type SignalInput,
  type SignalType,
  type SignalSubjectType,
} from '@/lib/signals/types';

const signalTypeSet = new Set<string>(SIGNAL_TYPES);
const subjectTypeSet = new Set<string>(SUBJECT_TYPES);

/**
 * Browser-facing signal bridge.
 *
 * This route is used for actions that do not naturally pass through a server
 * action first (Directions, Vibe selection, Surprise Me, city selection, etc.).
 * Existing server actions should call recordSignal() directly after their
 * operational database write succeeds.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signalType = String(body?.signalType || '');
    const subjectType = String(body?.subjectType || '');

    if (!signalTypeSet.has(signalType)) {
      return NextResponse.json({ error: 'Unsupported signal type.' }, { status: 400 });
    }

    if (!subjectTypeSet.has(subjectType)) {
      return NextResponse.json({ error: 'Unsupported subject type.' }, { status: 400 });
    }

    const supabase = await createClient();

    const input: SignalInput = {
      signalType: signalType as SignalType,
      subjectType: subjectType as SignalSubjectType,
      subjectId: body?.subjectId ? String(body.subjectId) : null,
      eventId: body?.eventId ? String(body.eventId) : null,
      venueId: body?.venueId ? String(body.venueId) : null,
      city: body?.city ? String(body.city) : null,
      state: body?.state ? String(body.state) : null,
      source: body?.source ? String(body.source) : 'browser',
      surface: body?.surface ? String(body.surface) : null,
      sessionId: body?.sessionId ? String(body.sessionId) : null,
      anonymousSessionId: body?.anonymousSessionId
        ? String(body.anonymousSessionId)
        : null,
      value: typeof body?.value === 'number' ? body.value : null,
      confidence:
        typeof body?.confidence === 'number'
          ? Math.max(0, Math.min(1, body.confidence))
          : 1,
      verificationLevel: body?.verificationLevel || 'observed',
      metadata:
        body?.metadata && typeof body.metadata === 'object'
          ? body.metadata
          : {},
    };

    await recordSignal(supabase, input);

    // Signal capture should remain non-blocking to the product experience.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[signals] API route failure:', error);
    return NextResponse.json({ error: 'Unable to record signal.' }, { status: 500 });
  }
}
