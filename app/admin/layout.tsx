import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AdminControlShell from '@/components/admin/AdminControlShell';
import { createClient } from '@/lib/supabase/server';

// The admin layout centralizes access control and navigation for every /admin route.
// Individual pages may keep their existing role checks; those are intentionally not
// removed during this additive upgrade.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) redirect('/auth/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role, display_name')
    .eq('id', user.id)
    .single();

  if (profileError) throw new Error(profileError.message);
  if (profile?.app_role !== 'admin') redirect('/dashboard');

  const displayName = profile.display_name || user.email?.split('@')[0] || 'Administrator';

  return <AdminControlShell displayName={displayName}>{children}</AdminControlShell>;
}
