import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type LookupValue = {
  id: string;
  category_key: string;
  value: string;
  display_name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  archived_at?: string | null;
};

export type LookupCategory = {
  id: string;
  category_key: string;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export async function getLookupValues(
  categoryKey: string,
  options?: {
    includeInactive?: boolean;
    includeArchived?: boolean;
  }
): Promise<LookupValue[]> {
  const includeInactive = Boolean(options?.includeInactive);
  const includeArchived = Boolean(options?.includeArchived);

  return getCachedLookupValues(
    categoryKey,
    includeInactive,
    includeArchived
  );
}

const getCachedLookupValues = unstable_cache(
  async (
    categoryKey: string,
    includeInactive: boolean,
    includeArchived: boolean
  ): Promise<LookupValue[]> => {
    const supabase = await createClient();

    let query = supabase
      .from('lookup_values')
      .select(`
        id,
        category_key,
        value,
        display_name,
        description,
        icon,
        color,
        sort_order,
        is_active,
        archived_at
      `)
      .eq('category_key', categoryKey)
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as LookupValue[];
  },
  ['hypeknight-lookups'],
  {
    revalidate: 300,
    tags: ['lookups'],
  }
);

export async function getLookupMap(
  categoryKeys: string[],
  options?: {
    includeInactive?: boolean;
    includeArchived?: boolean;
  }
): Promise<Record<string, LookupValue[]>> {
  const uniqueKeys = Array.from(
    new Set(
      categoryKeys
        .map((key) => key.trim())
        .filter(Boolean)
    )
  );

  const entries = await Promise.all(
    uniqueKeys.map(async (categoryKey) => {
      const values = await getLookupValues(
        categoryKey,
        options
      );

      return [categoryKey, values] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function getLookupCategories(
  options?: {
    includeInactive?: boolean;
  }
): Promise<LookupCategory[]> {
  const includeInactive = Boolean(
    options?.includeInactive
  );

  const supabase = await createClient();

  let query = supabase
    .from('lookup_categories')
    .select(`
      id,
      category_key,
      name,
      description,
      sort_order,
      is_active
    `)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LookupCategory[];
}

export function findLookupValue(
  values: LookupValue[],
  selectedValue?: string | null
) {
  if (!selectedValue) return null;

  const normalized = normalizeLookupValue(
    selectedValue
  );

  return (
    values.find(
      (value) =>
        normalizeLookupValue(value.value) ===
        normalized
    ) || null
  );
}

export function resolveLookupValues(
  values: LookupValue[],
  selectedValues: string[]
): LookupValue[] {
  const selected = new Set(
    selectedValues.map(normalizeLookupValue)
  );

  const resolved = values.filter((value) =>
    selected.has(
      normalizeLookupValue(value.value)
    )
  );

  const resolvedKeys = new Set(
    resolved.map((value) =>
      normalizeLookupValue(value.value)
    )
  );

  const missing = selectedValues.filter(
    (value) =>
      !resolvedKeys.has(
        normalizeLookupValue(value)
      )
  );

  return [
    ...resolved,
    ...missing.map((value, index) => ({
      id: `legacy-${normalizeLookupValue(
        value
      )}-${index}`,
      category_key: 'legacy',
      value,
      display_name: value,
      description: null,
      icon: null,
      color: null,
      sort_order: 999,
      is_active: false,
      archived_at: null,
    })),
  ];
}

export function normalizeLookupValue(
  value: unknown
) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}