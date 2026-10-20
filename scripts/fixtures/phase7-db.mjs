import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Disposable in-memory PostgreSQL, using the same explicitly reviewed baseline
// as commerce-reliability.test.mjs. No hosted database or app fixture fallback.
export async function createPhase7Database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
    alter table storage.objects enable row level security;
    create function storage.allow_any_operation(text[]) returns boolean language sql as $$ select true $$;
  `);
  for (const name of [
    "001_schema.sql", "20261011123446_phase_3_catalogue_boundaries.sql",
    "20261012000000_phase_4_commerce_foundation.sql", "20261012010000_phase_5_commerce_lifecycle.sql",
    "20261020180305_commerce_reliability.sql", "20261020182652_phase_7_product_details.sql",
  ]) await db.exec(fs.readFileSync(`supabase/migrations/${name}`, "utf8").replace(/create extension if not exists "uuid-ossp";/i, ""));
  return db;
}

export const id = n => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const verifiedFixtureDetails = {
  version: 1,
  materials: "QA fixture only: 100% cotton.",
  care: "QA fixture only: wash at 30°C. Do not tumble dry.",
  fit: "QA fixture only: straight fit. See the garment measurements.",
  model: { height_cm: 180, wears_size: "M" },
  specifications: [{ label: "Construction", value: "QA fixture: button front" }],
  size_guide: {
    unit: "cm", kind: "garment", instructions: "QA fixture only. Garment laid flat; chest measured across the front.",
    columns: ["Chest width", "Length"], rows: [{ size: "S", values: [50, 68] }, { size: "M", values: [53, 70] }],
  },
};

export async function seedPhase7Database(db) {
  await db.query("insert into categories(id,name,slug,is_active) values($1,'Shirts','shirts',true),($2,'Hidden','hidden',false)", [id(900), id(901)]);
  const products = [
    [1, "qa-reference-shirt", "QA fixture — Everyday shirt", 149950, true, "manual", id(900), verifiedFixtureDetails],
    [2, "qa-minimal", "QA fixture — Minimal information", 0, true, "admin", id(900), null],
    [3, "qa-reserved", "QA fixture — Unavailable sizes", 125000, true, "admin", id(900), null],
    [4, "qa-no-variants", "QA fixture — No variants", 85000, true, "admin", id(900), null],
    [5, "qa-seed", "Hidden seed", 10000, true, "seed", id(900), null],
    [6, "qa-inactive", "Hidden inactive", 10000, false, "admin", id(900), null],
    [7, "qa-category-inactive", "Hidden category", 10000, true, "admin", id(901), null],
  ];
  for (const [number, slug, title, price, active, source, category, details] of products) {
    await db.query("insert into products(id,slug,title,price_paise,is_active,source,category_id,product_details,description) values($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [id(number), slug, title, price, active, source, category, details, number === 1 ? "Isolated QA fixture. Reference photography and product facts are used only to test this local experience. They are not catalogue inventory." : null]);
  }
  for (const [number, size, colour, stock, reserved] of [
    [100, "XS", "Ink", 0, 0], [101, "S", "Ink", 3, 1], [102, "M", "Ink", 20, 0],
    [103, "L", "Ink", 4, 4], [104, "M", "Stone", 0, 0], [105, "M", "Red", 8, 0],
  ]) await db.query("insert into product_variants(id,product_id,size,color,stock,stock_reserved) values($1,$2,$3,$4,$5,$6)", [id(number), id(1), size, colour, stock, reserved]);
  await db.query("insert into product_variants(id,product_id,size,color,stock,stock_reserved) values($1,$2,'Free Size','default',1,0),($3,$4,'M','default',2,2)", [id(110), id(2), id(111), id(3)]);
  for (const [number, product, photo] of [[200, 1, 0], [201, 1, 1], [202, 3, 0], [203, 5, 0]]) {
    await db.query("insert into product_images(id,product_id,url,alt,sort_order,is_primary) values($1,$2,$3,$4,$5,$6)", [id(number), id(product), `uploads/photo-${photo}.jpg`, `QA reference photograph ${photo + 1}`, photo, photo === 0]);
  }
}
