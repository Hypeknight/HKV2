'use client';
import type { ReactNode } from 'react';
import { recordSearchSubmission } from '@/lib/signals/discovery-browser';
export default function DiscoverySearchForm({ children, className }: { children: ReactNode; className?: string }) {
  return <form action="/events" className={className} onSubmit={event => recordSearchSubmission(event.currentTarget, 'events_index')}>{children}</form>;
}
