# HypeKnight Next

A fresh-start rebuild of HypeKnight designed to move you off HostGator and into a cleaner GitHub + Supabase + Render workflow.

## What this build includes

- Next.js web app with App Router
- Supabase auth + Postgres schema
- Public pages for home, venues, events, and event detail pages
- User login/sign-up flow
- Dashboard for signed-in users
- Role-aware admin control room for `admin` and `venue_owner`
- Create Venue and Create Event forms
- Render blueprint for deploys
- Capacitor starter config for a later iOS/Android wrapper

## What this build intentionally does **not** do

- It does not migrate old HostGator users
- It does not migrate old venues or events
- It does not bring over old mixed PHP admin systems
- It does not assume the old database schema should survive

This is a **fresh foundation**, not a direct lift-and-shift.

## Project structure

```text
hypeknight-next/
  apps/web/
    app/
    components/
    lib/
  supabase/migrations/
  render.yaml
  capacitor.config.ts
```

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase values
3. Install packages
4. Run the dev server

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Supabase setup

1. Create a new Supabase project
2. Open the SQL editor
3. Run `supabase/migrations/0001_initial.sql`
4. In Authentication, enable Email/Password
5. Copy your project URL and anon key into `.env.local`

### Optional first admin user

After you create your first user through the UI, promote them in Supabase SQL:

```sql
update public.profiles
set app_role = 'admin'
where email = 'you@example.com';
```

### Optional venue owner user

```sql
update public.profiles
set app_role = 'venue_owner'
where email = 'owner@example.com';
```

## Render deploy

This repo includes `render.yaml`.

### Basic deploy flow

1. Push this project to GitHub
2. In Render, create a new Blueprint instance from the repo
3. Add the required environment variables
4. Deploy

### Required environment variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

> Note: the current app does not use the service role key in the public UI, but keeping it available makes future admin automation and background jobs easier.

## Cloudflare

Recommended:

- point DNS to Render
- enable SSL/TLS
- keep caching conservative at first
- add WAF rules later after the app is stable

## Mobile path

This build is web-first.

When you are ready:

1. add Capacitor packages
2. generate the mobile platforms
3. decide whether to serve a statically exported shell or a hosted web build inside the wrapper

Because the public and dashboard flows are already responsive, this project is a good base for an iOS/Android wrapper later.

## Suggested next improvements

- RSVP flow
- Venue claiming flow
- Admin moderation queue
- Event submission approval workflow
- Payments / featured placement flow
- Push notifications
- Shared account model with Linkd'N

## GitHub checklist

Before pushing:

- confirm `.env.local` is ignored
- add a production README screenshot if you want
- choose your license
- add branch protection later

## Notes for your migration

This build is meant to become the **new clean home** for HypeKnight.

You can now:

- launch new users into this system
- rebuild venue/event inventory cleanly
- add only the modules worth keeping
- leave old HostGator clutter behind
