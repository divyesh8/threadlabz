-- Canonical 001-based schema only. No data rewrite or role assignment.
begin;

-- Auth provisioning uses INSERT(id) ON CONFLICT DO NOTHING. Column grants keep
-- profile role assignment exclusively in an approved server/database operation.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id), update (full_name, phone) on public.profiles to authenticated;
create policy "insert own customer profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'customer');

-- The existing banner editor uses session/RLS access, not a service-role bypass.
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;
alter policy "public read banners" on public.banners
  using (public.is_admin() or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())));

-- Helpers are used by RLS/triggers, never by public RPC mutations.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
revoke all on function public.handle_new_user(), public.touch_updated_at() from public, anon, authenticated;
commit;
