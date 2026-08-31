export type EventLifecycleInput = {
  eventStartAt: string;
  eventEndAt?: string | null;
  includedPromoDays: number;
  extraPromoDays: number;
  defaultDiscoveryBufferMinutes?: number;
  liveProductSelected?: boolean;
};

export type EventLifecycleWindow = {
  promotionStartAt: string;
  promotionEndAt: string;
  discoveryStartAt: string;
  discoveryEndAt: string;
  resolvedEventEndAt: string | null;
  endReason: 'explicit_event_end' | 'default_start_plus_buffer';
};

export function resolveEventLifecycle({
  eventStartAt,
  eventEndAt,
  includedPromoDays,
  extraPromoDays,
  defaultDiscoveryBufferMinutes = 30,
  liveProductSelected = false,
}: EventLifecycleInput): EventLifecycleWindow {
  const start = new Date(eventStartAt);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid event start date.');

  const explicitEnd = eventEndAt ? new Date(eventEndAt) : null;
  if (explicitEnd && Number.isNaN(explicitEnd.getTime())) {
    throw new Error('Invalid event end date.');
  }
  if (explicitEnd && explicitEnd <= start) {
    throw new Error('Event end time must be after the event start time.');
  }

  if (liveProductSelected && !explicitEnd) {
    throw new Error('An event end time is required when Patron Pulse or Linkd’N is selected.');
  }

  const totalPromoDays = Math.max(
    Number(includedPromoDays || 0) + Number(extraPromoDays || 0),
    1
  );

  const promotionStart = new Date(start);
  promotionStart.setDate(promotionStart.getDate() - totalPromoDays);

  const fallbackEnd = new Date(start.getTime() + Math.max(defaultDiscoveryBufferMinutes, 1) * 60_000);
  const resolvedEnd = explicitEnd || fallbackEnd;

  return {
    promotionStartAt: promotionStart.toISOString(),
    promotionEndAt: resolvedEnd.toISOString(),
    discoveryStartAt: promotionStart.toISOString(),
    discoveryEndAt: resolvedEnd.toISOString(),
    resolvedEventEndAt: explicitEnd ? explicitEnd.toISOString() : null,
    endReason: explicitEnd ? 'explicit_event_end' : 'default_start_plus_buffer',
  };
}
