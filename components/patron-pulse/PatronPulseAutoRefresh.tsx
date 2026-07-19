'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PatronPulseAutoRefresh({
  intervalMs = 10000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null =
      null;

    const start = () => {
      if (timer || document.hidden) {
        return;
      }

      timer = setInterval(() => {
        router.refresh();
      }, intervalMs);
    };

    const stop = () => {
      if (!timer) {
        return;
      }

      clearInterval(timer);
      timer = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };

    start();

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      stop();
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [intervalMs, router]);

  return (
    <p className="text-xs text-white/35">
      Live data refreshes automatically.
    </p>
  );
}