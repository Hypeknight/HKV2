'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single();

  if (profile?.app_role !== 'admin') redirect('/dashboard');

  return user;
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin();

  const supabase = createAdminClient();

  const userId = String(formData.get('user_id') || '');
  const role = String(formData.get('app_role') || 'user');

  if (!userId) throw new Error('Missing user id.');

  if (!['user', 'venue_owner', 'admin'].includes(role)) {
    throw new Error('Invalid role.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      app_role: role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  redirect('/admin/users?role=updated');
}