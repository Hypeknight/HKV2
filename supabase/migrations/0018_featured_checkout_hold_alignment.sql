-- ============================================================================
-- HypeKnight V3.5 - Featured Checkout Hold Alignment
-- ============================================================================
--
-- Stripe Checkout sessions cannot expire sooner than 30 minutes.
-- Featured inventory therefore uses the same 30-minute checkout hold so the
-- HypeKnight reservation and Stripe payment window remain synchronized.
-- ============================================================================

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
  -- Create a 30-minute checkout hold.
  -- ------------------------------------------------------------------------

  v_expires_at := now() + interval '30 minutes';

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


create or replace function public.create_featured_draft_order(
  p_event_id uuid,
  p_inventory_ids uuid[]
)
returns table (
  order_id uuid,
  subtotal numeric,
  total numeric,
  reservation_count integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_event public.events%rowtype;

  v_inventory_ids uuid[];

  v_selected_count integer;
  v_found_count integer;

  v_discovery_start timestamptz;
  v_discovery_end timestamptz;

  v_timezone text;

  v_inventory record;
  v_existing public.featured_reservations%rowtype;

  v_used_capacity integer;

  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_expires_at timestamptz := now() + interval '30 minutes';

  v_reservation_id uuid;
begin

  -- ------------------------------------------------------------------------
  -- 1. Authentication / input
  -- ------------------------------------------------------------------------

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_inventory_ids is null
     or cardinality(p_inventory_ids) = 0 then
    raise exception 'Choose at least one Featured date';
  end if;

  /*
   * Normalize duplicate inventory ids so one date cannot accidentally appear
   * twice in the same Featured cart.
   */
  select array_agg(id order by id)
    into v_inventory_ids
  from (
    select distinct unnest(p_inventory_ids) as id
  ) selected;

  v_selected_count := cardinality(v_inventory_ids);

  if v_selected_count is null
     or v_selected_count = 0 then
    raise exception 'Choose at least one Featured date';
  end if;


  -- ------------------------------------------------------------------------
  -- 2. Event eligibility
  -- ------------------------------------------------------------------------

  select *
    into v_event
  from public.events
  where id = p_event_id
    and owner_id = v_user_id;

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

  select m.timezone
    into v_timezone
  from public.markets m
  where m.id = v_event.market_id;

  if v_timezone is null
     or trim(v_timezone) = '' then
    raise exception 'Featured is unavailable until this market has a timezone';
  end if;

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


  -- ------------------------------------------------------------------------
  -- 3. Lock ALL selected inventory rows in deterministic order
  -- ------------------------------------------------------------------------
  --
  -- This is the concurrency boundary. Two purchases competing for the final
  -- slot on the same date cannot both make their capacity decision at once.
  -- Deterministic id ordering also reduces deadlock risk for multi-date carts.
  -- ------------------------------------------------------------------------

  perform fi.id
  from public.featured_inventory fi
  where fi.id = any(v_inventory_ids)
  order by fi.id
  for update;


  select count(*)::integer
    into v_found_count
  from public.featured_inventory fi
  where fi.id = any(v_inventory_ids);

  if v_found_count <> v_selected_count then
    raise exception 'One or more Featured dates no longer exist';
  end if;


  -- ------------------------------------------------------------------------
  -- 4. Expire stale holds before capacity validation
  -- ------------------------------------------------------------------------

  update public.featured_reservations
  set
    status = 'expired',
    updated_at = now()
  where inventory_id = any(v_inventory_ids)
    and status = 'reserved'
    and expires_at is not null
    and expires_at <= now();


  -- ------------------------------------------------------------------------
  -- 5. Validate every date BEFORE creating the order
  -- ------------------------------------------------------------------------

  for v_inventory in
    select
      fi.id,
      fi.market_id,
      fi.feature_date,
      fi.capacity,
      fi.unit_price,
      fi.enabled,

      fi.feature_date::timestamp
        at time zone v_timezone as day_start,

      (fi.feature_date + 1)::timestamp
        at time zone v_timezone as day_end

    from public.featured_inventory fi
    where fi.id = any(v_inventory_ids)
    order by fi.feature_date, fi.id
  loop

    if v_inventory.enabled is distinct from true then
      raise exception
        'Featured inventory for % is not available',
        v_inventory.feature_date;
    end if;

    if v_inventory.market_id <> v_event.market_id then
      raise exception
        'Featured inventory for % belongs to a different market',
        v_inventory.feature_date;
    end if;

    if v_inventory.day_end <= now() then
      raise exception
        'Featured date % has already ended',
        v_inventory.feature_date;
    end if;

    if v_inventory.day_end <= v_discovery_start
       or v_inventory.day_start >= v_discovery_end then
      raise exception
        'Featured date % falls outside the event Discovery Window',
        v_inventory.feature_date;
    end if;


    -- Existing entitlement / checkout for this event and date.

    select *
      into v_existing
    from public.featured_reservations
    where inventory_id = v_inventory.id
      and event_id = p_event_id
      and status in ('reserved', 'sold')
    order by created_at desc
    limit 1;

    if found then

      if v_existing.status = 'sold' then
        raise exception
          'This event already owns Featured placement for %',
          v_inventory.feature_date;
      end if;

      /*
       * An active hold attached to another order represents a checkout already
       * in progress. Do not silently steal that reservation.
       */
      if v_existing.status = 'reserved'
         and v_existing.expires_at > now()
         and v_existing.order_id is not null then
        raise exception
          'A Featured checkout is already in progress for %',
          v_inventory.feature_date;
      end if;

    end if;


    select count(*)::integer
      into v_used_capacity
    from public.featured_reservations fr
    where fr.inventory_id = v_inventory.id
      and (
        fr.status = 'sold'
        or (
          fr.status = 'reserved'
          and fr.expires_at > now()
        )
      )
      and not (
        fr.event_id = p_event_id
        and fr.user_id = v_user_id
        and fr.order_id is null
      );

    if v_used_capacity >= v_inventory.capacity then
      raise exception
        'Featured date % is sold out',
        v_inventory.feature_date;
    end if;

    v_subtotal :=
      v_subtotal + v_inventory.unit_price;

  end loop;


  if v_subtotal <= 0 then
    raise exception 'Featured order total must be greater than zero';
  end if;


  -- ------------------------------------------------------------------------
  -- 6. Create one immutable Featured transaction
  -- ------------------------------------------------------------------------

  insert into public.event_orders (
    event_id,
    user_id,
    order_kind,
    status,
    subtotal,
    discount_amount,
    total,
    coupon_id,
    coupon_code,
    discount_type,
    discount_value,
    stripe_checkout_session_id,
    stripe_payment_intent_id
  ) values (
    p_event_id,
    v_user_id,
    'featured',
    'draft',
    v_subtotal,
    0,
    v_subtotal,
    null,
    null,
    null,
    null,
    null,
    null
  )
  returning id into v_order_id;


  -- ------------------------------------------------------------------------
  -- 7. Create/reuse reservation + one order line for every selected date
  -- ------------------------------------------------------------------------

  for v_inventory in
    select
      fi.id,
      fi.feature_date,
      fi.unit_price
    from public.featured_inventory fi
    where fi.id = any(v_inventory_ids)
    order by fi.feature_date, fi.id
  loop

    /*
     * A reservation may already exist from the single-date reservation RPC
     * used during selection/testing. Reuse an unbound active reservation owned
     * by this exact organizer/event rather than consuming another slot.
     */

    select *
      into v_existing
    from public.featured_reservations
    where inventory_id = v_inventory.id
      and event_id = p_event_id
      and user_id = v_user_id
      and status = 'reserved'
      and expires_at > now()
      and order_id is null
    order by created_at desc
    limit 1;

    if found then

      update public.featured_reservations
      set
        order_id = v_order_id,
        price_snapshot = v_inventory.unit_price,
        reserved_at = now(),
        expires_at = v_expires_at,
        updated_at = now()
      where id = v_existing.id;

      v_reservation_id := v_existing.id;

    else

      insert into public.featured_reservations (
        inventory_id,
        event_id,
        user_id,
        order_id,
        status,
        price_snapshot,
        reserved_at,
        expires_at
      ) values (
        v_inventory.id,
        p_event_id,
        v_user_id,
        v_order_id,
        'reserved',
        v_inventory.unit_price,
        now(),
        v_expires_at
      )
      returning id into v_reservation_id;

    end if;


    insert into public.event_order_items (
      order_id,
      event_id,
      product_code,
      label,
      quantity,
      unit_price,
      line_total,
      metadata
    ) values (
      v_order_id,
      p_event_id,
      'HYPEKNIGHT_FEATURED_DATE',
      'Featured - ' || v_inventory.feature_date::text,
      1,
      v_inventory.unit_price,
      v_inventory.unit_price,
      jsonb_build_object(
        'reservation_id', v_reservation_id,
        'inventory_id', v_inventory.id,
        'feature_date', v_inventory.feature_date,
        'price_snapshot', v_inventory.unit_price,
        'reservation_expires_at', v_expires_at
      )
    );

  end loop;


  -- ------------------------------------------------------------------------
  -- 8. Return checkout-ready order summary
  -- ------------------------------------------------------------------------

  return query
  select
    v_order_id,
    v_subtotal::numeric,
    v_subtotal::numeric,
    v_selected_count,
    v_expires_at;

end;
$$;


revoke all on function
  public.create_featured_draft_order(uuid, uuid[])
from public;

grant execute on function
  public.create_featured_draft_order(uuid, uuid[])
to authenticated;
