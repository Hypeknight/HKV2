'use client';
import { useEffect, useRef } from 'react';
import type { DiscoverySurface } from '@/lib/signals/discovery';
import { exposureKey, exposureObservationId, sendDiscoveryObservation } from '@/lib/signals/discovery-browser';
export default function DiscoveryImpression({ subjectId, inventorySource, surface, placement, position }: {
  subjectId: string; inventorySource: 'hypeknight' | 'external'; surface: DiscoverySurface; placement: string; position?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    let visible = false; let timer: ReturnType<typeof setTimeout> | null = null; let sent = false;
    const cancel = () => { if (timer !== null) clearTimeout(timer); timer = null; };
    const update = () => {
      cancel();
      if (!visible || document.visibilityState !== 'visible' || sent) return;
      timer = setTimeout(() => {
        timer = null; sent = true;
        void sendDiscoveryObservation({ observationId: exposureObservationId(exposureKey(surface, placement, inventorySource, subjectId)),
          signalType: 'discovery_impression', surface, placement, subjectId, inventorySource,
          metadata: { exposure_class: 'organic', visible_fraction: 0.5, visible_ms: 1000, ...(position === undefined ? {} : { position }) } });
      }, 1000);
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5); update();
    }, { threshold: [0, 0.5] });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => { cancel(); observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [subjectId, inventorySource, surface, placement, position]);
  return <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
