'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  normalizeTicketmasterEvent,
  searchTicketmasterEvents,
} from '@/lib/external-events/ticketmaster';

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

export async function importTicketmasterEvents(formData: FormData) {
  await requireAdmin();

  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const keyword = String(formData.get('keyword') || '').trim();

  if (!city) throw new Error('City is required');

  const events = await searchTicketmasterEvents({
    city,
    stateCode: state || undefined,
    keyword: keyword || undefined,
    size: 12,
  });

  const supabase = createAdminClient();

  const rows = events.map(normalizeTicketmasterEvent);

  if (rows.length) {
    const { error } = await supabase
      .from('external_events')
      .upsert(rows, {
        onConflict: 'source_code,source_event_id',
      });

    if (error) throw new Error(error.message);
  }

  redirect('/admin/external-events?imported=1');
}