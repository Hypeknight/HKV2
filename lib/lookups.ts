import { createClient } from '@/lib/supabase/server';

export type LookupValue = {
  id: string;
  category_key: string;
  value: string;
  display_name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function getLookupValues(categoryKey: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lookup_values')
    .select('*')
    .eq('category_key', categoryKey)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as LookupValue[];
}

export async function getLookupMap(categoryKeys: string[]) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lookup_values')
    .select('*')
    .in('category_key', categoryKeys)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) throw new Error(error.message);

  const map: Record<string, LookupValue[]> = {};

  for (const key of categoryKeys) {
    map[key] = [];
  }

  for (const item of data ?? []) {
    if (!map[item.category_key]) {
      map[item.category_key] = [];
    }

    map[item.category_key].push(item as LookupValue);
  }

  return map;
}