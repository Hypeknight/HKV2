-- ============================================================================
-- HypeKnight V3.5 - Featured Inventory Foundation
-- ============================================================================

create table if not exists public.featured_inventory (
  id uuid primary key default gen_random_uuid(),

  market_id uuid not null
    references public.markets(id)
    on delete cascade,

  feature_date date not null,

  capacity integer not null default 1
    check (capacity > 0),

  unit_price numeric(10,2) not null default 0
    check (unit_price >= 0),

  enabled boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (market_id, feature_date)
);

create index if not exists
  featured_inventory_market_date_idx
on public.featured_inventory (
  market_id,
  feature_date
);

create index if not exists
  featured_inventory_active_date_idx
on public.featured_inventory (
  feature_date,
  market_id
)
where enabled = true;


create table if not exists public.featured_reservations (
  id uuid primary key default gen_random_uuid(),

  inventory_id uuid not null
    references public.featured_inventory(id)
    on delete cascade,

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  order_id uuid null
    references public.event_orders(id)
    on delete set null,

  status text not null default 'reserved'
    check (
      status in (
        'reserved',
        'sold',
        'expired',
        'cancelled',
        'refunded'
      )
    ),

  price_snapshot numeric(10,2) not null default 0
    check (price_snapshot >= 0),

  reserved_at timestamptz not null default now(),

  expires_at timestamptz null,
  sold_at timestamptz null,
  cancelled_at timestamptz null,
  refunded_at timestamptz null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  featured_reservations_inventory_status_idx
on public.featured_reservations (
  inventory_id,
  status,
  expires_at
);

create index if not exists
  featured_reservations_event_idx
on public.featured_reservations (
  event_id,
  created_at desc
);

create index if not exists
  featured_reservations_user_idx
on public.featured_reservations (
  user_id,
  created_at desc
);

create index if not exists
  featured_reservations_order_idx
on public.featured_reservations (
  order_id
)
where order_id is not null;

create unique index if not exists
  featured_reservations_event_inventory_active_unique_idx
on public.featured_reservations (
  event_id,
  inventory_id
)
where status in ('reserved', 'sold');


alter table public.featured_inventory
  enable row level security;

alter table public.featured_reservations
  enable row level security;


drop policy if exists
  "authenticated read enabled featured inventory"
on public.featured_inventory;

create policy
  "authenticated read enabled featured inventory"
on public.featured_inventory
for select
to authenticated
using (enabled = true);


drop policy if exists
  "owners read featured reservations"
on public.featured_reservations;

create policy
  "owners read featured reservations"
on public.featured_reservations
for select
to authenticated
using (
  user_id = auth.uid()
);


drop policy if exists
  "admins read all featured inventory"
on public.featured_inventory;

create policy
  "admins read all featured inventory"
on public.featured_inventory
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);


drop policy if exists
  "admins read all featured reservations"
on public.featured_reservations;

create policy
  "admins read all featured reservations"
on public.featured_reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);
