import { createClient } from '@/lib/supabase/server';

export async function getPlatformSettings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 'global')
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('platform_settings')
    .insert({ id: 'global' })
    .select('*')
    .single();

  if (createError) throw new Error(createError.message);

  return created;
}