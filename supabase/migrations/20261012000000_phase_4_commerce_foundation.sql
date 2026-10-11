-- Phase 4: Commerce foundation (Carts, Stock Reservation, Orders, Payments, Webhook Events)
-- Additive migration only. Does not alter or drop existing tables or data.
-- Baseline: 001_schema.sql and 20261011123446_phase_3_catalogue_boundaries.sql.

begin;

-- 1. Shopping Carts
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_token is not null)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  qty integer not null check (qty > 0 and qty <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- 2. Stock Reservations and Movements
alter table public.product_variants add column if not exists stock_reserved integer not null default 0 check (stock_reserved >= 0);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  qty integer not null check (qty > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('PURCHASE_RECEIVED', 'SALE', 'RESERVATION_RELEASED', 'RETURN', 'ADJUSTMENT', 'DAMAGE')),
  ref_type text,
  ref_id text,
  created_at timestamptz not null default now()
);

-- 3. Payments and Webhook Idempotency
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text not null unique,
  provider_payment_id text unique,
  status text not null default 'CREATED' check (status in ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Order & Order Items Enhancements
alter table public.orders add column if not exists order_number text unique;
alter table public.orders add column if not exists email text;
alter table public.orders add column if not exists subtotal_paise integer not null default 0 check (subtotal_paise >= 0);
alter table public.orders add column if not exists shipping_paise integer not null default 0 check (shipping_paise >= 0);
alter table public.orders add column if not exists tax_paise integer not null default 0 check (tax_paise >= 0);
alter table public.orders add column if not exists discount_paise integer not null default 0 check (discount_paise >= 0);
alter table public.orders add column if not exists currency text not null default 'INR';
alter table public.orders add column if not exists idempotency_key text unique;

alter table public.order_items add column if not exists sku text;
alter table public.order_items add column if not exists tax_paise integer not null default 0 check (tax_paise >= 0);

-- 5. Safe Stock Reservation Functions (Security Definer, Search Path Set)
create or replace function public.reserve_stock(
  p_variant_id uuid,
  p_qty integer,
  p_expires_at timestamptz,
  p_order_id uuid default null
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_res_id uuid;
  v_updated integer;
begin
  if p_qty <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  -- Atomic conditional update: prevents overselling under concurrent requests
  update public.product_variants
  set stock_reserved = stock_reserved + p_qty
  where id = p_variant_id
    and (stock - stock_reserved) >= p_qty;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Insufficient stock available for variant %', p_variant_id;
  end if;

  insert into public.inventory_reservations (variant_id, order_id, qty, status, expires_at)
  values (p_variant_id, p_order_id, p_qty, 'ACTIVE', p_expires_at)
  returning id into v_res_id;

  return v_res_id;
end;
$$;

create or replace function public.release_stock_reservation(
  p_reservation_id uuid
) returns boolean language plpgsql security definer set search_path to 'public' as $$
declare
  v_variant_id uuid;
  v_qty integer;
  v_status text;
begin
  select variant_id, qty, status into v_variant_id, v_qty, v_status
  from public.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found or v_status <> 'ACTIVE' then
    return false;
  end if;

  update public.product_variants
  set stock_reserved = greatest(0, stock_reserved - v_qty)
  where id = v_variant_id;

  update public.inventory_reservations
  set status = 'RELEASED'
  where id = p_reservation_id;

  insert into public.stock_movements (variant_id, delta, reason, ref_type, ref_id)
  values (v_variant_id, 0, 'RESERVATION_RELEASED', 'reservation', p_reservation_id::text);

  return true;
end;
$$;

-- 6. Row Level Security & Access Policies
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.webhook_events enable row level security;
alter table public.payments enable row level security;

-- Customers can view/manage only their own carts
drop policy if exists "user read own cart" on public.carts;
create policy "user read own cart" on public.carts for select
  using ((auth.uid() is not null and user_id = auth.uid()) or public.is_admin());

drop policy if exists "user manage own cart" on public.carts;
create policy "user manage own cart" on public.carts for all
  using ((auth.uid() is not null and user_id = auth.uid()) or public.is_admin())
  with check ((auth.uid() is not null and user_id = auth.uid()) or public.is_admin());

drop policy if exists "user read own cart items" on public.cart_items;
create policy "user read own cart items" on public.cart_items for select
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())));

drop policy if exists "user manage own cart items" on public.cart_items;
create policy "user manage own cart items" on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.carts c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())));

-- Internal ledger & admin-only records
drop policy if exists "admin read stock movements" on public.stock_movements;
create policy "admin read stock movements" on public.stock_movements for select using (public.is_admin());

drop policy if exists "admin read webhook events" on public.webhook_events;
create policy "admin read webhook events" on public.webhook_events for select using (public.is_admin());

drop policy if exists "admin read reservations" on public.inventory_reservations;
create policy "admin read reservations" on public.inventory_reservations for select using (public.is_admin());

drop policy if exists "user read own payments" on public.payments;
create policy "user read own payments" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = payments.order_id and (o.user_id = auth.uid() or public.is_admin())));

-- Explicit grants
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;
grant select on public.payments to authenticated;

-- Indexes for performance & integrity
create index if not exists carts_user_idx on public.carts(user_id);
create index if not exists carts_session_idx on public.carts(session_token);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);
create index if not exists cart_items_variant_idx on public.cart_items(variant_id);
create index if not exists orders_number_idx on public.orders(order_number);
create index if not exists orders_idempotency_idx on public.orders(idempotency_key);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists inventory_reservations_status_expiry_idx on public.inventory_reservations(status, expires_at);

commit;
