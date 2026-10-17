'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export default function AuthSubmit({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <><button type="submit" disabled={pending} aria-disabled={pending} className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-black disabled:opacity-60">{pending ? pendingLabel : children}</button><span className="sr-only" role="status">{pending ? pendingLabel : ''}</span></>;
}
