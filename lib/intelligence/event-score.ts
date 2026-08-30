import type { SignalType } from '@/lib/signals/types';

/**
 * EXPERIMENTAL V1 WEIGHTS.
 *
 * These weights are intentionally centralized so we can tune them later using
 * real conversion/attendance evidence. They are NOT a permanent algorithm and
 * should not yet be marketed as a statistically validated score.
 */
export const EVENT_SIGNAL_WEIGHTS: Partial<Record<SignalType, number>> = {
  event_view: 1,
  event_saved: 4,
  event_unsaved: -2,
  event_rsvp_interested: 5,
  event_rsvp_going: 7,
  event_rsvp_not_going: -3,
  event_shared: 5,
  directions_requested: 9,
  event_comment_created: 3,
  patron_pulse_checkin: 10,
  patron_pulse_response: 8,
};

type ScoreSignal = {
  signal_type: string;
  occurred_at: string;
  confidence?: number | null;
  actor_id?: string | null;
  anonymous_session_id?: string | null;
};

function recencyMultiplier(occurredAt: string, nowMs: number) {
  const ageHours = Math.max(
    0,
    (nowMs - new Date(occurredAt).getTime()) / (1000 * 60 * 60)
  );

  // V1 decay is deliberately simple and easy to inspect. Event-stage-specific
  // decay curves can replace this once we have enough real data to calibrate.
  if (ageHours <= 1) return 1;
  if (ageHours <= 3) return 0.9;
  if (ageHours <= 6) return 0.75;
  if (ageHours <= 12) return 0.6;
  if (ageHours <= 24) return 0.45;
  if (ageHours <= 72) return 0.25;
  return 0.1;
}

export function calculateExperimentalEventScore(
  signals: ScoreSignal[],
  now = new Date()
) {
  const nowMs = now.getTime();

  const weightedPoints = signals.reduce((sum, signal) => {
    const weight =
      EVENT_SIGNAL_WEIGHTS[signal.signal_type as SignalType] ?? 0;
    const confidence = Math.max(
      0,
      Math.min(1, Number(signal.confidence ?? 1))
    );

    return (
      sum +
      weight *
        confidence *
        recencyMultiplier(signal.occurred_at, nowMs)
    );
  }, 0);

  const uniqueActors = new Set(
    signals
      .map(
        (signal) =>
          signal.actor_id || signal.anonymous_session_id || null
      )
      .filter(Boolean)
  ).size;

  // Confidence grows with evidence volume + unique participants. This is not
  // the future statistical confidence model; it is a transparent V1 guardrail.
  const evidenceUnits = Math.min(signals.length, 50) / 50;
  const actorUnits = Math.min(uniqueActors, 25) / 25;
  const confidence = Math.min(1, evidenceUnits * 0.4 + actorUnits * 0.6);

  // Development-only 0-100 index. The logarithmic curve prevents raw volume
  // from growing without bound. Public scoring should later normalize against
  // comparable event/category/market baselines before this is exposed broadly.
  const positivePoints = Math.max(0, weightedPoints);
  const score = Math.round(100 * (1 - Math.exp(-positivePoints / 75)));

  return {
    score,
    confidence: Number(confidence.toFixed(2)),
    weightedPoints: Number(weightedPoints.toFixed(2)),
    uniqueActors,
    signalCount: signals.length,
    label:
      confidence < 0.2
        ? 'Building Signal'
        : score >= 85
          ? 'Very High'
          : score >= 65
            ? 'High'
            : score >= 40
              ? 'Developing'
              : 'Early',
  };
}
