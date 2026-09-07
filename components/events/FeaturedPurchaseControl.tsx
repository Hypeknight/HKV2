'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  createFeaturedDraftOrder,
} from '@/app/dashboard/events/actions';

export type FeaturedInventoryOption = {
  inventory_id: string;
  feature_date: string;
  capacity: number;
  unit_price: number;
  remaining_capacity: number;
  reserved_by_event: boolean;
  sold_by_event: boolean;
};

type Props = {
  eventId: string;
  inventory: FeaturedInventoryOption[];
};

export default function FeaturedPurchaseControl({
  eventId,
  inventory,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRows = useMemo(
    () =>
      inventory.filter((row) =>
        selectedIds.includes(row.inventory_id)
      ),
    [inventory, selectedIds]
  );

  const total = selectedRows.reduce(
    (sum, row) =>
      sum + Number(row.unit_price || 0),
    0
  );

  const selectableInventory = inventory.filter(
    (row) =>
      !row.sold_by_event &&
      !row.reserved_by_event &&
      Number(row.remaining_capacity || 0) > 0
  );

  const purchasedInventory = inventory.filter(
    (row) => row.sold_by_event
  );

  function toggleInventory(
    inventoryId: string
  ) {
    setError(null);

    setSelectedIds((current) =>
      current.includes(inventoryId)
        ? current.filter(
            (id) => id !== inventoryId
          )
        : [...current, inventoryId]
    );
  }

  function beginCheckout() {
    if (!selectedIds.length) {
      setError(
        'Choose at least one Featured date.'
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData();

        formData.set(
          'event_id',
          eventId
        );

        for (const inventoryId of selectedIds) {
          formData.append(
            'inventory_id',
            inventoryId
          );
        }

        const order =
          await createFeaturedDraftOrder(
            formData
          );

        const response = await fetch(
          '/api/stripe/events/featured/checkout',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
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
              'Unable to start Featured checkout.'
          );
        }

        if (!data.checkout_url) {
          throw new Error(
            'Stripe checkout did not return a checkout URL.'
          );
        }

        window.location.href =
          data.checkout_url;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to start Featured checkout.'
        );
      }
    });
  }

  if (!inventory.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="font-bold text-white">
          Featured
        </p>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          More attention
        </p>

        <p className="mt-3 text-sm leading-6 text-white/45">
          There are no Featured calendar dates available
          for this event right now.
        </p>

        <p className="mt-3 text-xs leading-5 text-white/30">
          Featured inventory is offered by market and date
          during the event&apos;s active Discovery Window.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white">
            Featured
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">
            More attention
          </p>
        </div>

        {selectableInventory.length ? (
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-200">
            Available
          </span>
        ) : purchasedInventory.length ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            Purchased
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            No open dates
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-white/50">
        Choose one or more dates for premium Featured
        placement while your event is inside its Discovery
        Window.
      </p>

      <div className="mt-5 space-y-3">
        {inventory.map((row) => {
          const selected =
            selectedIds.includes(
              row.inventory_id
            );

          const sold =
            row.sold_by_event;

          const reserved =
            !sold &&
            row.reserved_by_event;

          const soldOut =
            !sold &&
            !reserved &&
            Number(
              row.remaining_capacity || 0
            ) <= 0;

          const selectable =
            !sold &&
            !reserved &&
            !soldOut;

          return (
            <button
              key={row.inventory_id}
              type="button"
              disabled={
                !selectable ||
                isPending
              }
              onClick={() =>
                toggleInventory(
                  row.inventory_id
                )
              }
              className={[
                'w-full rounded-2xl border p-4 text-left transition',
                selected
                  ? 'border-purple-400/50 bg-purple-500/15'
                  : 'border-white/10 bg-black/25',
                selectable
                  ? 'hover:border-purple-400/40'
                  : 'cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-white">
                    {formatFeatureDate(
                      row.feature_date
                    )}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {getAvailabilityLabel(
                      row
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-white">
                    $
                    {Number(
                      row.unit_price
                    ).toFixed(2)}
                  </p>

                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    {sold
                      ? 'Purchased'
                      : reserved
                        ? 'Reserved'
                        : soldOut
                          ? 'Sold out'
                          : selected
                            ? 'Selected'
                            : 'Choose date'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedIds.length ? (
        <div className="mt-5 rounded-2xl border border-purple-500/20 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                Selected
              </p>

              <p className="mt-1 font-bold text-white">
                {selectedIds.length}{' '}
                {selectedIds.length === 1
                  ? 'Featured date'
                  : 'Featured dates'}
              </p>
            </div>

            <p className="text-xl font-black text-white">
              ${total.toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={beginCheckout}
            className="mt-4 w-full rounded-xl bg-purple-300 px-4 py-3 text-sm font-black text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? 'Opening checkout...'
              : `Continue to checkout · $${total.toFixed(
                  2
                )}`}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-100">
            {error}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-white/35">
        Featured changes how prominently HypeKnight may
        surface your event on the selected dates. It does
        not guarantee ranking position, views, ticket
        sales, or attendance.
      </p>
    </div>
  );
}

function getAvailabilityLabel(
  row: FeaturedInventoryOption
) {
  if (row.sold_by_event) {
    return 'Featured placement is confirmed for this event.';
  }

  if (row.reserved_by_event) {
    return 'This date is currently held for an existing checkout.';
  }

  const remaining = Number(
    row.remaining_capacity || 0
  );

  if (remaining <= 0) {
    return 'Featured inventory for this date is sold out.';
  }

  return `${remaining} of ${Number(
    row.capacity || 0
  )} Featured ${
    remaining === 1 ? 'spot' : 'spots'
  } remaining`;
}

function formatFeatureDate(
  value: string
) {
  const [year, month, day] = value
    .split('-')
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12
      )
    )
  );
}
