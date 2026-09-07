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

export type ExtendedDiscoveryPackage = {
  totalDays: 14 | 21 | 28 | 44 | 60;
  extraDays: 0 | 7 | 14 | 30 | 46;
  price: number;
  included: boolean;
};

export type ExtendedDiscoveryUpgradeQuote = {
  currentPackage: ExtendedDiscoveryPackage;
  targetPackage: ExtendedDiscoveryPackage;
  upgradePrice: number;
};

export type ExtendedDiscoveryEntitlement = {
  includedDays: number;
  extraDays: number;
  totalDays: number;
  package: ExtendedDiscoveryPackage | null;
  isLegacy: boolean;
  availablePackages: ExtendedDiscoveryPackage[];
};

/**
 * Business Model 1.0 provisional package pricing.
 *
 * These values are the current product defaults. They can later be moved
 * into platform settings without changing the package/upgrade rules used
 * by the application.
 */
export const EXTENDED_DISCOVERY_PACKAGES: readonly ExtendedDiscoveryPackage[] = [
  {
    totalDays: 14,
    extraDays: 0,
    price: 0,
    included: true,
  },
  {
    totalDays: 21,
    extraDays: 7,
    price: 9.99,
    included: false,
  },
  {
    totalDays: 28,
    extraDays: 14,
    price: 24.99,
    included: false,
  },
  {
    totalDays: 44,
    extraDays: 30,
    price: 59.99,
    included: false,
  },
  {
    totalDays: 60,
    extraDays: 46,
    price: 99.99,
    included: false,
  },
] as const;

export function money(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function getExtendedDiscoveryPackage(
  totalDays: number
): ExtendedDiscoveryPackage | null {
  return (
    EXTENDED_DISCOVERY_PACKAGES.find(
      (pkg) => pkg.totalDays === Number(totalDays)
    ) || null
  );
}

export function resolveExtendedDiscoveryEntitlement({
  includedDays,
  extraDays,
}: {
  includedDays: number;
  extraDays: number;
}): ExtendedDiscoveryEntitlement {
  const normalizedIncludedDays = Math.max(
    0,
    Number(includedDays || 0)
  );

  const normalizedExtraDays = Math.max(
    0,
    Number(extraDays || 0)
  );

  const totalDays =
    normalizedIncludedDays + normalizedExtraDays;

  const pkg =
    normalizedIncludedDays === 14
      ? getExtendedDiscoveryPackage(totalDays)
      : null;

  return {
    includedDays: normalizedIncludedDays,
    extraDays: normalizedExtraDays,
    totalDays,
    package: pkg,
    isLegacy: pkg === null,
    availablePackages:
      EXTENDED_DISCOVERY_PACKAGES.filter(
        (candidate) => candidate.totalDays > totalDays
      ),
  };
}

export function requireExtendedDiscoveryPackage(
  totalDays: number
): ExtendedDiscoveryPackage {
  const pkg = getExtendedDiscoveryPackage(totalDays);

  if (!pkg) {
    throw new Error(
      `Unsupported Extended Discovery package: ${totalDays} total days.`
    );
  }

  return pkg;
}

export function quoteExtendedDiscoveryUpgrade({
  currentTotalDays,
  targetTotalDays,
}: {
  currentTotalDays: number;
  targetTotalDays: number;
}): ExtendedDiscoveryUpgradeQuote {
  const currentPackage =
    requireExtendedDiscoveryPackage(currentTotalDays);

  const targetPackage =
    requireExtendedDiscoveryPackage(targetTotalDays);

  if (targetPackage.totalDays <= currentPackage.totalDays) {
    throw new Error(
      'Extended Discovery upgrades must increase the current Discovery Window.'
    );
  }

  return {
    currentPackage,
    targetPackage,
    upgradePrice: money(
      targetPackage.price - currentPackage.price
    ),
  };
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

  /*
   * Compatibility path for the V3.4 event builder.
   *
   * Do not use this per-day pricing model for new V3.5 Extended Discovery
   * purchases. It remains temporarily so the existing builder continues
   * working until Step 3 is migrated to the package model.
   */
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

  const subtotal = money(
    lines.reduce((sum, line) => sum + line.total, 0)
  );

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

  if (discountType === 'fixed') {
    discount = Number(discountAmount || 0);
  }

  if (discountType === 'percent') {
    discount =
      subtotal * (Number(discountPercent || 0) / 100);
  }

  discount = money(
    Math.min(Math.max(discount, 0), subtotal)
  );

  return {
    discount,
    total: money(Math.max(subtotal - discount, 0)),
  };
}
