-- HypeKnight fresh-start schema
create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  username text unique,
  city text,
  state text,
  bio text,
  avatar_url text,
  app_role text not null default 'user' check (app_role in ('user', 'venue_owner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  city text not null,
  state text not null,
  description text,
  address text,
  website_url text,
  instagram_url text,
  cover_image_url text,
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  excerpt text,
  description text,
  city text not null,
  state text not null,
  address text,
  start_at timestamptz not null,
  end_at timestamptz,
  age_requirement text,
  ticket_url text,
  cover_image_url text,
  price_min numeric(10,2),
  price_max numeric(10,2),
  vibe_level int check (vibe_level between 1 and 10),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'interested', 'not_going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists set_venues_updated_at on public.venues;
create trigger set_venues_updated_at
before update on public.venues
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute procedure public.set_current_timestamp_updated_at();

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select app_role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "profiles are viewable by everyone"
on public.profiles for select
using (true);

create policy "users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "published venues are public"
on public.venues for select
using (status = 'published' or owner_id = auth.uid() or public.current_role() = 'admin');

create policy "venue owners and admins create venues"
on public.venues for insert
with check (auth.uid() = owner_id and public.current_role() in ('venue_owner', 'admin'));

create policy "venue owners and admins update owned venues"
on public.venues for update
using (owner_id = auth.uid() or public.current_role() = 'admin')
with check (owner_id = auth.uid() or public.current_role() = 'admin');

create policy "published events are public"
on public.events for select
using (
  (status = 'published' and visibility = 'public')
  or created_by = auth.uid()
  or public.current_role() = 'admin'
);

create policy "venue owners and admins create events"
on public.events for insert
with check (
  created_by = auth.uid()
  and public.current_role() in ('venue_owner', 'admin')
  and exists (
    select 1 from public.venues
    where id = venue_id and (owner_id = auth.uid() or public.current_role() = 'admin')
  )
);

create policy "venue owners and admins update events"
on public.events for update
using (
  created_by = auth.uid()
  or public.current_role() = 'admin'
)
with check (
  created_by = auth.uid()
  or public.current_role() = 'admin'
);

create policy "authenticated users view their rsvps"
on public.event_rsvps for select
using (auth.uid() = user_id or public.current_role() = 'admin');

create policy "authenticated users manage their rsvps"
on public.event_rsvps for insert
with check (auth.uid() = user_id);

create policy "authenticated users update their rsvps"
on public.event_rsvps for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.venues (owner_id, name, slug, city, state, description, address, website_url, instagram_url, is_featured, status)
select null, 'Midnight Atlas', 'midnight-atlas', 'Kansas City', 'MO', 'A polished sample venue to help you test the new build.', '123 Main St, Kansas City, MO', 'https://example.com', 'https://instagram.com/example', true, 'published'
where not exists (select 1 from public.venues where slug = 'midnight-atlas');

insert into public.venues (owner_id, name, slug, city, state, description, address, is_featured, status)
select null, 'Velvet Signal', 'velvet-signal', 'Kansas City', 'MO', 'Sample lounge listing for fresh-start data.', '456 Grand Blvd, Kansas City, MO', false, 'published'
where not exists (select 1 from public.venues where slug = 'velvet-signal');

insert into public.events (venue_id, created_by, name, slug, excerpt, description, city, state, address, start_at, end_at, age_requirement, price_min, price_max, vibe_level, status, visibility)
select v.id, null, 'Neon Frequency Friday', 'neon-frequency-friday', 'A sample flagship event for the new stack.', 'This seeded event lets you verify event cards, detail pages, and public browsing.', 'Kansas City', 'MO', '123 Main St, Kansas City, MO', now() + interval '7 days', now() + interval '7 days 4 hours', '21+', 15, 35, 8, 'published', 'public'
from public.venues v
where v.slug = 'midnight-atlas'
  and not exists (select 1 from public.events where slug = 'neon-frequency-friday');

insert into public.events (venue_id, created_by, name, slug, excerpt, description, city, state, address, start_at, age_requirement, price_min, vibe_level, status, visibility)
select v.id, null, 'After Hours Social', 'after-hours-social', 'Smaller sample event for seeded browsing.', 'Use this entry to test venue detail pages and event browsing.', 'Kansas City', 'MO', '456 Grand Blvd, Kansas City, MO', now() + interval '10 days', '18+', 10, 6, 'published', 'public'
from public.venues v
where v.slug = 'velvet-signal'
  and not exists (select 1 from public.events where slug = 'after-hours-social');
