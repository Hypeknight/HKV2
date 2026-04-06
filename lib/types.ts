export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  city: string | null;
  state: string | null;
  app_role: 'user' | 'venue_owner' | 'admin';
};

export type Venue = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  city: string;
  state: string;
  description: string | null;
  address: string | null;
  website_url: string | null;
  instagram_url: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
  created_at?: string;
};

export type Event = {
  id: string;
  venue_id: string;
  created_by: string | null;
  name: string;
  slug: string;
  excerpt: string | null;
  description: string | null;
  city: string;
  state: string;
  address: string | null;
  start_at: string;
  end_at: string | null;
  age_requirement: string | null;
  ticket_url: string | null;
  cover_image_url: string | null;
  price_min: number | null;
  price_max: number | null;
  vibe_level: number | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  visibility: 'public' | 'private' | 'unlisted';
  venue?: Pick<Venue, 'name' | 'slug' | 'city' | 'state'> | null;
};
