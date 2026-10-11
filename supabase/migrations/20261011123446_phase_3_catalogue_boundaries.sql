-- Phase 3: reviewed source records only. Local proposal; NOT applied remotely.
-- Baseline: 001_schema.sql. The older phase_1 migration is an incompatible design.
begin;

-- Explicit API grants also support local config with auto-exposure disabled.
grant select on public.categories, public.festivals, public.products,
  public.product_images, public.product_variants, public.product_festivals to anon, authenticated;
grant insert, update, delete on public.categories, public.festivals, public.products,
  public.product_images, public.product_variants, public.product_festivals to authenticated;
grant select on public.profiles to authenticated;

alter policy "public read active products" on public.products
  using (public.is_admin() or (is_active and source in ('admin', 'manual')
    and exists (select 1 from public.categories c where c.id = category_id and c.is_active)));
alter policy "public read categories" on public.categories using (is_active or public.is_admin());
alter policy "public read festivals" on public.festivals using (is_active or public.is_admin());
alter policy "public read product_variants" on public.product_variants
  using (exists (select 1 from public.products p where p.id = product_id));
alter policy "public read product_images" on public.product_images
  using (exists (select 1 from public.products p where p.id = product_id));
alter policy "public read product_festivals" on public.product_festivals
  using (exists (select 1 from public.products p where p.id = product_id));

-- Keep administration intact. Restrict object reads to registered, visible images.
-- Public URL caching must not bypass unpublication. No files are removed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images'
  and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info'])
  and exists (select 1 from public.product_images i
    where i.url = storage.objects.name
      or regexp_replace(split_part(i.url, '?', 1), '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/product-images/', '') = storage.objects.name));
-- This policy exists on the observed deployment but is absent from 001_schema.sql.
drop policy if exists "admin write product images" on storage.objects;
create policy "admin write product images" on storage.objects for all to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

-- Supports the actual ordered, bounded catalogue queries and child lookups.
create index if not exists products_catalogue_newest_idx on public.products(created_at desc, id)
  where is_active and source in ('admin', 'manual');
create index if not exists products_catalogue_price_idx on public.products(price_paise, id)
  where is_active and source in ('admin', 'manual');
create index if not exists products_category_idx on public.products(category_id);
create index if not exists product_images_product_idx on public.product_images(product_id, sort_order, id);
create index if not exists product_festivals_festival_idx on public.product_festivals(festival_id, product_id);
commit;
