import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createPhase7Database, seedPhase7Database, verifiedFixtureDetails, id } from "./fixtures/phase7-db.mjs";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    const stubs = {
      "server-only": "export {};",
      "@/lib/auth/guards": "export const requireAdmin = async () => { if (!globalThis.phase7Admin) throw new Error('Unauthorized'); };",
      "@/lib/supabase/server": "export const createServerSupabaseClient = async () => globalThis.phase7Client;",
      "next/cache": "export const revalidatePath = () => {};",
    };
    if (specifier in stubs) return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
    let local;
    if (specifier.startsWith("@/")) local = path.resolve("src", specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) local = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (local && !path.extname(local) && fs.existsSync(`${local}.ts`)) return next(pathToFileURL(`${local}.ts`).href, context);
    return next(specifier, context);
  },
});
const { productDetailsSchema, readProductDetails } = await import("../src/features/catalogue/schemas/product-details.ts");
const { adminProductSchema } = await import("../src/features/admin/schemas/admin.ts");
const { availableStock, quantityLimit, compareSizes, colourLabel, productStructuredData, serializeStructuredData } = await import("../src/features/catalogue/services/product-presentation.ts");
const { readShoppingPolicies } = await import("../src/features/catalogue/schemas/delivery.ts");
const { checkServiceability } = await import("../src/features/catalogue/services/delivery.ts");
const { catalogueImageLoader, PRODUCT_IMAGE_WIDTHS } = await import("../src/features/media/services/image-widths.ts");
const { saveProduct } = await import("../src/features/admin/actions/catalogue.ts");
const { formatPrice } = await import("../src/lib/utils/index.ts");
test.after(() => hooks.deregister());

test("INR display preserves integer paise and shows complete fractional currency", () => {
  assert.equal(formatPrice(149950), "₹1,499.50");
  assert.equal(formatPrice(149900), "₹1,499");
  assert.equal(formatPrice(149945), "₹1,499.45");
});

test("product details preserve verified facts; missing and malformed records make no claims", () => {
  assert.deepEqual(productDetailsSchema.parse(verifiedFixtureDetails), verifiedFixtureDetails);
  for (const value of [undefined, null, {}, { version: 2 }, { ...verifiedFixtureDetails, model: { height_cm: -1 } }]) {
    assert.deepEqual(readProductDetails(value), { version: 1, materials: "", care: "", fit: "", model: null, specifications: [], size_guide: null });
  }
});

test("size guide rejects partial, duplicate, impossible and unsupported fit measurements", () => {
  for (const changes of [
    { model: { height_cm: 180, wears_size: "" } },
    { fit: "Unverified fit", size_guide: null },
    { size_guide: { ...verifiedFixtureDetails.size_guide, rows: [{ size: "S", values: [0, 2] }] } },
    { size_guide: { ...verifiedFixtureDetails.size_guide, rows: [{ size: "S", values: [52] }] } },
    { size_guide: { ...verifiedFixtureDetails.size_guide, columns: ["Chest", "chest"] } },
    { size_guide: { ...verifiedFixtureDetails.size_guide, rows: [{ size: "M", values: [50, 60] }, { size: "m", values: [51, 61] }] } },
    { size_guide: { ...verifiedFixtureDetails.size_guide, instructions: " " } },
    { specifications: [{ label: "Origin", value: "" }] },
  ]) assert.equal(productDetailsSchema.safeParse({ ...verifiedFixtureDetails, ...changes }).success, false);
});

const input = () => ({
  id: id(1), title: "QA fixture — Everyday shirt", slug: "qa-reference-shirt", price_rupees: 1499.50,
  variants: [{ id: id(101), size: "S", color: "Ink", stock: 3 }, { id: id(102), size: "M", color: "Ink", stock: 20 }],
});

test("admin rejects size-guide/model sizes not present in the product and preserves omitted details", () => {
  assert.equal(adminProductSchema.parse(input()).product_details, undefined);
  assert.equal(adminProductSchema.safeParse({ ...input(), product_details: verifiedFixtureDetails }).success, true);
  assert.equal(adminProductSchema.safeParse({ ...input(), variants: [{ size: "XS", color: "Ink", stock: 0 }], product_details: verifiedFixtureDetails }).success, false);
});

test("reserved stock, quantity cap and colour labels never invent availability or swatches", () => {
  assert.equal(availableStock(5, 3), 2);
  assert.equal(availableStock(5, 9), 0);
  assert.equal(availableStock(5), 5);
  assert.equal(availableStock(NaN), 0);
  assert.equal(quantityLimit(27), 10);
  assert.equal(quantityLimit(0), 0);
  assert.equal(colourLabel("default"), "Colour not specified");
  assert.equal(colourLabel("Ink"), "Ink");
  assert.deepEqual(["XL", "S", "XXL", "M", "XS", "L"].sort(compareSizes), ["XS", "S", "M", "L", "XL", "XXL"]);
  assert.deepEqual(["38", "6", "10"].sort(compareSizes), ["6", "10", "38"]);
});

