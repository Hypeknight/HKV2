'use client';
import type { ReactNode } from 'react';
import { recordSearchSubmission } from '@/lib/signals/discovery-browser';
export default function DiscoverySearchForm({ children, className, surface = 'events_index', tracking = true }: { children: ReactNode; className?: string; surface?: 'homepage' | 'events_index'; tracking?: boolean }) {
  return <form action="/events" method="get" className={className} onSubmit={event => { if (tracking) recordSearchSubmission(event.currentTarget, surface); }}>{children}</form>;
}
