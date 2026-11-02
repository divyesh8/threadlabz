// LOCAL DATABASE: real Next production routes/actions and canonical SQL.
// MOCK: Auth, PostgREST, Storage transport and all Razorpay traffic.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { isolatedEnvironment } from './fixtures/isolated-env.mjs';
import { createPhase7Database, seedPhase7Database } from './fixtures/phase7-db.mjs';
import { createFixtureServer, publicKey, privateKey } from './fixtures/phase7-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve('artifacts/phase-8/browser'); fs.mkdirSync(output, { recursive: true });
const base = 'http://127.0.0.1:3108';
const db = await createPhase7Database(); await seedPhase7Database(db);
const providerOrders = new Map(), providerPayments = new Map();
let providerCalls = 0, app, browser, appOutput = '';
const fixture = await createFixtureServer(db, { checkout: true, onRequest: async ({ url, req, send, body }) => {
  if (!url.pathname.startsWith('/gateway/')) return false;
  assert.equal(req.headers.authorization, `Basic ${Buffer.from('rzp_test_phase8:phase8-fixture-secret').toString('base64')}`);
  if (url.pathname.endsWith('/orders') && req.method === 'POST') {
    const order = { ...await body(), id: `order_phase8${++providerCalls}` }; providerOrders.set(order.id, order); send(order);
  } else if (url.pathname.includes('/payments/')) send(providerPayments.get(url.pathname.split('/').at(-1)) ?? null);
  else throw Error('Unexpected provider fixture request');
  return true;
} });
const env = isolatedEnvironment({ THREADLABZ_SUPABASE_URL: fixture.origin, THREADLABZ_SUPABASE_PUBLISHABLE_KEY: publicKey,
  THREADLABZ_SUPABASE_SECRET_KEY: privateKey, SITE_URL: base, CHECKOUT_MODE: 'test', RAZORPAY_KEY_ID: 'rzp_test_phase8',
  RAZORPAY_KEY_SECRET: 'phase8-fixture-secret', RAZORPAY_WEBHOOK_SECRET: 'phase8-fixture-webhook', QA_GATEWAY_ORIGIN: fixture.origin });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const reports = { evidence: ['LOCAL DATABASE', 'MOCK'], hosted: 'BLOCKED — not exercised', build: null, checks: [], performance: [] };