test("only configured, safe policy copy is displayed", () => {
  for (const value of [undefined, "broken", '{"delivery":{"summary":""}}', '{"returns":{"summary":"test","url":"javascript:alert(1)"}}']) assert.deepEqual(readShoppingPolicies(value), {});
  assert.deepEqual(readShoppingPolicies('{"returns":{"summary":"QA policy","url":"https://example.com/returns"}}'), { returns: { summary: "QA policy", url: "https://example.com/returns" } });
});

test("PIN serviceability distinguishes invalid, unconfigured, checked and failed states", async () => {
  assert.deepEqual(await checkServiceability({ pinCode: "000000", productId: id(1) }), { status: "invalid" });
  assert.deepEqual(await checkServiceability({ pinCode: "400001", productId: id(1) }), { status: "not-configured" });
  assert.deepEqual(await checkServiceability({ pinCode: "400001", productId: id(1) }, { check: async () => { throw Error("fixture outage"); } }), { status: "unavailable" });
  const result = { status: "not-serviceable", message: "QA fixture: unavailable" };
  assert.deepEqual(await checkServiceability({ pinCode: "400001", productId: id(1) }, { check: async () => result }), result);
});

test("responsive URLs stay on the authorized image route; structured data escapes scripts and omits offers", () => {
  for (const width of [1, 72, 390, 1280, 5000]) {
    const url = new URL(catalogueImageLoader({ src: `/catalogue-image/${id(200)}`, width }), "https://example.com");
    assert.equal(url.pathname, `/catalogue-image/${id(200)}`);
    assert.ok(PRODUCT_IMAGE_WIDTHS.includes(Number(url.searchParams.get("w"))));
  }
  const value = productStructuredData({ name: "</script><script>bad", slug: "qa", description: null, images: [], category: "Shirts", price_paise: 149950 }, "https://example.com");
  assert.equal("offers" in value, false);
  assert.equal("aggregateRating" in value, false);
  assert.equal("image" in value, false);
  assert.equal(serializeStructuredData(value).includes("<"), false);
});

test("additive migration, existing RLS and actual guarded admin save preserve product data", async t => {
  const db = await createPhase7Database();
  t.after(() => db.close());
  await seedPhase7Database(db);
  assert.equal((await db.query("select product_details from products where id=$1", [id(2)])).rows[0].product_details, null);
  for (const details of ["[]", '{"version":2}', "{}"]) await assert.rejects(db.query("update products set product_details=$1 where id=$2", [details, id(1)]), /products_details_shape/);
  await db.exec("set role anon");
  assert.equal((await db.query("select product_details from products where id=$1", [id(1)])).rows.length, 1);
  assert.equal((await db.query("select id from products where id=$1", [id(5)])).rows.length, 0);
  await assert.rejects(db.query("update products set product_details=null where id=$1", [id(1)]), /permission denied/);
  await db.exec("reset role");

  const writes = [];
  globalThis.phase7Client = {
    from(table) {
      assert.ok(["products", "product_variants", "product_images", "product_festivals"].includes(table));
      let method = "select", payload, column = "*";
      const filters = [];
      const query = {
        select(value) { column = value; return query; },
        update(value) { method = "update"; payload = value; return query; },
        insert(value) { method = "insert"; payload = value; return query; },
        delete() { method = "delete"; return query; },
        eq(key, value) { assert.match(key, /^\w+$/); filters.push([key, value]); return query; },
        then(resolve, reject) {
          const run = async () => {
            try {
              const args = [];
              let sql;
              if (method === "update") {
                writes.push(payload);
                sql = `update ${table} set ${Object.entries(payload).map(([key, value]) => { assert.match(key, /^\w+$/); args.push(value); return `${key}=$${args.length}`; }).join(",")}`;
              } else if (method === "delete") sql = `delete from ${table}`;
              else if (method === "select") sql = `select ${column} from ${table}`;
              else throw Error("Unexpected insert in update fixture");
              const where = filters.map(([key, value]) => { args.push(value); return `${key}=$${args.length}`; }).join(" and ");
              const result = await db.query(`${sql}${where ? ` where ${where}` : ""}`, args);
              return { data: result.rows, error: null };
            } catch (error) { return { data: null, error }; }
          };
          return run().then(resolve, reject);
        },
      };
      return query;
    },
  };
  globalThis.phase7Admin = false;
  await assert.rejects(saveProduct(input()), /Unauthorized/);
  assert.equal(writes.length, 0);
  globalThis.phase7Admin = true;
  const updated = { ...verifiedFixtureDetails, care: "Updated verified QA care." };
  const save = await saveProduct({ ...input(), category_id: id(900), product_details: updated });
  assert.equal(save.success, true, save.error);
  assert.equal((await db.query("select product_details from products where id=$1", [id(1)])).rows[0].product_details.care, updated.care);
  assert.equal((await saveProduct({ ...input(), category_id: id(900) })).success, true);
  assert.equal((await db.query("select product_details from products where id=$1", [id(1)])).rows[0].product_details.care, updated.care);
});
