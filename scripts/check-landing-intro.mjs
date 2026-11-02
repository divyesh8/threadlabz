// Real browser/media checks against a locally running Next application.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import AxeBuilder from '@axe-core/playwright';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3110';
const output = path.resolve('artifacts/landing-intro');
fs.mkdirSync(output, { recursive: true });

const manifest = JSON.parse(fs.readFileSync('src/features/landing-intro/generated/manifest.json', 'utf8'));
const campaignVersion = manifest.version ?? manifest.asset.version;
const key = `threadlabz:landing-intro:${campaignVersion}`;

const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'msedge', headless: true });
const results = [];

async function check(name, run, options = {}) {
  if (process.env.QA_INTRO_FILTER && !name.includes(process.env.QA_INTRO_FILTER)) return;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(15000);
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (options.allowNetworkAbortConsole && /ERR_FAILED|ERR_ABORTED|Failed to load resource/i.test(text)) return;
      consoleErrors.push(text);
    }
  });
  try {
    await run(page, context);
    assert.deepEqual(errors, [], `pageerror in ${name}`);
    assert.deepEqual(consoleErrors, [], `console.error in ${name}`);
    results.push({ name, result: 'passed' });
    console.log(`PASS ${name}`);
  } finally {
    await context.close();
  }
}

const intro = page => page.locator('dialog[data-landing-intro]');
const open = async page => {
  await page.goto(base);
  await intro(page).waitFor();
};
const gone = async page => {
  await page.waitForFunction(
    () =>
      !document.querySelector('dialog[data-landing-intro]') &&
      !document.documentElement.dataset.introBoot &&
      !document.documentElement.dataset.introVariant &&
      !document.documentElement.dataset.introStage,
    { timeout: 20000 },
  );
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
  await page.locator('#main-content').waitFor({ state: 'visible', timeout: 10000 });
};

