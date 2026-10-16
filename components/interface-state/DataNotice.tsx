'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function DataNotice({ message }: { message: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div role="status" className="my-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/70">
    <p>{message}</p>
    <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="mt-2 font-semibold text-accent disabled:opacity-60">
      {pending ? 'Loading…' : 'Try again'}
    </button>
  </div>;
}
