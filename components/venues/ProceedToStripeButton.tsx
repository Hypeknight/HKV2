'use client';

import { useState } from 'react';

export default function ProceedToStripeButton({ venueId }: { venueId: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);

          const res = await fetch('/api/stripe/venues/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venue_id: venueId }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to start checkout');
          }

          if (!data.url) {
            throw new Error('Missing Stripe checkout URL');
          }

          window.location.href = data.url;
        } catch (error) {
          console.error(error);
          alert(error instanceof Error ? error.message : 'Checkout failed');
        } finally {
          setLoading(false);
        }
      }}
      className="block w-full rounded-2xl bg-accent px-5 py-3 text-center font-semibold text-black hover:opacity-90 disabled:opacity-60"
    >
      {loading ? 'Opening Checkout...' : 'Proceed to Payment'}
    </button>
  );
}