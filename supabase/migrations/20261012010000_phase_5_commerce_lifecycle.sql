-- Phase 5: Commerce Lifecycle, Expiry, and Stock Finalization
-- Additive migration only. Does not alter or drop existing tables or data.
-- Builds on 20261012000000_phase_4_commerce_foundation.sql

begin;

-- 1. Index on inventory reservations for fast order and status lookup
create index if not exists inventory_reservations_order_idx on public.inventory_reservations(order_id);
create index if not exists inventory_reservations_variant_idx on public.inventory_reservations(variant_id);

-- 2. Release Expired Reservations (Idempotent cleanup function)
-- Selects active reservations that have passed their expires_at timestamp,
-- releases reserved stock on product_variants, transitions status to 'EXPIRED',
-- and logs audit movements in stock_movements.
create or replace function public.release_expired_stock_reservations()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id, variant_id, qty
    from public.inventory_reservations
    where status = 'ACTIVE' and expires_at <= now()
    for update skip locked
  loop
    -- Transition status to EXPIRED
    update public.inventory_reservations
    set status = 'EXPIRED'
    where id = r.id;

    -- Return reserved units back to available pool
    update public.product_variants
    set stock_reserved = greatest(0, stock_reserved - r.qty)
    where id = r.variant_id;

    -- Audit movement
    insert into public.stock_movements (variant_id, delta, reason, ref_type, ref_id)
    values (r.variant_id, 0, 'RESERVATION_RELEASED', 'expired_reservation', r.id::text);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 3. Finalize Stock Reservation (Authoritative stock consumption on captured payment)
-- Transitions active reservation to CONSUMED, reduces physical stock and reserved pool,
-- and audits movement with reason 'SALE' and negative delta.
create or replace function public.finalize_stock_reservation(
  p_reservation_id uuid
) returns boolean language plpgsql security definer set search_path to 'public' as $$
declare
  v_variant_id uuid;
  v_qty integer;
  v_status text;
  v_order_id uuid;
begin
  select variant_id, qty, status, order_id into v_variant_id, v_qty, v_status, v_order_id
  from public.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found or v_status <> 'ACTIVE' then
    return false;
  end if;

  -- Decrement actual stock and reserved pool atomically
  update public.product_variants
  set stock = greatest(0, stock - v_qty),
      stock_reserved = greatest(0, stock_reserved - v_qty)
  where id = v_variant_id;

  update public.inventory_reservations
  set status = 'CONSUMED'
  where id = p_reservation_id;

  -- Audit stock decrement
  insert into public.stock_movements (variant_id, delta, reason, ref_type, ref_id)
  values (v_variant_id, -v_qty, 'SALE', 'order', coalesce(v_order_id::text, p_reservation_id::text));

  return true;
end;
$$;

-- 4. Finalize all active reservations for an order
create or replace function public.finalize_order_stock(
  p_order_id uuid
) returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id
    from public.inventory_reservations
    where order_id = p_order_id and status = 'ACTIVE'
    for update
  loop
    if public.finalize_stock_reservation(r.id) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- 5. Release all active reservations for an order (e.g. on cancellation or payment failure)
create or replace function public.release_order_reservations(
  p_order_id uuid
) returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id
    from public.inventory_reservations
    where order_id = p_order_id and status = 'ACTIVE'
    for update
  loop
    if public.release_stock_reservation(r.id) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

commit;
