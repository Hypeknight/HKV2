import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Event, Profile, Venue } from '@/lib/types';

export async function getFeaturedVenues() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('status', 'active')
    .eq('is_visible', true)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as Venue[];
}

export async function getUpcomingEvents() {
  const supabase = await createServerClient();
  
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('is_public', true)
    .eq('is_approved', true)
    .or('is_paid.eq.true,payment_override.eq.true')
    .is('removed_at', null)
    .gte('event_start_at', now)
    .lte('promotion_start_at', now)
    .gte('promotion_end_at', now)
    .order('event_start_at', { ascending: true })
    .limit(12);

  if (error) throw error;
  return (data ?? []) as Event[];
}

export async function getLiveOrTonightEvents() {
  const supabase = await createServerClient();

  const now = new Date();
  const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('is_public', true)
    .eq('is_approved', true)
    .or('is_paid.eq.true,payment_override.eq.true')
    .is('removed_at', null)
    .gte('event_start_at', now.toISOString())
    .lte('event_start_at', next24.toISOString())
    .lte('promotion_start_at', now.toISOString())
    .gte('promotion_end_at', now.toISOString())
    .order('event_start_at', { ascending: true })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as Event[];
}

export async function getEventBySlug(slug: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as Event | null;
}

export async function getVenueBySlug(slug: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as Venue | null;
}

export async function getVenueEvents(venueId: string) {
  const supabase = await createServerClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('venue_id', venueId)
    .eq('is_public', true)
    .eq('is_approved', true)
    .or('is_paid.eq.true,payment_override.eq.true')
    .is('removed_at', null)
    .gte('promotion_end_at', now)
    .order('event_start_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Event[];
}


export async function getProfile() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function getOwnedVenues(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Venue[];
}

export async function getMyDraftEvents() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('events')
    .select('id, name, status, current_step, created_at, updated_at')
    .eq('owner_id', user.id)
    .eq('status', 'building')
    .is('submitted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading draft events:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getMyEvents() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      slug,
      venue_name,
      city,
      state,
      status,
      current_step,
      is_public,
      is_paid,
      payment_override,
      total_price,
      event_start_at,
      promotion_start_at,
      promotion_end_at,
      created_at,
      updated_at,
      rejected_at,
      rejection_reason
    `)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading user events:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getMyVenues() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('venues')
    .select(`
      id,
      name,
      slug,
      city,
      state,
      status,
      created_at,
      updated_at
    `)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading user venues:', error.message);
    return [];
  }

  return data ?? [];
}

