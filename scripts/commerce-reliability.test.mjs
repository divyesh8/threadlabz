import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import { createHmac, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Test only: replace the network/framework boundaries, never application code.
// SQL below executes the actual proposed RPCs and real constraints/triggers.
const moduleSource = text => `data:text/javascript,${encodeURIComponent(text)}`;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const stubs = {
      "server-only": "export {};",
      "@/lib/supabase/admin": "export const createAdminSupabaseClient = () => globalThis.commerceTestClient;",
      "@/lib/auth/guards": "export const getUser = async () => globalThis.commerceTestUser;",
      "next/headers": "export const cookies = async () => globalThis.commerceTestCookies;",
      "next/cache": "export const revalidatePath = () => {};",
    };
    if (specifier in stubs) return { url: moduleSource(stubs[specifier]), shortCircuit: true };
    if (specifier === "next/server") return next("next/server.js", context);
    let local;
    if (specifier.startsWith("@/")) local = path.resolve("src", specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      local = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (local && !path.extname(local)) {
      const candidate = [`${local}.ts`, `${local}.tsx`, path.join(local, "index.ts")].find(fs.existsSync);
      if (candidate) return next(pathToFileURL(candidate).href, context);
    }
    return next(specifier, context);
  },
});
const { createCheckoutOrder } = await import("../src/features/checkout/services/checkout.ts");
const { checkOrderStatusAction, createCheckoutOrderAction, verifyCheckoutPaymentAction, resumeCheckoutAction, resumeCheckoutAttemptAction } = await import("../src/features/checkout/actions/checkout.ts");
const { addToCart, removeCartItem, updateCartItemQuantity, mergeGuestCartIntoUserCart, getOrCreateCart } = await import("../src/features/cart/services/cart.ts");
const { getCartAction } = await import("../src/features/cart/actions/cart.ts");
const { handleRazorpayWebhook, reconcilePendingPaymentEvents, reconcileCheckoutPayment, runReservationExpiryCleanup } =
  await import("../src/features/checkout/services/payment.ts");
const { POST } = await import("../src/app/api/webhooks/razorpay/route.ts");
const { logCommerceEvent } = await import("../src/lib/observability/commerce-logger.ts");

const address = {
  fullName: "Test Customer", phone: "9876543210", addressLine1: "123 Test Street",
  city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN",
};
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const guestA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const guestB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const migration = name => fs.readFileSync(`supabase/migrations/${name}`, "utf8")
  .replace(/create extension if not exists "uuid-ossp";/i, "-- unavailable WASM extension, uses native gen_random_uuid");

