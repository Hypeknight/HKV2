'use client';

import { useEffect, useState } from 'react';

export default function EventTime({ value }: { value?: string | null }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!value) return <>—</>;

  const date = new Date(value);
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let status = '';

  if (diff < 0) status = 'Started';
  else if (minutes < 60) status = `Starts in ${minutes} min`;
  else if (hours < 24) status = `Starts in ${hours} hr`;
  else if (days === 1) status = 'Tomorrow';
  else status = date.toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div className="space-y-1">
      <p className="font-semibold text-white">{status}</p>
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