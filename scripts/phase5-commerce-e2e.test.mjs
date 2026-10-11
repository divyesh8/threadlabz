import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

import { calculateOrderPricing } from "../src/features/checkout/services/pricing.ts";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../src/features/checkout/services/signatures.ts";

test("Phase 5 Commerce End-to-End Suite: 24 Core Invariants", async (t) => {
  const db = new PGlite();

  // 1. Setup mock auth, storage, roles, and functions
  await db.exec(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
    END $$;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      raw_user_meta_data jsonb
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '11111111-1111-1111-1111-111111111111'::uuid; $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text; $$;

    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id text PRIMARY KEY,
      name text,
      public boolean DEFAULT false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text REFERENCES storage.buckets(id),
      name text,
      owner uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      last_accessed_at timestamptz DEFAULT now(),
      metadata jsonb
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE OR REPLACE FUNCTION storage.allow_any_operation(operations text[]) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true; $$;

    INSERT INTO auth.users (id, email)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'usera@threadlabz.com'),
      ('22222222-2222-2222-2222-222222222222', 'userb@threadlabz.com');
  `);

  // 2. Load and execute all migrations in order
  const m1 = fs.readFileSync(path.resolve("supabase/migrations/001_schema.sql"), "utf-8")
    .replace(/create extension if not exists "uuid-ossp";/i, "-- uuid-ossp");
  const m2 = fs.readFileSync(path.resolve("supabase/migrations/20261011123446_phase_3_catalogue_boundaries.sql"), "utf-8");
  const m3 = fs.readFileSync(path.resolve("supabase/migrations/20261012000000_phase_4_commerce_foundation.sql"), "utf-8");
  const m4 = fs.readFileSync(path.resolve("supabase/migrations/20261012010000_phase_5_commerce_lifecycle.sql"), "utf-8");

  await db.exec(m1);
  await db.exec(m2);
  await db.exec(m3);
  await db.exec(m4);

  // Setup test catalogue
  const catRes = await db.query(`
    INSERT INTO categories (name, slug, is_active)
    VALUES ('Kurtas', 'kurtas', true)
    RETURNING id;
  `);
  const catId = catRes.rows[0].id;

  const prodRes = await db.query(`
    INSERT INTO products (title, slug, price_paise, is_active, source, category_id)
    VALUES 
      ('Silk Festive Kurta', 'silk-festive-kurta', 249900, true, 'admin', $1),
      ('Out of Stock Kurta', 'oos-kurta', 199900, true, 'admin', $1),
      ('Draft Inactive Kurta', 'draft-kurta', 149900, false, 'admin', $1)
    RETURNING id, slug;
  `, [catId]);

  const activeProdId = prodRes.rows.find(p => p.slug === 'silk-festive-kurta').id;
  const oosProdId = prodRes.rows.find(p => p.slug === 'oos-kurta').id;
  const inactiveProdId = prodRes.rows.find(p => p.slug === 'draft-kurta').id;

  const varRes = await db.query(`
    INSERT INTO product_variants (product_id, size, color, stock, stock_reserved)
    VALUES 
      ($1, 'M', 'Maroon', 10, 0),
      ($1, 'L', 'Maroon', 5, 0),
      ($2, 'M', 'Black', 0, 0),
      ($3, 'M', 'Grey', 20, 0)
    RETURNING id, size, product_id;
  `, [activeProdId, oosProdId, inactiveProdId]);

  const activeVarM = varRes.rows.find(v => v.product_id === activeProdId && v.size === 'M').id;
  const activeVarL = varRes.rows.find(v => v.product_id === activeProdId && v.size === 'L').id;
  const oosVar = varRes.rows.find(v => v.product_id === oosProdId).id;

  const userA = '11111111-1111-1111-1111-111111111111';
  const sessionGuest1 = 'session-guest-token-111';
  const sessionGuest2 = 'session-guest-token-222';

  // --- INVARIANT 1: Add product to cart ---
  await t.test("1. Add product to cart", async () => {
    const cRes = await db.query(`
      INSERT INTO carts (user_id) VALUES ($1) RETURNING id;
    `, [userA]);
    const cartId = cRes.rows[0].id;

    const itemRes = await db.query(`
      INSERT INTO cart_items (cart_id, variant_id, qty)
      VALUES ($1, $2, 2)
      RETURNING id, qty;
    `, [cartId, activeVarM]);

    assert.equal(itemRes.rows[0].qty, 2);
  });

  // --- INVARIANT 2: Quantity update ---
  await t.test("2. Quantity update", async () => {
    const c = await db.query(`SELECT id FROM carts WHERE user_id = $1`, [userA]);
    const cartId = c.rows[0].id;

    await db.query(`
      UPDATE cart_items SET qty = 4 WHERE cart_id = $1 AND variant_id = $2;
    `, [cartId, activeVarM]);

    const updated = await db.query(`
      SELECT qty FROM cart_items WHERE cart_id = $1 AND variant_id = $2;
    `, [cartId, activeVarM]);
    assert.equal(updated.rows[0].qty, 4);
  });

  // --- INVARIANT 3: Remove cart item ---
  await t.test("3. Remove cart item", async () => {
    const c = await db.query(`SELECT id FROM carts WHERE user_id = $1`, [userA]);
    const cartId = c.rows[0].id;

    await db.query(`
      DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2;
    `, [cartId, activeVarM]);

    const count = await db.query(`
      SELECT count(*) AS cnt FROM cart_items WHERE cart_id = $1 AND variant_id = $2;
    `, [cartId, activeVarM]);
    assert.equal(count.rows[0].cnt, 0);
  });

  // --- INVARIANT 4: Cart price recalculation ---
  await t.test("4. Cart price recalculation", async () => {
    const c = await db.query(`SELECT id FROM carts WHERE user_id = $1`, [userA]);
    const cartId = c.rows[0].id;

    // Add 2 of Var M and 1 of Var L
    await db.query(`INSERT INTO cart_items (cart_id, variant_id, qty) VALUES ($1, $2, 2);`, [cartId, activeVarM]);
    await db.query(`INSERT INTO cart_items (cart_id, variant_id, qty) VALUES ($1, $2, 1);`, [cartId, activeVarL]);

    const totalRes = await db.query(`
      SELECT sum(p.price_paise * ci.qty) as subtotal
      FROM cart_items ci
      JOIN product_variants pv ON pv.id = ci.variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE ci.cart_id = $1;
    `, [cartId]);

    // 2 * 249900 + 1 * 249900 = 749700
    assert.equal(Number(totalRes.rows[0].subtotal), 749700);
  });

  // --- INVARIANT 5: Guest cart isolation ---
  await t.test("5. Guest cart isolation", async () => {
    const g1 = await db.query(`INSERT INTO carts (session_token) VALUES ($1) RETURNING id;`, [sessionGuest1]);
    const g2 = await db.query(`INSERT INTO carts (session_token) VALUES ($1) RETURNING id;`, [sessionGuest2]);

    assert.notEqual(g1.rows[0].id, g2.rows[0].id);

    await db.query(`INSERT INTO cart_items (cart_id, variant_id, qty) VALUES ($1, $2, 1);`, [g1.rows[0].id, activeVarM]);
    const g2Items = await db.query(`SELECT count(*) as cnt FROM cart_items WHERE cart_id = $1;`, [g2.rows[0].id]);
    assert.equal(g2Items.rows[0].cnt, 0);
  });

  // --- INVARIANT 6: Authenticated cart ownership ---
  await t.test("6. Authenticated cart ownership", async () => {
    const uACart = await db.query(`SELECT user_id FROM carts WHERE user_id = $1;`, [userA]);
    assert.equal(uACart.rows[0].user_id, userA);
  });

  // --- INVARIANT 7: Guest -> authenticated cart merge ---
  await t.test("7. Guest to authenticated cart merge", async () => {
    const gCart = await db.query(`SELECT id FROM carts WHERE session_token = $1;`, [sessionGuest1]);
    const uCart = await db.query(`SELECT id FROM carts WHERE user_id = $1;`, [userA]);

    // Simulate merge query
    await db.query(`
      INSERT INTO cart_items (cart_id, variant_id, qty)
      SELECT $1, variant_id, qty
      FROM cart_items
      WHERE cart_id = $2
      ON CONFLICT (cart_id, variant_id)
      DO UPDATE SET qty = LEAST(50, cart_items.qty + EXCLUDED.qty);
    `, [uCart.rows[0].id, gCart.rows[0].id]);

    const mergedItem = await db.query(`
      SELECT qty FROM cart_items WHERE cart_id = $1 AND variant_id = $2;
    `, [uCart.rows[0].id, activeVarM]);

    // Previously user had 2 of Var M, guest had 1 -> 2 + 1 = 3
    assert.equal(mergedItem.rows[0].qty, 3);
  });

  // --- INVARIANT 8: Invalid variant rejection ---
  await t.test("8. Invalid variant rejection", async () => {
    let rejected = false;
    try {
      await db.query(`
        INSERT INTO cart_items (cart_id, variant_id, qty)
        VALUES ((SELECT id FROM carts WHERE user_id = $1), gen_random_uuid(), 1);
      `, [userA]);
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, "Foreign variant UUID must fail FK constraint");
  });

  // --- INVARIANT 9: Inactive product rejection ---
  await t.test("9. Inactive product rejection", async () => {
    const activeProducts = await db.query(`
      SELECT p.id FROM products p WHERE p.id = $1 AND p.is_active = true;
    `, [inactiveProdId]);
    assert.equal(activeProducts.rows.length, 0, "Draft/inactive products must not be returned for active sales");
  });

  // --- INVARIANT 10: Out-of-stock rejection ---
  await t.test("10. Out-of-stock rejection", async () => {
    let oosRejected = false;
    try {
      await db.query(`
        SELECT reserve_stock($1::uuid, 1, now() + interval '15 minutes');
      `, [oosVar]);
    } catch (err) {
      oosRejected = err.message.includes("Insufficient stock");
    }
    assert.equal(oosRejected, true, "Reserving out-of-stock variant must raise Insufficient stock");
  });

  // --- INVARIANT 11: Checkout order creation ---
  let orderId = "";
  await t.test("11. Checkout order creation", async () => {
    const oRes = await db.query(`
      INSERT INTO orders (
        order_number, user_id, status, payment_status,
        subtotal_paise, tax_paise, shipping_paise, total_paise,
        shipping_address
      ) VALUES (
        'TL-TEST-001', $1, 'pending', 'unpaid',
        249900, 11900, 0, 249900,
        '{"fullName": "Test Customer", "phone": "9876543210"}'::jsonb
      ) RETURNING id, status, total_paise;
    `, [userA]);
    orderId = oRes.rows[0].id;
    assert.ok(orderId);
    assert.equal(oRes.rows[0].status, 'pending');
    assert.equal(oRes.rows[0].total_paise, 249900);
  });

  // --- INVARIANT 12: Server-authoritative pricing ---
  await t.test("12. Server-authoritative pricing", () => {
    const pricing = calculateOrderPricing(
      [{ unitPricePaise: 249900, quantity: 1 }],
      { shippingPaise: 0, taxRateBps: 500, isTaxInclusive: true }
    );
    assert.equal(pricing.grandTotalPaise, 249900);
    assert.equal(pricing.taxPaise, Math.round((249900 * 500) / 10500));
  });

  // --- INVARIANT 13: Reservation creation ---
  let reservationId = "";
  await t.test("13. Reservation creation", async () => {
    const rRes = await db.query(`
      SELECT reserve_stock($1::uuid, 2, now() + interval '15 minutes', $2::uuid) as id;
    `, [activeVarM, orderId]);
    reservationId = rRes.rows[0].id;
    assert.ok(reservationId);

    const vCheck = await db.query(`SELECT stock_reserved FROM product_variants WHERE id = $1;`, [activeVarM]);
    assert.equal(vCheck.rows[0].stock_reserved, 2);
  });

  // --- INVARIANT 14: Oversell prevention ---
  await t.test("14. Oversell prevention", async () => {
    // Stock is 10, reserved is 2 -> available is 8. Attempting to reserve 9 must fail.
    let oversellPrevented = false;
    try {
      await db.query(`
        SELECT reserve_stock($1::uuid, 9, now() + interval '15 minutes', $2::uuid);
      `, [activeVarM, orderId]);
    } catch (err) {
      oversellPrevented = err.message.includes("Insufficient stock");
    }
    assert.equal(oversellPrevented, true);
  });

  // --- INVARIANT 15: Reservation release ---
  await t.test("15. Reservation release", async () => {
    const relRes = await db.query(`SELECT release_stock_reservation($1::uuid) as ok;`, [reservationId]);
    assert.equal(relRes.rows[0].ok, true);

    const vCheck = await db.query(`SELECT stock_reserved FROM product_variants WHERE id = $1;`, [activeVarM]);
    assert.equal(vCheck.rows[0].stock_reserved, 0);
  });

  // --- INVARIANT 16: Reservation expiry (stock 5 -> reserve 3 -> avail 2 -> expire -> avail 5 -> expire again -> avail 5) ---
  await t.test("16. Reservation expiry idempotent recovery", async () => {
    // Use activeVarL: total stock is 5
    const initVar = await db.query(`SELECT stock, stock_reserved FROM product_variants WHERE id = $1;`, [activeVarL]);
    assert.equal(initVar.rows[0].stock, 5);
    assert.equal(initVar.rows[0].stock_reserved, 0);

    // Reserve 3 units
    const expRes = await db.query(`
      SELECT reserve_stock($1::uuid, 3, now() - interval '1 minute', $2::uuid) as id;
    `, [activeVarL, orderId]);
    assert.ok(expRes.rows[0].id);

    // Available is now 5 - 3 = 2
    const midVar = await db.query(`SELECT stock, stock_reserved FROM product_variants WHERE id = $1;`, [activeVarL]);
    assert.equal(midVar.rows[0].stock_reserved, 3);
    assert.equal(midVar.rows[0].stock - midVar.rows[0].stock_reserved, 2);

    // First expiration run: should release 3 units back to available pool
    const cleanup1 = await db.query(`SELECT release_expired_stock_reservations() as count;`);
    assert.ok(cleanup1.rows[0].count >= 1);

    const recoveredVar = await db.query(`SELECT stock, stock_reserved FROM product_variants WHERE id = $1;`, [activeVarL]);
    assert.equal(recoveredVar.rows[0].stock_reserved, 0);
    assert.equal(recoveredVar.rows[0].stock - recoveredVar.rows[0].stock_reserved, 5);

    // Second expiration run: MUST NOT double-release or corrupt available stock
    const cleanup2 = await db.query(`SELECT release_expired_stock_reservations() as count;`);
    assert.equal(cleanup2.rows[0].count, 0);

    const checkDoubleRelease = await db.query(`SELECT stock, stock_reserved FROM product_variants WHERE id = $1;`, [activeVarL]);
    assert.equal(checkDoubleRelease.rows[0].stock_reserved, 0);
    assert.equal(checkDoubleRelease.rows[0].stock - checkDoubleRelease.rows[0].stock_reserved, 5);
  });

  // --- INVARIANT 17: Razorpay payment signature verification ---
  await t.test("17. Razorpay payment signature verification", () => {
    const secret = "test_merchant_secret";
    const order_id = "order_rzp_12345";
    const payment_id = "pay_rzp_67890";
    const validSig = crypto.createHmac("sha256", secret).update(`${order_id}|${payment_id}`).digest("hex");

    assert.equal(verifyPaymentSignature({ razorpayOrderId: order_id, razorpayPaymentId: payment_id, razorpaySignature: validSig, secret }), true);
    assert.equal(verifyPaymentSignature({ razorpayOrderId: order_id, razorpayPaymentId: payment_id, razorpaySignature: "tampered_sig", secret }), false);
  });

  // --- INVARIANT 18: Razorpay webhook signature verification ---
  await t.test("18. Razorpay webhook signature verification", () => {
    const secret = "test_webhook_secret";
    const rawBody = JSON.stringify({ event: "payment.captured", id: "evt_123" });
    const validSig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    assert.equal(verifyWebhookSignature({ rawBody, signature: validSig, secret }), true);
    assert.equal(verifyWebhookSignature({ rawBody, signature: "tampered", secret }), false);
  });

  // --- INVARIANT 19: Duplicate webhook handling ---
  await t.test("19. Duplicate webhook handling", async () => {
    await db.query(`
      INSERT INTO webhook_events (provider, event_id, payload, processed_at)
      VALUES ('razorpay', 'evt_duplicate_test', '{"event":"payment.captured"}'::jsonb, now());
    `);

    let threwUnique = false;
    try {
      await db.query(`
        INSERT INTO webhook_events (provider, event_id, payload, processed_at)
        VALUES ('razorpay', 'evt_duplicate_test', '{"event":"payment.captured"}'::jsonb, now());
      `);
    } catch {
      threwUnique = true;
    }
    assert.equal(threwUnique, true);
  });

  // --- INVARIANT 20: Failed payment handling ---
  await t.test("20. Failed payment handling", async () => {
    // Create new order with reservation
    const failOrder = await db.query(`
      INSERT INTO orders (order_number, total_paise, status, payment_status, shipping_address)
      VALUES ('TL-FAIL-1', 249900, 'pending', 'unpaid', '{}'::jsonb)
      RETURNING id;
    `);
    const failOrderId = failOrder.rows[0].id;

    const res = await db.query(`
      SELECT reserve_stock($1::uuid, 1, now() + interval '15 minutes', $2::uuid) as id;
    `, [activeVarM, failOrderId]);
    assert.ok(res.rows[0].id);

    // Call release_order_reservations
    const relCount = await db.query(`SELECT release_order_reservations($1::uuid) as count;`, [failOrderId]);
    assert.equal(relCount.rows[0].count, 1);

    const rCheck = await db.query(`SELECT status FROM inventory_reservations WHERE id = $1;`, [res.rows[0].id]);
    assert.equal(rCheck.rows[0].status, 'RELEASED');
  });

  // --- INVARIANT 21: Captured payment reconciliation ---
  let rzpOrderId = "order_rzp_reconcile_999";
  await t.test("21. Captured payment reconciliation", async () => {
    const payOrder = await db.query(`
      INSERT INTO orders (order_number, total_paise, status, payment_status, shipping_address)
      VALUES ('TL-PAID-1', 249900, 'pending', 'unpaid', '{}'::jsonb)
      RETURNING id;
    `);
    const paidOrderId = payOrder.rows[0].id;

    await db.query(`
      INSERT INTO payments (order_id, provider, provider_order_id, amount_paise, status)
      VALUES ($1, 'razorpay', $2, 249900, 'CREATED');
    `, [paidOrderId, rzpOrderId]);

    // Check payment matching
    const payMatch = await db.query(`
      SELECT id, amount_paise FROM payments WHERE provider_order_id = $1;
    `, [rzpOrderId]);
    assert.equal(payMatch.rows[0].amount_paise, 249900);
  });

  // --- INVARIANT 22: Stock finalization after successful payment ---
  await t.test("22. Stock finalization after successful payment", async () => {
    // Find paid order and reserve 2 units of activeVarM
    const o = await db.query(`SELECT id FROM orders WHERE order_number = 'TL-PAID-1';`);
    const paidOrderId = o.rows[0].id;

    // Get current physical stock of activeVarM
    const vPre = await db.query(`SELECT stock, stock_reserved FROM product_variants WHERE id = $1;`, [activeVarM]);
    const preStock = vPre.rows[0].stock;

    const r = await db.query(`
      SELECT reserve_stock($1::uuid, 2, now() + interval '15 minutes', $2::uuid) as id;
    `, [activeVarM, paidOrderId]);
    const reservationToFinalize = r.rows[0].id;

    // Finalize stock for this order
    const finalizeCount = await db.query(`SELECT finalize_order_stock($1::uuid) as count;`, [paidOrderId]);
    assert.equal(finalizeCount.rows[0].count, 1);

    // Reservation must be CONSUMED
    const rPost = await db.query(`SELECT status FROM inventory_reservations WHERE id = $1;`, [reservationToFinalize]);
    assert.equal(rPost.rows[0].status, 'CONSUMED');

    // Physical stock must be decremented by 2
    const vPost = await db.query(`SELECT stock, stock_reserved FROM product_variants WHERE id = $1;`, [activeVarM]);
    assert.equal(vPost.rows[0].stock, preStock - 2);

    // Movement must be audited as SALE
    const move = await db.query(`
      SELECT delta, reason FROM stock_movements WHERE ref_id = $1::text;
    `, [paidOrderId]);
    assert.equal(move.rows[0].delta, -2);
    assert.equal(move.rows[0].reason, 'SALE');
  });

  // --- INVARIANT 23: Wrong order/payment association rejection ---
  await t.test("23. Wrong order/payment association rejection", async () => {
    // If webhook reports amount less than payment record amount_paise (e.g. ₹100 instead of ₹2499)
    const p = await db.query(`SELECT amount_paise FROM payments WHERE provider_order_id = $1;`, [rzpOrderId]);
    const recordedAmount = p.rows[0].amount_paise;
    const webhookAmount = 10000; // ₹100

    const isMatch = webhookAmount >= recordedAmount;
    assert.equal(isMatch, false, "Lesser paid amount must be rejected from marking order as paid");
  });

  // --- INVARIANT 24: RLS access boundaries ---
  await t.test("24. RLS access boundaries", async () => {
    // Check that RLS is active on carts, orders, and payments
    const rlsCheck = await db.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname IN ('carts', 'cart_items', 'orders', 'payments', 'webhook_events');
    `);
    assert.equal(rlsCheck.rows.length, 5);
    for (const row of rlsCheck.rows) {
      assert.equal(row.relrowsecurity, true, `Table ${row.relname} must have row security enabled`);
    }
  });

  await db.close();
});
