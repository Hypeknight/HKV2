'use client';

import { useEffect, useRef } from 'react';

export default function AuthFeedback({ error, message }: { error: string | null; message?: string | null }) {
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) feedback.current?.focus(); });
  if (!error && !message) return null;
  return <p ref={feedback} id="auth-feedback" tabIndex={-1} role={error ? 'alert' : 'status'} className={'mt-4 rounded-2xl p-3 text-sm ' + (error ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300')}>{error || message}</p>;
}
