import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireVenueAuthority } from '@/lib/venues/authority';

export async function requireVenueManagement(venueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const authority = await requireVenueAuthority(venueId);

  return {
    supabase,
    user,
    authority,
  };
}
