-- ThreadLabz Database Schema
-- Production PostgreSQL schema applied to Supabase project

create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Admin check helper
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- Festivals table
create table if not exists public.festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_url text,
  event_date date,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  audience text not null default 'unisex' check (audience in ('men', 'women', 'kids', 'unisex')),
  price_paise integer not null check (price_paise >= 0),
  compare_at_paise integer check (compare_at_paise >= 0),
  badge text,
  total_sold integer not null default 0,
  is_active boolean not null default true,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

-- Product variants table
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null default 'default',
  stock integer not null default 0 check (stock >= 0),
  sku text,
  unique (product_id, size, color)
);

-- Product images table
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  is_primary boolean not null default false
);

-- Product festivals junction
create table if not exists public.product_festivals (
  product_id uuid not null references public.products(id) on delete cascade,
  festival_id uuid not null references public.festivals(id) on delete cascade,
  primary key (product_id, festival_id)
);

-- Banners table
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('hero', 'festive')),
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

-- Addresses table
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false
);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_paise integer not null check (total_paise >= 0),
  shipping_address jsonb not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  payment_status text not null default 'created',
  created_at timestamptz not null default now()
);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  title_snapshot text not null,
  size text,
  qty integer not null check (qty > 0),
  price_paise integer not null check (price_paise >= 0)
);

-- Newsletter subscribers table
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  discount_code text,
  created_at timestamptz not null default now()
);

-- Wishlist table
create table if not exists public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.festivals enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_festivals enable row level security;
alter table public.banners enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;

-- Policies
create policy "read own profile" on public.profiles for select using ((auth.uid() = id) or is_admin());
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check ((auth.uid() = id) and (role = (select p.role from profiles p where p.id = auth.uid())));

create policy "public read categories" on public.categories for select using (true);
create policy "admin write categories" on public.categories for all using (is_admin()) with check (is_admin());

create policy "public read festivals" on public.festivals for select using (true);
create policy "admin write festivals" on public.festivals for all using (is_admin()) with check (is_admin());

create policy "public read active products" on public.products for select using (is_active or is_admin());
create policy "admin write products" on public.products for all using (is_admin()) with check (is_admin());

create policy "public read product_variants" on public.product_variants for select using (true);
create policy "admin write product_variants" on public.product_variants for all using (is_admin()) with check (is_admin());

create policy "public read product_images" on public.product_images for select using (true);
create policy "admin write product_images" on public.product_images for all using (is_admin()) with check (is_admin());

create policy "public read product_festivals" on public.product_festivals for select using (true);
create policy "admin write product_festivals" on public.product_festivals for all using (is_admin()) with check (is_admin());

create policy "public read banners" on public.banners for select using (true);
create policy "admin write banners" on public.banners for all using (is_admin()) with check (is_admin());

create policy "own addresses" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read own orders" on public.orders for select using ((auth.uid() = user_id) or is_admin());
create policy "admin update orders" on public.orders for update using (is_admin());

create policy "read own order items" on public.order_items for select using (exists (select 1 from orders o where o.id = order_items.order_id and (o.user_id = auth.uid() or is_admin())));

create policy "anyone can subscribe" on public.newsletter_subscribers for insert with check (true);
create policy "admin read subscribers" on public.newsletter_subscribers for select using (is_admin());

create policy "own wishlist" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public read reviews" on public.reviews for select using (true);
create policy "insert own review" on public.reviews for insert with check (auth.uid() = user_id);
create policy "admin manage reviews" on public.reviews for all using (is_admin());
