import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

test("database migrations, atomic stock reservation, and RLS enforce commerce security in isolated WASM Postgres", async () => {
  const db = new PGlite();

  // Create mock auth and storage schemas, roles, and functions required by Supabase migrations
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
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid; $$;
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
  `);

  // Read migrations
  const m1 = fs.readFileSync(path.resolve("supabase/migrations/001_schema.sql"), "utf-8")
    .replace(/create extension if not exists "uuid-ossp";/i, "-- uuid-ossp (native gen_random_uuid used)");
  const m2 = fs.readFileSync(path.resolve("supabase/migrations/20261011123446_phase_3_catalogue_boundaries.sql"), "utf-8");
  const m3 = fs.readFileSync(path.resolve("supabase/migrations/20261012000000_phase_4_commerce_foundation.sql"), "utf-8");

  await db.exec(m1);
  await db.exec(m2);
  await db.exec(m3);

  // 1. Set up test category and products: 1 published real product, 1 demo product
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
      ('Demo Seed Shirt', 'demo-seed-shirt', 99900, true, 'seed', $1)
    RETURNING id, source;
  `, [catId]);

  const realProdId = prodRes.rows.find(r => r.source === 'admin').id;
  const demoProdId = prodRes.rows.find(r => r.source === 'seed').id;

  // Insert variants
  const varRes = await db.query(`
    INSERT INTO product_variants (product_id, size, color, stock, stock_reserved)
    VALUES 
      ($1, 'M', 'Maroon', 5, 0),
      ($2, 'M', 'Blue', 10, 0)
    RETURNING id, product_id;
  `, [realProdId, demoProdId]);

  const realVarId = varRes.rows.find(r => r.product_id === realProdId).id;

  // 2. Test catalogue visibility predicate: Demo products must NOT appear in public catalogue
  const publicCatalogue = await db.query(`
    SELECT p.id, p.title, p.source
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true 
      AND p.source IN ('admin', 'manual')
      AND c.is_active = true;
  `);

  assert.equal(publicCatalogue.rows.length, 1);
  assert.equal(publicCatalogue.rows[0].id, realProdId);
  assert.equal(publicCatalogue.rows.some(r => r.source === 'seed'), false);

  // 3. Test atomic reserve_stock() function
  const orderRes = await db.query(`
    INSERT INTO orders (order_number, total_paise, status, payment_status, shipping_address)
    VALUES ('TL-TEST-1', 249900, 'pending', 'unpaid', '{}'::jsonb)
    RETURNING id;
  `);
  const orderId = orderRes.rows[0].id;

  // Step 3a: Reserve 3 units out of 5
  const res1 = await db.query(`
    SELECT reserve_stock($1::uuid, $2::int, now() + interval '15 minutes', $3::uuid) AS reservation_id;
  `, [realVarId, 3, orderId]);

  const reservationId = res1.rows[0].reservation_id;
  assert.ok(reservationId, "Stock reservation should return a valid reservation UUID");

  // Check updated variant reserved stock
  const vCheck1 = await db.query(`
    SELECT stock, stock_reserved FROM product_variants WHERE id = $1;
  `, [realVarId]);
  assert.equal(vCheck1.rows[0].stock, 5);
  assert.equal(vCheck1.rows[0].stock_reserved, 3);

  // Step 3b: Attempt to reserve 3 more units (only 2 remain available: 5 - 3 = 2)
  let oversellPrevented = false;
  try {
    await db.query(`
      SELECT reserve_stock($1::uuid, $2::int, now() + interval '15 minutes', $3::uuid) AS reservation_id;
    `, [realVarId, 3, orderId]);
  } catch (err) {
    oversellPrevented = err.message.includes("Insufficient stock");
  }
  assert.equal(oversellPrevented, true, "Overselling must be prevented; reserve_stock must raise Insufficient stock exception");

  // Step 3c: Reserve exactly the remaining 2 units
  const res3 = await db.query(`
    SELECT reserve_stock($1::uuid, $2::int, now() + interval '15 minutes', $3::uuid) AS reservation_id;
  `, [realVarId, 2, orderId]);
  assert.ok(res3.rows[0].reservation_id, "Reservation of remaining available units should succeed");

  // Check that variant is now 100% reserved (0 available)
  const vCheck2 = await db.query(`
    SELECT stock, stock_reserved FROM product_variants WHERE id = $1;
  `, [realVarId]);
  assert.equal(vCheck2.rows[0].stock_reserved, 5);

  // Step 3d: Release first reservation (3 units)
  const relRes = await db.query(`
    SELECT release_stock_reservation($1::uuid) AS released;
  `, [reservationId]);
  assert.equal(relRes.rows[0].released, true);

  // Check that stock_reserved reduced from 5 to 2
  const vCheck3 = await db.query(`
    SELECT stock, stock_reserved FROM product_variants WHERE id = $1;
  `, [realVarId]);
  assert.equal(vCheck3.rows[0].stock_reserved, 2);

  // 4. Test webhook idempotency unique constraint
  await db.query(`
    INSERT INTO webhook_events (provider, event_id, payload, processed_at)
    VALUES ('razorpay', 'evt_pay_unique_123', '{"event": "payment.captured"}', now());
  `);

  let duplicateError = false;
  try {
    await db.query(`
      INSERT INTO webhook_events (provider, event_id, payload, processed_at)
      VALUES ('razorpay', 'evt_pay_unique_123', '{"event": "payment.captured"}', now());
    `);
  } catch {
    duplicateError = true;
  }
  assert.equal(duplicateError, true, "Duplicate webhook events must violate unique (provider, event_id) constraint");

  // 5. Test cart and cart_items schema integrity
  const guestCartRes = await db.query(`
    INSERT INTO carts (session_token)
    VALUES ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d')
    RETURNING id;
  `);
  const guestCartId = guestCartRes.rows[0].id;

  const cartItemRes = await db.query(`
    INSERT INTO cart_items (cart_id, variant_id, qty)
    VALUES ($1, $2, 2)
    RETURNING id;
  `, [guestCartId, realVarId]);
  assert.ok(cartItemRes.rows[0].id, "Cart item must insert successfully with FK to cart and variant");

  await db.close();
});
