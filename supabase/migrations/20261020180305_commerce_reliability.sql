-- PROPOSAL ONLY. Apply after the 001 + phase 3/4/5 baseline has been reconciled.
-- No historical rows are deleted or rewritten. Duplicate customer carts abort
-- the unique-index creation and require an owner-reviewed consolidation.
begin;

create unique index carts_one_customer on public.carts(user_id) where user_id is not null;
alter table public.product_variants add constraint stock_covers_reservations
  check (stock >= stock_reserved) not valid;
alter table public.orders
  add column guest_token_hash text,
  add column checkout_cart_id uuid,
  add column checkout_fingerprint text,
  add column reservation_expires_at timestamptz,
  add column gateway_attempted_at timestamptz,
  add column payment_verified_at timestamptz,
  add column reconciliation_reason text;
create index orders_checkout_cart on public.orders(checkout_cart_id, created_at desc);
alter table public.webhook_events
  add column payload_hash text,
  add column last_error text;

-- Browser table writes cannot participate in our parent-cart lock protocol.
revoke insert, update, delete on public.carts, public.cart_items from anon, authenticated;
grant select on public.orders, public.webhook_events, public.cart_items, public.products,
  public.product_variants, public.product_images, public.categories to service_role;

create function public.commerce_cart(p_user_id uuid, p_session_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_user_id is null and (p_session_token is null or
      p_session_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
    raise exception 'Missing cart authorization';
  end if;
  -- Serializes first creation, including when no cart row exists yet.
  perform pg_advisory_xact_lock(hashtextextended(
    coalesce('user:' || p_user_id::text, 'guest:' || p_session_token), 0));
  select id into v_id from public.carts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_user_id is null and user_id is null and session_token = p_session_token)
  for update;
  if v_id is null then
    insert into public.carts(user_id, session_token)
    values (p_user_id, case when p_user_id is null then p_session_token end)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create function public.commerce_mutate_cart(
  p_user_id uuid, p_session_token text, p_operation text,
  p_variant_id uuid default null, p_item_id uuid default null, p_qty integer default 0
) returns void language plpgsql security definer set search_path = '' as $$
declare v_cart uuid; v_variant uuid; v_available integer; v_existing integer;
begin
  v_cart := public.commerce_cart(p_user_id, p_session_token);
  if p_operation = 'remove' or (p_operation = 'set' and p_qty = 0) then
    delete from public.cart_items where cart_id = v_cart and id = p_item_id;
    return;
  end if;
  if p_operation not in ('add', 'set') or p_qty not between 1 and 10 then
    raise exception 'Invalid cart change';
  end if;
  v_variant := p_variant_id;
  if p_operation = 'set' then
    select variant_id into v_variant from public.cart_items where cart_id = v_cart and id = p_item_id;
  end if;
  select v.stock - v.stock_reserved into v_available
    from public.product_variants v join public.products p on p.id = v.product_id
    join public.categories c on c.id = p.category_id
    where v.id = v_variant and p.is_active and c.is_active
      and p.source in ('admin', 'manual') and p.price_paise > 0;
  if v_available is null or v_available < 1 then raise exception 'Unavailable variant'; end if;
  select qty into v_existing from public.cart_items where cart_id = v_cart and variant_id = v_variant;
  insert into public.cart_items(cart_id, variant_id, qty)
    values (v_cart, v_variant, least(10, v_available,
      p_qty + case when p_operation = 'add' then coalesce(v_existing, 0) else 0 end))
    on conflict (cart_id, variant_id) do update set qty = excluded.qty, updated_at = now();
end;
$$;

create function public.commerce_merge_cart(p_user_id uuid, p_session_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_guest uuid;
begin
  if p_user_id is null or p_session_token is null then raise exception 'Missing cart authorization'; end if;
  -- User lock first; all merges into this customer serialize.
  v_user := public.commerce_cart(p_user_id, null);
  perform pg_advisory_xact_lock(hashtextextended('guest:' || p_session_token, 0));
  select id into v_guest from public.carts
    where session_token = p_session_token and user_id is null for update;
  if v_guest is null then return; end if;
  insert into public.cart_items(cart_id, variant_id, qty)
    select v_user, variant_id, least(qty, 10) from public.cart_items where cart_id = v_guest
    on conflict (cart_id, variant_id) do update
      set qty = least(10, public.cart_items.qty + excluded.qty), updated_at = now();
  delete from public.carts where id = v_guest and user_id is null;
end;
$$;

create function public.commerce_order_view(p_order_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'orderNumber', o.order_number, 'status', o.status,
    'paymentStatus', o.payment_status, 'grandTotalPaise', o.total_paise,
    'currency', o.currency, 'shippingAddress', o.shipping_address,
    'reservationExpiresAt', o.reservation_expires_at, 'createdAt', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
      'variantId', i.variant_id, 'productId', i.product_id, 'title', i.title_snapshot,
      'sku', i.sku, 'size', i.size, 'colour', '', 'unitPricePaise', i.price_paise,
      'quantity', i.qty, 'lineTotalPaise', i.price_paise * i.qty, 'taxPaise', i.tax_paise
    ) order by i.id), '[]'::jsonb) from public.order_items i where i.order_id = o.id)
  ) from public.orders o where o.id = p_order_id;