const stop = async () => {
  if (app && app.exitCode === null) {
    if (process.platform === 'win32') await new Promise(resolve => spawn('taskkill', ['/pid', String(app.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }).on('close', resolve));
    else { app.kill('SIGTERM'); await new Promise(resolve => app.once('close', resolve)); }
  }
};
const addItem = async page => {
  await page.goto(`${base}/products/qa-reference-shirt`, { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'M', exact: true }).check();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.locator('.bag-feedback.success').waitFor();
};
const fillAddress = async page => {
  const values = { fullName: 'QA Customer', phone: '9876543210', addressLine1: '123 Fixture Street', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001' };
  for (const [key, value] of Object.entries(values)) await page.locator(`#checkout-${key}`).fill(value);
};
const finishCallback = async (page, captured = true) => {
  const order = await page.evaluate(() => window.qaPopup.options);
  const payment = { id: `pay_phase8${providerCalls}`, order_id: order.order_id, amount: order.amount, currency: order.currency,
    status: captured ? 'captured' : 'authorized', captured };
  providerPayments.set(payment.id, payment);
  const callback = { razorpay_order_id: order.order_id, razorpay_payment_id: payment.id,
    razorpay_signature: createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${order.order_id}|${payment.id}`).digest('hex') };
  await page.evaluate(result => window.qaPopup.options.handler(result), callback);
};
try {
  console.log('Building isolated production app for browser and performance checks');
  const build = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let buildLog = ''; build.stdout.on('data', chunk => { buildLog += chunk; }); build.stderr.on('data', chunk => { buildLog += chunk; });
  const code = await new Promise(resolve => build.on('close', resolve)); fs.writeFileSync(path.join(output, 'build.log'), buildLog);
  assert.equal(code, 0, 'Isolated production build'); reports.build = 'PASS';
  app = spawn(process.execPath, ['--import', pathToFileURL(path.resolve('scripts/fixtures/phase8-network.mjs')).href,
    'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3108'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  app.stdout.on('data', chunk => { appOutput += chunk; }); app.stderr.on('data', chunk => { appOutput += chunk; });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null) throw Error('Production test server stopped');
    try { if ((await fetch(`${base}/shop`)).ok) { ready = true; break; } } catch {}
    await pause(300);
  }
  assert.ok(ready, 'Production test server ready');
  browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
  for (const width of [390, 768, 1280, 1440]) {
    console.log(`Test checkout browser checks: ${width}px`);
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    // Load the actual script-loader branch, but fulfill the external asset locally.
    let scriptRequests = 0;
    await context.route('https://checkout.razorpay.com/v1/checkout.js', route => {
      if (width === 390 && ++scriptRequests === 1) return route.abort();
      return route.fulfill({ contentType: 'application/javascript', body: `window.Razorpay = class {
      constructor(options) { this.options = options; this.handlers = {}; window.qaPopup = this; }
      on(name, callback) { this.handlers[name] = callback; } open() { window.qaOpened = (window.qaOpened || 0) + 1; }
      close() { this.options.modal.ondismiss(); }
    };` }); });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await addItem(page); await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Proceed to test checkout', exact: true }).click();
    await page.getByRole('heading', { name: 'Delivery & Payment', exact: true }).waitFor();
    await page.getByRole('button', { name: /^Test pay/ }).click(); await page.getByText('Please complete all required delivery fields.').waitFor();
    assert.equal(await page.locator('[aria-invalid="true"]').count(), 6);
    await fillAddress(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'Checkout fits viewport');
    const axe = await new AxeBuilder({ page }).include('.checkout-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    fs.writeFileSync(path.join(output, `checkout-accessibility-${width}.json`), JSON.stringify(axe.violations, null, 2));
    assert.deepEqual(axe.violations.map(v => v.id), [], 'Checkout accessibility');
    await page.screenshot({ path: path.join(output, `checkout-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: /^Test pay/ }).focus(); await page.keyboard.press('Enter');
    if (width === 390) {
      await page.getByText(/The payment window could not load/).waitFor();
      await page.getByRole('button', { name: 'Resume test payment', exact: true }).click();
    }
    await page.waitForFunction(() => window.qaOpened === 1);
    const savedUrl = page.url(), orderId = new URL(savedUrl).searchParams.get('order'); assert.ok(orderId);
    const calls = providerCalls;
    assert.equal(await scalar('select count(*)::int from inventory_reservations where order_id=$1', [orderId]), 1);
    await page.evaluate(() => window.qaPopup.close()); await page.getByText(/Payment window closed/).waitFor();
    if (width === 390) {
      fixture.state.failOrders = true; await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Saved checkout could not be loaded.', exact: true }).waitFor();
      assert.equal(page.url(), savedUrl, 'Transient order lookup retains recovery address'); fixture.state.failOrders = false;
    }
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Resume test payment', exact: true }).click();
    await page.waitForFunction(() => window.qaOpened === 1);
    assert.equal(providerCalls, calls, 'Reload reuses the same provider order');
    if (width === 390) {
      await finishCallback(page, false); await page.getByText(/Checking payment with the server/).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Thank you for your order!' }).count(), 0, 'Authorized alone stays pending');
      await page.getByRole('button', { name: 'Resume test payment', exact: true }).click(); await page.waitForFunction(() => window.qaOpened === 2);
      await page.evaluate(() => window.qaPopup.handlers['payment.failed']()); await page.getByText(/payment attempt did not complete/).waitFor();
      await page.getByRole('button', { name: 'Resume test payment', exact: true }).click(); await page.waitForFunction(() => window.qaOpened === 3);
    }
    await finishCallback(page); await page.getByRole('heading', { name: 'Thank you for your order!', exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('heading', { name: 'Thank you for your order!', exact: true }).waitFor();
    assert.equal(await scalar('select payment_status from orders where id=$1', [orderId]), 'captured');
    assert.equal(await scalar("select count(*)::int from inventory_reservations where order_id=$1 and status='CONSUMED'", [orderId]), 1);
    assert.deepEqual(errors, []);
    reports.checks.push({ width, passed: ['labels', 'validation', 'keyboard submit', 'no overflow', 'axe', 'popup loader', 'dismiss', 'reload', 'same provider order', 'capture', 'paid reload'], pageErrors: errors });
    const foreign = await browser.newContext(); const foreignPage = await foreign.newPage(); await foreignPage.goto(savedUrl, { waitUntil: 'networkidle' });
    await foreignPage.getByRole('heading', { name: 'Saved checkout could not be loaded.', exact: true }).waitFor();
    assert.equal(await foreignPage.getByRole('button', { name: 'Resume test payment', exact: true }).count(), 0, 'Foreign browser cannot read saved order'); await foreign.close();
    await context.close();
  }
  // Unthrottled local production timings; these are observations, not lab scores.
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.qaVitals = { lcpMs: null, cls: 0 };
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.qaVitals.lcpMs = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.qaVitals.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage(); await addItem(page);
    for (const route of ['/', '/shop', '/products/qa-reference-shirt', '/cart', '/checkout']) {
      const errors = []; const listener = error => errors.push(error.message); page.on('pageerror', listener);
      const samples = [];
      for (let run = 0; run < 3; run++) {
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
        samples.push(await page.evaluate(() => {
          const n = performance.getEntriesByType('navigation')[0], resources = performance.getEntriesByType('resource');
          return { ttfbMs: n.responseStart, domContentLoadedMs: n.domContentLoadedEventEnd, ...window.qaVitals,
            scriptTransferBytes: resources.filter(r => r.initiatorType === 'script').reduce((n,r) => n + r.transferSize,0),
            loadedImages: [...document.images].filter(i => i.complete && i.naturalWidth > 0).length,
            brokenImages: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
            overflow: document.documentElement.scrollWidth > innerWidth };
        }));
      }
      const accessibility = await new AxeBuilder({ page }).include('main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      reports.performance.push({ width, route, samples, errors, accessibility: accessibility.violations.map(v => ({ id:v.id, impact:v.impact, targets:v.nodes.map(n=>n.target) })) });
      assert.deepEqual(errors, []); assert.ok(samples.every(s => !s.overflow && !s.brokenImages));
      page.off('pageerror', listener);
    }
    await context.close();
  }
  assert.deepEqual(fixture.state.failures, []);
  const layout = spawn(process.execPath, ['scripts/check-layout.mjs'], { env: { ...env, QA_BASE_URL: base, QA_OUTPUT: path.join(output, 'layout') }, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
  let layoutLog = ''; layout.stdout.on('data', chunk => { layoutLog += chunk; }); layout.stderr.on('data', chunk => { layoutLog += chunk; });
  const layoutCode = await new Promise(resolve => layout.on('close', resolve)); fs.writeFileSync(path.join(output, 'layout.log'), layoutLog);
  assert.equal(layoutCode, 0, 'Existing shared layout suite'); reports.layout = 'PASS';
  console.log('PASS: local production checkout at four widths and five-route performance/accessibility observations');
} finally {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(reports, null, 2));
  fs.writeFileSync(path.join(output, 'server.log'), appOutput);
  fs.writeFileSync(path.join(output, 'fixture-errors.json'), JSON.stringify(fixture.state.failures, null, 2));
  await browser?.close(); await stop(); await new Promise(resolve => fixture.server.close(resolve)); await db.close();
}
