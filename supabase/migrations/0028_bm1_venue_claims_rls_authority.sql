-- BM1 E2B. Apply only after 0027. No identity/history transfer or payment gate.
-- private lookup functions read otherwise-private authority rows, bind auth.uid(),
-- and cannot be invoked through the public Data API. Trigger functions have no
-- direct EXECUTE grants. Ordinary operations continue through user-client RLS.
create schema if not exists bm1_private;
revoke all on schema bm1_private from public, anon, authenticated;
grant usage on schema bm1_private to authenticated;

create function bm1_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and app_role = 'admin'
  );
$$;
create function bm1_private.can_manage_venue(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (bm1_private.is_admin() or exists (
    select 1 from public.venue_managers
    where venue_id = target and user_id = auth.uid() and status = 'active'
  ));
$$;
revoke all on function bm1_private.is_admin() from public, anon, authenticated;
revoke all on function bm1_private.can_manage_venue(uuid) from public, anon, authenticated;
grant execute on function bm1_private.is_admin() to authenticated;
grant execute on function bm1_private.can_manage_venue(uuid) to authenticated;

-- Administrator authority cannot be self-assigned through profile UPDATE/INSERT.
-- Invoker trigger: current_user reflects the database role, not a supplied actor.
create function bm1_private.protect_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then return new; end if;
  if tg_op = 'INSERT' then
    if new.app_role <> 'user' and not bm1_private.is_admin() then
      raise exception 'Profile role assignment requires an administrator' using errcode = '42501';
    end if;
  elsif new.app_role is distinct from old.app_role and not bm1_private.is_admin() then
    raise exception 'Profile role assignment requires an administrator' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger bm1_protect_profile_role before insert or update on public.profiles
for each row execute function bm1_private.protect_profile_role();

-- Managers maintain ordinary information and submit removal requests. Canonical
-- identity, location, lifecycle, verification, attribution and admin decisions
-- are not editable through an ordinary manager UPDATE, even via the Data API.
create function bm1_private.protect_venue_fields() returns trigger
language plpgsql set search_path = '' as $$
declare allowed text[] := array['description','special_message','website_url',
  'instagram_url','cover_image_url','flyer_url','updated_at',
  'removal_requested_at','removal_reason','refund_requested','refund_decision'];
begin
  if current_user in ('postgres','supabase_admin','service_role') or bm1_private.is_admin() then return new; end if;
  if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
    raise exception 'Venue identity, location and review state require HypeKnight review' using errcode = '42501';
  end if;
  if new.refund_decision is distinct from old.refund_decision
     and new.refund_decision not in ('pending','not_applicable') then
    raise exception 'Refund decisions require HypeKnight review' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger bm1_protect_venue_fields before update on public.venues
for each row execute function bm1_private.protect_venue_fields();

-- Remove every installed legacy venue authority policy, including permissive
-- duplicates. Exact names below are from the read-only production preflight.
drop policy if exists "owners can view own venue billing events" on public.venue_billing_events;
drop policy if exists "owners can manage own venue hours" on public.venue_hours;
drop policy if exists "owners can manage own venue feature profiles" on public.venue_feature_profiles;
drop policy if exists "owners can insert own venue subscription usage" on public.venue_subscription_usage;
drop policy if exists "owners can update own venue subscription usage" on public.venue_subscription_usage;
drop policy if exists "owners can view own venue subscription usage" on public.venue_subscription_usage;
drop policy if exists "owners can insert own venue subscription features" on public.venue_subscription_features;
drop policy if exists "owners can update own venue subscription features" on public.venue_subscription_features;
drop policy if exists "owners can view own venue subscription features" on public.venue_subscription_features;
drop policy if exists "owners can view music request flags for own venues" on public.venue_music_request_flags;
drop policy if exists "owners can manage own interaction settings" on public.venue_interaction_settings;
drop policy if exists "venue owners can manage comments for own venues" on public.venue_comments;
drop policy if exists "venue owners can view flags for own venues" on public.venue_comment_flags;
drop policy if exists "venue owners can manage music requests for own venues" on public.venue_music_requests;
drop policy if exists "owners can view votes for own venue requests" on public.venue_music_request_votes;
drop policy if exists "owners can manage own venue presence sessions" on public.venue_presence_sessions;
drop policy if exists "venue owners can view assignments for own venues" on public.venue_dj_assignments;
drop policy if exists "owners can insert own venue subscriptions" on public.venue_subscriptions;
drop policy if exists "owners can update own venue subscriptions" on public.venue_subscriptions;
drop policy if exists "owners can view own venue subscriptions" on public.venue_subscriptions;
drop policy if exists "venue_connection_request_read" on public.venue_event_connection_requests;
drop policy if exists "owners can view presence checkins for own venues" on public.venue_presence_checkins;
drop policy if exists "owners can update own venues" on public.venues;
drop policy if exists "owners can view own venues" on public.venues;
drop policy if exists "published venues are public" on public.venues;
drop policy if exists "venue owners and admins create venues" on public.venues;
drop policy if exists "venue owners and admins update owned venues" on public.venues;
drop policy if exists "venue owners can insert own venues" on public.venues;

create policy bm1_managers_read_venues on public.venues for select to authenticated
using (bm1_private.can_manage_venue(id));
create policy bm1_managers_update_venues on public.venues for update to authenticated
using (bm1_private.can_manage_venue(id)) with check (bm1_private.can_manage_venue(id));
-- Compatibility onboarding is creation permission, never existing-venue access.
-- The AFTER INSERT trigger below creates its manager in this same transaction.
create policy bm1_legacy_create_venues on public.venues for insert to authenticated
with check (owner_id = auth.uid() and exists (select 1 from public.profiles
  where id = auth.uid() and app_role in ('venue_owner','admin'))
  and status = 'draft' and entity_state = 'active' and claim_state = 'unclaimed'
  and verification_state = 'unverified' and location_id is null
  and not is_featured and removed_at is null and removed_by is null);
-- Existing administrator/public policies remain. No claim/payment predicate
-- controls public visibility. The legacy published policy was incompatible
-- with the deployed status constraint and mixed public read with ownership.
create policy bm1_managers_select on public.venue_hours for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_insert on public.venue_hours for insert to authenticated
with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_update on public.venue_hours for update to authenticated
using (bm1_private.can_manage_venue(venue_id)) with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_delete on public.venue_hours for delete to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_feature_profiles for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_insert on public.venue_feature_profiles for insert to authenticated
with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_update on public.venue_feature_profiles for update to authenticated
using (bm1_private.can_manage_venue(venue_id)) with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_interaction_settings for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_insert on public.venue_interaction_settings for insert to authenticated
with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_update on public.venue_interaction_settings for update to authenticated
using (bm1_private.can_manage_venue(venue_id)) with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_comments for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_update on public.venue_comments for update to authenticated
using (bm1_private.can_manage_venue(venue_id)) with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_music_requests for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_update on public.venue_music_requests for update to authenticated
using (bm1_private.can_manage_venue(venue_id)) with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_presence_sessions for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_insert on public.venue_presence_sessions for insert to authenticated
with check (bm1_private.can_manage_venue(venue_id) and created_by = auth.uid());
create policy bm1_managers_update on public.venue_presence_sessions for update to authenticated
using (bm1_private.can_manage_venue(venue_id)) with check (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_presence_checkins for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_billing_events for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_dj_assignments for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_select on public.venue_system_entitlements for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_managers_read on public.venue_comment_flags for select to authenticated
using (exists (select 1 from public.venue_comments r where r.id = venue_comment_flags.comment_id and bm1_private.can_manage_venue(r.venue_id)));
create policy bm1_managers_read on public.venue_music_request_flags for select to authenticated
using (exists (select 1 from public.venue_music_requests r where r.id = venue_music_request_flags.request_id and bm1_private.can_manage_venue(r.venue_id)));
create policy bm1_managers_read on public.venue_music_request_votes for select to authenticated
using (exists (select 1 from public.venue_music_requests r where r.id = venue_music_request_votes.request_id and bm1_private.can_manage_venue(r.venue_id)));

create policy bm1_connection_read on public.venue_event_connection_requests
for select to authenticated using (requested_by = auth.uid() or bm1_private.can_manage_venue(venue_id));
-- DJs retain narrowly scoped music moderation, not general management.
create policy bm1_dj_read_music on public.venue_music_requests for select to authenticated
using (exists (select 1 from public.venue_dj_assignments d where d.venue_id = venue_music_requests.venue_id and d.dj_user_id = auth.uid() and d.status = 'active'));
create policy bm1_dj_update_music on public.venue_music_requests for update to authenticated
using (exists (select 1 from public.venue_dj_assignments d where d.venue_id = venue_music_requests.venue_id and d.dj_user_id = auth.uid() and d.status = 'active'))
with check (exists (select 1 from public.venue_dj_assignments d where d.venue_id = venue_music_requests.venue_id and d.dj_user_id = auth.uid() and d.status = 'active'));

-- Existing commercial configuration uses user-client writes. Permit draft
-- configuration only; activation, settlement, usage accounting and entitlements
-- remain administrator/system decisions. Draft price integrity is E2C work.
create policy bm1_subscriptions_read on public.venue_subscriptions for select to authenticated
using (bm1_private.can_manage_venue(venue_id));
create policy bm1_subscriptions_insert on public.venue_subscriptions for insert to authenticated
with check (bm1_private.can_manage_venue(venue_id) and subscription_status = 'draft' and not is_active);
create policy bm1_subscriptions_update on public.venue_subscriptions for update to authenticated
using (bm1_private.can_manage_venue(venue_id) and subscription_status = 'draft' and not is_active)
with check (bm1_private.can_manage_venue(venue_id) and subscription_status in ('draft','pending_payment') and not is_active);
create function bm1_private.protect_subscription_fields() returns trigger
language plpgsql set search_path = '' as $$
declare allowed text[] := array['plan_definition_id','billing_mode','lock_in',
  'monthly_price','prepaid_total','current_period_price','next_billing_amount',
  'stripe_checkout_session_id','subscription_status','updated_at'];
begin
  if current_user in ('postgres','supabase_admin','service_role') or bm1_private.is_admin() then return new; end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
      raise exception 'Subscription settlement is system managed' using errcode = '42501';
    end if;
  elsif new.is_active or new.subscription_status <> 'draft' or new.payment_due_status <> 'pending'
      or new.activated_at is not null or new.last_payment_at is not null
      or new.stripe_subscription_id is not null or new.stripe_customer_id is not null
      or new.admin_notes is not null or new.term_start_at is not null or new.term_end_at is not null
      or new.starts_at is not null or new.current_period_start is not null or new.current_period_end is not null
      or new.next_payment_due_at is not null or new.renewal_at is not null or new.expires_at is not null
      or new.grace_period_ends_at is not null or new.canceled_at is not null or new.last_payment_amount is not null then
    raise exception 'Subscription settlement is system managed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger bm1_protect_subscription_fields before insert or update on public.venue_subscriptions
for each row execute function bm1_private.protect_subscription_fields();
create policy bm1_managers_read on public.venue_subscription_features for select to authenticated using (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_features.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id)));
create policy bm1_managers_insert on public.venue_subscription_features for insert to authenticated
with check (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_features.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id) and s.subscription_status = 'draft' and not s.is_active));
create policy bm1_managers_update on public.venue_subscription_features for update to authenticated
using (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_features.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id) and s.subscription_status = 'draft' and not s.is_active)) with check (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_features.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id) and s.subscription_status = 'draft' and not s.is_active));
create policy bm1_managers_read on public.venue_subscription_usage for select to authenticated using (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_usage.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id)));
create policy bm1_managers_insert on public.venue_subscription_usage for insert to authenticated
with check (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_usage.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id) and s.subscription_status = 'draft' and not s.is_active) and used_event_posts = 0);
create policy bm1_managers_update on public.venue_subscription_usage for update to authenticated
using (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_usage.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id) and s.subscription_status = 'draft' and not s.is_active) and used_event_posts = 0) with check (exists (select 1 from public.venue_subscriptions s where s.id = venue_subscription_usage.venue_subscription_id and bm1_private.can_manage_venue(s.venue_id) and s.subscription_status = 'draft' and not s.is_active) and used_event_posts = 0);

