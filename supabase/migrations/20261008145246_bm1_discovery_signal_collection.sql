-- P2-B1: new observations only. No historical rewrite, venue/event authority change,
-- new market creation, or production application is part of this checkpoint.
alter table public.signals add column observation_id uuid;
create unique index signals_observation_id_unique on public.signals(observation_id)
  where observation_id is not null;

-- Not exposed through the Data API. Trigger normalizes ALL future signal inserts,
-- including the compatibility RPC, without accepting client entity associations.
create schema if not exists bm1_signal_internal;
revoke all on schema bm1_signal_internal from public, anon, authenticated;
create function bm1_signal_internal.normalize_context()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_context jsonb;
  v_external jsonb;
  v_market uuid;
  v_venue uuid;
begin
  if new.event_id is not null then
    select to_jsonb(e) into v_context from public.events e where e.id = new.event_id;
    if v_context is null then raise exception 'Unknown event context'; end if;
    -- A stored association is context, not proof of accepted connection/attendance.
    new.venue_id := nullif(v_context->>'venue_id','')::uuid;
    new.city := nullif(v_context->>'city','');
    new.state := nullif(v_context->>'state','');
    v_market := nullif(v_context->>'market_id','')::uuid;
    new.metadata := new.metadata || jsonb_build_object('event_context','canonical','inventory_source','hypeknight','venue_connection_acceptance','not_asserted');
  elsif new.subject_type = 'event' and new.metadata->>'external_event_id' is not null then
    select to_jsonb(e) into v_external from public.external_events e
      where e.id::text = new.metadata->>'external_event_id';
    if v_external is not null then
      -- External inventory remains external. Never resolve identity from address.
      new.venue_id := nullif(v_external->>'venue_id','')::uuid;
      new.city := nullif(v_external->>'city',''); new.state := nullif(v_external->>'state','');
      v_market := nullif(v_external->>'market_id','')::uuid;
      new.metadata := new.metadata || jsonb_build_object('event_context','external','inventory_source','external','external_source_code',v_external->>'source_code');
    else
      new.venue_id := null;
      new.metadata := new.metadata || jsonb_build_object('event_context','unresolved_external');
    end if;
  end if;
  v_venue := new.venue_id;
  if v_venue is not null then
    select to_jsonb(v) into v_context from public.venues v where v.id = v_venue;
    if v_context is null then raise exception 'Unknown venue context'; end if;
    if new.event_id is null and v_external is null then
      new.city := nullif(v_context->>'city',''); new.state := nullif(v_context->>'state','');
    else
      new.city := coalesce(new.city, nullif(v_context->>'city',''));
      new.state := coalesce(new.state, nullif(v_context->>'state',''));
    end if;
    v_market := coalesce(v_market, nullif(v_context->>'market_id','')::uuid);
  end if;
  -- Only a unique, existing geography assignment may establish market context.
  -- Client-supplied market_id/metadata never establishes a registry identity.
  if v_market is null and nullif(trim(new.city),'') is not null and nullif(trim(new.state),'') is not null then
    select (array_agg(distinct a.market_id))[1] into v_market from public.market_areas a join public.markets m on m.id=a.market_id
      where a.is_active and m.status <> 'retired'
        and lower(trim(a.city))=lower(trim(new.city)) and lower(trim(a.state))=lower(trim(new.state)) having count(distinct a.market_id)=1;
  end if;
  new.market_id := v_market;
  new.metadata := new.metadata || jsonb_build_object('normalization_version','p2b1',
    'market_context',case when v_market is null then 'unresolved' else 'registered' end,
    'venue_context',case when new.venue_id is null then 'unresolved_or_not_applicable' else 'canonical_reference' end);
  return new;
end; $$;
revoke all on function bm1_signal_internal.normalize_context() from public, anon, authenticated;
create trigger signals_normalize_context before insert on public.signals
  for each row execute function bm1_signal_internal.normalize_context();

