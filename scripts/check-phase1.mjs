// Isolated HTTP/UI contract tests. This mock is NOT a substitute for real
// Supabase Auth, PostgREST, Storage or RLS verification. No real service is called.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = path.resolve("artifacts/phase-1/contracts");
fs.mkdirSync(output, { recursive: true });
const publicKey = "sb_publishable_local_http_fixture_only";
const userId = "f0000000-0000-4000-8000-000000000001";
const categoryId = "f1000000-0000-4000-8000-000000000001";
const productId = "f2000000-0000-4000-8000-000000000001";
const imageId = "f3000000-0000-4000-8000-000000000001";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "qa@example.invalid", app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
const token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: userId, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000) })).toString("base64url"), "local-test-only"].join(".");
let catalogue = "empty";
let rejectAuth = true;
let allowConfirmation = false;
let allowPkce = false;
const requests = [];
let browser;
let app;
let appOutput = "";
const base = "http://127.0.0.1:3101";
const mock = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  requests.push({ path: url.pathname, query: url.search, method: req.method });
  res.setHeader("Content-Type", "application/json");
  const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (url.pathname.startsWith("/rest/v1/")) {
    assert.equal(req.headers.apikey, publicKey);
    if (catalogue === "failure" && url.pathname !== "/rest/v1/profiles") return send({ message: "Fixture unavailable" }, 503);
    if (url.pathname.endsWith("/categories")) return send([{ id: categoryId, slug: "men", name: "Men", is_active: true }]);
    if (url.pathname.endsWith("/festivals")) return send([{ id: categoryId, slug: "diwali", name: "Diwali", is_active: true }]);
    if (url.pathname.endsWith("/products")) {
      assert.equal(url.searchParams.get("source"), "in.(admin,manual)");
      assert.equal(url.searchParams.get("categories.is_active"), "eq.true");
      assert.equal(url.searchParams.get("is_active"), "eq.true");
      res.setHeader("Content-Range", `0-0/${catalogue === "empty" || url.searchParams.get("title")?.includes("nomatch") ? 0 : 1}`);
      if (catalogue === "empty" || url.searchParams.get("title")?.includes("nomatch")) return send([]);
      return send([{ id: productId, category_id: categoryId, title: "HTTP TEST — Fixture Tee", price_paise: 12345, is_active: true, source: "manual", categories: { name: "Men", slug: "men", is_active: true }, slug: "http-test-fixture", description: "Synthetic UI test record; never seeded or sold.", product_festivals: [] }]);
    }
    if (url.pathname.endsWith("/product_images")) return send(url.searchParams.has("id") ? { url: `${productId}/test.png` } : [{ id: imageId, product_id: productId, url: `${productId}/test.png`, alt: "Synthetic image fixture", sort_order: 0 }]);
    if (url.pathname.endsWith("/product_variants")) return send([{ id: imageId, product_id: productId, size: "M", color: "Black", stock: 5 }]);
    if (url.pathname.endsWith("/profiles")) return send([], 201);
  }
  if (url.pathname === "/auth/v1/token") {
    if (rejectAuth || (url.searchParams.get("grant_type") === "pkce" && !allowPkce)) return send({ code: "invalid_credentials", message: "Invalid credentials" }, 400);
    return send({ access_token: token, refresh_token: "not-a-real-refresh-token", expires_in: 3600, token_type: "bearer", user });
  }
  if (url.pathname === "/auth/v1/user") return send(user);
  if (url.pathname === "/auth/v1/signup") return send({ user });
  if (url.pathname === "/auth/v1/logout") { res.statusCode = 204; return res.end(); }
  if (url.pathname === "/auth/v1/verify") return allowConfirmation
    ? send({ access_token: token, refresh_token: "not-a-real-refresh-token", expires_in: 3600, token_type: "bearer", user })
    : send({ message: "Expired fixture" }, 400);
  if (url.pathname.startsWith("/storage/v1/object/")) {
    res.setHeader("Content-Type", "image/png");
    return res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64"));
  }
  send({ message: "Unimplemented mock endpoint" }, 404);
});

