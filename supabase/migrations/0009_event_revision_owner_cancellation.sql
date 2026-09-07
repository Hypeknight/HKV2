begin;

-- Allow an event owner to cancel their own draft or rejected revision.
-- The USING clause deliberately excludes submitted revisions, so an owner
-- cannot withdraw a revision that is already awaiting admin review.

drop policy if exists event_revisions_owner_update
on public.event_revisions;

create policy event_revisions_owner_update
on public.event_revisions
for update
to authenticated
using (
  created_by = auth.uid()
  and status in ('draft', 'rejected')
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and status in ('draft', 'submitted', 'cancelled')
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);

commit;
