import { createClient } from '@/lib/supabase/server';

export type LookupValue = {
  id: string;
  category_key: string;
  value: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
};

export type LookupCategory = {
  id: string;
  category_key: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type LookupOptions = {
  includeInactive?: boolean;
  includeArchived?: boolean;
};

/**
 * Returns lookup values for one category.
 *
 * Default behavior:
 * - active values only
 * - archived values excluded
 * - sorted by sort_order, then display_name
 */
export async function getLookupValues(
  categoryKey: string,
  options?: LookupOptions
): Promise<LookupValue[]> {
  const cleanCategoryKey = String(categoryKey || '').trim();

  if (!cleanCategoryKey) {
    return [];
  }

  const includeInactive = Boolean(
    options?.includeInactive
  );

  const includeArchived = Boolean(
    options?.includeArchived
  );

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
    .eq('category_key', cleanCategoryKey)
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

  return normalizeLookupRows(data ?? []);
}

/**
 * Returns several lookup categories in one object.
 *
 * Example:
 * {
 *   music_genres: [...],
 *   event_types: [...],
 * }
 */
export async function getLookupMap(
  categoryKeys: string[],
  options?: LookupOptions
): Promise<Record<string, LookupValue[]>> {
  const uniqueKeys = Array.from(
    new Set(
      categoryKeys
        .map((key) => String(key || '').trim())
        .filter(Boolean)
    )
  );

  if (!uniqueKeys.length) {
    return {};
  }

  /*
   * One query is more efficient than making a separate
   * Supabase request for every category.
   */
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
    .in('category_key', uniqueKeys)
    .order('category_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  if (!options?.includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedRows = normalizeLookupRows(
    data ?? []
  );

  const lookupMap: Record<string, LookupValue[]> =
    Object.fromEntries(
      uniqueKeys.map((categoryKey) => [
        categoryKey,
        [],
      ])
    );

  for (const lookup of normalizedRows) {
    if (!lookupMap[lookup.category_key]) {
      lookupMap[lookup.category_key] = [];
    }

    lookupMap[lookup.category_key].push(lookup);
  }

  return lookupMap;
}

/**
 * Returns lookup category definitions.
 */
export async function getLookupCategories(
  options?: {
    includeInactive?: boolean;
  }
): Promise<LookupCategory[]> {
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

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: String(item.id),
    category_key: String(item.category_key),
    name: String(item.name),
    description: item.description ?? null,
    sort_order: Number(item.sort_order ?? 100),
    is_active: item.is_active === true,
  }));
}

/**
 * Finds one lookup using its stored value.
 */
export function findLookupValue(
  values: LookupValue[],
  selectedValue?: string | null
): LookupValue | null {
  if (!selectedValue) {
    return null;
  }

  const normalizedSelected =
    normalizeLookupValue(selectedValue);

  return (
    values.find(
      (item) =>
        normalizeLookupValue(item.value) ===
        normalizedSelected
    ) ?? null
  );
}

/**
 * Resolves stored values into complete lookup records.
 *
 * Missing or archived values are retained as legacy
 * records so older events and preferences can still
 * display what was originally selected.
 */
export function resolveLookupValues(
  values: LookupValue[],
  selectedValues: string[]
): LookupValue[] {
  const cleanedSelectedValues = Array.from(
    new Set(
      selectedValues
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );

  const selectedKeys = new Set(
    cleanedSelectedValues.map(normalizeLookupValue)
  );

  const resolvedValues = values.filter((item) =>
    selectedKeys.has(
      normalizeLookupValue(item.value)
    )
  );

  const resolvedKeys = new Set(
    resolvedValues.map((item) =>
      normalizeLookupValue(item.value)
    )
  );

  const missingValues = cleanedSelectedValues.filter(
    (value) =>
      !resolvedKeys.has(normalizeLookupValue(value))
  );

  return [
    ...resolvedValues,
    ...missingValues.map((value, index) => ({
      id: `legacy-${normalizeLookupValue(
        value
      )}-${index}`,
      category_key: 'legacy',
      value,
      display_name: formatLegacyLabel(value),
      description:
        'This value was previously selected but is no longer active.',
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

function normalizeLookupRows(
  rows: Array<{
    id: unknown;
    category_key: unknown;
    value: unknown;
    display_name: unknown;
    description?: unknown;
    icon?: unknown;
    color?: unknown;
    sort_order?: unknown;
    is_active?: unknown;
    archived_at?: unknown;
  }>
): LookupValue[] {
  return rows.map((item) => ({
    id: String(item.id),
    category_key: String(item.category_key),
    value: String(item.value),
    display_name: String(item.display_name),
    description:
      item.description === null ||
      item.description === undefined
        ? null
        : String(item.description),
    icon:
      item.icon === null ||
      item.icon === undefined
        ? null
        : String(item.icon),
    color:
      item.color === null ||
      item.color === undefined
        ? null
        : String(item.color),
    sort_order: Number(item.sort_order ?? 100),
    is_active: item.is_active === true,
    archived_at:
      item.archived_at === null ||
      item.archived_at === undefined
        ? null
        : String(item.archived_at),
  }));
}

function formatLegacyLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}