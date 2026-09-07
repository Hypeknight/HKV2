-- ============================================================================
-- HypeKnight V3.5 - Featured Inventory Admin Write Access
-- ============================================================================
--
-- Featured inventory is controlled by HypeKnight Operations.
--
-- Authenticated organizers may read enabled inventory through the existing
-- policies/RPCs, but only administrators may create or modify inventory.
--
-- Inventory is intentionally not deleted through normal admin operations.
-- Disable a date instead so commerce/reservation history remains intact.
-- ============================================================================


drop policy if exists
  "admins insert featured inventory"
on public.featured_inventory;

create policy
  "admins insert featured inventory"
on public.featured_inventory
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);


drop policy if exists
  "admins update featured inventory"
on public.featured_inventory;

create policy
  "admins update featured inventory"
on public.featured_inventory
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);


grant insert, update
on public.featured_inventory
to authenticated;
