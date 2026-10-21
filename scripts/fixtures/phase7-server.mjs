import http from "node:http";
import fs from "node:fs";
import assert from "node:assert/strict";
import { id } from "./phase7-db.mjs";

export const publicKey = "sb_publishable_phase7_local_fixture";
export const privateKey = "phase7_local_service_fixture";
export const fixtureUser = { id: id(999), aud: "authenticated", role: "authenticated", email: "qa@example.invalid", app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
export const fixtureToken = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: fixtureUser.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"), "local-fixture-only"].join(".");

export async function createFixtureServer(db, { checkout = false, onRequest } = {}) {
  await db.query("insert into auth.users(id,email) values($1,$2)", [fixtureUser.id, fixtureUser.email]);
  await db.query("update profiles set role='admin' where id=$1", [fixtureUser.id]);
  const state = { mode: "ready", asset: "valid", imageDelay: 0, productDelay: 0, cartDelay: 0, failCart: false, requests: [], failures: [] };
  const photographs = [fs.readFileSync("public/images/previews/men-3.jpg"), fs.readFileSync("public/images/previews/men-4.jpg")];
  const visible = "p.is_active and p.source in ('manual','admin') and c.is_active";
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const q = url.searchParams;
    const send = (data, status = 200) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    };
    const body = async () => { let value = ""; for await (const chunk of req) value += chunk; return JSON.parse(value || "{}"); };
    const rows = data => send(req.headers.accept?.includes("vnd.pgrst.object") ? data[0] ?? null : data);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
      state.requests.push({ path: url.pathname, method: req.method, query: url.search });
      if (onRequest && await onRequest({ req, res, url, send, body })) return;
      if (url.pathname === "/auth/v1/user") {
        return req.headers.authorization === `Bearer ${fixtureToken}` ? send(fixtureUser) : send({ message: "No fixture session" }, 401);
      }
      if (url.pathname.startsWith("/storage/v1/object/")) {
        await delay(state.imageDelay);
        if (state.asset === "inaccessible") return send({ message: "Fixture image unavailable" }, 403);
        res.setHeader("Content-Type", state.asset === "corrupt" ? "image/png" : "image/jpeg");
        return res.end(state.asset === "corrupt" ? Buffer.from("<html>fixture invalid image</html>") : photographs[url.pathname.includes("photo-1") ? 1 : 0]);
      }
      if (!url.pathname.startsWith("/rest/v1/")) return send({ message: "Fixture endpoint missing" }, 404);
      // Boolean assertions deliberately avoid printing request credentials.
      assert.ok([publicKey, privateKey].includes(req.headers.apikey), "Only fixture keys are allowed");
      const table = url.pathname.split("/").at(-1);
      if (url.pathname.includes("/rpc/")) {
        assert.ok(req.headers.apikey === privateKey, "RPC must use the server-side fixture key");
        assert.ok(["commerce_cart", "commerce_mutate_cart", "commerce_merge_cart", ...(checkout ? ["commerce_prepare_checkout", "commerce_claim_gateway", "commerce_attach_gateway", "commerce_order_view", "commerce_record_event", "commerce_process_event"] : [])].includes(table));
        await delay(state.cartDelay);
        if (state.failCart) return send({ message: "Fixture cart outage" }, 503);
        const args = await body(), values = Object.values(args);
        const fields = Object.keys(args).map((key, i) => { assert.match(key, /^p_[a-z_]+$/); return `${key} => $${i + 1}`; });
        try {
          const result = await db.query(`select public.${table}(${fields.join(",")}) result`, values);
          return send(result.rows[0].result);
        } catch { return send({ message: "Fixture stock validation rejected cart update" }, 409); }
      }
      if (table === "cart_items") {
        assert.ok(req.headers.apikey === privateKey);
        const result = await db.query(`
          select i.*, jsonb_build_object('id',v.id,'size',v.size,'color',v.color,'stock',v.stock,
          'stock_reserved',v.stock_reserved,'product_id',v.product_id,'sku',v.sku,
          'products',jsonb_build_object('id',p.id,'title',p.title,'slug',p.slug,'price_paise',p.price_paise,
          'source',p.source,'is_active',p.is_active,'categories',to_jsonb(c),'product_images','[]'::jsonb)) product_variants
          from cart_items i join product_variants v on v.id=i.variant_id
          join products p on p.id=v.product_id join categories c on c.id=p.category_id where i.cart_id=$1
        `, [q.get("cart_id").slice(3)]);
        return rows(result.rows);
      }
      if (checkout && table === "orders") {
        assert.ok(req.headers.apikey === privateKey);
        if (state.failOrders) return send({ message: "Fixture order lookup outage" }, 503);
        const columns = q.get("select"); assert.match(columns, /^[a-z_, ]+$/);
        const args = [], clauses = [];
        for (const [key, value] of q) {
          if (key === "select") continue;
          assert.ok(["id", "user_id", "guest_token_hash", "idempotency_key"].includes(key));
          if (value === "is.null") clauses.push(`${key} is null`);
          else { assert.ok(value.startsWith("eq.")); args.push(value.slice(3)); clauses.push(`${key}=$${args.length}`); }
        }
        return rows((await db.query(`select ${columns} from orders where ${clauses.join(" and ")}`, args)).rows);
      }
      const isAdmin = req.headers.authorization === `Bearer ${fixtureToken}`;
      if (req.method !== "GET" && req.method !== "HEAD") {
        assert.ok(isAdmin, "Fixture mutations require a signed-in admin");
        assert.ok(["products", "product_variants", "product_images", "product_festivals"].includes(table));
        const data = req.method === "DELETE" ? {} : await body();
        const args = [], where = [];
        for (const [key, value] of q) {
          assert.match(key, /^\w+$/); assert.ok(value.startsWith("eq."));
          args.push(value.slice(3)); where.push(`${key}=$${args.length}`);
        }
        if (req.method === "PATCH") {
          const columns = Object.entries(data).map(([key, value]) => { assert.match(key, /^\w+$/); args.push(value); return `${key}=$${args.length}`; });
          await db.query(`update ${table} set ${columns.join(",")} where ${where.join(" and ")}`, args);
        } else if (req.method === "DELETE") await db.query(`delete from ${table} where ${where.join(" and ")}`, args);
        else throw Error("Unexpected fixture insert");
        return send(null);
      }
      if (table === "profiles") return rows((await db.query("select * from profiles where id=$1", [fixtureUser.id])).rows);
      if (state.mode === "failure") return send({ message: "Fixture catalogue outage" }, 503);
      if (table === "categories") return rows((await db.query(`select * from categories ${isAdmin ? "" : "where is_active"}`)).rows);
      if (["festivals", "product_festivals", "banners"].includes(table)) return rows([]);
      if (table === "products") {
        await delay(state.productDelay);
        // A parallel admin-page render may still read as its layout redirects
        // after sign-out. Deny that read instead of treating it as public API.
        if (!q.has("source") && !isAdmin) return send({ message: "Fixture admin read denied" }, 403);
        let result;
        if (isAdmin && !q.has("source")) result = (await db.query(`select * from products${q.has("id") ? " where id=$1" : ""}`, q.has("id") ? [q.get("id").slice(3)] : [])).rows;
        else {
          assert.equal(q.get("source"), "in.(admin,manual)");
          assert.equal(q.get("is_active"), "eq.true");
          assert.equal(q.get("categories.is_active"), "eq.true");
          const args = [], clauses = [visible];
          for (const [key, prefix, operator] of [["slug", "eq.", "="], ["id", "neq.", "!="], ["category_id", "eq.", "="]]) {
            if (q.get(key)?.startsWith(prefix)) { args.push(q.get(key).slice(prefix.length)); clauses.push(`p.${key}${operator}$${args.length}`); }
          }
          result = (await db.query(`select p.*,to_jsonb(c) categories from products p join categories c on c.id=p.category_id where ${clauses.join(" and ")} order by p.created_at desc,p.id`, args)).rows;
        }
        if (state.mode === "render-error") result = result.map(product => ({ ...product, description: { invalid: true } }));
        res.setHeader("Content-Range", `0-${Math.max(0, result.length - 1)}/${result.length}`);
        return rows(result.slice(Number(q.get("offset") || 0), Number(q.get("offset") || 0) + Number(q.get("limit") || 100)));
      }
      if (["product_variants", "product_images"].includes(table)) {
        const args = [], clauses = [];
        if (q.has("id")) {
          assert.equal(q.get("products.source"), "in.(admin,manual)");
          assert.equal(q.get("products.is_active"), "eq.true");
          assert.equal(q.get("products.categories.is_active"), "eq.true");
          args.push(q.get("id").slice(3)); clauses.push(`r.id=$${args.length}`, visible);
        }
        if (q.has("product_id")) {
          const value = q.get("product_id");
          args.push(value.startsWith("in.") ? value.slice(4, -1).split(",") : [value.slice(3)]);
          clauses.push(`r.product_id=any($${args.length}::uuid[])`);
        }
        if (q.has("products.source")) clauses.push(visible);
        if (q.has("stock")) clauses.push("r.stock>0");
        let result = (await db.query(`select r.* from ${table} r join products p on p.id=r.product_id join categories c on c.id=p.category_id where ${clauses.join(" and ") || "true"} order by r.id`, args)).rows;
        if (table === "product_images" && state.asset === "malformed") result = result.map(image => ({ ...image, url: "https://unapproved.invalid/photo.jpg" }));
        return rows(result.slice(Number(q.get("offset") || 0), Number(q.get("offset") || 0) + Number(q.get("limit") || 100)));
      }
      throw Error(`Unhandled fixture table ${table}`);
    } catch (error) {
      state.failures.push(`${req.method} ${url.pathname}${url.search}: ${error.message}`);
      return send({ message: "Fixture transport error" }, 500);
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, state, origin: `http://127.0.0.1:${server.address().port}` };
}