-- Foundation tables: private evidence is visible only to its submitter/admin.
-- Managers cannot appoint other managers, review claims, or self-verify.
grant select, insert, update on public.venue_claims, public.venue_corrections, public.venue_managers to authenticated;
create policy bm1_claims_read on public.venue_claims for select to authenticated
using (claimant_user_id = auth.uid() or bm1_private.is_admin());
create policy bm1_claims_submit on public.venue_claims for insert to authenticated
with check (claimant_user_id = auth.uid() and status = 'pending' and reviewed_at is null
  and reviewed_by is null and admin_note is null and verification_method is null
  and exists (select 1 from public.venues where id = venue_id));
create policy bm1_claims_review on public.venue_claims for update to authenticated
using (bm1_private.is_admin()) with check (bm1_private.is_admin());
create unique index venue_claims_one_pending_per_user_idx
on public.venue_claims(venue_id, claimant_user_id) where status = 'pending';
create policy bm1_managers_read_relationship on public.venue_managers for select to authenticated
using (user_id = auth.uid() or bm1_private.is_admin());
create policy bm1_managers_admin_insert on public.venue_managers for insert to authenticated
with check (bm1_private.is_admin());
create policy bm1_managers_admin_update on public.venue_managers for update to authenticated
using (bm1_private.is_admin()) with check (bm1_private.is_admin());
create policy bm1_corrections_read on public.venue_corrections for select to authenticated
using (submitted_by = auth.uid() or bm1_private.is_admin());
create policy bm1_corrections_submit on public.venue_corrections for insert to authenticated
with check (submitted_by = auth.uid() and status = 'pending' and reviewed_at is null and reviewed_by is null
  and exists (select 1 from public.venues where id = venue_id));
