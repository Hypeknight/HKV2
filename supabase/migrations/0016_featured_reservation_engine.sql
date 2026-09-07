-- ============================================================================
-- HypeKnight V3.5 - Featured Reservation Engine
-- ============================================================================
--
-- Featured = premium attention on specific market-local calendar dates.
--
-- This migration adds:
--
--   1. Organizer-safe Featured inventory availability for one event.
--   2. Atomic 10-minute Featured reservations.
--
-- Capacity decisions are made inside PostgreSQL while locking the inventory
-- row so the final Featured slot cannot be sold to two organizers at once.
-- ============================================================================


-- --------------------------------------------------------------------------
-- 1. FEATURED INVENTORY AVAILABILITY FOR AN OWNED EVENT
-- --------------------------------------------------------------------------

create or replace function public.get_featured_inventory_for_event(
  p_event_id uuid
)
returns table (
  inventory_id uuid,
  feature_date date,
  capacity integer,
  unit_price numeric,
  remaining_capacity integer,
  reserved_by_event boolean,
  sold_by_event boolean
)
language sql
security definer
set search_path = public
as $$
  select
    fi.id as inventory_id,
    fi.feature_date,
    fi.capacity,
    fi.unit_price,

    greatest(
      fi.capacity -
      (
        select count(*)::integer
        from public.featured_reservations fr
        where fr.inventory_id = fi.id
          and (
            fr.status = 'sold'
            or (
              fr.status = 'reserved'
              and fr.expires_at > now()
            )
          )
      ),
      0
    )::integer as remaining_capacity,

    exists (
      select 1
      from public.featured_reservations fr
      where fr.inventory_id = fi.id
        and fr.event_id = e.id
        and fr.user_id = auth.uid()
        and fr.status = 'reserved'
        and fr.expires_at > now()
    ) as reserved_by_event,

    exists (
      select 1
      from public.featured_reservations fr
      where fr.inventory_id = fi.id
        and fr.event_id = e.id
        and fr.status = 'sold'
    ) as sold_by_event

  from public.events e
  join public.markets m
    on m.id = e.market_id
  join public.featured_inventory fi
    on fi.market_id = e.market_id

  where e.id = p_event_id
    and e.owner_id = auth.uid()
    and e.is_approved = true
    and e.is_public = true
    and e.removed_at is null
    and coalesce(e.hidden_by_admin, false) = false
    and e.status in ('scheduled', 'active', 'live')

    and m.timezone is not null
    and fi.enabled = true

    -- The local Featured calendar day must overlap the event's
    -- active Discovery Window.
    and (
      (fi.feature_date + 1)::timestamp
        at time zone m.timezone
    ) > coalesce(
      e.discovery_start_at,
      e.event_start_at - interval '14 days'
    )

    and (
      fi.feature_date::timestamp
        at time zone m.timezone
    ) < coalesce(
      e.discovery_end_at,
      case
        when e.end_time_is_explicit = true
             and e.event_end_at is not null
             and e.event_end_at > e.event_start_at
          then e.event_end_at
        else e.event_start_at + interval '30 minutes'
      end
    )

    -- Do not offer a local calendar date whose entire day has passed.
    and (
      (fi.feature_date + 1)::timestamp
        at time zone m.timezone
    ) > now()

  order by fi.feature_date;
$$;


revoke all on function
  public.get_featured_inventory_for_event(uuid)
from public;

grant execute on function
  public.get_featured_inventory_for_event(uuid)
to authenticated;


-- --------------------------------------------------------------------------
-- 2. ATOMIC FEATURED RESERVATION
-- --------------------------------------------------------------------------