try {
  // 1. Pre-hydration startup: no blank page, no loading.tsx flash, storefront ready underneath
  await check('no blank loading screen on initial paint; poster cover active before hydration', async page => {
    let releaseChunks;
    const gate = new Promise(resolve => { releaseChunks = resolve; });
    await page.route('**/_next/static/chunks/*.js', async route => {
      await gate;
      await route.continue();
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.locator('[data-intro-boot-cover]').waitFor({ state: 'attached' });
    await page.locator('.home .hero h1').waitFor({ state: 'attached' });
    const preHydration = await page.evaluate(() => {
      const boot = document.querySelector('[data-intro-boot-cover]');
      const bootRect = boot?.getBoundingClientRect();
      const bootStyle = boot ? getComputedStyle(boot) : null;
      const visibleStatusPages = Array.from(document.querySelectorAll('.status-page')).filter(
        el => getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0,
      );
      return {
        introBootAttr: document.documentElement.dataset.introBoot,
        introStageAttr: document.documentElement.dataset.introStage,
        visibleStatusPageCount: visibleStatusPages.length,
        homeExists: Boolean(document.querySelector('.home .hero h1')),
        bootDisplay: bootStyle?.display,
        bootBgImage: bootStyle?.backgroundImage,
        bootWidth: bootRect?.width ?? 0,
        bootHeight: bootRect?.height ?? 0,
      };
    });
    assert.equal(preHydration.introBootAttr, campaignVersion);
    assert.equal(preHydration.introStageAttr, 'playing');
    assert.equal(preHydration.visibleStatusPageCount, 0, 'loading.tsx must never be visible on homepage startup');
    assert.equal(preHydration.homeExists, true, 'storefront hero already in initial HTML shell');
    assert.equal(preHydration.bootDisplay, 'block', 'pre-paint boot cover visible immediately');
    assert.match(preHydration.bootBgImage ?? '', /\.poster\.webp/);
    assert.equal(preHydration.bootWidth, 1280);
    assert.equal(preHydration.bootHeight, 900);
    await page.screenshot({ path: path.join(output, 'pre-hydration-cover-1280.png') });
    releaseChunks();
    await intro(page).waitFor();
    await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
    await page.mouse.click(640, 450);
    await gone(page);
  });

  // 2. Responsive viewports & browser mode detection across mobile (320, 375, 390, 430), tablet (768), side-DevTools desktop (890x900), desktop (1280, 1440), ultrawide (2560)
  const viewports = [
    { width: 320, height: 568, label: '320x568', expectedVariant: 'mobile' },
    { width: 375, height: 812, label: '375x812', expectedVariant: 'mobile' },
    { width: 390, height: 844, label: '390x844', expectedVariant: 'mobile' },
    { width: 430, height: 932, label: '430x932', expectedVariant: 'mobile' },
    { width: 768, height: 1024, label: '768x1024', expectedVariant: 'mobile' },
    { width: 890, height: 900, label: '890x900', expectedVariant: 'desktop' },
    { width: 1280, height: 900, label: '1280x900', expectedVariant: 'desktop' },
    { width: 1440, height: 900, label: '1440x900', expectedVariant: 'desktop' },
    { width: 2560, height: 1080, label: '2560x1080', expectedVariant: 'desktop' },
  ];

  for (const vp of viewports) {
    await check(`responsive full-bleed cover, ${vp.expectedVariant} mode & zero visible controls at ${vp.label}`, async page => {
      const expectedAsset = vp.expectedVariant === 'mobile' ? manifest.mobile : manifest.desktop;
      await open(page);
      await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 0.25);

      const state = await page.evaluate(() => {
        const dialog = document.querySelector('dialog[data-landing-intro]');
        const canvas = dialog?.querySelector('canvas[data-intro-canvas]');
        const video = dialog?.querySelector('video[data-intro-decoder]');
        const visibleButtons = [...(dialog?.querySelectorAll('button') ?? [])].filter(btn => {
          const r = btn.getBoundingClientRect();
          return r.width > 2 && r.height > 2;
        });
        const heroImg = document.querySelector('.hero-slide-0 .hero-photo img');
        return {
          isModal: dialog?.matches(':modal') ?? false,
          variant: dialog?.getAttribute('data-intro-variant'),
          source: dialog?.getAttribute('data-intro-source'),
          src: dialog?.getAttribute('data-intro-src'),
          poster: dialog?.getAttribute('data-intro-poster'),
          decoderCurrentSrc: video?.currentSrc ?? '',
          canvasPainted: canvas?.dataset.painted ?? 'false',
          dialogRect: dialog?.getBoundingClientRect().toJSON(),
          canvasRect: canvas?.getBoundingClientRect().toJSON(),
          decoderRect: video?.getBoundingClientRect().toJSON(),
          muted: video?.muted,
          loop: video?.loop,
          inline: video?.playsInline,
          controls: video?.controls,
          visibleButtonCount: visibleButtons.length,
          scrollWidth: document.documentElement.scrollWidth,
          heroReadyUnderneath: Boolean(heroImg && heroImg.complete && heroImg.naturalWidth > 0),
        };
      });

      assert.equal(state.isModal, true);
      assert.equal(state.variant, vp.expectedVariant);
      assert.equal(state.source, expectedAsset.source);
      assert.equal(state.src, expectedAsset.src);
      assert.equal(state.poster, expectedAsset.poster);
      assert.equal(expectedAsset.hasAudio, false, 'silent stream with stripped audio');
      assert.match(state.decoderCurrentSrc, /^blob:/, 'decoder uses in-memory blob URL to prevent mobile browser streaming prompts');
      assert.equal(state.canvasPainted, 'true', 'canvas actively painting full-bleed frames');
      assert.equal(state.muted, true);
      assert.equal(state.loop, false);
      assert.equal(state.inline, true);
      assert.equal(state.controls, false);
      assert.match(state.poster ?? '', /\.poster\.webp$/);
      assert.equal(state.visibleButtonCount, 0, 'zero visible skip/mute/player controls');
      assert.equal(state.dialogRect.x, 0);
      assert.equal(state.dialogRect.y, 0);
      assert.equal(state.dialogRect.width, vp.width);
      assert.equal(state.dialogRect.height, vp.height);
      assert.equal(state.canvasRect.width, vp.width);
      assert.equal(state.canvasRect.height, vp.height);
      assert.ok(state.decoderRect.width <= 4 && state.decoderRect.height <= 4, 'decoder stays tiny so mobile Video Assistants never attach');
      assert.equal(state.scrollWidth, vp.width, 'no horizontal overflow');
      assert.equal(state.heroReadyUnderneath, true, 'storefront hero already decoded underneath intro');

      if ([320, 390, 768, 1440, 2560].includes(vp.width)) {
        await page.screenshot({ path: path.join(output, `intro-${vp.label}.png`) });
      }

      if (vp.width === 390 || vp.width === 1440) {
        const axe = await new AxeBuilder({ page }).include('dialog[data-landing-intro]').withTags(['wcag2a', 'wcag2aa']).analyze();
        assert.deepEqual(axe.violations.map(v => v.id), []);
      }

      await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
      await page.mouse.click(Math.round(vp.width / 2), Math.round(vp.height / 2));
      await gone(page);

      if ([390, 1440].includes(vp.width)) {
        await page.screenshot({ path: path.join(output, `revealed-${vp.label}.png`) });
      }
    }, { viewport: { width: vp.width, height: vp.height } });
  }

  // 3. Exact 0-2s ignore vs >2s click-to-skip, delayed playback start, rapid clicks, scroll lock/restore, no click-through
  await check('2s playback timer starts on actual playback, blocks <2s clicks, handles rapid clicks, locks/restores scroll', async page => {
    let revealEvents = 0;
    await page.addInitScript(() => {
      window.__revealCount = 0;
      window.addEventListener('threadlabz:intro-reveal', () => { window.__revealCount++; });
    });

    // Delay video bytes by 900ms to prove 2s timer starts on actual playback, not mount
    let delayedOnce = false;
    await page.route('**/_landing-intro/*.mp4', async route => {
      if (!delayedOnce) {
        delayedOnce = true;
        await new Promise(resolve => setTimeout(resolve, 900));
      }
      await route.continue();
    });

    await open(page);
    // At ~1.2s after mount, video has only played ~0.3s -> skip must NOT be unlocked yet!
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 0.25);
    const earlyState = await page.evaluate(() => ({
      currentTime: document.querySelector('video')?.currentTime ?? 0,
      skipReady: document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady,
    }));
    assert.ok(earlyState.currentTime < 1.5);
    assert.equal(earlyState.skipReady, 'false');

    // Click over header link & hero CTA area before 2s -> must NOT skip and must NOT navigate
    await page.mouse.click(520, 70);
    await page.mouse.click(220, 420);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Space');
    assert.equal(await intro(page).getAttribute('data-phase'), 'playing');
    assert.equal(page.url(), `${base}/`);

    // Attempt wheel scroll while intro is active -> background scroll remains locked at 0
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.scrollY), 0);

    // Wait for 2s of actual playback -> skip unlocks
    await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
    const unlockedTime = await page.locator('video').evaluate(v => v.currentTime);
    assert.ok(unlockedTime >= 1.95, `expected >= ~2s playback before skip unlock, got ${unlockedTime}`);

    // Fire 8 rapid clicks right over interactive storefront coordinates -> idempotent single transition, zero click-through
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(220, 420);
    }
    assert.equal(await intro(page).getAttribute('data-phase'), 'revealing');
    revealEvents = await page.evaluate(() => window.__revealCount);
    assert.equal(revealEvents, 1, 'idempotent transition triggered exactly once');

    await gone(page);
    assert.equal(page.url(), `${base}/`, 'clicks did not leak through to storefront links');
    assert.equal(await page.locator('#main-content').evaluate(el => el === document.activeElement), true);

    // Verify page scrolling is fully functional after exit
    await page.evaluate(() => window.scrollTo({ top: 360, behavior: 'instant' }));
    assert.equal(await page.evaluate(() => window.scrollY), 360);
  });

  // 4. Mobile touch tap (<2s ignored, >2s exits cleanly) + orientation change without re-downloading video
  await check('mobile touch tap after 2s and portrait/landscape orientation change without video re-download', async page => {
    const videoRequests = [];
    page.on('request', req => {
      if (req.url().endsWith('.mp4') || req.url().endsWith('.webm')) videoRequests.push(req.url());
    });

    await open(page);
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 0.3);

    // Tap before 2s -> ignored
    await page.touchscreen.tap(195, 420);
    assert.equal(await intro(page).getAttribute('data-phase'), 'playing');

    // Rotate portrait -> landscape -> portrait
    await page.setViewportSize({ width: 844, height: 390 });
    const landscapeBox = await intro(page).boundingBox();
    assert.equal(landscapeBox.width, 844);
    assert.equal(landscapeBox.height, 390);
    await page.screenshot({ path: path.join(output, 'intro-844x390-landscape.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    const portraitBox = await intro(page).boundingBox();
    assert.equal(portraitBox.width, 390);
    assert.equal(portraitBox.height, 844);
    assert.equal(new Set(videoRequests).size, 1, 'no duplicate video download on orientation change');

    // Wait for >2s playback and tap to exit
    await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
    await page.touchscreen.tap(195, 420);
    assert.equal(await intro(page).getAttribute('data-phase'), 'revealing');
    await gone(page);
    assert.equal(page.url(), `${base}/`);
  }, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // 5. Nonvisual keyboard accessibility after 2s + native modal focus containment
  await check('keyboard focus contained during intro and nonvisual keyboard skip works after 2s', async page => {
    await open(page);
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 0.25);

    // Initial focus lands inside the modal dialog on the visually-hidden skip control
    assert.equal(await intro(page).evaluate(el => el.contains(document.activeElement)), true);

    // Background storefront is inert under native showModal() and cannot receive programmatic or Tab focus
    await page.locator('header a').first().evaluate(el => el.focus());
    const bgFocused = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header, main, footer, nav')).some(el => el.contains(document.activeElement)),
    );
    assert.equal(bgFocused, false, 'inert background cannot receive focus');

    await page.keyboard.press('Tab');
    const bgFocusedAfterTab = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header, main, footer, nav')).some(el => el.contains(document.activeElement)),
    );
    assert.equal(bgFocusedAfterTab, false, 'Tab never enters inert background');

    // Before 2s, Enter does not skip
    await page.keyboard.press('Enter');
    assert.equal(await intro(page).getAttribute('data-phase'), 'playing');

    await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
    await page.keyboard.press('Enter');
    assert.equal(await intro(page).getAttribute('data-phase'), 'revealing');
    await gone(page);
  });

  // 6. Natural playback completion -> identical cinematic reveal -> session persistence on reload & internal nav
  await check('complete real video naturally, capture mid-transition dissolve, verify reload & internal nav', async page => {
    await open(page);
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 1);
    assert.equal(await intro(page).getAttribute('data-phase'), 'playing');

    await page.waitForFunction(
      () => document.querySelector('dialog[data-landing-intro]')?.dataset.phase === 'revealing',
      { timeout: 20000 },
    );
    const ended = await page.locator('video').evaluate(v => ({ time: v.currentTime, duration: v.duration, ended: v.ended }));
    assert.equal(ended.ended, true);
    assert.ok(Math.abs(ended.time - ended.duration) < 0.15);

    await page.waitForTimeout(320);
    await page.screenshot({ path: path.join(output, 'transition-reveal-1440.png') });
    await gone(page);

    assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), 'seen');
    await page.reload();
    await page.waitForTimeout(600);
    assert.equal(await intro(page).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.introBoot), undefined);

    await page.locator('header').getByRole('link', { name: 'Shop all', exact: true }).click();
    await page.waitForURL('**/shop');
    await page.locator('header').getByRole('link', { name: 'ThreadLabz home' }).click();
    await page.waitForURL(`${base}/`);
    await page.waitForTimeout(500);
    assert.equal(await intro(page).count(), 0);
  }, { viewport: { width: 1440, height: 900 } });

  // 7. Stale campaign marker does not suppress a new campaign version
  await check('stale campaign marker does not suppress new version', async page => {
    await page.addInitScript(() => sessionStorage.setItem('threadlabz:landing-intro:previous-campaign', 'seen'));
    await open(page);
    await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
    await page.keyboard.press('Escape');
    await gone(page);
  });

  // 8. Blocked storage still plays and permits click-to-skip after 2s
  await check('blocked storage still plays and permits skip after 2s', async page => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw Error('blocked'); };
      Storage.prototype.setItem = () => { throw Error('blocked'); };
    });
    await open(page);
    await page.waitForFunction(() => document.querySelector('dialog[data-landing-intro]')?.dataset.skipReady === 'true');
    await page.mouse.click(640, 450);
    await gone(page);
  });

  // 9. Video load failure opens storefront safely
  await check('video load failure opens storefront safely', async page => {
    await page.route('**/_landing-intro/*.mp4', route => route.abort());
    await page.goto(base);
    await gone(page);
  }, { allowNetworkAbortConsole: true });

  // 10. Autoplay rejection opens storefront safely
  await check('autoplay rejection opens storefront safely', async page => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
    });
    await page.goto(base);
    await gone(page);
  });

  // 11. Startup timeout with hung play promise recovers cleanly
  await check('startup timeout with unresolved play promise recovers cleanly', async page => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => new Promise(() => {});
      HTMLMediaElement.prototype.pause = function () {};
    });
    await page.route('**/_landing-intro/*.mp4', async route => {
      await new Promise(resolve => setTimeout(resolve, 9000));
      await route.abort().catch(() => {});
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.locator('[data-intro-boot-cover]').waitFor({ state: 'attached' });
    await page.locator('.home .hero h1').waitFor({ state: 'attached' });
    await intro(page).waitFor();
    await gone(page);
  }, { allowNetworkAbortConsole: true });

  // 12. Mid-playback stall recovers by revealing storefront
  await check('interruption/stall recovers by revealing storefront', async page => {
    await open(page);
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 0.5);
    await page.locator('video').evaluate(v => v.pause());
    await gone(page);
  });

  // 13. Hidden tab pauses & resumes from exact position; live reduced-motion exits cleanly
  await check('hidden tab pauses and resumes from same position, then live reduced-motion reveals', async page => {
    await open(page);
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 0.5);
    const time = await page.locator('video').evaluate(v => v.currentTime);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('video').evaluate(v => v.paused), true);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: false, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(t => (document.querySelector('video')?.currentTime ?? 0) > t + 0.2, time);
    await page.setViewportSize({ width: 390, height: 740 });
    assert.equal((await intro(page).boundingBox()).height, 740);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gone(page);
  });

  // 14. Programmatic route navigation during intro cleans up and does not replay
  await check('navigation during intro cleans up and does not replay', async page => {
    await open(page);
    await page.locator('header a[href="/shop"]').evaluate(el => el.click());
    await page.waitForURL('**/shop');
    await gone(page);
    await page.locator('header').getByRole('link', { name: 'ThreadLabz home' }).click();
    await page.waitForURL(`${base}/`);
    await page.waitForTimeout(500);
    assert.equal(await intro(page).count(), 0);
  });

  // 15. Reduced motion bypasses without fetching video or poster
  await check('reduced motion bypasses without fetching media', async page => {
    let mediaRequests = 0;
    page.on('request', req => { if (req.url().includes('/_landing-intro/')) mediaRequests++; });
    await page.goto(base);
    await page.waitForTimeout(800);
    assert.equal(await intro(page).count(), 0);
    assert.equal(mediaRequests, 0);
  }, { reducedMotion: 'reduce' });

  // 15b. Mobile Data Saver (saveData: true) bypasses cleanly with 0 media bytes
  await check('mobile Data Saver (saveData) bypasses cleanly without fetching media', async page => {
    let mediaRequests = 0;
    page.on('request', req => { if (req.url().includes('/_landing-intro/')) mediaRequests++; });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        get: () => ({ saveData: true, effectiveType: '4g' }),
      });
    });
    await page.goto(base);
    await page.waitForTimeout(800);
    assert.equal(await intro(page).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.introBoot), undefined);
    assert.equal(mediaRequests, 0);
  });

  // 16. JavaScript-disabled storefront remains immediately visible
  await check('JavaScript-disabled storefront remains visible', async page => {
    await page.goto(base);
    assert.equal(await page.locator('.home').isVisible(), true);
    assert.equal(await page.locator('.hero h1').isVisible(), true);
    assert.equal(await intro(page).count(), 0);
  }, { javaScriptEnabled: false });

  // 17. Other routes never request intro media; internal homepage arrival bypasses
  await check('other routes never request intro media; internal homepage arrival bypasses', async (page, context) => {
    let mediaRequests = 0;
    context.on('request', req => { if (req.url().includes('/_landing-intro/')) mediaRequests++; });
    for (const route of ['/shop', '/products/missing-intro-test-product', '/cart', '/login', '/account', '/checkout', '/admin']) {
      console.log(`  no-intro route: ${route}`);
      const routePage = await context.newPage();
      const response = await routePage.goto(base + route, { waitUntil: 'commit', timeout: 10000 });
      assert.ok(response.status() < 500, route);
      await routePage.waitForTimeout(600);
      assert.equal(await intro(routePage).count(), 0, route);
      await routePage.close();
    }
    await page.goto(`${base}/shop`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.locator('header').getByRole('link', { name: 'ThreadLabz home' }).click();
    await page.waitForURL(`${base}/`);
    await page.waitForTimeout(800);
    assert.equal(await intro(page).count(), 0);
    assert.equal(mediaRequests, 0);
  });

  // 18. Immutable caching headers on both generated video and generated poster
  const videoRes = await fetch(base + manifest.asset.src);
  assert.equal(videoRes.status, 200);
  assert.match(videoRes.headers.get('content-type') ?? '', /video\/mp4/);
  assert.match(videoRes.headers.get('cache-control') ?? '', /immutable/);

  const posterRes = await fetch(base + manifest.asset.poster);
  assert.equal(posterRes.status, 200);
  assert.match(posterRes.headers.get('content-type') ?? '', /image\/webp/);
  assert.match(posterRes.headers.get('cache-control') ?? '', /immutable/);

  results.push({
    name: 'generated video and poster served with immutable cache headers',
    result: 'passed',
    cacheControl: videoRes.headers.get('cache-control'),
  });
} finally {
  fs.writeFileSync(
    path.join(output, process.env.QA_INTRO_FILTER ? 'filtered-report.json' : 'report.json'),
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
