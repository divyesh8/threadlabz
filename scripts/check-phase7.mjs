// Real Next routes/actions + disposable PostgreSQL RPCs. Auth/HTTP/Storage are
// isolated fixtures. Never connects to a hosted Supabase project.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { isolatedEnvironment } from "./fixtures/isolated-env.mjs";
import { createPhase7Database, seedPhase7Database, id } from "./fixtures/phase7-db.mjs";
import { createFixtureServer, publicKey, privateKey, fixtureUser, fixtureToken } from "./fixtures/phase7-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = path.resolve("artifacts/phase-7/browser");
fs.mkdirSync(output, { recursive: true });
const base = "http://127.0.0.1:3107";
const db = await createPhase7Database();
await seedPhase7Database(db);
const { server, state, origin } = await createFixtureServer(db);
let app, browser, appOutput = "";
const reports = [];
const widths = process.env.QA_VIEWPORTS === "none" ? [] : (process.env.QA_VIEWPORTS ?? "390,768,1280,1440").split(",").filter(Boolean).map(Number);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const stopApp = async () => {
  if (app && app.exitCode === null) {
    if (process.platform === "win32") await new Promise(resolve => spawn("taskkill", ["/pid", String(app.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" }).on("close", resolve));
    else { app.kill("SIGTERM"); await new Promise(resolve => app.once("close", resolve)); }
  }
};
const startApp = async policies => {
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3107"], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: isolatedEnvironment({ THREADLABZ_SUPABASE_URL: origin, THREADLABZ_SUPABASE_PUBLISHABLE_KEY: publicKey,
      THREADLABZ_SUPABASE_SECRET_KEY: privateKey, SITE_URL: base,
      SHOPPING_POLICIES_JSON: policies }),
  });
  app.stdout.on("data", chunk => { appOutput += chunk; });
  app.stderr.on("data", chunk => { appOutput += chunk; });
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null) throw Error("Fixture Next server stopped");
    try { if ((await fetch(`${base}/products/qa-reference-shirt`)).ok) return; } catch {}
    await pause(500);
  }
  throw Error("Fixture Next server did not become ready");
};
const shot = async (page, name) => {
  await page.evaluate(() => { for (const image of document.images) image.loading = "eager"; });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); window.scrollTo(0, 0); });
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), page.viewportSize().width, `${name}: no horizontal overflow`);
};
try {
  await startApp("");
  browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || "msedge" });
  for (const width of widths) {
    await db.exec("truncate carts cascade");
    console.log(`Product detail browser checks: ${width}px`);
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const go = async slug => { await page.goto(`${base}/products/${slug}`, { waitUntil: "networkidle" }); };
    await go("qa-reference-shirt");
    await page.getByRole("heading", { name: "QA fixture — Everyday shirt", exact: true }).waitFor();
    assert.equal(await page.locator(".detail-price").innerText(), "₹1,499.50");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${base}/products/qa-reference-shirt`);
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
    assert.ok(await page.locator('meta[property="og:image"]').count());
    const structured = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    assert.equal(structured["@type"], "Product");
    assert.equal("offers" in structured, false);
    await page.getByText("Delivery charges and serviceable locations have not been confirmed.").waitFor();
    assert.equal(await page.getByRole("button", { name: /wishlist/i }).count(), 0);
    await shot(page, `product-${width}`);
    const axe = await new AxeBuilder({ page }).include(".pdp-view").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(axe.violations.map(item => ({ id: item.id, nodes: item.nodes.map(n => n.target) })), [], `Accessibility ${width}`);
    fs.writeFileSync(path.join(output, `accessibility-${width}.json`), JSON.stringify({ violations: axe.violations, passes: axe.passes.length, incomplete: axe.incomplete.map(v => v.id) }, null, 2));
    fs.writeFileSync(path.join(output, `screen-reader-${width}.txt`), await page.locator(".pdp-view").ariaSnapshot());

    const first = page.getByRole("button", { name: "View photograph 1", exact: true });
    await first.focus(); await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("button", { name: "View photograph 2", exact: true }).getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Home"); assert.equal(await first.getAttribute("aria-pressed"), "true");
    await page.keyboard.press("End"); await page.getByRole("button", { name: "Previous photograph", exact: true }).click();
    await page.getByRole("button", { name: "Enlarge photograph" }).click();
    const zoom = page.getByRole("dialog", { name: "Product photograph", exact: true });
    await zoom.waitFor();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.equal(await zoom.locator(".is-magnified").count(), 1);
    await page.keyboard.press("Escape");
    assert.equal(await zoom.isVisible(), false);
    assert.equal(await page.getByRole("button", { name: "Enlarge photograph" }).evaluate(el => el === document.activeElement), true);

    const guideTrigger = page.getByRole("button", { name: "Size guide", exact: true });
    await guideTrigger.click();
    const guide = page.getByRole("dialog", { name: "Size guide", exact: true });
    await guide.getByRole("table").waitFor();
    assert.match(await guide.innerText(), /Garment measurements · Centimetres/);
    assert.match(await guide.innerText(), /Chest width \(cm\)/);
    assert.equal(await guide.getByRole("row").count(), 3);
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    assert.equal(await guide.evaluate(el => el.contains(document.activeElement)), true, "Dialog traps keyboard focus");
    const guideAxe = await new AxeBuilder({ page }).include(".product-dialog[open]").withTags(["wcag2a", "wcag2aa"]).analyze();
    assert.deepEqual(guideAxe.violations.map(item => item.id), []);
    await page.screenshot({ path: path.join(output, `size-guide-${width}.png`) });
    await page.keyboard.press("Escape");
    assert.equal(await guideTrigger.evaluate(el => el === document.activeElement), true);

    const small = page.getByRole("radio", { name: "S", exact: true });
    await small.check();
    assert.equal(await page.getByRole("radio", { name: "L — Unavailable", exact: true }).isDisabled(), true, "Fully reserved size unavailable");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    assert.equal(await page.getByRole("button", { name: "Increase quantity" }).isDisabled(), true, "Reserved units excluded");
    await page.getByRole("radio", { name: "Red", exact: true }).check();
    assert.equal(await page.locator('input[name="variant"]:checked').count(), 0, "No silent size substitution");
    await page.getByRole("radio", { name: "M", exact: true }).check();
    await page.getByRole("radio", { name: "Ink", exact: true }).check();
    assert.equal(await page.getByRole("radio", { name: "M", exact: true }).isChecked(), true);
    for (let count = 1; count < 10; count++) await page.getByRole("button", { name: "Increase quantity" }).click();
    assert.equal(await page.getByRole("button", { name: "Increase quantity" }).isDisabled(), true);
    assert.equal(await page.locator(".quantity-control output").innerText(), "10");
    await page.getByRole("radio", { name: "Stone Unavailable", exact: true }).check();
    assert.equal(await page.locator('input[name="variant"]:enabled').count(), 0);
    await page.getByText("This colour is currently unavailable. Choose another colour.", { exact: true }).waitFor();
    await page.getByRole("radio", { name: "Ink", exact: true }).check();
    await small.check(); await small.focus(); await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("radio", { name: "M", exact: true }).isChecked(), true);
    assert.equal(await page.locator(".variant-option:has(:focus-visible)").count(), 1);

    await small.check();
    state.cartDelay = 200;
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await page.getByRole("button", { name: "Adding to bag…", exact: true }).waitFor();
    assert.equal(await small.isDisabled(), true, "Selection locked during cart request");
    await page.locator(".bag-feedback.success").waitFor();
    state.cartDelay = 0;
    assert.equal((await db.query("select sum(qty)::integer quantity from cart_items where variant_id=$1", [id(101)])).rows[0].quantity, 1);
    await page.getByRole("link", { name: "View bag →", exact: true }).click();
    await page.getByRole("heading", { name: "Shopping Bag", exact: true }).waitFor();
    assert.match(await page.locator("main").first().innerText(), /₹1,499.50/);
    await go("qa-reference-shirt");
    await small.check();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await page.locator(".bag-feedback.success").waitFor();
    assert.match(await page.locator(".bag-feedback.success").innerText(), /Quantity in bag: 2/, "Confirm actual server-clamped quantity, not the requested addition");
    assert.equal((await db.query("select qty from cart_items where variant_id=$1", [id(101)])).rows[0].qty, 2);
    await db.query("update product_variants set stock_reserved=stock where id=$1", [id(101)]);
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await page.locator(".bag-feedback.error").waitFor(); // Stock changed since page load.
    assert.match(await page.locator(".bag-feedback.error").innerText(), /Could not update your bag/);
    await db.query("update product_variants set stock_reserved=1 where id=$1", [id(101)]);
    state.failCart = true;
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await page.locator(".bag-feedback.error").waitFor();
    state.failCart = false;
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".product-actions button")).transitionDuration), "0s");
    assert.equal(await page.locator(".related-products .catalogue-card").count(), 3);
    await shot(page, `selected-${width}`);
    for (const slug of ["qa-seed", "qa-inactive", "qa-category-inactive", "missing"]) {
      await go(slug); await page.getByRole("heading", { name: "This piece isn’t available." }).waitFor();
    }
    await go("qa-minimal");
    assert.equal(await page.locator(".detail-price").innerText(), "Price unavailable");
    assert.equal(await page.getByRole("button", { name: "Price unavailable", exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "Size guide", exact: true }).count(), 0);
    assert.equal(await page.locator(".pdp-disclosure").count(), 0);
    await page.locator(".gallery-main .catalogue-image-empty").waitFor();
    await page.getByText("Colour not specified", { exact: true }).waitFor();
    await shot(page, `minimal-${width}`);
    await go("qa-reserved");
    await page.getByRole("button", { name: "Currently unavailable", exact: true }).waitFor();
    assert.equal(await page.locator('input[name="variant"]:enabled').count(), 0);
    await go("qa-no-variants");
    await page.getByText("Size and availability information has not been supplied.").waitFor();
    state.asset = "inaccessible"; await go("qa-reference-shirt");
    await page.locator(".gallery-main .catalogue-image-empty").waitFor();
    assert.equal(await page.getByRole("button", { name: "Enlarge photograph" }).isDisabled(), true);
    await shot(page, `image-error-${width}`);
    state.asset = "valid"; state.mode = "failure"; await go("qa-reference-shirt");
    await page.getByRole("heading", { name: "We couldn’t load this product." }).waitFor();
    state.mode = "ready";
    assert.deepEqual(errors, [], `No browser exceptions at ${width}`);
    reports.push({ width, layout: "pass", keyboard: "pass", axe: "pass", nativeDialogFocus: "pass", stock: "pass", realCartRpc: "pass", emptyStates: "pass", imageFailure: "pass", reducedMotion: "pass" });
    await context.close();
  }

  const adminContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await adminContext.newPage();
  await page.goto(`${base}/products/qa-reference-shirt`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".product-actions button")).transitionDuration), "0.15s", "Normal motion is lightweight");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".skip-link").evaluate(el => el === document.activeElement), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#main-content").evaluate(el => el === document.activeElement), true);
  state.imageDelay = 1800;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".gallery-main .catalogue-image-loading").waitFor();
  assert.equal(await page.getByRole("button", { name: "Enlarge photograph" }).isDisabled(), true);
  await page.waitForLoadState("networkidle"); state.imageDelay = 0;
  state.productDelay = 1800;
  await page.getByRole("link", { name: /QA fixture — Minimal information/ }).click();
  await page.getByRole("status", { name: "Loading product", exact: true }).waitFor();
  await page.getByRole("heading", { name: "QA fixture — Minimal information", exact: true }).waitFor();
  state.productDelay = 0;
  state.mode = "render-error";
  await page.goto(`${base}/products/qa-reference-shirt`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Let’s try that again.", exact: true }).waitFor();
  state.mode = "ready";
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("heading", { name: "QA fixture — Everyday shirt", exact: true }).waitFor();
  for (const [asset, status] of [["valid", 200], ["inaccessible", 404], ["malformed", 404], ["corrupt", 404]]) {
    state.asset = asset;
    const response = await page.request.get(`${base}/catalogue-image/${id(200)}?w=384`);
    assert.equal(response.status(), status);
    assert.match(response.headers()["cache-control"], /private, no-store/);
    if (status === 200) {
      assert.equal(response.headers()["content-type"], "image/webp");
      assert.ok((await sharp(await response.body()).metadata()).width <= 384);
    }
  }
  state.asset = "valid";
  assert.equal((await page.request.get(`${base}/catalogue-image/${id(203)}?w=384`)).status(), 404);
  for (const suffix of ["w=999999", "w=384&w=640"]) assert.equal((await page.request.get(`${base}/catalogue-image/${id(200)}?${suffix}`)).status(), 400);
  await page.goto(`${base}/admin/products/${id(1)}`, { waitUntil: "networkidle" });
  assert.match(page.url(), /\/login/);
  const session = { access_token: fixtureToken, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: "local-fixture-refresh", user: fixtureUser };
  await page.context().addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: base, httpOnly: false, sameSite: "Lax" }]);
  await page.goto(`${base}/admin/products/${id(1)}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Edit Product/ }).waitFor();
  const editorAxe = await new AxeBuilder({ page }).include(".product-details-editor").withTags(["wcag2a", "wcag2aa"]).analyze();
  assert.deepEqual(editorAxe.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
  await page.getByLabel("Garment-care instructions", { exact: true }).fill("QA fixture: updated care from the editor.");
  await page.getByRole("button", { name: "Save Changes", exact: true }).last().click();
  await page.getByText("Product updated successfully.", { exact: true }).waitFor();
  assert.equal((await db.query("select product_details from products where id=$1", [id(1)])).rows[0].product_details.care, "QA fixture: updated care from the editor.");
  await page.waitForURL(`${base}/admin/products`);
  await page.context().clearCookies();
  await page.goto(`${base}/products/qa-reference-shirt`, { waitUntil: "networkidle" });
  await page.getByText("Care instructions", { exact: true }).click();
  await page.getByText("QA fixture: updated care from the editor.", { exact: true }).waitFor();
  reports.push({ adminEditRoundTrip: "pass", unauthenticatedAdminGuard: "pass", routeLoading: "pass", errorBoundaryRetry: "pass", imageLoading: "pass", transformedImageAuthorization: "pass", normalMotion: "pass", skipLink: "pass" });
  await page.close();
  assert.deepEqual(state.failures, []);
  await stopApp();
  await startApp(JSON.stringify({ delivery: { summary: "QA fixture: delivery fees are confirmed by the owner.", url: "https://example.com/delivery" }, returns: { summary: "QA fixture: contact the owner to confirm eligibility." } }));
  const policyPage = await browser.newPage();
  for (const route of ["/products/qa-reference-shirt", "/shipping"]) {
    await policyPage.goto(base + route, { waitUntil: "networkidle" });
    await policyPage.getByText("QA fixture: delivery fees are confirmed by the owner.", { exact: true }).waitFor();
    assert.equal(await policyPage.getByRole("link", { name: "Read delivery policy", exact: true }).getAttribute("href"), "https://example.com/delivery");
  }
  reports.push({ configuredPolicies: "pass", hostedSupabase: "not tested", manualScreenReader: "not tested" });
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(reports, null, 2));
  console.log(JSON.stringify(reports, null, 2));
} catch (error) {
  const currentPage = browser?.contexts().flatMap(context => context.pages()).at(-1);
  if (currentPage) {
    await currentPage.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(output, "failure-state.txt"), await currentPage.locator("body").innerText().catch(() => "Page closed"));
  }
  throw error;
} finally {
  fs.writeFileSync(path.join(output, "server.log"), appOutput);
  await browser?.close(); await stopApp();
  await new Promise(resolve => server.close(resolve)); await db.close();
}