-- Deliberately narrow public telemetry endpoint. SECURITY DEFINER is required by
-- the append-only foundation (no public INSERT grant/policy), not an RLS workaround
-- for venue/event operations. Actor is ALWAYS auth.uid(), including null for anon.
create function public.record_discovery_observation(
  p_observation_id uuid, p_signal_type text, p_subject_id text,
  p_inventory_source text, p_surface text, p_placement text,
  p_anonymous_session_id text, p_metadata jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_event uuid;
  v_subject_type text;
  v_subject text;
  v_city text;
  v_state text;
  v_metadata jsonb := '{}'::jsonb;
  v_row jsonb;
  v_key text;
begin
  if p_observation_id is null or p_signal_type is null or p_signal_type not in ('search_performed','discovery_impression') then
    raise exception 'Unsupported discovery observation';
  end if;
  if p_surface is null or p_surface not in ('homepage','events_index','city_discovery','recommended_events','dashboard_recommendations') then
    raise exception 'Unsupported discovery surface';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' or octet_length(p_metadata::text)>8192 then
    raise exception 'Invalid discovery metadata';
  end if;
  if p_signal_type='search_performed' then
    if p_surface not in ('homepage','events_index') then raise exception 'Unsupported search surface'; end if;
    foreach v_key in array array['q','city','state','music','event_type','vibe','amenity','age','when','source'] loop
      v_metadata := v_metadata || jsonb_build_object(v_key,nullif(left(trim(p_metadata->>v_key),256),''));
    end loop;
    v_city := nullif(left(trim(p_metadata->>'city'),120),'');
    v_state := nullif(left(trim(p_metadata->>'state'),40),'');
    v_subject_type := 'search'; v_subject := coalesce(v_metadata->>'q',v_city,v_metadata->>'when','discovery_search');
    v_metadata := v_metadata || jsonb_build_object('query',v_metadata->'q','source_filter',v_metadata->'source',
      'searched_city',v_city,'searched_state',v_state,'result_count',null,'result_coverage','not_observed');
  else
    if p_placement is null or nullif(trim(p_placement),'') is null or length(p_placement)>120 then raise exception 'Invalid placement'; end if;
    if p_inventory_source is null or p_inventory_source not in ('hypeknight','external') then raise exception 'Invalid inventory source'; end if;
    if p_metadata ? 'exposure_class' and p_metadata->>'exposure_class' is distinct from 'organic' then raise exception 'Unsupported exposure class'; end if;
    if p_metadata->>'visible_fraction' is distinct from '0.5' or p_metadata->>'visible_ms' is distinct from '1000' then raise exception 'Invalid viewability'; end if;
    if p_inventory_source='hypeknight' then
      select to_jsonb(e) into v_row from public.events e where e.id::text=p_subject_id
        and e.is_public and e.status in ('scheduled','active') and e.removed_at is null
        and e.promotion_start_at<=now() and e.promotion_end_at>=now();
      if v_row is null then raise exception 'Event is not discoverable'; end if;
      v_event := p_subject_id::uuid;
    else
      select to_jsonb(e) into v_row from public.external_events e where e.id::text=p_subject_id
        and e.status='active' and e.event_start_at is not null
        and (e.event_end_at>=now() or (e.event_end_at is null and e.event_start_at>=now()-interval '4 hours'));
      if v_row is null then raise exception 'External event is not discoverable'; end if;
      v_metadata := jsonb_build_object('external_event_id',p_subject_id);
    end if;
    v_subject_type := 'event'; v_subject := p_subject_id;
    v_metadata := v_metadata || jsonb_build_object('visible_fraction',0.5,'visible_ms',1000,'exposure_class','organic','inventory_source',p_inventory_source);
    if jsonb_typeof(p_metadata->'position')='number' and (p_metadata->>'position')::numeric between 0 and 1000 then
      v_metadata := v_metadata || jsonb_build_object('position',p_metadata->'position');
    end if;
  end if;
  v_metadata := v_metadata || jsonb_build_object('placement',case when p_signal_type='search_performed' then 'search_form' else trim(p_placement) end,
    'acquisition_source','unknown','evidence_origin','browser_reported','contract_version','p2b1');
  insert into public.signals(signal_type,actor_id,anonymous_session_id,subject_type,subject_id,event_id,
    city,state,source,surface,verification_level,metadata,observation_id)
  values(p_signal_type,auth.uid(),nullif(left(p_anonymous_session_id,128),''),v_subject_type,v_subject,v_event,
    v_city,v_state,'browser',p_surface,case when p_signal_type='search_performed' then 'declared' else 'observed' end,v_metadata,p_observation_id)
  on conflict (observation_id) where observation_id is not null do nothing returning id into v_id;
  -- Duplicate receipt returns NULL rather than disclosing another actor's signal.
  return v_id;
end; $$;
revoke all on function public.record_discovery_observation(uuid,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.record_discovery_observation(uuid,text,text,text,text,text,text,jsonb) to anon, authenticated;
