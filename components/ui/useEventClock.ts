'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let now: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const serverSnapshot = () => null;
const snapshot = () => now;
const inactive = () => () => {};

export function subscribeEventClock(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    // One shared timer, irrespective of the number of event cards/badges.
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach(notify => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
      now = null;
    }
  };
}

export default function useEventClock(active: boolean) {
  // React uses this same null snapshot for SSR and the hydration render, even
  // when another mounted component has already started the shared clock.
  return useSyncExternalStore(active ? subscribeEventClock : inactive, active ? snapshot : serverSnapshot, serverSnapshot);
}
