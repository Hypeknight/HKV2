'use client';

import { useState } from 'react';

export default function ProceedToEventPaymentButton({
  eventId,
}: {
  eventId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    try {
      setLoading(true);

      const res = await fetch('/api/stripe/events/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to start checkout');
      }

      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={loading}
      className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-black hover:opacity-90 disabled:opacity-60"
    >
      {loading ? 'Opening Checkout...' : 'Pay for Event Promotion'}
    </button>
  );
}