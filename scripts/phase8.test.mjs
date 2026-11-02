import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateEnvironment } from "../src/lib/config/environment.ts";
import { isolatedEnvironment } from "./fixtures/isolated-env.mjs";
import { createPhase7Database, id } from "./fixtures/phase7-db.mjs";
import { contractDifferences } from "./schema-drift.mjs";

const local = () => isolatedEnvironment({ THREADLABZ_SUPABASE_URL: "http://127.0.0.1:54321", THREADLABZ_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture", THREADLABZ_SUPABASE_SECRET_KEY: "local_fixture" });
const staging = () => ({ ...local(), APP_ENV: "staging", VERCEL: "1", VERCEL_ENV: "preview",
  SITE_URL: "https://staging.example.invalid", SUPABASE_PROJECT_REF: "s".repeat(20), THREADLABZ_SUPABASE_URL: `https://${"s".repeat(20)}.supabase.co`,
  PRODUCTION_SUPABASE_PROJECT_REF: "p".repeat(20), PRODUCTION_SITE_URL: "https://shop.example.invalid", THREADLABZ_SUPABASE_SECRET_KEY: "sb_secret_fixture" });

test("environment isolation rejects accidental production connections and mismatched deployments", () => {
  assert.equal(validateEnvironment(isolatedEnvironment()).valid, true);
  assert.equal(validateEnvironment(local()).valid, true);
  assert.equal(validateEnvironment(staging()).valid, true);
  for (const env of [
    { ...local(), THREADLABZ_SUPABASE_URL: "https://example.supabase.co" },
    { ...staging(), APP_ENV: "local" }, { ...staging(), VERCEL_ENV: "production" },
    { ...staging(), SUPABASE_PROJECT_REF: "p".repeat(20), THREADLABZ_SUPABASE_URL: `https://${"p".repeat(20)}.supabase.co` },
    { ...staging(), SITE_URL: "https://shop.example.invalid" }, { ...staging(), SUPABASE_PROJECT_REF: "different" },
    { ...staging(), THREADLABZ_SUPABASE_SECRET_KEY: "legacy-jwt" }, { ...staging(), PRODUCTION_SUPABASE_PROJECT_REF: "" },
    { ...staging(), NEXT_PUBLIC_SERVICE_ROLE_KEY: "must-not-be-public" },
  ]) assert.equal(validateEnvironment(env).valid, false);
});

test("checkout requires explicit test configuration; live and production payments fail closed", () => {
  const enabled = { ...local(), CHECKOUT_MODE: "test", RAZORPAY_KEY_ID: "rzp_test_fixture", RAZORPAY_KEY_SECRET: "fixture", RAZORPAY_WEBHOOK_SECRET: "fixture" };
  assert.equal(validateEnvironment(enabled).checkoutEnabled, true);
  assert.equal(validateEnvironment({ ...enabled, CHECKOUT_MODE: "disabled" }).checkoutEnabled, false);
  for (const change of [{ RAZORPAY_KEY_ID: "rzp_live_fixture" }, { CHECKOUT_MODE: "live" }, { RAZORPAY_WEBHOOK_SECRET: "" }, { APP_ENV: "production" }]) {
    const result = validateEnvironment({ ...enabled, ...change }); assert.equal(result.valid, false); assert.equal(result.checkoutEnabled, false);
  }
});

test("test environment sanitization blocks inherited secrets and dotenv fallback", () => {
  const names = ["RAZORPAY_KEY_SECRET", "NEXT_PUBLIC_SERVICE_ROLE_KEY", "THREADLABZ_SUPABASE_SECRET_KEY", "VERCEL_ENV"];
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) process.env[name] = "sensitive-fixture";
    const env = isolatedEnvironment();
    for (const name of names) assert.equal(env[name], "");
    assert.equal(env.CHECKOUT_MODE, "disabled");
    assert.equal(env.THREADLABZ_SUPABASE_URL, "");
  } finally { for (const name of names) { if (before[name] === undefined) delete process.env[name]; else process.env[name] = before[name]; } }
});

