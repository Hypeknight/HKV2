-- HypeKnight V3.4 — Event Builder + Commerce Foundation
-- Additive migration. Existing event/payment fields remain for compatibility.

alter table public.events
  add column if not exists address_normalized text,
  add column if not exists venue_connection_status text not null default 'unmatched',
  add column if not exists end_time_is_explicit boolean not null default false,
  add column if not exists discovery_start_at timestamptz,
  add column if not exists discovery_end_at timestamptz;

alter table public.venues
  add column if not exists address_normalized text;

alter table public.platform_settings
  add column if not exists event_builder_enabled boolean not null default true,
  add column if not exists venue_matching_enabled boolean not null default true,
  add column if not exists venue_approval_required boolean not null default true,
  add column if not exists default_discovery_buffer_minutes integer not null default 30,
  add column if not exists commerce_receipts_enabled boolean not null default true,
  add column if not exists coupons_enabled boolean not null default true;

-- Normalize existing venue/event identity data enough for exact address matching.
update public.venues
set address_normalized = lower(regexp_replace(trim(coalesce(address, '')) || '|' || trim(coalesce(city, '')) || '|' || upper(trim(coalesce(state, ''))), '[^a-zA-Z0-9|]+', ' ', 'g'))
where coalesce(address_normalized, '') = '';

update public.events
set address_normalized = lower(regexp_replace(trim(coalesce(address, '')) || '|' || trim(coalesce(city, '')) || '|' || upper(trim(coalesce(state, ''))), '[^a-zA-Z0-9|]+', ' ', 'g'))
where coalesce(address_normalized, '') = '';

create table if not exists public.platform_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  product_family text not null default 'hypeknight',
  product_type text not null default 'event_addon',
  enabled boolean not null default false,
  price numeric(10,2) not null default 0,
  requires_event_end boolean not null default false,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_products
  (code, name, description, product_family, product_type, enabled, price, requires_event_end, sort_order)
values
  ('PATRON_PULSE', 'Patron Pulse', 'Live attendee sentiment and event intelligence.', 'patron_pulse', 'event_addon', false, 0, true, 20),
  ('LINKDN', 'Linkd’N', 'Connected live venue experiences and event interactions.', 'linkdn', 'event_addon', false, 0, true, 30)
on conflict (code) do nothing;

create table if not exists public.venue_event_connection_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  venue_owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined','revoked','cancelled')),
  event_address_normalized text,
  venue_address_normalized text,
  owner_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, venue_id)
);

create index if not exists venue_event_connection_requests_owner_idx
  on public.venue_event_connection_requests(venue_owner_id, status, created_at desc);

create table if not exists public.event_product_selections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  product_id uuid not null references public.platform_products(id) on delete restrict,
  product_code text not null,
  unit_price numeric(10,2) not null default 0,
  status text not null default 'selected' check (status in ('selected','active','cancelled','refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, product_id)
);

create table if not exists public.event_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('HK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  event_id uuid not null unique references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','pending','paid','void','refunded','partially_refunded')),
  currency text not null default 'usd',
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  coupon_id uuid,
  coupon_code text,
  discount_type text,
  discount_value numeric(10,2),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_receipt_url text,
  stripe_invoice_id text,
  stripe_invoice_url text,
  stripe_invoice_pdf text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.event_orders(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  product_code text not null,
  label text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_order_items_order_idx on public.event_order_items(order_id);
create index if not exists event_orders_user_idx on public.event_orders(user_id, created_at desc);

alter table public.platform_products enable row level security;
alter table public.venue_event_connection_requests enable row level security;
alter table public.event_product_selections enable row level security;
alter table public.event_orders enable row level security;
alter table public.event_order_items enable row level security;

-- Public/authenticated product catalog reads; writes remain server/admin controlled.
drop policy if exists platform_products_read on public.platform_products;
create policy platform_products_read on public.platform_products
for select to authenticated using (true);

-- Event owners and venue owners can see their connection requests.
drop policy if exists venue_connection_request_read on public.venue_event_connection_requests;
create policy venue_connection_request_read on public.venue_event_connection_requests
for select to authenticated using (auth.uid() = requested_by or auth.uid() = venue_owner_id);

-- Event owners may read their selected products/orders/items.
drop policy if exists event_product_selection_read on public.event_product_selections;
create policy event_product_selection_read on public.event_product_selections
for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists event_order_read on public.event_orders;
create policy event_order_read on public.event_orders
for select to authenticated using (user_id = auth.uid());

drop policy if exists event_order_item_read on public.event_order_items;
create policy event_order_item_read on public.event_order_items
for select to authenticated using (
  exists (select 1 from public.event_orders o where o.id = order_id and o.user_id = auth.uid())
);

-- Backfill discovery end for old events without changing their payment state.
update public.events
set discovery_start_at = coalesce(discovery_start_at, promotion_start_at),
    discovery_end_at = coalesce(
      discovery_end_at,
      case
        when event_end_at is not null and event_end_at > event_start_at then event_end_at
        else event_start_at + interval '30 minutes'
      end
    )
where event_start_at is not null;
