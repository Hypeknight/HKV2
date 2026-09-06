export type CommerceProduct = {
  code: string;
  name: string;
  price: number;
  enabled: boolean;
  requires_event_end?: boolean | null;
};

export type EventOrderLine = {
  code: string;
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
  metadata?: Record<string, unknown>;
};

export function money(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function buildEventOrderLines({
  basePrice,
  includedPromoDays,
  extraPromoDays,
  extraPromoDayPrice,
  selectedProducts,
}: {
  basePrice: number;
  includedPromoDays: number;
  extraPromoDays: number;
  extraPromoDayPrice: number;
  selectedProducts: CommerceProduct[];
}) {
  const lines: EventOrderLine[] = [
    {
      code: 'HYPEKNIGHT_INCLUDED_DISCOVERY',
      label: `Included Discovery (${includedPromoDays} days)`,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      metadata: {
        included_discovery_days: includedPromoDays,
        price: 'free',
      },
    },
  ];

  if (extraPromoDays > 0) {
    lines.push({
      code: 'HYPEKNIGHT_EXTRA_PROMO_DAY',
      label: 'Additional promotion day',
      quantity: extraPromoDays,
      unitPrice: money(extraPromoDayPrice),
      total: money(extraPromoDays * extraPromoDayPrice),
    });
  }

  for (const product of selectedProducts) {
    lines.push({
      code: product.code,
      label: product.name,
      quantity: 1,
      unitPrice: money(product.price),
      total: money(product.price),
    });
  }

  const subtotal = money(lines.reduce((sum, line) => sum + line.total, 0));
  return { lines, subtotal };
}

export function applyOrderDiscount({
  subtotal,
  discountType,
  discountAmount,
  discountPercent,
}: {
  subtotal: number;
  discountType?: string | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
}) {
  let discount = 0;
  if (discountType === 'fixed') discount = Number(discountAmount || 0);
  if (discountType === 'percent') {
    discount = subtotal * (Number(discountPercent || 0) / 100);
  }
  discount = money(Math.min(Math.max(discount, 0), subtotal));
  return { discount, total: money(Math.max(subtotal - discount, 0)) };
}