test("actual commerce services/actions/HTTP handler with transactional Postgres", async t => {
  const db = new PGlite();
  const originalFetch = globalThis.fetch;
  t.after(async () => { globalThis.fetch = originalFetch; hooks.deregister(); await db.close(); });
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
    alter table storage.objects enable row level security;
    create function storage.allow_any_operation(text[]) returns boolean language sql as $$ select true $$;
  `);
  await db.exec(migration("001_schema.sql"));
  await t.test("archived alternative is demonstrably incompatible with the canonical baseline", async () => {
    await assert.rejects(db.exec(fs.readFileSync("supabase/history/phase-1-alternative/20261011061713_phase_1_catalogue_auth.sql", "utf8")), /already exists/);
    await db.exec("rollback");
  });
  for (const name of [
    "20261011123446_phase_3_catalogue_boundaries.sql",
    "20261012000000_phase_4_commerce_foundation.sql",
    "20261012010000_phase_5_commerce_lifecycle.sql",
    "20261020180305_commerce_reliability.sql",
  ]) await db.exec(migration(name));
  await db.query("insert into auth.users(id) values($1),($2)", [userA, userB]);

  let gatewayCalls, gatewayFailure, failRpc, providerOrders, providerPayments, paymentFetches, paymentFetchFailure;
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  // Minimal PostgREST transport adapter: no business logic or state transitions.
  globalThis.commerceTestClient = {
    async rpc(name, args = {}) {
      try {
        if (name === failRpc) throw new Error("Injected transport failure");
        assert.match(name, /^[a-z_]+$/);
        const keys = Object.keys(args);
        const fields = keys.map((key, i) => { assert.match(key, /^[a-z_]+$/); return `${key} => $${i + 1}`; });
        const data = await scalar(`select public.${name}(${fields.join(",")})`, Object.values(args));
        return { data, error: null };
      } catch (error) { if (process.env.DEBUG_COMMERCE_TEST) console.error(name, error.message); return { data: null, error }; }
    },
    from(table) {
      assert.ok(["orders", "webhook_events", "cart_items"].includes(table));
      let columns = "*", single = false, limit = 100, ordering = "";
      const filters = [], args = [];
      const query = {
        select(value) { columns = value; return query; },
        eq(key, value) { assert.match(key, /^\w+$/); args.push(value); filters.push(`${key} = $${args.length}`); return query; },
        is(key, value) { assert.equal(value, null); filters.push(`${key} is null`); return query; },
        not(key, op, value) { assert.equal(op, "is"); assert.equal(value, null); filters.push(`${key} is not null`); return query; },
        order(key, opts) { ordering = `order by ${key} ${opts?.ascending === false ? "desc" : "asc"}`; return query; },
        limit(value) { limit = value; return query; },
        maybeSingle() { single = true; return query; },
        then(resolve, reject) {
          const sql = table === "cart_items" ? `
            select i.*, jsonb_build_object('id',v.id,'size',v.size,'color',v.color,'stock',v.stock,
              'stock_reserved',v.stock_reserved,'products',jsonb_build_object('id',p.id,'title',p.title,
              'slug',p.slug,'price_paise',p.price_paise,'is_active',p.is_active,'source',p.source,
              'categories',to_jsonb(c),'product_images','[]'::jsonb)) product_variants
            from cart_items i join product_variants v on v.id=i.variant_id
            join products p on p.id=v.product_id join categories c on c.id=p.category_id
            where i.cart_id=$1
          ` : `select ${columns} from ${table} where ${filters.join(" and ") || "true"} ${ordering} limit ${limit}`;
          return db.query(sql, args).then(result => ({ data: single ? result.rows[0] ?? null : result.rows, error: null }))
            .catch(error => ({ data: null, error })).then(resolve, reject);
        },
      };
      return query;
    },
  };
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://api.razorpay.com/v1/payments/")) {
      paymentFetches++;
      if (paymentFetchFailure) throw Error("Simulated provider outage");
      return Response.json(providerPayments.get(String(url).split("/").at(-1)) ?? null);
    }
    assert.ok(String(url).startsWith("https://api.razorpay.com/v1/orders"));
    if (options.method === "GET") return Response.json(providerOrders.get(String(url).split("/").at(-1)));
    gatewayCalls++;
    const body = JSON.parse(options.body);
    const result = { id: `order_test${gatewayCalls}`, ...body };
    providerOrders.set(result.id, result);
    if (gatewayFailure) throw new Error("Simulated lost provider response");
    return Response.json(result);
  };
  const identity = (user, token) => {
    globalThis.commerceTestUser = user ? { id: user } : null;
    globalThis.commerceTestCookies = {
      get: () => token ? { value: token } : undefined,
      set: () => { throw new Error("Cannot set cookie during render"); },
    };
  };
  const reset = async () => {
    await db.exec("truncate public.orders, public.carts, public.products, public.categories, public.webhook_events cascade");
    process.env.RAZORPAY_KEY_ID = "rzp_test_fixture";
    process.env.RAZORPAY_KEY_SECRET = "fixture-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "fixture-webhook-secret";
    process.env.CHECKOUT_MODE = "test";
    gatewayCalls = 0; gatewayFailure = false; failRpc = null; providerOrders = new Map();
    providerPayments = new Map(); paymentFetches = 0; paymentFetchFailure = false;
    identity(null, guestA);
    const category = await scalar("insert into categories(name,slug,is_active) values('Fixture','fixture',true) returning id");
    const product = await scalar("insert into products(title,slug,price_paise,is_active,source,category_id) values('Fixture','fixture',10000,true,'admin',$1) returning id", [category]);
    return (await db.query("insert into product_variants(product_id,size,color,stock) values($1,'M','Blue',10),($1,'L','Blue',10) returning id", [product])).rows.map(r => r.id);
  };
  const fill = async (context = { sessionToken: guestA }, count = 1) => {
    const variants = await reset();
    for (const variantId of variants.slice(0, count)) assert.equal((await addToCart(context, { variantId, quantity: 2 })).success, true);
    return variants;
  };
  const checkout = (context = { sessionToken: guestA }, key = randomUUID()) => createCheckoutOrder(context, address, { idempotencyKey: key });
  const signed = (order, event = "payment.captured", changes = {}, eventId = randomUUID()) => {
    const rawBody = JSON.stringify({ event, payload: { payment: { entity: {
      id: "pay_fixture", order_id: order.razorpayOrderId, amount: order.order.grandTotalPaise,
      currency: "INR", status: event === "payment.failed" ? "failed" : "captured", ...changes,
    } } } });
    return { rawBody, signature: createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex"), eventId };
  };
  const invoke = options => POST(new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST", headers: { "x-razorpay-signature": options.signature, "x-razorpay-event-id": options.eventId },
    body: options.rawBody,
  }));
  const callback = (order, changes = {}) => {
    const payment = { id: "pay_callback", order_id: order.razorpayOrderId, amount: order.order.grandTotalPaise, currency: "INR", status: "captured", captured: true, ...changes };
    providerPayments.set(payment.id, payment);
    return { orderId: order.order.id, razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: payment.id,
      razorpay_signature: createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${order.razorpayOrderId}|${payment.id}`).digest("hex") };
  };
  await t.test("browser callback requires owner, stored order, signature and provider capture", async () => {
    await fill(); const order = await checkout(); const input = callback(order, { status: "authorized", captured: false });
    identity(null, guestB);
    assert.equal((await verifyCheckoutPaymentAction(input)).isPaid, false);
    identity(null, guestA);
    assert.equal((await verifyCheckoutPaymentAction({ ...input, razorpay_signature: "0".repeat(64) })).isPaid, false);
    assert.equal((await verifyCheckoutPaymentAction({ ...input, razorpay_order_id: "order_other" })).isPaid, false);
    assert.equal(paymentFetches, 0);
    assert.equal((await verifyCheckoutPaymentAction(input)).isPaid, false);
    assert.equal(await scalar("select sum(stock_reserved)::int from product_variants"), 2);
    for (const changes of [{ amount: 1 }, { currency: "USD" }, { order_id: "order_other" }, { captured: false }]) {
      assert.equal((await verifyCheckoutPaymentAction(callback(order, changes))).isPaid, false);
    }
    assert.equal((await verifyCheckoutPaymentAction(callback(order))).isPaid, true);
    assert.equal((await verifyCheckoutPaymentAction(callback(order))).isPaid, true);
    assert.equal((await handleRazorpayWebhook(signed(order, "payment.captured", { id: "pay_callback" }))).status, "success");
    assert.equal(await scalar("select sum(stock)::int from product_variants"), 18);
    assert.equal(await scalar("select sum(stock_reserved)::int from product_variants"), 0);
  });
  await t.test("callback provider outage and interrupted inbox processing recover without duplicate stock", async () => {
    await fill(); const order = await checkout(); const input = callback(order);
    paymentFetchFailure = true;
    assert.equal((await verifyCheckoutPaymentAction(input)).isPaid, false);
    paymentFetchFailure = false; failRpc = "commerce_process_event";
    assert.equal((await verifyCheckoutPaymentAction(input)).isPaid, false);
    assert.equal(await scalar("select count(*)::int from webhook_events where processed_at is null"), 1);
    failRpc = null; await reconcilePendingPaymentEvents();
    assert.equal((await checkOrderStatusAction(order.order.id)).isPaid, true);
    assert.equal((await verifyCheckoutPaymentAction(input)).isPaid, true);
    assert.equal(await scalar("select sum(stock)::int from product_variants"), 18);
  });
  await t.test("reload and lost-response recovery remain owner-scoped and cannot reopen expired checkout", async () => {
    await fill(); const key = randomUUID(); const order = await checkout(undefined, key);
    assert.equal((await resumeCheckoutAction(order.order.id)).canPay, true);
    assert.equal((await resumeCheckoutAttemptAction(key)).order.id, order.order.id);
    identity(null, guestB);
    assert.equal(await resumeCheckoutAction(order.order.id), null);
    assert.equal(await resumeCheckoutAttemptAction(key), null);
    identity(null, guestA);
    await db.query("update orders set reservation_expires_at=now()-interval '1 minute' where id=$1", [order.order.id]);
    await db.query("update inventory_reservations set expires_at=now()-interval '1 minute' where order_id=$1", [order.order.id]);
    assert.equal((await resumeCheckoutAction(order.order.id)).canPay, false);
    await runReservationExpiryCleanup();
    assert.equal((await verifyCheckoutPaymentAction(callback(order))).isPaid, false);
    assert.equal(await scalar("select payment_status from orders"), "captured_review");
    assert.equal(await scalar("select sum(stock)::int from product_variants"), 20);
  });
  await t.test("disabling new test checkout still permits verified in-flight payment reconciliation", async () => {
    await fill(); const order = await checkout(); process.env.CHECKOUT_MODE = "disabled";
    assert.equal((await resumeCheckoutAction(order.order.id)).canPay, false);
    assert.equal((await checkout()).success, false);
    assert.equal((await handleRazorpayWebhook(signed(order))).status, "success");
    assert.equal((await checkOrderStatusAction(order.order.id)).isPaid, true);
    process.env.CHECKOUT_MODE = "test";
  });
  const failTable = async (table, operation) => db.exec(`
    create function public.inject_failure() returns trigger language plpgsql as $$ begin raise exception 'injected write failure'; end $$;
    create trigger inject_failure before ${operation} on public.${table} for each row execute function public.inject_failure();
  `);
  const clearFailure = async table => db.exec(`drop trigger inject_failure on public.${table}; drop function public.inject_failure()`);

  await t.test("guest ownership, authenticated ownership, old attached guest tokens, and render-only cart read", async () => {
    await reset();
    identity(null, null);
    assert.equal((await getCartAction()).items.length, 0);
    const userCart = await getOrCreateCart({ userId: userA, sessionToken: guestA });
    await db.query("update carts set session_token=$1 where id=$2", [guestA, userCart.id]);
    // Legacy token on a user-owned cart must never become a guest capability.
    await assert.rejects(getOrCreateCart({ sessionToken: guestA }));
    await mergeGuestCartIntoUserCart(guestA, userB);
    assert.equal(await scalar("select user_id from carts where id=$1", [userCart.id]), userA);
    await db.query("update carts set session_token=null where id=$1", [userCart.id]);
    assert.notEqual((await getOrCreateCart({ sessionToken: guestA })).id, userCart.id);
    assert.notEqual((await getOrCreateCart({ sessionToken: guestB })).id, userCart.id);
  });
  await t.test("merge rollback retains guest items, repeat merge adds quantity only once", async () => {
    await fill();
    await failTable("cart_items", "insert");
    await assert.rejects(mergeGuestCartIntoUserCart(guestA, userA));
    assert.equal(await scalar("select count(*)::int from cart_items"), 1);
    await clearFailure("cart_items");
    await Promise.all([mergeGuestCartIntoUserCart(guestA, userA), mergeGuestCartIntoUserCart(guestA, userA)]);
    assert.equal(await scalar("select qty from cart_items"), 2);
  });
  await t.test("a guest cannot update or delete another guest's item", async () => {
    await fill();
    const itemId = await scalar("select id from cart_items");
    const other = { sessionToken: guestB };
    assert.equal((await updateCartItemQuantity(other, { itemId, quantity: 5 })).success, false);
    await removeCartItem(other, { itemId });
    assert.equal(await scalar("select qty from cart_items where id=$1", [itemId]), 2);
  });
  await t.test("order status rejects other users/guests and anonymous IDs", async () => {
    await fill({ userId: userA });
    const order = await checkout({ userId: userA });
    assert.equal(order.success, true);
    for (const [user, token] of [[userB, guestA], [null, guestA], [null, null]]) {
      identity(user, token);
      assert.deepEqual(await checkOrderStatusAction(order.order.id), { found: false, isPaid: false });
    }
    identity(userA);
    assert.equal((await checkOrderStatusAction(order.order.id)).found, true);
    await fill();
    const guestOrder = await checkout();
    identity(null, guestB);
    assert.equal((await checkOrderStatusAction(guestOrder.order.id)).found, false);
    identity(null, guestA);
    assert.equal((await checkOrderStatusAction(guestOrder.order.id)).found, true);
    assert.equal((await checkOrderStatusAction({ id: guestOrder.order.id })).found, false);
  });
  await t.test("duplicate checkout actions use one order, one stock hold and one provider request", async () => {
    await fill();
    const key = randomUUID();
    const results = await Promise.all([1, 2].map(() => createCheckoutOrderAction({ shippingAddress: address, idempotencyKey: key })));
    assert.ok(results.some(r => r.success));
    const retry = await checkout(undefined, key);
    assert.equal(retry.success, true);
    assert.equal(await scalar("select count(*)::int from orders"), 1);
    assert.equal(gatewayCalls, 1);
    assert.equal(retry.order.items.length, 1);
    assert.equal(new Date(retry.order.reservationExpiresAt).toISOString(), await scalar("select reservation_expires_at::text from orders").then(x => new Date(x).toISOString()));
    assert.equal((await createCheckoutOrder({ sessionToken: guestA }, { ...address, city: "Pune" }, { idempotencyKey: key })).success, false);
    assert.equal((await checkout({ sessionToken: guestB }, key)).success, false);
  });
  for (const [table, operation] of [["order_items", "insert"], ["inventory_reservations", "insert"], ["payments", "insert"], ["cart_items", "delete"]]) {
    await t.test(`failed ${table} ${operation} rolls back the entire checkout`, async () => {
      await fill(undefined, 2);
      if (table === "inventory_reservations") {
        // Fail the second reservation after the first variant has already updated.
        await db.exec(`create function public.inject_failure() returns trigger language plpgsql as $$
          begin if (select count(*) from inventory_reservations) > 0 then raise exception 'second reservation failed'; end if; return new; end $$;
          create trigger inject_failure before insert on inventory_reservations for each row execute function public.inject_failure();`);
      } else await failTable(table, operation);
      assert.equal((await checkout()).success, false);
      assert.equal(await scalar("select count(*)::int from orders"), 0);
      assert.equal(await scalar("select count(*)::int from payments"), 0);
      assert.equal(await scalar("select sum(stock_reserved)::int from product_variants"), 0);
      assert.equal(await scalar("select count(*)::int from cart_items"), 2);
      assert.equal(gatewayCalls, 0);
      await clearFailure(table);
      assert.equal((await checkout()).success, true);
    });
  }
  await t.test("gateway is fail-closed without webhook configuration or RPC migration", async () => {
    await fill();
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    assert.equal((await checkout()).success, false);
    assert.equal(await scalar("select count(*)::int from orders"), 0);
    process.env.RAZORPAY_WEBHOOK_SECRET = "fixture-webhook-secret";
    failRpc = "commerce_prepare_checkout";
    assert.equal((await checkout()).success, false);
    assert.equal(gatewayCalls, 0);
  });
  await t.test("ambiguous gateway create is durable and recovered by verified receipt, without creating twice", async () => {
    await fill();
    gatewayFailure = true;
    const key = randomUUID();
    assert.equal((await checkout(undefined, key)).success, false);
    assert.equal((await checkout(undefined, key)).success, false);
    assert.equal(gatewayCalls, 1);
    const id = await scalar("select id from orders");
    const fake = { razorpayOrderId: "order_test1", order: { grandTotalPaise: 20000 } };
    assert.equal((await invoke(signed(fake))).status, 500);
    assert.equal(await scalar("select count(*)::int from webhook_events where processed_at is null"), 1);
    await assert.rejects(reconcileCheckoutPayment(randomUUID(), "order_test1"), /association/);
    await reconcileCheckoutPayment(id, "order_test1");
    assert.equal(await scalar("select status from orders"), "paid");
    assert.equal(await scalar("select count(*)::int from webhook_events where processed_at is null"), 0);
  });
  await t.test("failed gateway attachment never returns success and can be reconciled", async () => {
    await fill();
    await failTable("payments", "update");
    const key = randomUUID();
    assert.equal((await checkout(undefined, key)).success, false);
    await clearFailure("payments");
    assert.equal((await checkout(undefined, key)).success, false);
    assert.equal(gatewayCalls, 1);
    const id = await scalar("select id from orders");
    await reconcileCheckoutPayment(id, "order_test1");
    assert.equal((await checkout(undefined, key)).success, true);
    assert.equal(gatewayCalls, 1);
  });
  await t.test("duplicate, concurrent and out-of-order HTTP webhooks finalize stock once", async () => {
    await fill();
    const order = await checkout();
    const event = signed(order);
    const responses = await Promise.all([invoke(event), invoke(event), invoke(signed(order, "order.paid"))]);
    assert.ok(responses.every(r => r.status === 200));
    assert.equal((await invoke(signed(order, "payment.failed", { id: "pay_failedAttempt" }))).status, 200);
    assert.equal(await scalar("select status from orders"), "paid");
    assert.equal(await scalar("select count(*)::int from stock_movements where reason='SALE'"), 1);
    assert.equal(await scalar("select sum(stock)::int from product_variants"), 18);
    assert.equal((await checkOrderStatusAction(order.order.id)).isPaid, true);
  });
  await t.test("capture after failure or expired reservation requires durable review", async () => {
    for (const release of ["failed", "expired", "elapsed"]) {
      await fill();
      const order = await checkout();
      if (release === "failed") await invoke(signed(order, "payment.failed"));
      else {
        await db.exec("update inventory_reservations set expires_at=now()-interval '1 minute'");
        if (release === "expired") {
          assert.equal((await runReservationExpiryCleanup()).releasedCount, 1);
          assert.equal((await runReservationExpiryCleanup()).releasedCount, 0);
        }
      }
      assert.equal((await invoke(signed(order))).status, 200);
      assert.equal(await scalar("select payment_status from orders"), "captured_review");
      assert.equal(await scalar("select status from payments"), "CAPTURED");
      assert.equal(await scalar("select count(*)::int from stock_movements where reason='SALE'"), 0);
      assert.equal((await checkOrderStatusAction(order.order.id)).isPaid, false);
    }
  });
  await t.test("exact amount, currency, provider association and event identity are required", async () => {
    await fill();
    const order = await checkout();
    for (const patch of [{ amount: 19999 }, { amount: 20001 }, { order_id: "order_unknown" }]) {
      assert.equal((await invoke(signed(order, "payment.captured", patch))).status, 500);
    }
    assert.equal((await invoke(signed(order, "payment.captured", { currency: "USD" }))).status, 400);
    assert.equal((await invoke(signed(order, "payment.captured", { status: "failed" }))).status, 400);
    const good = signed(order);
    assert.equal((await invoke({ ...good, signature: "bad" })).status, 400);
    assert.equal(await scalar("select status from orders"), "pending");
    assert.equal((await invoke(good)).status, 200);
    assert.equal((await invoke(signed(order, "payment.captured", { id: "pay_other" }, good.eventId))).status, 500);
    assert.equal((await invoke(signed(order, "payment.captured", { id: "pay_other" }))).status, 500);
  });
  await t.test("one payment cannot pay a second order, including equal-value orders", async () => {
    const variants = await fill();
    const first = await checkout();
    assert.equal((await invoke(signed(first))).status, 200);
    await addToCart({ sessionToken: guestB }, { variantId: variants[0], quantity: 2 });
    const second = await checkout({ sessionToken: guestB });
    assert.equal((await invoke(signed(second))).status, 500);
    assert.equal(await scalar("select status from orders where id=$1", [second.order.id]), "pending");
  });
  await t.test("historical partial captures are held for review, never treated as verified success", async () => {
    await fill();
    const order = await checkout();
    await db.exec("update payments set status='CAPTURED', provider_payment_id='pay_fixture'; update orders set status='paid', payment_status='captured'");
    assert.equal((await checkOrderStatusAction(order.order.id)).isPaid, false);
    assert.equal((await invoke(signed(order))).status, 200);
    assert.equal(await scalar("select reconciliation_reason from orders"), "legacy_capture_requires_review");
    assert.equal((await checkOrderStatusAction(order.order.id)).isPaid, false);
  });
  await t.test("inbox write failure returns 500 and provider redelivery recovers", async () => {
    await fill();
    const order = await checkout();
    const event = signed(order);
    failRpc = "commerce_record_event";
    assert.equal((await invoke(event)).status, 500);
    assert.equal(await scalar("select count(*)::int from webhook_events"), 0);
    failRpc = null;
    assert.equal((await invoke(event)).status, 200);
  });
  for (const table of ["payments", "orders", "product_variants", "webhook_events"]) {
    await t.test(`failed webhook ${table} update returns 500; durable inbox replays successfully`, async () => {
      await fill();
      const order = await checkout();
      const event = signed(order);
      await failTable(table, "update");
      assert.equal((await invoke(event)).status, 500);
      assert.equal(await scalar("select status from orders"), "pending");
      assert.equal(await scalar("select status from payments"), "CREATED");
      assert.equal(await scalar("select count(*)::int from webhook_events where processed_at is null"), 1);
      assert.equal(await scalar("select count(*)::int from stock_movements where reason='SALE'"), 0);
      await clearFailure(table);
      assert.equal((await reconcilePendingPaymentEvents())[0].status, "success");
      assert.equal((await invoke(event)).status, 200);
      assert.equal(await scalar("select status from orders"), "paid");
    });
  }
  await t.test("guest mutation transport failure is not reported as success", async () => {
    const variants = await reset();
    failRpc = "commerce_mutate_cart";
    assert.equal((await addToCart({ sessionToken: guestA }, { variantId: variants[0], quantity: 1 })).success, false);
  });
  await t.test("privileged RPC grants, direct cart writes, and reserved stock are protected", async () => {
    await fill();
    await checkout();
    const functions = (await db.query(`select oid::regprocedure::text signature from pg_proc
      where pronamespace='public'::regnamespace and (proname like 'commerce_%' or proname in
      ('reserve_stock','release_stock_reservation','finalize_stock_reservation','finalize_order_stock','release_order_reservations','release_expired_stock_reservations'))`)).rows;
    for (const f of functions) {
      assert.equal(await scalar("select has_function_privilege('anon',$1,'execute')", [f.signature]), false);
      assert.equal(await scalar("select has_function_privilege('authenticated',$1,'execute')", [f.signature]), false);
      assert.equal(await scalar("select has_function_privilege('service_role',$1,'execute')", [f.signature]), true);
    }
    assert.equal(await scalar("select has_table_privilege('authenticated','public.cart_items','insert')"), false);
    await assert.rejects(db.exec("update product_variants set stock=0"), /stock_covers_reservations/);
    await assert.rejects(db.exec("delete from product_variants"), /must be retained/);
    await db.exec("set role anon");
    await assert.rejects(db.exec("select public.release_expired_stock_reservations()"), /permission denied/);
    await db.exec("reset role");
  });
  await t.test("signed malformed JSON and missing signatures cannot mutate state", async () => {
    await reset();
    const rawBody = "null";
    assert.equal((await handleRazorpayWebhook({ rawBody, signature: createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex") })).status, "invalid_payload");
    assert.equal((await POST(new Request("http://localhost", { method: "POST", body: "{}" }))).status, 400);
    assert.equal(await scalar("select count(*)::int from webhook_events"), 0);
  });
  await t.test("commerce logger strips nested, mixed-case and arbitrary provider PII", () => {
    const original = console.info;
    let text;
    console.info = value => { text = value; };
    try {
      logCommerceEvent("payment_failed", { orderId: "safe-id", sessionToken: "secret",
        rawBody: "private", nested: { phone: "1234" }, reason: "Customer email: private@example.com" });
    } finally { console.info = original; }
    assert.equal(JSON.parse(text).orderId, "safe-id");
    assert.doesNotMatch(text, /secret|private|1234|nested/);
  });
});
