-- HypeKnight Business Model 1.0
-- Venue -> physical location backfill repair.
--
-- 0026 created the physical venue_locations correctly but existing venues
-- were not linked through venues.location_id.
--
-- Location is not venue identity. This migration only links an existing
-- venue to an existing physical location when the address relationship
-- resolves to exactly one location.

with candidate_matches as (
  select
    v.id as venue_id,
    vl.id as location_id,
    count(*) over (partition by v.id) as match_count
  from public.venues v
  join public.venue_locations vl
    on lower(trim(v.address)) like '%' || lower(trim(vl.address_line_1)) || '%'
   and lower(trim(v.city)) = lower(trim(vl.city))
   and upper(trim(v.state)) = upper(trim(vl.state))
  where v.location_id is null
    and nullif(trim(v.address), '') is not null
    and nullif(trim(v.city), '') is not null
    and nullif(trim(v.state), '') is not null
)
update public.venues v
set location_id = cm.location_id
from candidate_matches cm
where v.id = cm.venue_id
  and cm.match_count = 1
  and v.location_id is null;

comment on column public.venues.location_id is
  'Physical location relationship. Location is not venue identity; shared address does not imply shared venue identity.';
