/* Local QA only. Uses the bundled Playwright runtime; adds no app dependency. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const output = path.resolve(process.env.QA_OUTPUT || "artifacts/phase-0");
  fs.mkdirSync(output, { recursive: true });
  const report = [];
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { for (const img of document.images) img.loading = "eager"; });
    await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `viewport-${width}.png`) });
    await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true });
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      festivals: document.querySelectorAll(".festival-card").length,
      brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src),
      smallControls: [...document.querySelectorAll("a,button,input")].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !el.closest("[inert]") && (r.width < 44 || r.height < 44);
      }).map(el => ({ text: el.textContent.trim().slice(0, 50), label: el.getAttribute("aria-label"), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
    }));
    assert.equal(layout.scrollWidth, width, "Horizontal page overflow");
    assert.equal(layout.festivals, 20);
    assert.deepEqual(layout.brokenImages, []);
    assert.deepEqual(layout.smallControls, [], "Interactive controls below 44px");
    await page.getByRole("button", { name: "Go to collection 2" }).click();
    await page.waitForFunction(() => document.querySelector('.hero-dots button:nth-child(2)').getAttribute('aria-pressed') === 'true');
    assert.equal(await page.getByRole("button", { name: "Go to collection 2" }).getAttribute("aria-pressed"), "true");
    if (width === 390) {
      await page.getByRole("button", { name: "Open menu" }).click();
      assert.equal(await page.locator("#mobile-menu").isVisible(), true);
      await page.getByRole("button", { name: "Close menu" }).click();
      assert.equal(await page.locator(".bottom-nav").isVisible(), true);
    } else assert.equal(await page.locator(".bottom-nav").isVisible(), false);
    await page.getByRole("searchbox").fill("hoodie");
    await page.getByRole("searchbox").press("Enter");
    await page.waitForURL("**/shop?q=hoodie");
    assert.equal(await page.getByRole("status").isVisible(), true);
    for (const route of ["/customize", "/account", "/cart", "/wishlist", "/orders", "/about", "/contact", "/shipping"]) {
      const r = await page.goto(`${baseUrl}${route}`);
      assert.equal(r.status(), 200, route);
    }
    const missing = await page.goto(`${baseUrl}/this-page-does-not-exist`);
    assert.equal(missing.status(), 404);
    assert.deepEqual(errors, [], "Browser errors");
    report.push({ width, ...layout, browserErrors: errors, interactions: "passed" });
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
