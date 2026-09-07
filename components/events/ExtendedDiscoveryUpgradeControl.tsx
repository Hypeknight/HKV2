'use client';

import { useState, useTransition } from 'react';
import {
  createExtendedDiscoveryDraftOrder,
} from '@/app/dashboard/events/actions';
import type {
  ExtendedDiscoveryUpgradeOption,
} from '@/lib/commerce/event-order';

type Props = {
  eventId: string;
  currentTotalDays: number;
  options: ExtendedDiscoveryUpgradeOption[];
};

export default function ExtendedDiscoveryUpgradeControl({
  eventId,
  currentTotalDays,
  options,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [activePackage, setActivePackage] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableOptions = options.filter(
    (option) =>
      option.available &&
      option.upgradePrice !== null
  );

  function beginUpgrade(targetTotalDays: number) {
    setError(null);
    setActivePackage(targetTotalDays);

    startTransition(async () => {
      try {
        const formData = new FormData();

        formData.set('event_id', eventId);
        formData.set(
          'target_total_days',
          String(targetTotalDays)
        );

        const order =
          await createExtendedDiscoveryDraftOrder(
            formData
          );

        const response = await fetch(
          '/api/stripe/events/extended-discovery/checkout',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: order.orderId,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to start Extended Discovery checkout.'
          );
        }

        if (!data.checkout_url) {
          throw new Error(
            'Stripe checkout did not return a checkout URL.'
          );
        }

        window.location.href = data.checkout_url;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to start Extended Discovery checkout.'
        );

        setActivePackage(null);
      }
    });
  }

  if (!availableOptions.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="font-bold text-white">
          Extended Discovery
        </p>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          More time
        </p>

        <p className="mt-3 text-sm leading-6 text-white/45">
          Your event currently has {currentTotalDays} total Discovery days.
          There are no additional self-service Discovery packages available
          for this event right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white">
            Extended Discovery
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            More time
          </p>
        </div>

        <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          Available
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/50">
        You currently have {currentTotalDays} total Discovery days.
        Extend the window earlier by choosing an available package.
      </p>

      <div className="mt-5 space-y-3">
        {availableOptions.map((option) => {
          const loading =
            isPending &&
            activePackage ===
              option.package.totalDays;

          return (
            <div
              key={option.package.totalDays}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black text-white">
                  {option.package.totalDays} total days
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {option.package.extraDays} Extended Discovery days
                </p>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  beginUpgrade(
                    option.package.totalDays
                  )
                }
                className="rounded-xl bg-accent px-4 py-3 text-sm font-black text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Opening checkout...'
                  : `Upgrade · $${Number(
                      option.upgradePrice
                    ).toFixed(2)}`}
              </button>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-100">
            {error}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-white/35">
        Extended Discovery changes when your event becomes eligible for
        normal HypeKnight discovery. It does not guarantee ranking,
        placement, views, or sales.
      </p>
    </div>
  );
}
