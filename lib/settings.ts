import { createClient } from '@/lib/supabase/server';

export async function getPlatformSettings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 'global')
    .single();

  if (error) throw new Error(error.message);

  return data;
}