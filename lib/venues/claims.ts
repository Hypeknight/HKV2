import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireClaimUser(adminOnly = false) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  if (error) throw new Error(error.message);
  if (adminOnly) {
    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('app_role').eq('id', user.id).single();
    if (profileError) throw new Error(profileError.message);
    if (profile?.app_role !== 'admin') throw new Error('Administrator access required');
  }
  return { supabase, user };
}