create or replace function public.reserve_featured_inventory(
  p_event_id uuid,
  p_inventory_id uuid
)
returns table (
  reservation_id uuid,
  inventory_id uuid,
  feature_date date,
  price_snapshot numeric,
  expires_at timestamptz,
  resumed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;

  v_inventory_id uuid;
  v_inventory_market_id uuid;
  v_feature_date date;
  v_capacity integer;
  v_unit_price numeric;
  v_enabled boolean;
  v_timezone text;

  v_discovery_start timestamptz;
  v_discovery_end timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;

  v_existing public.featured_reservations%rowtype;
  v_used_capacity integer;

  v_reservation_id uuid;
  v_expires_at timestamptz;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  -- ------------------------------------------------------------------------
  -- Event eligibility
  -- ------------------------------------------------------------------------

  select *
    into v_event
  from public.events
  where id = p_event_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'Event not found or access denied';
  end if;

  if v_event.is_approved is distinct from true
     or v_event.is_public is distinct from true
     or v_event.removed_at is not null
     or coalesce(v_event.hidden_by_admin, false) = true
     or v_event.status not in ('scheduled', 'active', 'live') then
    raise exception 'This event is not eligible for Featured placement';
  end if;

  if v_event.market_id is null then
    raise exception 'This event does not have a HypeKnight market';
  end if;

  if v_event.event_start_at is null then
    raise exception 'This event does not have a valid start time';
  end if;


  -- ------------------------------------------------------------------------
  -- Lock the inventory row before making any capacity decision.
  -- ------------------------------------------------------------------------

  select
    fi.id,
    fi.market_id,
    fi.feature_date,
    fi.capacity,
    fi.unit_price,
    fi.enabled,
    m.timezone
  into
    v_inventory_id,
    v_inventory_market_id,
    v_feature_date,
    v_capacity,
    v_unit_price,
    v_enabled,
    v_timezone
  from public.featured_inventory fi
  join public.markets m
    on m.id = fi.market_id
  where fi.id = p_inventory_id
  for update of fi;

  if not found then
    raise exception 'Featured inventory not found';
  end if;

  if v_enabled is distinct from true then
    raise exception 'This Featured date is not available';
  end if;

  if v_inventory_market_id <> v_event.market_id then
    raise exception 'Featured inventory belongs to a different market';
  end if;

  if v_timezone is null or trim(v_timezone) = '' then
    raise exception 'Featured is unavailable until this market has a timezone';
  end if;


  -- ------------------------------------------------------------------------
  -- Discovery Window validation
  -- ------------------------------------------------------------------------

  v_discovery_start := coalesce(
    v_event.discovery_start_at,
    v_event.event_start_at - interval '14 days'
  );

  v_discovery_end := coalesce(
    v_event.discovery_end_at,
    case
      when v_event.end_time_is_explicit = true
           and v_event.event_end_at is not null
           and v_event.event_end_at > v_event.event_start_at
        then v_event.event_end_at
      else v_event.event_start_at + interval '30 minutes'
    end
  );

  v_day_start :=
    v_feature_date::timestamp
      at time zone v_timezone;

  v_day_end :=
    (v_feature_date + 1)::timestamp
      at time zone v_timezone;

  if v_day_end <= now() then
    raise exception 'This Featured date has already ended';
  end if;

  if v_day_end <= v_discovery_start
     or v_day_start >= v_discovery_end then
    raise exception 'Featured dates must fall inside the event Discovery Window';
  end if;


  -- ------------------------------------------------------------------------
  -- Expire stale checkout holds for this inventory before counting capacity.
  -- ------------------------------------------------------------------------

  update public.featured_reservations
  set
    status = 'expired',
    updated_at = now()
  where inventory_id = p_inventory_id
    and status = 'reserved'
    and expires_at is not null
    and expires_at <= now();


  -- ------------------------------------------------------------------------
  -- Idempotent behavior for this event/date.
  -- ------------------------------------------------------------------------

  select *
    into v_existing
  from public.featured_reservations
  where inventory_id = p_inventory_id
    and event_id = p_event_id
    and status in ('reserved', 'sold')
  order by created_at desc
  limit 1;

  if found then
    if v_existing.status = 'sold' then
      raise exception 'This event already owns this Featured date';
    end if;

    if v_existing.status = 'reserved'
       and v_existing.expires_at > now() then

      return query
      select
        v_existing.id,
        v_existing.inventory_id,
        v_feature_date,
        v_existing.price_snapshot,
        v_existing.expires_at,
        true;

      return;
    end if;
  end if;


  -- ------------------------------------------------------------------------
  -- Capacity check while the inventory row remains locked.
  -- ------------------------------------------------------------------------

  select count(*)::integer
    into v_used_capacity
  from public.featured_reservations
  where inventory_id = p_inventory_id
    and (
      status = 'sold'
      or (
        status = 'reserved'
        and expires_at > now()
      )
    );

  if v_used_capacity >= v_capacity then
    raise exception 'This Featured date is sold out';
  end if;


  -- ------------------------------------------------------------------------
  -- Create a 10-minute checkout hold.
  -- ------------------------------------------------------------------------

  v_expires_at := now() + interval '10 minutes';

  insert into public.featured_reservations (
    inventory_id,
    event_id,
    user_id,
    status,
    price_snapshot,
    reserved_at,
    expires_at
  ) values (
    p_inventory_id,
    p_event_id,
    auth.uid(),
    'reserved',
    v_unit_price,
    now(),
    v_expires_at
  )
  returning id into v_reservation_id;


  return query
  select
    v_reservation_id,
    v_inventory_id,
    v_feature_date,
    v_unit_price,
    v_expires_at,
    false;
end;
$$;


revoke all on function
  public.reserve_featured_inventory(uuid, uuid)
from public;

grant execute on function
  public.reserve_featured_inventory(uuid, uuid)
to authenticated;