test("canonical database enforces profile ownership, column grants, admin catalogue edits and hidden fixtures", async t => {
  const db = await createPhase7Database(); t.after(() => db.close());
  await db.query("insert into auth.users(id,email) values($1,'customer@example.invalid'),($2,'admin@example.invalid')", [id(980), id(981)]);
  await db.query("update profiles set role='admin' where id=$1", [id(981)]);
  await db.query("insert into categories(id,name,slug) values($1,'QA','qa')", [id(982)]);
  await db.query("insert into products(id,title,slug,price_paise,source,category_id) values($1,'QA','qa',10000,'test',$2)", [id(983), id(982)]);
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(980)]);
  await db.query("insert into profiles(id) values($1) on conflict do nothing", [id(980)]);
  await db.query("update profiles set full_name='QA customer' where id=$1", [id(980)]);
  await assert.rejects(db.query("update profiles set role='admin' where id=$1", [id(980)]), /permission denied/);
  await assert.rejects(db.query("insert into profiles(id) values($1)", [id(984)]), /row-level security/);
  assert.equal((await db.query("select count(*)::int n from products")).rows[0].n, 0);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(981)]);
  await db.query("update products set product_details=$1 where id=$2", [{ version: 1, care: "QA verified label" }, id(983)]);
  assert.equal((await db.query("select product_details from products where id=$1", [id(983)])).rows[0].product_details.care, "QA verified label");
  await db.exec("reset role; set role anon");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  assert.equal((await db.query("select count(*)::int n from products")).rows[0].n, 0);
  await assert.rejects(db.exec("select commerce_order_view(gen_random_uuid())"), /permission denied/);
});

test("existing canonical data survives Phase 6, Phase 7 and release-permission upgrades", async t => {
  const checkpoint = "20261012010000_phase_5_commerce_lifecycle.sql";
  const db = await createPhase7Database({ through: checkpoint }); t.after(() => db.close());
  await db.query("insert into auth.users(id,email) values($1,'upgrade@example.invalid')", [id(970)]);
  await db.query("insert into categories(id,name,slug) values($1,'Upgrade fixture','upgrade')", [id(971)]);
  await db.query("insert into products(id,title,slug,price_paise,source,category_id) values($1,'Existing fixture','existing',12345,'manual',$2)", [id(972), id(971)]);
  await db.query("insert into product_variants(id,product_id,size,stock) values($1,$2,'M',10)", [id(973), id(972)]);
  await db.query("insert into orders(id,user_id,total_paise,shipping_address,status) values($1,$2,12345,'{}','pending')", [id(974), id(970)]);
  const tables = ["profiles", "categories", "products", "product_variants", "orders"];
  const before = Object.fromEntries(await Promise.all(tables.map(async table => [table, (await db.query(`select * from ${table} order by id`)).rows])));
  await db.exec(fs.readFileSync("supabase/ops/upgrade-preflight.sql", "utf8"));
  for (const name of fs.readdirSync("supabase/migrations").filter(name => name.endsWith(".sql") && name > checkpoint).sort()) await db.exec(fs.readFileSync(`supabase/migrations/${name}`, "utf8"));
  for (const table of tables) {
    const rows = (await db.query(`select * from ${table} order by id`)).rows;
    assert.equal(rows.length, before[table].length);
    before[table].forEach((row, index) => { for (const key of Object.keys(row)) assert.deepEqual(rows[index][key], row[key], `${table}.${key} preserved`); });
  }
  assert.equal((await db.query("select product_details from products")).rows[0].product_details, null);
});

test("upgrade preflight rejects data hazards and unknown migration history without repairs", async t => {
  const db = await createPhase7Database({ through: "20261012010000_phase_5_commerce_lifecycle.sql" }); t.after(() => db.close());
  await db.query("insert into auth.users(id) values($1)", [id(960)]);
  await db.query("insert into carts(user_id) values($1),($1)", [id(960)]);
  await assert.rejects(db.exec(fs.readFileSync("supabase/ops/upgrade-preflight.sql", "utf8")), /Duplicate customer carts/);
  await db.exec("rollback");
  assert.equal((await db.query("select count(*)::int n from carts")).rows[0].n, 2);
  await db.exec("truncate carts cascade; insert into supabase_migrations.schema_migrations values('20261011061713','phase_1_catalogue_auth')");
  await assert.rejects(db.exec(fs.readFileSync("supabase/ops/upgrade-preflight.sql", "utf8")), /alternative/i);
  await db.exec("rollback");
});

test("schema drift detection identifies changed policies, functions and privileges", () => {
  const expected = JSON.parse(fs.readFileSync("supabase/schema-contract.json", "utf8"));
  assert.deepEqual(contractDifferences(expected, structuredClone(expected)), []);
  assert.deepEqual(contractDifferences({ functions: "select 'two  spaces'" }, { functions: "select 'two spaces'" }), ["functions"]);
  for (const key of ["policies", "functions", "tableGrants", "columnGrants", "columns", "productBucket"]) {
    const changed = structuredClone(expected); changed[key] = null;
    assert.deepEqual(contractDifferences(expected, changed), [key]);
  }
});
