'use client';

export default function LocalDateTime({
  value,
  fallback = '—',
}: {
  value?: string | null;
  fallback?: string;
}) {
  if (!value) return <>{fallback}</>;

  const date = new Date(value);

  return (
    <>
      {date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}
    </>
  );
}