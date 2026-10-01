-- HypeKnight production schema reconciliation
-- Patron Pulse + Venue Presence baseline
--
-- PURPOSE:
-- Source-control the PP/Presence objects that already exist in production
-- but were missing from the checked-in migration history.
--
-- IMPORTANT:
-- This migration represents the PRE-BM1 production baseline.
-- BM1 behavioral changes belong in later migrations.
--
-- event_system_activations is intentionally NOT reconstructed here.
-- It is legacy generic entitlement infrastructure. Existing production
-- patron_pulse_sessions.activation_id is nullable and ON DELETE SET NULL.
--
-- Generated from the read-only production public-schema dump captured
-- during the October BM1 alignment preflight.


-- ==========================================================
-- TABLES
-- ==========================================================

CREATE TABLE IF NOT EXISTS "public"."event_patron_pulse_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "require_checkin" boolean,
    "allow_anonymous_view" boolean,
    "allow_guest_results" boolean,
    "announcements_enabled" boolean,
    "dj_requests_enabled" boolean,
    "challenges_enabled" boolean,
    "rewards_enabled" boolean,
    "max_open_pulses" integer,
    "default_duration_minutes" integer,
    "max_response_length" integer,
    "default_results_visibility" "text",
    "owner_can_open_session" boolean,
    "owner_can_create_pulses" boolean,
    "owner_can_publish_announcements" boolean,
    "admin_approval_required" boolean,
    "public_label" "text",
    "public_description" "text",
    "admin_note" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_patron_pulse_settings_default_duration_minutes_check" CHECK ((("default_duration_minutes" IS NULL) OR (("default_duration_minutes" >= 1) AND ("default_duration_minutes" <= 1440)))),
    CONSTRAINT "event_patron_pulse_settings_default_results_visibility_check" CHECK ((("default_results_visibility" IS NULL) OR ("default_results_visibility" = ANY (ARRAY['hidden'::"text", 'live'::"text", 'after_response'::"text", 'after_close'::"text"])))),
    CONSTRAINT "event_patron_pulse_settings_max_open_pulses_check" CHECK ((("max_open_pulses" IS NULL) OR ("max_open_pulses" >= 1))),
    CONSTRAINT "event_patron_pulse_settings_max_response_length_check" CHECK ((("max_response_length" IS NULL) OR (("max_response_length" >= 1) AND ("max_response_length" <= 5000))))
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulse_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "pulse_id" "uuid",
    "announcement_id" "uuid",
    "actor_id" "uuid",
    "actor_role" "text" DEFAULT 'system'::"text" NOT NULL,
    "action" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "note" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patron_pulse_activity_log_actor_role_check" CHECK (("actor_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'guest'::"text", 'system'::"text", 'automation'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulse_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "publish_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "published_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    CONSTRAINT "patron_pulse_announcements_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "patron_pulse_announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'published'::"text", 'expired'::"text", 'cancelled'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulse_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'checked_in'::"text" NOT NULL,
    "source" "text" DEFAULT 'event_page'::"text" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_active_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "patron_pulse_checkins_source_check" CHECK (("source" = ANY (ARRAY['event_page'::"text", 'qr'::"text", 'staff'::"text", 'linkdn'::"text", 'admin'::"text"]))),
    CONSTRAINT "patron_pulse_checkins_status_check" CHECK (("status" = ANY (ARRAY['checked_in'::"text", 'left'::"text", 'removed'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulse_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pulse_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulse_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pulse_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "option_id" "uuid",
    "text_response" "text",
    "numeric_response" numeric(8,2),
    "boolean_response" boolean,
    "source" "text" DEFAULT 'event_page'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "patron_pulse_responses_source_check" CHECK (("source" = ANY (ARRAY['event_page'::"text", 'qr'::"text", 'linkdn'::"text", 'staff'::"text", 'admin'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulse_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "activation_id" "uuid",
    "title" "text" DEFAULT 'Live Event Experience'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "opens_at" timestamp with time zone,
    "closes_at" timestamp with time zone,
    "check_in_enabled" boolean DEFAULT true NOT NULL,
    "announcements_enabled" boolean DEFAULT true NOT NULL,
    "responses_visible" boolean DEFAULT true NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "opened_by" "uuid",
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opened_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    CONSTRAINT "patron_pulse_sessions_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'open'::"text", 'paused'::"text", 'closed'::"text", 'cancelled'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."patron_pulses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "pulse_type" "text" DEFAULT 'poll'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "prompt" "text",
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "results_visibility" "text" DEFAULT 'after_close'::"text" NOT NULL,
    "allow_multiple_responses" boolean DEFAULT false NOT NULL,
    "anonymous_results" boolean DEFAULT true NOT NULL,
    "opens_at" timestamp with time zone,
    "closes_at" timestamp with time zone,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "opened_by" "uuid",
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opened_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    CONSTRAINT "patron_pulses_pulse_type_check" CHECK (("pulse_type" = ANY (ARRAY['poll'::"text", 'announcement'::"text", 'rating'::"text", 'yes_no'::"text", 'dj_request'::"text", 'challenge'::"text", 'feedback'::"text"]))),
    CONSTRAINT "patron_pulses_results_visibility_check" CHECK (("results_visibility" = ANY (ARRAY['hidden'::"text", 'live'::"text", 'after_response'::"text", 'after_close'::"text"]))),
    CONSTRAINT "patron_pulses_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'open'::"text", 'closed'::"text", 'cancelled'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."venue_presence_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_presence_session_id" "uuid" NOT NULL,
    "venue_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "venue_presence_checkins_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'revoked'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."venue_presence_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_id" "uuid" NOT NULL,
    "session_code" "text" NOT NULL,
    "qr_token" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "venue_presence_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'closed'::"text", 'expired'::"text"])))
);


-- ==========================================================
-- FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."patron_pulse_current_actor_role"("target_event_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_role text;
begin
  if current_user_id is null then
    return 'system';
  end if;

  select profiles.app_role
  into current_role
  from public.profiles
  where profiles.id = current_user_id;

  if current_role = 'admin' then
    return 'admin';
  end if;

  if exists (
    select 1
    from public.events
    where events.id = target_event_id
      and events.owner_id = current_user_id
  ) then
    return 'owner';
  end if;

  return 'guest';
end;
$$;

CREATE OR REPLACE FUNCTION "public"."log_patron_pulse_item_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  event_uuid uuid;
  session_uuid uuid;
  action_name text;
begin
  event_uuid := new.event_id;
  session_uuid := new.session_id;

  if tg_op = 'INSERT' then
    action_name :=
      case tg_table_name
        when 'patron_pulses'
          then 'pulse_created'
        when 'patron_pulse_announcements'
          then 'announcement_created'
        else 'item_created'
      end;

    insert into public.patron_pulse_activity_log (
      event_id,
      session_id,
      pulse_id,
      announcement_id,
      actor_id,
      actor_role,
      action,
      to_status,
      note
    )
    values (
      event_uuid,
      session_uuid,
      case
        when tg_table_name = 'patron_pulses'
          then new.id
        else null
      end,
      case
        when tg_table_name =
          'patron_pulse_announcements'
          then new.id
        else null
      end,
      auth.uid(),
      public.patron_pulse_current_actor_role(
        event_uuid
      ),
      action_name,
      new.status,
      case
        when tg_table_name = 'patron_pulses'
          then new.title
        when tg_table_name =
          'patron_pulse_announcements'
          then new.title
        else null
      end
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    action_name :=
      case tg_table_name
        when 'patron_pulses'
          then 'pulse_status_changed'
        when 'patron_pulse_announcements'
          then 'announcement_status_changed'
        else 'item_status_changed'
      end;

    insert into public.patron_pulse_activity_log (
      event_id,
      session_id,
      pulse_id,
      announcement_id,
      actor_id,
      actor_role,
      action,
      from_status,
      to_status
    )
    values (
      event_uuid,
      session_uuid,
      case
        when tg_table_name = 'patron_pulses'
          then new.id
        else null
      end,
      case
        when tg_table_name =
          'patron_pulse_announcements'
          then new.id
        else null
      end,
      auth.uid(),
      public.patron_pulse_current_actor_role(
        event_uuid
      ),
      action_name,
      old.status,
      new.status
    );
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."log_patron_pulse_participation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.patron_pulse_activity_log (
    event_id,
    session_id,
    pulse_id,
    actor_id,
    actor_role,
    action,
    metadata
  )
  values (
    new.event_id,
    new.session_id,
    case
      when tg_table_name =
        'patron_pulse_responses'
        then new.pulse_id
      else null
    end,
    new.user_id,
    'guest',
    case
      when tg_table_name =
        'patron_pulse_checkins'
        then 'guest_checked_in'
      else 'pulse_response_submitted'
    end,
    case
      when tg_table_name =
        'patron_pulse_responses'
        then jsonb_build_object(
          'option_id',
          new.option_id
        )
      else '{}'::jsonb
    end
  );

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."log_patron_pulse_session_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    insert into public.patron_pulse_activity_log (
      event_id,
      session_id,
      actor_id,
      actor_role,
      action,
      to_status,
      note
    )
    values (
      new.event_id,
      new.id,
      auth.uid(),
      public.patron_pulse_current_actor_role(
        new.event_id
      ),
      'session_created',
      new.status,
      new.title
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.patron_pulse_activity_log (
      event_id,
      session_id,
      actor_id,
      actor_role,
      action,
      from_status,
      to_status
    )
    values (
      new.event_id,
      new.id,
      auth.uid(),
      public.patron_pulse_current_actor_role(
        new.event_id
      ),
      'session_status_changed',
      old.status,
      new.status
    );
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."expire_venue_presence_checkins"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.venue_presence_checkins
  set
    status = 'expired',
    updated_at = now()
  where status = 'active'
    and now() > expires_at;

  update public.venue_presence_sessions
  set
    status = 'expired',
    updated_at = now()
  where status = 'active'
    and ends_at is not null
    and now() > ends_at;
end;
$$;


-- ==========================================================
-- TARGET TABLE DDL
-- ==========================================================

    ADD CONSTRAINT "event_patron_pulse_settings_event_id_key" UNIQUE ("event_id");
    ADD CONSTRAINT "event_patron_pulse_settings_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulse_activity_log_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulse_announcements_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulse_checkins_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulse_checkins_session_id_user_id_key" UNIQUE ("session_id", "user_id");
    ADD CONSTRAINT "patron_pulse_options_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulse_responses_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulse_responses_pulse_id_user_id_key" UNIQUE ("pulse_id", "user_id");
    ADD CONSTRAINT "patron_pulse_sessions_event_id_key" UNIQUE ("event_id");
    ADD CONSTRAINT "patron_pulse_sessions_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "patron_pulses_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "venue_presence_checkins_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "venue_presence_checkins_venue_presence_session_id_user_id_key" UNIQUE ("venue_presence_session_id", "user_id");
    ADD CONSTRAINT "venue_presence_sessions_pkey" PRIMARY KEY ("id");
    ADD CONSTRAINT "venue_presence_sessions_qr_token_key" UNIQUE ("qr_token");
    ADD CONSTRAINT "venue_presence_sessions_session_code_key" UNIQUE ("session_code");
CREATE INDEX "idx_venue_presence_checkins_session_id" ON "public"."venue_presence_checkins" USING "btree" ("venue_presence_session_id");
CREATE INDEX "idx_venue_presence_checkins_status" ON "public"."venue_presence_checkins" USING "btree" ("status");
CREATE INDEX "idx_venue_presence_checkins_user_id" ON "public"."venue_presence_checkins" USING "btree" ("user_id");
CREATE INDEX "idx_venue_presence_checkins_venue_id" ON "public"."venue_presence_checkins" USING "btree" ("venue_id");
CREATE INDEX "idx_venue_presence_sessions_status" ON "public"."venue_presence_sessions" USING "btree" ("status");
CREATE INDEX "idx_venue_presence_sessions_venue_id" ON "public"."venue_presence_sessions" USING "btree" ("venue_id");
CREATE INDEX "patron_pulse_activity_event_idx" ON "public"."patron_pulse_activity_log" USING "btree" ("event_id", "created_at" DESC);
CREATE INDEX "patron_pulse_activity_pulse_idx" ON "public"."patron_pulse_activity_log" USING "btree" ("pulse_id", "created_at" DESC);
CREATE INDEX "patron_pulse_activity_session_idx" ON "public"."patron_pulse_activity_log" USING "btree" ("session_id", "created_at" DESC);
CREATE INDEX "patron_pulse_announcements_session_idx" ON "public"."patron_pulse_announcements" USING "btree" ("session_id", "status", "publish_at" DESC);
CREATE INDEX "patron_pulse_checkins_session_active_idx" ON "public"."patron_pulse_checkins" USING "btree" ("session_id", "status", "last_active_at" DESC);
CREATE INDEX "patron_pulse_responses_pulse_idx" ON "public"."patron_pulse_responses" USING "btree" ("pulse_id", "submitted_at" DESC);
CREATE INDEX "patron_pulse_sessions_event_idx" ON "public"."patron_pulse_sessions" USING "btree" ("event_id", "status");
CREATE INDEX "patron_pulses_session_status_idx" ON "public"."patron_pulses" USING "btree" ("session_id", "status", "sort_order");
    ADD CONSTRAINT "event_patron_pulse_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "event_patron_pulse_settings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "event_patron_pulse_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_activity_log_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."patron_pulse_announcements"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_activity_log_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_activity_log_pulse_id_fkey" FOREIGN KEY ("pulse_id") REFERENCES "public"."patron_pulses"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_activity_log_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."patron_pulse_sessions"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
    ADD CONSTRAINT "patron_pulse_announcements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_announcements_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_announcements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."patron_pulse_sessions"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_checkins_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_checkins_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."patron_pulse_sessions"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_options_pulse_id_fkey" FOREIGN KEY ("pulse_id") REFERENCES "public"."patron_pulses"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_responses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_responses_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."patron_pulse_options"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_responses_pulse_id_fkey" FOREIGN KEY ("pulse_id") REFERENCES "public"."patron_pulses"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."patron_pulse_sessions"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulse_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
    ADD CONSTRAINT "patron_pulse_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulse_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulses_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
    ADD CONSTRAINT "patron_pulses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "patron_pulses_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "patron_pulses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."patron_pulse_sessions"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "venue_comments_presence_session_id_fkey" FOREIGN KEY ("presence_session_id") REFERENCES "public"."venue_presence_sessions"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "venue_music_requests_presence_session_id_fkey" FOREIGN KEY ("presence_session_id") REFERENCES "public"."venue_presence_sessions"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "venue_presence_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "venue_presence_checkins_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "venue_presence_checkins_venue_presence_session_id_fkey" FOREIGN KEY ("venue_presence_session_id") REFERENCES "public"."venue_presence_sessions"("id") ON DELETE CASCADE;
    ADD CONSTRAINT "venue_presence_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
    ADD CONSTRAINT "venue_presence_sessions_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;
CREATE POLICY "Admins manage event pulse settings" ON "public"."event_patron_pulse_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage patron_pulse_announcements" ON "public"."patron_pulse_announcements" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage patron_pulse_checkins" ON "public"."patron_pulse_checkins" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage patron_pulse_options" ON "public"."patron_pulse_options" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage patron_pulse_responses" ON "public"."patron_pulse_responses" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage patron_pulse_sessions" ON "public"."patron_pulse_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage patron_pulses" ON "public"."patron_pulses" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Admins manage pulse activity" ON "public"."patron_pulse_activity_log" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners create pulse activity" ON "public"."patron_pulse_activity_log" FOR INSERT TO "authenticated" WITH CHECK ((("actor_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
CREATE POLICY "Event owners manage pulse announcements" ON "public"."patron_pulse_announcements" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners manage pulse options" ON "public"."patron_pulse_options" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners manage pulse sessions" ON "public"."patron_pulse_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners manage pulses" ON "public"."patron_pulses" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners read event checkins" ON "public"."patron_pulse_checkins" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners read event responses" ON "public"."patron_pulse_responses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners read pulse activity" ON "public"."patron_pulse_activity_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Event owners read pulse settings" ON "public"."event_patron_pulse_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "Guests read open pulse sessions" ON "public"."patron_pulse_sessions" FOR SELECT TO "authenticated", "anon" USING ((("status" = ANY (ARRAY['open'::"text", 'paused'::"text"])) AND (EXISTS ( SELECT 1
CREATE POLICY "Guests read published announcements" ON "public"."patron_pulse_announcements" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"text") AND (("publish_at" IS NULL) OR ("publish_at" <= "now"())) AND (("expires_at" IS NULL) OR ("expires_at" >= "now"()))));
CREATE POLICY "Guests read pulse options" ON "public"."patron_pulse_options" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND (EXISTS ( SELECT 1
CREATE POLICY "Guests read visible pulses" ON "public"."patron_pulses" FOR SELECT TO "authenticated", "anon" USING ((("status" = ANY (ARRAY['scheduled'::"text", 'open'::"text", 'closed'::"text"])) AND (EXISTS ( SELECT 1
CREATE POLICY "Users create their pulse responses" ON "public"."patron_pulse_responses" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
CREATE POLICY "Users manage their pulse checkins" ON "public"."patron_pulse_checkins" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Users read their pulse responses" ON "public"."patron_pulse_responses" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users update their pulse responses" ON "public"."patron_pulse_responses" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "admins can manage all venue presence checkins" ON "public"."venue_presence_checkins" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "admins can manage all venue presence sessions" ON "public"."venue_presence_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "authenticated users can create own presence checkins" ON "public"."venue_presence_checkins" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."event_patron_pulse_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage own venue presence sessions" ON "public"."venue_presence_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
CREATE POLICY "owners can view presence checkins for own venues" ON "public"."venue_presence_checkins" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
ALTER TABLE "public"."patron_pulse_activity_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patron_pulse_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patron_pulse_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patron_pulse_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patron_pulse_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patron_pulse_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patron_pulses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own presence checkins" ON "public"."venue_presence_checkins" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."venue_presence_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venue_presence_sessions" ENABLE ROW LEVEL SECURITY;


-- ==========================================================
-- PRODUCTION TRIGGERS
-- ==========================================================


CREATE OR REPLACE TRIGGER "patron_pulse_announcement_activity_trigger" AFTER INSERT OR UPDATE ON "public"."patron_pulse_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."log_patron_pulse_item_activity"();

CREATE OR REPLACE TRIGGER "patron_pulse_checkin_activity_trigger" AFTER INSERT ON "public"."patron_pulse_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."log_patron_pulse_participation"();

CREATE OR REPLACE TRIGGER "patron_pulse_item_activity_trigger" AFTER INSERT OR UPDATE ON "public"."patron_pulses" FOR EACH ROW EXECUTE FUNCTION "public"."log_patron_pulse_item_activity"();

CREATE OR REPLACE TRIGGER "patron_pulse_response_activity_trigger" AFTER INSERT ON "public"."patron_pulse_responses" FOR EACH ROW EXECUTE FUNCTION "public"."log_patron_pulse_participation"();

CREATE OR REPLACE TRIGGER "patron_pulse_session_activity_trigger" AFTER INSERT OR UPDATE ON "public"."patron_pulse_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."log_patron_pulse_session_activity"();

CREATE OR REPLACE TRIGGER "trg_venue_presence_checkins_updated_at" BEFORE UPDATE ON "public"."venue_presence_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_venue_presence_sessions_updated_at" BEFORE UPDATE ON "public"."venue_presence_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
