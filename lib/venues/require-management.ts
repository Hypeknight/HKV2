import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveVenueAuthority } from '@/lib/venues/authority';

export async function requireVenueManagement(venueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const authority = await resolveVenueAuthority(venueId);
  if (!authority.canManage) notFound();

  return {
    supabase,
    user,
    authority,
  };
}