$$;

create function public.commerce_prepare_checkout(
  p_user_id uuid, p_session_token text, p_guest_hash text,
  p_key text, p_address jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cart uuid; v_order public.orders%rowtype; v_fingerprint text;
  v_total bigint; v_id uuid; v_expiry timestamptz := now() + interval '15 minutes'; r record;
begin
  v_cart := public.commerce_cart(p_user_id, p_session_token);
  if p_key is null or length(p_key) <> 64 or
     (p_user_id is null and (p_guest_hash is null or length(p_guest_hash) <> 64)) then
    raise exception 'Invalid checkout authorization';
  end if;
  -- Lock cart lines before computing the exact submitted cart fingerprint.
  perform 1 from public.cart_items where cart_id = v_cart order by variant_id for update;
  select md5(string_agg(variant_id::text || ':' || qty::text, ',' order by variant_id))
    into v_fingerprint from public.cart_items where cart_id = v_cart;
  select * into v_order from public.orders where idempotency_key = p_key for update;
  if found then
    if ((p_user_id is not null and v_order.user_id = p_user_id) or
      (p_user_id is null and v_order.user_id is null and v_order.guest_token_hash = p_guest_hash)) is distinct from true
      or v_order.checkout_cart_id is distinct from v_cart
      or v_order.shipping_address is distinct from p_address
      or (v_fingerprint is not null and v_order.checkout_fingerprint is distinct from v_fingerprint) then
      raise exception 'Checkout request changed';
    end if;
    return public.commerce_order_view(v_order.id);
  end if;
  if v_fingerprint is null then
    -- Concurrent submission with a different key cannot produce another order.
    select * into v_order from public.orders where checkout_cart_id = v_cart
      and shipping_address = p_address and status = 'pending'
      and ((p_user_id is not null and user_id = p_user_id) or
        (p_user_id is null and user_id is null and guest_token_hash = p_guest_hash))
      order by created_at desc limit 1;
    if found then return public.commerce_order_view(v_order.id); end if;
    raise exception 'Empty cart';
  end if;
  -- Stable variant order across checkouts; publication and prices are locked too.
  perform 1 from public.product_variants v join public.cart_items i on i.variant_id = v.id
    where i.cart_id = v_cart order by v.id for update of v;
  perform 1 from public.products p where p.id in (
    select v.product_id from public.product_variants v join public.cart_items i on i.variant_id = v.id
    where i.cart_id = v_cart) order by p.id for share;
  perform 1 from public.categories c where c.id in (
    select p.category_id from public.products p join public.product_variants v on v.product_id = p.id
    join public.cart_items i on i.variant_id = v.id where i.cart_id = v_cart) order by c.id for share;
  if exists (select 1 from public.cart_items i
    join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id left join public.categories c on c.id = p.category_id
    where i.cart_id = v_cart and (not p.is_active or c.is_active is distinct from true
      or p.source not in ('admin', 'manual') or p.price_paise <= 0
      or i.qty not between 1 and 10 or v.stock - v.stock_reserved < i.qty)) then
    raise exception 'Unavailable cart stock';
  end if;
  select sum(p.price_paise::bigint * i.qty) into v_total
    from public.cart_items i join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id where i.cart_id = v_cart;
  if v_total is null or v_total <= 0 or v_total > 2147483647 then raise exception 'Invalid total'; end if;
  insert into public.orders(user_id, guest_token_hash, idempotency_key, checkout_cart_id,
    checkout_fingerprint, order_number, status, payment_status, subtotal_paise, tax_paise,
    total_paise, currency, shipping_address, reservation_expires_at)
    values(p_user_id, case when p_user_id is null then p_guest_hash end, p_key, v_cart,
      v_fingerprint, 'TL-' || gen_random_uuid()::text, 'pending', 'unpaid', v_total,
      round(v_total * 500::numeric / 10500), v_total, 'INR', p_address, v_expiry)
    returning id into v_id;
  for r in select i.*, p.id as product_id, p.title, p.price_paise, v.size, v.sku
    from public.cart_items i join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id where i.cart_id = v_cart order by v.id
  loop
    perform public.reserve_stock(r.variant_id, r.qty, v_expiry, v_id);
    insert into public.order_items(order_id, product_id, variant_id, title_snapshot, size, sku, price_paise, qty, tax_paise)
      values(v_id, r.product_id, r.variant_id, r.title, r.size, r.sku, r.price_paise, r.qty,
        round(r.price_paise::numeric * r.qty * 500 / 10500));
  end loop;
  insert into public.payments(order_id, provider_order_id, amount_paise, currency)
    values(v_id, 'pending_' || v_id::text, v_total, 'INR');
  delete from public.cart_items where cart_id = v_cart;
  return public.commerce_order_view(v_id);
end;
$$;

create function public.commerce_claim_gateway(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  select * into strict o from public.orders where id = p_order_id for update;
  if o.status = 'pending' and o.reservation_expires_at <= now() then raise exception 'Checkout expired'; end if;
  if o.razorpay_order_id is not null then
    return jsonb_build_object('providerOrderId', o.razorpay_order_id, 'claimed', false);
  end if;
  if o.status <> 'pending' or o.reservation_expires_at <= now() then raise exception 'Checkout expired'; end if;
  if o.gateway_attempted_at is not null then return jsonb_build_object('claimed', false); end if;
  update public.orders set gateway_attempted_at = now(), reconciliation_reason = 'gateway_creation_pending'
    where id = p_order_id;
  return jsonb_build_object('claimed', true);
end;
$$;

create function public.commerce_attach_gateway(p_order_id uuid, p_provider_id text, p_amount integer, p_currency text)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; n integer;
begin
  select * into strict o from public.orders where id = p_order_id for update;
  if o.total_paise <> p_amount or o.currency <> p_currency or p_provider_id !~ '^order_[A-Za-z0-9]+$'
    or (o.razorpay_order_id is not null and o.razorpay_order_id <> p_provider_id) then
    raise exception 'Gateway association mismatch';
  end if;
  update public.payments set provider_order_id = p_provider_id, updated_at = now()
    where order_id = o.id and provider = 'razorpay'
      and provider_order_id in ('pending_' || o.id::text, p_provider_id)
      and amount_paise = p_amount and currency = p_currency;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Payment intent missing or ambiguous'; end if;
  update public.orders set razorpay_order_id = p_provider_id,
    reconciliation_reason = case when reconciliation_reason = 'gateway_creation_pending' then null else reconciliation_reason end
    where id = o.id;
end;
$$;

create function public.commerce_record_event(p_event_id text, p_hash text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.webhook_events%rowtype;
begin
  insert into public.webhook_events(provider, event_id, payload_hash, payload)
    values('razorpay', p_event_id, p_hash, p_payload) on conflict(provider, event_id) do nothing;
  select * into strict e from public.webhook_events where provider = 'razorpay' and event_id = p_event_id for update;
  if e.payload_hash is distinct from p_hash then raise exception 'Event identity conflict'; end if;
  return e.id;
end;
$$;

create function public.commerce_process_event(p_event_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.webhook_events%rowtype; p public.payments%rowtype; o public.orders%rowtype;
  v_reason text; v_bad boolean; r record; v_payment text; v_capture boolean;
begin
  select * into strict e from public.webhook_events where id = p_event_id for update;
  if e.processed_at is not null then return 'duplicate'; end if;
  v_payment := e.payload->>'paymentId';
  v_capture := e.payload->>'event' in ('payment.captured', 'order.paid');
  -- Order before payment before reservations; consistent with gateway attachment.
  select o1.* into o from public.orders o1 join public.payments p1 on p1.order_id = o1.id
    where p1.provider = 'razorpay' and p1.provider_order_id = e.payload->>'providerOrderId' for update of o1;
  if not found then
    update public.webhook_events set last_error = 'association_missing' where id = e.id;
    return 'retry';
  end if;
  select * into strict p from public.payments where provider = 'razorpay'
    and provider_order_id = e.payload->>'providerOrderId' for update;
  if o.razorpay_order_id is distinct from p.provider_order_id or
    p.amount_paise <> (e.payload->>'amount')::bigint or p.amount_paise <> o.total_paise or
    p.currency is distinct from e.payload->>'currency' or p.currency <> o.currency then
    v_reason := 'payment_mismatch';
  elsif p.status in ('CAPTURED', 'REFUNDED') and v_capture and p.provider_payment_id is distinct from v_payment then
    v_reason := 'conflicting_capture';
  elsif exists(select 1 from public.payments where provider_payment_id = v_payment and id <> p.id) then
    v_reason := 'payment_already_associated';
  end if;
  if v_reason is not null then
    update public.webhook_events set last_error = v_reason where id = e.id;
    return 'retry';
  end if;
  if p.status not in ('CAPTURED', 'REFUNDED') then
    perform 1 from public.inventory_reservations where order_id = o.id order by variant_id, id for update;
    if v_capture then
      -- One exact active, unexpired reservation per snapshot, with no extra holds.
      select not exists(select 1 from public.order_items where order_id = o.id)
        or exists (
          select 1 from (select variant_id, sum(qty) qty from public.order_items where order_id = o.id group by variant_id) i
          full join (select variant_id, sum(qty) qty, bool_and(status = 'ACTIVE' and expires_at > now()) valid
            from public.inventory_reservations where order_id = o.id group by variant_id) held using(variant_id)
          where i.qty is distinct from held.qty or held.valid is distinct from true
        ) into v_bad;
      if o.status <> 'pending' or v_bad then
        -- Money arrived, but fulfilment is unsafe. Never show this as a paid order.
        update public.payments set status = 'CAPTURED', provider_payment_id = v_payment, updated_at = now() where id = p.id;
        update public.orders set payment_status = 'captured_review', razorpay_payment_id = v_payment,
          reconciliation_reason = 'capture_without_valid_reservation' where id = o.id;
        perform public.release_order_reservations(o.id);
      else
        -- All effects, including event completion, roll back on any failed write.
        for r in select * from public.inventory_reservations where order_id = o.id order by variant_id, id loop
          if not public.finalize_stock_reservation(r.id) then raise exception 'Stock finalization failed'; end if;
        end loop;
        update public.payments set status = 'CAPTURED', provider_payment_id = v_payment, updated_at = now() where id = p.id;
        update public.orders set status = 'paid', payment_status = 'captured',
          razorpay_payment_id = v_payment, payment_verified_at = now(), reconciliation_reason = null where id = o.id;
      end if;
    else
      update public.payments set status = 'FAILED', updated_at = now() where id = p.id;
      update public.orders set payment_status = 'failed' where id = o.id;
      perform public.release_order_reservations(o.id);
    end if;
  elsif p.status = 'CAPTURED' and o.payment_verified_at is null and o.payment_status <> 'captured_review' then
    -- Historical handler could commit CAPTURED without committing stock/order
    -- writes. Do not silently bless that partial state as a duplicate success.
    update public.orders set payment_status = 'captured_review',
      reconciliation_reason = 'legacy_capture_requires_review' where id = o.id;
  end if;
  update public.webhook_events set processed_at = now(), last_error = null where id = e.id;
  return 'success';
end;
$$;

-- Never hide an inconsistent ledger by clamping physical stock to zero.
create or replace function public.finalize_stock_reservation(p_reservation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.inventory_reservations%rowtype;
begin
  select * into r from public.inventory_reservations where id = p_reservation_id for update;
  if not found or r.status <> 'ACTIVE' then return false; end if;
  if r.expires_at <= now() then raise exception 'Reservation expired'; end if;
  update public.product_variants set stock = stock - r.qty, stock_reserved = stock_reserved - r.qty
    where id = r.variant_id and stock >= r.qty and stock_reserved >= r.qty;
  if not found then raise exception 'Inventory ledger mismatch'; end if;
  update public.inventory_reservations set status = 'CONSUMED' where id = r.id;
  insert into public.stock_movements(variant_id, delta, reason, ref_type, ref_id)
    values(r.variant_id, -r.qty, 'SALE', 'order', r.order_id::text);
  return true;
end;
$$;

-- Same order -> reservation -> variant lock order as payment processing.
create or replace function public.release_expired_stock_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare o record; r record; n integer := 0;
begin
  for o in select id from public.orders where exists(
    select 1 from public.inventory_reservations where order_id = orders.id
      and status = 'ACTIVE' and expires_at <= now()) order by id for update skip locked
  loop
    for r in select * from public.inventory_reservations
      where order_id = o.id and status = 'ACTIVE' and expires_at <= now()
      order by variant_id, id for update
    loop
      perform public.release_stock_reservation(r.id);
      update public.inventory_reservations set status = 'EXPIRED' where id = r.id;
      n := n + 1;
    end loop;
  end loop;
  -- Retain cleanup support for legacy, unassociated reservations.
  for r in select * from public.inventory_reservations where order_id is null
    and status = 'ACTIVE' and expires_at <= now() order by variant_id, id for update skip locked
  loop
    perform public.release_stock_reservation(r.id);
    update public.inventory_reservations set status = 'EXPIRED' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Preserve history and reservation ledgers when the existing admin form removes a SKU.
create function public.commerce_preserve_variant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.order_items where variant_id = old.id)
    or exists(select 1 from public.inventory_reservations where variant_id = old.id) then
    raise exception 'Ordered or reserved variants must be retained';
  end if;
  return old;
end;
$$;
create trigger commerce_preserve_variant before delete on public.product_variants
  for each row execute function public.commerce_preserve_variant();

-- SECURITY DEFINER functions are private capabilities, not browser APIs.
do $$
declare f record;
begin
  for f in select oid::regprocedure as signature from pg_proc where pronamespace = 'public'::regnamespace
    and (proname like 'commerce_%' or proname in ('reserve_stock', 'release_stock_reservation',
      'release_expired_stock_reservations', 'finalize_stock_reservation', 'finalize_order_stock', 'release_order_reservations'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end;
$$;
commit;
