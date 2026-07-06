'use client';

import { useEffect, useState } from 'react';

export default function EventTime({
  value,
  timeZone,
  mode = 'utc',
}: {
  value?: string | null;
  timeZone?: string;
  mode?: 'utc' | 'wall';
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!value) return <>—</>;

  const displayDate = mode === 'wall' ? parseWallTime(value) : new Date(value);
  const diff = displayDate.getTime() - now.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let status = '';

  if (diff < 0) status = 'Started';
  else if (minutes < 60) status = `Starts in ${Math.max(minutes, 1)} min`;
  else if (hours < 24) status = `Starts in ${hours} hr`;
  else if (days === 1) status = 'Tomorrow';
  else status = displayDate.toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div className="space-y-1">
      <p className="font-semibold text-white">{status}</p>
      <p className="text-sm text-white/55">
        {displayDate.toLocaleString(undefined, {
          ...(mode === 'utc' && timeZone ? { timeZone } : {}),
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          ...(mode === 'utc' && timeZone ? { timeZoneName: 'short' } : {}),
        })}
      </p>
    </div>
  );
}

function parseWallTime(value: string) {
  const clean = value.replace('T', ' ').replace('Z', '');
  const [datePart, timePartRaw = '00:00:00'] = clean.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, secondRaw = '0'] = timePartRaw.split(':');
  const second = Number(String(secondRaw).split('.')[0]);

  return new Date(
    year,
    month - 1,
    day,
    Number(hour),
    Number(minute),
    second
  );
}