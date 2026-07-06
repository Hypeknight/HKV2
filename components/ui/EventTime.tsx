'use client';

import { useEffect, useState } from 'react';

export default function EventTime({
  value,
  mode = 'wall',
  showStatus = true,
}: {
  value?: string | null;
  mode?: 'wall' | 'utc';
  showStatus?: boolean;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!value) return <>—</>;

  const date = mode === 'wall' ? parseWallTime(value) : new Date(value);

  if (Number.isNaN(date.getTime())) return <>—</>;

  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let status = '';

  if (diff < 0) status = 'Started';
  else if (minutes < 60) status = `Starts in ${Math.max(minutes, 1)} min`;
  else if (hours < 24) status = `Starts in ${hours} hr`;
  else if (days === 1) status = 'Tomorrow';
  else status = date.toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div className="space-y-1">
      {showStatus ? <p className="font-semibold text-white">{status}</p> : null}

      <p className="text-sm text-white/55">
        {date.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}

function parseWallTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = '0'] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}