import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireVenueAuthority } from '@/lib/venues/authority';

export async function requireVenueManagement(venueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const authority = await requireVenueAuthority(
    supabase,
    venueId,
    user.id,
  );

  return {
    supabase,
    user,
    authority,
  };
}
