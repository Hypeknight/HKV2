'use client';

import { useMemo } from 'react';
import { eventTimeLabel, parseEventTimestamp, relativeEventTime } from '@/lib/time/event-time';
import useEventClock from './useEventClock';

export default function EventTime({ value, mode = 'wall', showStatus = true }: {
  value?: string | null;
  mode?: 'wall' | 'utc';
  showStatus?: boolean;
}) {
  const time = useMemo(() => parseEventTimestamp(value), [value]);
  const label = useMemo(() => time ? eventTimeLabel(time, mode) : null, [time, mode]);
  const now = useEventClock(Boolean(showStatus && time?.instant != null));
  if (!value) return <>—</>;
  if (!time) return <>Time unavailable</>;
  const status = now === null ? null : relativeEventTime(time, now, mode);
  return (
    <div className="space-y-1">
      {showStatus && status ? <p className="font-semibold text-white">{status}</p> : null}
      <p className="text-sm text-white/55"><time dateTime={value}>{label}</time></p>
    </div>
  );
}
