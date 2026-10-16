/** Presentation only: never infers an event timezone or changes lifecycle state. */
export type EventTimestamp = {
  calendar: number;
  instant: number | null;
  offsetMinutes: number | null;
  offsetLabel: string | null;
};

export function parseEventTimestamp(value?: string | null): EventTimestamp | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/i);
  if (!match) return null;
  const [, y, m, d, h, min, sec = '0', fraction = '', zone] = match;
  const parts = [y, m, d, h, min, sec].map(Number);
  const [year, month, day, hour, minute, second] = parts;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, Number(fraction.padEnd(3, '0').slice(0, 3)));
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) return null;
  if (!zone) return { calendar: date.getTime(), instant: null, offsetMinutes: null, offsetLabel: null };
  const isUtc = zone.toUpperCase() === 'Z';
  const hours = isUtc ? 0 : Number(zone.slice(1, 3));
  const minutes = isUtc ? 0 : Number(zone.slice(4, 6));
  // RFC 3339 -00:00 explicitly denotes an unknown offset.
  if (hours > 23 || minutes > 59 || zone === '-00:00') return null;
  const offsetMinutes = (zone[0] === '-' ? -1 : 1) * (hours * 60 + minutes);
  return { calendar: date.getTime(), instant: date.getTime() - offsetMinutes * 60000, offsetMinutes, offsetLabel: offsetMinutes === 0 ? 'UTC' : `UTC${zone}` };
}

const format = (value: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(value);

export function eventTimeLabel(time: EventTimestamp, mode: 'wall' | 'utc') {
  const value = mode === 'utc' && time.instant !== null ? time.instant : time.calendar;
  const zone = time.instant === null ? 'Timezone unavailable' : mode === 'utc' ? 'UTC' : time.offsetLabel;
  return `${format(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${zone}`;
}

export function relativeEventTime(time: EventTimestamp, now: number, mode: 'wall' | 'utc'): string | null {
  if (time.instant === null || !Number.isFinite(now)) return null;
  const diff = time.instant - now;
  if (diff <= 0) return 'Started';
  if (diff < 3600000) return `Starts in ${Math.ceil(diff / 60000)} min`;
  if (diff < 86400000) return `Starts in ${Math.floor(diff / 3600000)} hr`;
  const offset = mode === 'utc' ? 0 : (time.offsetMinutes || 0) * 60000;
  const dayDifference = Math.floor((time.instant + offset) / 86400000) - Math.floor((now + offset) / 86400000);
  return dayDifference === 1 ? 'Tomorrow' : format(time.instant + offset, { weekday: 'long' });
}

export function eventScheduleBadge(start: EventTimestamp | null, end: EventTimestamp | null, now: number): 'Live Now' | 'Starting Soon' | 'Ended' | null {
  if (start?.instant == null || !Number.isFinite(now)) return null;
  if (end && (end.instant === null || end.instant <= start.instant)) return null;
  if (now < start.instant) return start.instant - now <= 10800000 ? 'Starting Soon' : null;
  // No invented four-hour duration: a missing end cannot establish Live/Ended.
  if (end?.instant == null) return null;
  return now < end.instant ? 'Live Now' : 'Ended';
}