create policy bm1_corrections_review on public.venue_corrections for update to authenticated
using (bm1_private.is_admin()) with check (bm1_private.is_admin());

-- Only trusted triggers maintain denormalized claim state. A disputed marker
-- is retained for explicit administrator resolution. Verification is untouched.
create function bm1_private.refresh_claim_state(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.venues where id = target for update;
  update public.venues set claim_state = case
    when exists (select 1 from public.venue_managers where venue_id = target and status = 'active') then 'claimed'
    when exists (select 1 from public.venue_claims where venue_id = target and status = 'pending') then 'claim_pending'
    else 'unclaimed' end
  where id = target and claim_state <> 'disputed';
end;
$$;
create function bm1_private.claim_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null and coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
     and session_user not in ('postgres','supabase_admin') then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Serialize submissions/reviews against manager lifecycle for this identity.
  perform 1 from public.venues where id = new.venue_id for update;
  if tg_op = 'UPDATE' then
    if new.venue_id <> old.venue_id or new.claimant_user_id <> old.claimant_user_id
       or new.evidence is distinct from old.evidence or new.submitted_at <> old.submitted_at
       or new.verification_method is distinct from old.verification_method then
      raise exception 'Claim identity and evidence are immutable';
    end if;
    if old.status <> 'pending' or new.status not in ('approved','rejected') then
      raise exception 'Only a pending claim may be reviewed';
    end if;
    if not bm1_private.is_admin() then
      raise exception 'Claim review requires an administrator' using errcode = '42501';
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  else
    if new.status <> 'pending' or new.claimant_user_id <> auth.uid() then
      raise exception 'Claims must be submitted for the authenticated claimant' using errcode = '42501';
    end if;
    if exists (select 1 from public.venue_managers where venue_id = new.venue_id and user_id = auth.uid() and status = 'active') then
      raise exception 'You already manage this venue';
    end if;
  end if;
  return new;
end;
$$;
create function bm1_private.apply_claim_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform bm1_private.refresh_claim_state(old.venue_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and new.status = 'approved' then
    insert into public.venue_managers (venue_id,user_id,role,status)
    values (new.venue_id,new.claimant_user_id,'manager','active')
    on conflict (venue_id,user_id) do update set status = 'active', updated_at = now();
  end if;
  perform bm1_private.refresh_claim_state(new.venue_id);
  return new;
end;
$$;
create trigger bm1_claim_transition before insert or update on public.venue_claims
for each row execute function bm1_private.claim_transition();
create trigger bm1_apply_claim_review after insert or update or delete on public.venue_claims
for each row execute function bm1_private.apply_claim_review();

create function bm1_private.manager_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform bm1_private.refresh_claim_state(old.venue_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.venue_id <> old.venue_id or new.user_id <> old.user_id) then
    raise exception 'Manager identity is immutable; use a separate relationship';
  end if;
  perform bm1_private.refresh_claim_state(new.venue_id);
  return new;
end;
$$;
create trigger bm1_manager_transition after insert or update or delete on public.venue_managers
for each row execute function bm1_private.manager_transition();
create function bm1_private.legacy_creation_manager() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and exists (select 1 from public.profiles
      where id = auth.uid() and app_role in ('venue_owner','admin')) then
    insert into public.venue_managers(venue_id,user_id,role,status)
    values (new.id,auth.uid(),'owner','active');
  end if;
  return new;
end;
$$;
create trigger bm1_legacy_creation_manager after insert on public.venues
for each row execute function bm1_private.legacy_creation_manager();
-- Reconcile existing relationship state, not ownership or verification.
select bm1_private.refresh_claim_state(id) from public.venues;

-- Remove grants that RLS does not protect (TRUNCATE), and anonymous writes.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
    and (tablename = 'venues' or tablename like 'venue_%') loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon',t.tablename);
    execute format('revoke truncate, references, trigger on public.%I from authenticated',t.tablename);
  end loop;
end;
$$;
revoke delete on public.venues, public.venue_claims, public.venue_managers, public.venue_corrections,
 public.venue_subscriptions, public.venue_subscription_features, public.venue_subscription_usage,
 public.venue_feature_profiles, public.venue_interaction_settings, public.venue_presence_sessions,
 public.venue_presence_checkins, public.venue_event_connection_requests, public.venue_billing_events,
 public.venue_dj_assignments, public.venue_system_entitlements from authenticated;
-- Trigger-only functions and state refresh are never callable by client roles.
revoke all on all functions in schema bm1_private from public, anon, authenticated;
grant execute on function bm1_private.is_admin() to authenticated;
grant execute on function bm1_private.can_manage_venue(uuid) to authenticated;

-- Session evidence, not a self-authored checkin row, admits a participant.
drop policy if exists "authenticated users can create own presence checkins" on public.venue_presence_checkins;
-- INSERT/UPDATE grants remain for the existing admin policy; participant self-insert is retired.
create function bm1_private.join_venue_session(target uuid, code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.venue_presence_sessions; result uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ps.* into s from public.venue_presence_sessions ps
  join public.venues v on v.id = ps.venue_id
  where ps.venue_id = target and ps.session_code = upper(btrim(code))
    and ps.status = 'active' and ps.starts_at <= now()
    and (ps.ends_at is null or ps.ends_at > now())
    and v.status = 'active' and v.is_visible
  for share of ps;
  if not found then raise exception 'Invalid or expired venue session' using errcode = '42501'; end if;
  insert into public.venue_presence_checkins(venue_presence_session_id,venue_id,user_id,status,expires_at)
  values(s.id,target,auth.uid(),'active',coalesce(s.ends_at,now()+interval '4 hours'))
  on conflict(venue_presence_session_id,user_id) do update
    set status='active', expires_at=excluded.expires_at, updated_at=now()
  returning id into result;
  return result;
end;
$$;
revoke all on function bm1_private.join_venue_session(uuid,text) from public,anon,authenticated;
grant execute on function bm1_private.join_venue_session(uuid,text) to authenticated;
create function public.join_venue_presence_session(p_venue_id uuid,p_session_code text) returns uuid
language sql security invoker set search_path = '' as $$
  select bm1_private.join_venue_session(p_venue_id,p_session_code);
$$;
revoke all on function public.join_venue_presence_session(uuid,text) from public,anon,authenticated;
grant execute on function public.join_venue_presence_session(uuid,text) to authenticated;

-- Retired global-role requests are historical; venue-specific claims replace writes.
drop policy if exists "users can insert own venue owner requests" on public.venue_owner_requests;
drop policy if exists "admins can update all venue owner requests" on public.venue_owner_requests;
revoke insert,update,delete on public.venue_owner_requests from authenticated;

create function bm1_private.protect_venue_bindings() returns trigger
language plpgsql set search_path = '' as $$
declare key text;
begin
  if current_user in ('postgres','supabase_admin','service_role') or bm1_private.is_admin() then return new; end if;
  foreach key in array array['venue_id','user_id','created_by','venue_subscription_id','venue_presence_session_id','comment_id','request_id'] loop
    if to_jsonb(new)->key is distinct from to_jsonb(old)->key then
      raise exception 'Venue operation relationship is immutable' using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;
do $$
declare name text;
begin
  foreach name in array array['venue_hours','venue_feature_profiles','venue_interaction_settings',
    'venue_subscriptions','venue_subscription_features','venue_subscription_usage',
    'venue_comments','venue_music_requests','venue_comment_flags','venue_music_request_flags',
    'venue_music_request_votes','venue_presence_sessions','venue_presence_checkins'] loop
    execute format('create trigger bm1_protect_bindings before update on public.%I for each row execute function bm1_private.protect_venue_bindings()',name);
  end loop;
end;
$$;
revoke all on function bm1_private.protect_venue_bindings() from public,anon,authenticated;

-- Shared BM1 presence evidence/credentials remain server-only. Production had
-- no client policies but inherited grants on credentials included TRUNCATE.
revoke all on public.presence_credentials,public.presence_participants,public.presence_verifications from anon,authenticated;
