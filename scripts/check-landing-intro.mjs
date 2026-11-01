// Real browser/media checks against a locally running Next application.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import AxeBuilder from '@axe-core/playwright';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3110';
const output = path.resolve('artifacts/landing-intro'); fs.mkdirSync(output, { recursive: true });
const manifest = JSON.parse(fs.readFileSync('src/features/landing-intro/generated/manifest.json', 'utf8'));
const key = `threadlabz:landing-intro:${manifest.asset.version}`;
const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'msedge', headless: true });
const results = [];
async function check(name, run, options = {}) {
  if (process.env.QA_INTRO_FILTER && !name.includes(process.env.QA_INTRO_FILTER)) return;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(15000);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try { await run(page, context); assert.deepEqual(errors, []); results.push({ name, result: 'passed' }); console.log(`PASS ${name}`); }
  finally { await context.close(); }
}
const intro = page => page.locator('dialog[data-landing-intro]');
const open = async page => { await page.goto(base); await intro(page).waitFor(); };
const gone = async page => {
  await intro(page).waitFor({ state: 'detached', timeout: 20000 });
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
  assert.equal(await page.locator('#main-content').isVisible(), true);
};
try {
  for (const width of [390, 768, 1280, 1440]) await check(`viewport ${width}, keyboard, sound, skip`, async page => {
    await open(page);
    await page.waitForFunction(() => document.querySelector('video')?.currentTime > .15);
    const media = await page.locator('video').evaluate(v => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, width: v.videoWidth, height: v.videoHeight, fit: getComputedStyle(v).objectFit }));
    assert.equal(media.muted, true); assert.equal(media.loop, false); assert.equal(media.inline, true); assert.equal(media.fit, 'contain');
    assert.ok(media.width > 0 && media.height > 0);
    assert.ok(Math.abs(media.width / media.height - manifest.asset.aspectRatio) < .002, 'preserve display aspect ratio including non-square pixels');
    assert.equal(await intro(page).evaluate(el => el.matches(':modal')), true);
    const rect = await intro(page).boundingBox(); assert.equal(rect.width, width); assert.equal(rect.height, 900);
    const videoRect = await page.locator('video').boundingBox(); assert.equal(videoRect.width, width); assert.equal(videoRect.height, 900);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    assert.equal(await intro(page).evaluate(el => el.contains(document.activeElement)), true);
    await page.locator('header a').first().evaluate(el => el.focus());
    assert.equal(await intro(page).evaluate(el => el.contains(document.activeElement)), true, 'background cannot receive focus');
    await page.screenshot({ path: path.join(output, `intro-${width}.png`) });
    const axe = await new AxeBuilder({ page }).include('dialog[data-landing-intro]').withTags(['wcag2a', 'wcag2aa']).analyze();
    assert.deepEqual(axe.violations.map(v => v.id), []);
    if (manifest.asset.hasAudio) {
      await page.getByRole('button', { name: 'Enable sound' }).click();
      assert.equal(await page.locator('video').evaluate(v => v.muted), false);
      await page.getByRole('button', { name: 'Mute sound' }).click();
    }
    await page.getByRole('button', { name: 'Skip intro' }).click(); await gone(page);
    assert.equal(await page.locator('#main-content').evaluate(el => el === document.activeElement), true);
    await page.screenshot({ path: path.join(output, `revealed-${width}.png`) });
  }, { viewport: { width, height: 900 } });
  await check('complete real video once, hold, curtain reveal, session refresh and internal return', async page => {
    await open(page);
    await page.waitForFunction(() => document.querySelector('video')?.currentTime > 1);
    assert.equal(await intro(page).getAttribute('data-phase'), 'playing');
    await page.waitForFunction(() => document.querySelector('[data-landing-intro]')?.dataset.phase === 'holding', { timeout: 20000 });
    const ended = await page.locator('video').evaluate(v => ({ time: v.currentTime, duration: v.duration, ended: v.ended }));
    assert.equal(ended.ended, true); assert.ok(Math.abs(ended.time - ended.duration) < .1);
    await page.waitForFunction(() => document.querySelector('[data-landing-intro]')?.dataset.phase === 'revealing');
    await page.waitForTimeout(400); await page.screenshot({ path: path.join(output, 'curtain-reveal.png') });
    await gone(page);
    assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), 'seen');
    await page.reload(); await page.waitForTimeout(700); assert.equal(await intro(page).count(), 0);
    await page.locator('header').getByRole('link', { name: 'Shop all', exact: true }).click(); await page.waitForURL('**/shop');
    await page.locator('header').getByRole('link', { name: 'ThreadLabz home' }).click(); await page.waitForURL(base + '/');
    await page.waitForTimeout(500); assert.equal(await intro(page).count(), 0);
  });
  await check('stale campaign marker does not suppress new version', async page => {
    await page.addInitScript(() => sessionStorage.setItem('threadlabz:landing-intro:previous-campaign', 'seen'));
    await open(page); await page.keyboard.press('Escape'); await gone(page);
  });
  await check('blocked storage still plays and permits skip', async page => {
    await page.addInitScript(() => { Storage.prototype.getItem = () => { throw Error('blocked'); }; Storage.prototype.setItem = () => { throw Error('blocked'); }; });
    await open(page); await page.getByRole('button', { name: 'Skip intro' }).click(); await gone(page);
  });
  await check('video load failure', async page => {
    await page.route('**/_landing-intro/**', route => route.abort());
    await page.goto(base); await page.waitForTimeout(1800); await gone(page);
  });
  await check('autoplay rejection', async page => {
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
    await page.goto(base); await page.waitForTimeout(1800); await gone(page);
  });
  await check('startup timeout with unresolved play promise', async page => {
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => new Promise(() => {}); HTMLMediaElement.prototype.pause = function () {}; });
    await page.route('**/_landing-intro/**', async route => { await new Promise(resolve => setTimeout(resolve, 9000)); await route.abort().catch(() => {}); });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await intro(page).waitFor(); await gone(page);
  });
  await check('interruption/stall recovers by revealing storefront', async page => {
    await open(page); await page.waitForFunction(() => document.querySelector('video')?.currentTime > .5);
    await page.locator('video').evaluate(v => v.pause()); await gone(page);
  });
  await check('hidden tab pauses and resumes from the same position, then live reduced-motion reveals', async page => {
    await open(page); await page.waitForFunction(() => document.querySelector('video')?.currentTime > .5);
    const time = await page.locator('video').evaluate(v => v.currentTime);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('video').evaluate(v => v.paused), true);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(t => document.querySelector('video')?.currentTime > t + .2, time);
    await page.setViewportSize({ width: 390, height: 740 });
    assert.equal((await intro(page).boundingBox()).height, 740);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await gone(page);
  });
  await check('navigation during intro cleans up and does not replay', async page => {
    await open(page);
    // Programmatic click exercises a real Next Link route change while the modal is open.
    await page.locator('header a[href="/shop"]').evaluate(el => el.click());
    await page.waitForURL('**/shop'); await gone(page);
    await page.locator('header').getByRole('link', { name: 'ThreadLabz home' }).click(); await page.waitForURL(base + '/');
    await page.waitForTimeout(500); assert.equal(await intro(page).count(), 0);
  });
  await check('reduced motion bypasses without fetching video', async page => {
    let videos = 0; page.on('request', req => { if (req.url().includes('/_landing-intro/')) videos++; });
    await page.goto(base); await page.waitForTimeout(800); assert.equal(await intro(page).count(), 0); assert.equal(videos, 0);
  }, { reducedMotion: 'reduce' });
  await check('JavaScript-disabled storefront remains visible', async page => {
    await page.goto(base); assert.equal(await page.locator('.home').isVisible(), true); assert.equal(await intro(page).count(), 0);
  }, { javaScriptEnabled: false });
  await check('other routes never request video; internal homepage arrival bypasses', async (page, context) => {
    let videos = 0; context.on('request', req => { if (req.url().includes('/_landing-intro/')) videos++; });
    for (const route of ['/shop', '/products/missing-intro-test-product', '/cart', '/login', '/account', '/checkout', '/admin']) {
      console.log(`  no-intro route: ${route}`);
      const routePage = await context.newPage();
      const response = await routePage.goto(base + route, { waitUntil: 'commit', timeout: 10000 }); assert.ok(response.status() < 500, route);
      await routePage.waitForTimeout(600);
      assert.equal(await intro(routePage).count(), 0, route);
      await routePage.close();
    }
    await page.goto(base + '/shop', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.locator('header').getByRole('link', { name: 'ThreadLabz home' }).click(); await page.waitForURL(base + '/');
    await page.waitForTimeout(800); assert.equal(await intro(page).count(), 0); assert.equal(videos, 0);
  });
  const response = await fetch(base + manifest.asset.src);
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /video\/mp4/);
  assert.match(response.headers.get('cache-control'), /immutable/);
  results.push({ name: 'generated video served', result: 'passed', cacheControl: response.headers.get('cache-control') });
} finally {
  fs.writeFileSync(path.join(output, process.env.QA_INTRO_FILTER ? 'filtered-report.json' : 'report.json'), JSON.stringify(results, null, 2));
  await browser.close();
}

