import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Event, Profile, Venue } from '@/lib/types';

export async function getFeaturedVenues() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as Venue[];
}

export async function getUpcomingEvents() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('is_public', true)
    .gte('event_start_at', new Date().toISOString())
    .order('event_start_at', { ascending: true })
    .limit(12);

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
  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(name, slug, city, state)')
    .eq('venue_id', venueId)
    .eq('is_public', true)
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
    .order('created_at', { ascending: false });

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