try {
  await new Promise(resolve => mock.listen(0, "127.0.0.1", resolve));
  const address = mock.address();
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3101"], {
    cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, SITE_URL: base },
    stdio: ["ignore", "pipe", "pipe"],
  });
  app.stdout.on("data", chunk => { appOutput += chunk.toString(); });
  app.stderr.on("data", chunk => { appOutput += chunk.toString(); });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (app.exitCode !== null) throw new Error("Isolated test server stopped before readiness");
    try { if ((await fetch(`${base}/account`)).status === 200) { ready = true; break; } } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Isolated test server ready");
  browser = await chromium.launch({ headless: true, channel: "msedge" });
  const reports = [];
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/account`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.locator("#email-error").waitFor();
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
    rejectAuth = true;
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "couldn’t sign you in" }).waitFor();
    await page.screenshot({ path: path.join(output, `signin-${width}.png`), fullPage: true });
    rejectAuth = false;
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("heading", { name: "You’re signed in" }).waitFor();
    assert.ok(requests.some(r => r.path === "/auth/v1/user"), "Sign-in verifies user on server");
    const sessionCookie = (await page.context().cookies()).find(c => c.name.endsWith("-auth-token"));
    assert.ok(sessionCookie, "SSR writes a session cookie");
    const session = JSON.parse(Buffer.from(sessionCookie.value.replace(/^base64-/, ""), "base64url").toString());
    const oldClaims = { sub: userId, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now()/1000)-60, iat: Math.floor(Date.now()/1000)-3660 };
    session.access_token = [token.split(".")[0], Buffer.from(JSON.stringify(oldClaims)).toString("base64url"), "local-test-only"].join(".");
    session.expires_at = oldClaims.exp;
    await page.context().addCookies([{ ...sessionCookie, value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` }]);
    const accountResponse = await page.goto(`${base}/account`);
    assert.match(accountResponse.headers()["cache-control"], /no-store/);
    await page.getByRole("heading", { name: "You’re signed in" }).waitFor();
    assert.ok(requests.some(r => r.path === "/auth/v1/token" && r.query.includes("refresh_token")), "Expired session triggers refresh");
    assert.notEqual((await page.context().cookies()).find(c => c.name.endsWith("-auth-token"))?.value, `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, "Proxy returns refreshed browser cookie");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL("**/account?message=signed-out");
    await page.getByRole("heading", { name: "Welcome back" }).waitFor();
    await page.goto(`${base}/account?mode=signup`);
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "confirmation link" }).waitFor();
    await page.screenshot({ path: path.join(output, `signup-${width}.png`), fullPage: true });
    allowPkce = true;
    const callbackSuccess = await page.request.get(`${base}/auth/callback?code=valid-fixture&next=/shop`, { maxRedirects: 0 });
    assert.equal(new URL(callbackSuccess.headers().location).pathname, "/shop");
    allowPkce = false;
    await page.goto(`${base}/account`);
    await page.getByRole("heading", { name: "You’re signed in" }).waitFor();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL("**/account?message=signed-out");
    catalogue = "empty";
    await page.goto(`${base}/shop`);
    await page.getByRole("status").filter({ hasText: "No pieces to show just yet." }).waitFor();
    assert.equal(await page.locator(".product-card").count(), 0, "No demo photos substituted into empty live catalogue");
    catalogue = "ready";
    await page.goto(`${base}/shop?category=men&festival=diwali`);
    await page.getByRole("heading", { name: "HTTP TEST — Fixture Tee" }).waitFor();
    await page.getByText("₹123.45", { exact: true }).waitFor();
    assert.ok(requests.some(r => r.path === "/rest/v1/products" && new URLSearchParams(r.query).get("product_festivals") === "not.is.null"));
    await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    await page.screenshot({ path: path.join(output, `catalogue-${width}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    const imageResponse = await page.request.get(`${base}/catalogue-image/${imageId}`);
    assert.equal(imageResponse.status(), 200);
    assert.match(imageResponse.headers()["cache-control"], /no-store/);
    assert.equal((await page.request.get(`${base}/catalogue-image/not-a-uuid`)).status(), 404);
    await page.locator(".filter-panel summary").click();
    await page.getByLabel("Search the collection").fill("nomatch");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await page.getByRole("status").filter({ hasText: "No pieces to show just yet." }).waitFor();
    catalogue = "failure";
    await page.goto(`${base}/shop`);
    await page.getByRole("status").filter({ hasText: "couldn’t load the catalogue" }).waitFor();
    assert.equal(await page.locator(".product-card").count(), 0);
    for (const route of ["/auth/callback?code=invalid-fixture&next=https://evil.example", "/auth/confirm?token_hash=bad&type=recovery"]) {
      const response = await page.request.get(`${base}${route}`, { maxRedirects: 0 });
      assert.equal(response.status(), 307);
      const target = new URL(response.headers().location);
      assert.equal(target.origin, base);
      assert.equal(target.pathname, "/account");
      assert.equal(target.searchParams.has("code"), false);
      assert.equal(target.searchParams.has("token_hash"), false);
    }
    allowConfirmation = true;
    const confirmed = await page.request.get(`${base}/auth/confirm?token_hash=${"a".repeat(64)}&type=email`, { maxRedirects: 0 });
    assert.equal(new URL(confirmed.headers().location).href, `${base}/account`);
    await page.goto(`${base}/account`);
    await page.getByRole("heading", { name: "You’re signed in" }).waitFor();
    allowConfirmation = false;
    assert.deepEqual(errors, []);
    reports.push({ width, mockContracts: "passed", realSupabase: "NOT VERIFIED" });
    await page.close();
  }
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(reports, null, 2));
  console.log(JSON.stringify(reports, null, 2));
} catch (error) {
  // Only artificial credentials are used; logs stay in ignored local artifacts.
  fs.writeFileSync(path.join(output, "test-server.log"), appOutput);
  throw error;
} finally {
  await browser?.close();
  if (app && app.exitCode === null) {
    if (process.platform === "win32") await new Promise(resolve => {
      const stop = spawn("taskkill", ["/pid", String(app.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      stop.on("close", resolve);
    }); else app.kill("SIGTERM");
  }
  await new Promise(resolve => mock.close(resolve));
}
