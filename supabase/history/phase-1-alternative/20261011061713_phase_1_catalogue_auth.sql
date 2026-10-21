-- Additive, phase-1 foundation. No remote project is linked or changed by this file.
-- Currency values are integer INR paise; unpublished/demo data is never public.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create function private.is_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'threadlabz_role' = 'admin', false);
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create function private.set_updated_at() returns trigger
language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function private.set_updated_at() from public;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  name text not null check (length(btrim(name)) between 1 and 80),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  name text not null check (length(btrim(name)) between 1 and 80),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  name text not null check (length(btrim(name)) between 1 and 160),
  description text not null default '' check (length(description) <= 4000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_active boolean not null default false,
  is_demo boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_requires_real_data check (status <> 'published' or (not is_demo and published_at is not null))
);
create index products_category_id_idx on public.products(category_id);
create index products_published_idx on public.products(published_at desc, id)
  where status = 'published' and is_active and not is_demo;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null unique check (length(btrim(sku)) between 1 and 80),
  size text not null check (length(btrim(size)) between 1 and 32),
  colour text not null default '' check (length(colour) <= 60),
  price_paise integer check (price_paise > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, colour),
  constraint active_variant_requires_price check (not is_active or price_paise is not null)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  storage_path text not null unique,
  alt_text text not null check (length(btrim(alt_text)) between 1 and 240),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Exact product folder, safe raster extensions; no arbitrary URLs or traversal.
  constraint image_path_scoped check (
    storage_path ~ ('^' || product_id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
  ),
  unique (product_id, sort_order)
);

create table public.product_festivals (
  product_id uuid not null references public.products(id) on delete restrict,
  festival_id uuid not null references public.festivals(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (product_id, festival_id)
);
create index product_festivals_festival_id_idx on public.product_festivals(festival_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- No client-writable role column. Authorization uses protected app_metadata.
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null check (length(btrim(recipient)) between 1 and 100),
  line1 text not null check (length(btrim(line1)) between 1 and 200),
  line2 text not null default '' check (length(line2) <= 200),
  city text not null check (length(btrim(city)) between 1 and 100),
  state text not null check (length(btrim(state)) between 1 and 100),
  postal_code text not null check (postal_code ~ '^[1-9][0-9]{5}$'),
  country_code text not null default 'IN' check (country_code = 'IN'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses(user_id);

create table public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlist_product_id_idx on public.wishlist(product_id);

-- Explicit grants, independent of the project's Data API auto-exposure setting.
revoke all on public.categories, public.festivals, public.products, public.product_variants,
  public.product_images, public.product_festivals, public.profiles, public.addresses,
  public.wishlist from anon, authenticated;
grant select on public.categories, public.festivals, public.products, public.product_variants,
  public.product_images, public.product_festivals to anon, authenticated;
grant select on public.profiles, public.addresses, public.wishlist to authenticated;
grant insert (id, display_name), update (display_name) on public.profiles to authenticated;
grant insert (user_id, recipient, line1, line2, city, state, postal_code, country_code),
  update (recipient, line1, line2, city, state, postal_code, country_code), delete
  on public.addresses to authenticated;
grant insert (user_id, product_id), delete on public.wishlist to authenticated;
grant all on public.categories, public.festivals, public.products, public.product_variants,
  public.product_images, public.product_festivals, public.profiles, public.addresses,
  public.wishlist to service_role;

alter table public.categories enable row level security;
alter table public.festivals enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_festivals enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlist enable row level security;

create policy categories_read on public.categories for select to anon, authenticated
using (is_active or (select private.is_admin()));
create policy festivals_read on public.festivals for select to anon, authenticated
using (is_active or (select private.is_admin()));
create policy products_read on public.products for select to anon, authenticated
using ((select private.is_admin()) or (
  status = 'published' and is_active and not is_demo and published_at <= now()
  and exists (select 1 from public.categories c where c.id = category_id and c.is_active)
));
create policy variants_read on public.product_variants for select to anon, authenticated
using ((select private.is_admin()) or (is_active and exists (
  select 1 from public.products p where p.id = product_id
)));
create policy images_read on public.product_images for select to anon, authenticated
using ((select private.is_admin()) or (is_published and exists (
  select 1 from public.products p where p.id = product_id
)));
create policy product_festivals_read on public.product_festivals for select to anon, authenticated
using ((select private.is_admin()) or (
  exists (select 1 from public.products p where p.id = product_id)
  and exists (select 1 from public.festivals f where f.id = festival_id and f.is_active)
));

create policy profiles_read_own on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy addresses_read_own on public.addresses for select to authenticated
using ((select auth.uid()) = user_id);
create policy addresses_insert_own on public.addresses for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy addresses_update_own on public.addresses for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy addresses_delete_own on public.addresses for delete to authenticated
using ((select auth.uid()) = user_id);

create policy wishlist_read_own on public.wishlist for select to authenticated
using ((select auth.uid()) = user_id);
create policy wishlist_insert_own on public.wishlist for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.products p where p.id = product_id
    and p.status = 'published' and p.is_active and not p.is_demo and p.published_at <= now()
));
create policy wishlist_delete_own on public.wishlist for delete to authenticated
using ((select auth.uid()) = user_id);

create trigger categories_updated before update on public.categories for each row execute function private.set_updated_at();
create trigger festivals_updated before update on public.festivals for each row execute function private.set_updated_at();
create trigger products_updated before update on public.products for each row execute function private.set_updated_at();
create trigger variants_updated before update on public.product_variants for each row execute function private.set_updated_at();
create trigger images_updated before update on public.product_images for each row execute function private.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function private.set_updated_at();
create trigger addresses_updated before update on public.addresses for each row execute function private.set_updated_at();

-- A PUBLIC bucket bypasses SELECT RLS. Keep it PRIVATE and serve through an
-- anonymous, RLS-checked download; no service-role or long-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']);

create policy product_assets_read on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images' and (
  (select private.is_admin()) or (storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info']) and exists (
    select 1 from public.product_images i
    join public.products p on p.id = i.product_id
    join public.categories c on c.id = p.category_id
    where i.storage_path = storage.objects.name and i.is_published
      and p.status = 'published' and p.is_active and not p.is_demo
      and p.published_at <= now() and c.is_active
  ))
));
create policy product_assets_insert_admin on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select private.is_admin()) and exists (
  select 1 from public.product_images i where i.storage_path = storage.objects.name
));
create policy product_assets_update_admin on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()))
with check (bucket_id = 'product-images' and (select private.is_admin()) and exists (
  select 1 from public.product_images i where i.storage_path = storage.objects.name
));
-- No catalogue write grants, role assignment endpoint or Storage delete policy
-- in this phase. Admin mutations are a later, separately verified phase.
commit;
