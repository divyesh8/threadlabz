# ThreadLabz landing intro

The existing homepage and commerce modules remain intact. The homepage adds an isolated client entry and passes it a build-generated manifest. The root layout, shared header/footer, catalogue, authentication, cart, checkout, admin, payments and database code are unchanged.

Repository audit: Next.js 16.4 App Router; homepage `src/app/page.tsx`; root shell `src/app/layout.tsx`; existing loading UI `src/app/loading.tsx`. The hero already uses Framer Motion and Embla, so the intro reuses Framer Motion. Existing CSS/Tailwind and Zod handle styling and configuration. Browser-only admission and playback are contained in client components; discovery is a Node build step. Static media uses the existing `public/` convention. Existing lint/import-boundary, TypeScript, Node tests, isolated production builds and Playwright fixture scripts were inspected before implementation.

## Replace a campaign

1. Open `public/landing-video/` and remove the previous video.
2. Add the new `.mp4`, `.webm` or `.mov` file under any filename.
3. Commit the source asset and deploy using **`npm run build`**.

No JSX, imports, configuration, duration or animation edits are needed. Restart `npm run dev` after replacing assets locally. `npm run intro:generate` also regenerates on demand. Removing every video disables the intro.

## Files and structure

```text
public/
  landing-video/1000100811.mp4           # user-managed source
  _landing-intro/<sha256>.mp4            # generated, ignored by Git
src/features/landing-intro/
  components/
    LandingIntro.tsx
    IntroTransition.tsx
    NoScriptHome.tsx
    landing-intro.module.css
  hooks/useLandingIntro.ts
  config/intro.config.ts
  generated/manifest.json               # generated, ignored by Git
  session.ts
  index.ts
scripts/
  generate-landing-manifest.mjs
  landing-manifest.test.mjs
  check-landing-intro.mjs
  fixtures/landing-intro-server.mjs
docs/landing-intro.md
```

Modified existing files: `src/app/page.tsx`, `next.config.ts`, `package.json`, `package-lock.json`, `.gitignore`, and `scripts/check-layout.mjs` (dismiss the intro before its existing shop assertions). Pre-existing Supabase dependency edits and other untracked user files were retained.

## Discovery and deployment

`npm run dev`, `build`, `build:local`, `lint` and `typecheck` run the generator first. Vercel should use `npm ci --include=dev --include=optional` and `npm run build`; do not replace the build command with bare `next build`. Generated files are created before Next compiles and before Vercel packages public assets. No media tool runs in a request or in the browser.

Discovery checks regular, non-hidden files in the source folder only. It ignores directories, symlinks, images, JSON, Markdown and other extensions. FFprobe verifies the container, real video stream, dimensions and duration. FFmpeg decodes the complete video/audio streams, rejecting corrupt data. Extension/container mismatches and invalid media produce actionable build warnings and cannot be selected.

H.264/yuv420p MP4 with optional AAC audio is remuxed with fast-start metadata. VP8/VP9 WebM with compatible audio can be copied. MOV and other decodable incompatible codecs are converted to H.264/AAC MP4 with FFmpeg. Conversion/validation failures are excluded with a warning. Zero valid assets emits a null manifest and bypasses the intro. Multiple valid assets select the first filename in stable Unicode alphabetical order, with a warning naming it. Exactly one asset plays.

Only build-time media-tool packages were added. They install platform binaries for Windows/macOS/Linux, including Vercel Linux. Custom installations can set `FFMPEG_PATH` and `FFPROBE_PATH`. If the tools are unavailable, the generator warns and disables the campaign rather than blocking the shop. Per-tool processing is bounded to five minutes; unusually large campaigns should be compressed before uploading.

The manifest includes the source filename, output URL, SHA-256 campaign version, dimensions, display aspect ratio (including pixel-aspect metadata), duration and audio availability. The duration is metadata only; playback ends on the browser's `ended` event. Generated files live outside the source folder. Only generated hash-named outputs are cleaned up. Fingerprinted URLs receive `public, max-age=31536000, immutable`; replacing bytes changes the URL and session key. No service worker is introduced. Increment the generator's pipeline version if the encoding policy itself changes.

## Playback and presentation

Muted, inline autoplay plays once. Optional sound activation requires a button click and uses the video's own audio. A 200ms final-frame hold leads into a 1000ms Framer Motion transition: a 1.035x depth movement, restrained opacity fade, and black upper/lower curtains moving offscreen with deliberate easing. There are no image backdrops or extra logos/text. Skip and Escape begin the reveal immediately without the hold.

The full video remains visible with `object-fit: contain` on a dark full-viewport stage. This handles portrait and landscape without stretching or destructive cropping. CSS uses dynamic viewport height and safe-area control spacing. Sound and skip targets are at least 44px. Browser checks cover 390, 768, 1280 and 1440px plus a viewport-height change.

A native modal dialog makes the mounted shop, shared navigation and footer inert during playback and traps keyboard focus. Cleanup closes the dialog, restores overflow, scroll position and focus, and releases timers/listeners/media playback. Reduced-motion preference bypasses the film; changing the preference during playback reveals immediately.

Admission occurs after hydration, keeping server and initial client HTML identical. No video element or preload is emitted for other routes. A session marker is stored when a campaign is attempted, so skip, errors, navigation away and mid-film refreshes cannot cause replays. Internal arrivals from another document entry route bypass the campaign. New campaign hashes invalidate old markers. Storage access is guarded, with an in-memory fallback when blocked; a full reload cannot preserve a marker if the browser refuses all storage. A new independent tab/session plays again; browsers may copy sessionStorage when duplicating a tab.

## Recovery

- Startup without playback progress: reveal after 5 seconds.
- Playback stalls or unexpected pauses: reveal after 8 seconds without progress.
- Missing media, codec/load errors or rejected play promise: reveal immediately.
- Hidden tab: pause and suspend watchdog; resume the current position when visible. Completed films never restart.
- Navigation/unmount: cancel pending work and restore the page.
- JavaScript disabled: no intro mounts. A homepage-only noscript style exposes the existing streamed homepage that Next's loading boundary otherwise leaves hidden, and positions it above the footer. It also exposes the hero's server-rendered text. Normal JavaScript-enabled styling is unaffected.

The existing Next loading screen is retained. Intro configuration is validated with the existing Zod dependency; unsupported sound-on autoplay and looping configurations are rejected.

## Verification commands

```sh
npm run lint
npm run typecheck
npm test
npm run build:local
# Terminal 1, isolated environment, no real credentials:
node scripts/fixtures/landing-intro-server.mjs --production
# Terminal 2:
npm run test:intro
```

Browser checks use the already-installed Playwright core and Microsoft Edge by default. Set `QA_BROWSER_CHANNEL` for another installed Chromium browser, `QA_BASE_URL` for another local port, or `PLAYWRIGHT_MODULE` for a different Playwright runtime. Reports and screenshots are in `artifacts/landing-intro/` (ignored by Git).

The asset tests create real media fixtures, including incompatible MOV, corrupt containers, WebM, and a replacement with a different filename, duration and orientation. The browser suite checks actual playback through its natural end, frame hold/reveal, skip, audio gesture, focus trapping/restoration, refresh/internal navigation, version markers, blocked storage, load/autoplay failure, startup/stall timeouts, tab visibility, rapid navigation, reduced motion, no-JavaScript content and other-route request isolation. Network restrictions and visibility events are simulated; real playback and DOM behavior run in the browser.

Existing product/admin and checkout suites can be run with `PLAYWRIGHT_MODULE=playwright-core` via `npm run test:product` and `npm run test:release`. These use disposable local PostgreSQL fixtures and mocked external Auth/Storage/payment transports, never live payments. Their reports stay under `artifacts/phase-7/browser/` and `artifacts/phase-8/browser/`.

This change is prepared locally; publishing/committing is left to the existing Git/Vercel workflow. Physical iOS Safari, real mobile network interruption and hosted production transactions require deployment/device verification. The installed Next.js 16.4.0 build reports a security advisory; upgrading that existing framework dependency should be handled separately.

## Results from this implementation

- `npm run lint`: passed, including import boundaries (115 modules).
- `npm run typecheck`: passed.
- `npm run test:intro`: all 17 browser/report checks passed on the production build, including all four viewport widths, natural playback completion, curtain reveal, recovery, keyboard/axe checks, no-JavaScript rendering and route isolation. Final manifest and generated media were also verified byte-for-byte unchanged after the last generator refinement.
- `npm test`: 103 passed, 0 failed, including 9 new media-discovery/replacement tests.
- `npm run build:local`: passed on the final source, after the installed Next security-advisory interruption was retried.
- `npm run test:release` with `PLAYWRIGHT_MODULE=playwright-core`: passed. Production build, checkout at all four widths, real local cart/order RPCs, mocked gateway capture/reload recovery, foreign-session isolation, and the existing shared-layout/navigation suite passed. Five-route observations at 390/1280px recorded no browser errors. The existing homepage slide counter has a contrast finding at 1280px; the release script records accessibility observations rather than asserting all of them are empty.
- Full `test:product`: passed its product cases at 390/768/1280px, then failed at 1440px because the existing Red swatch label intercepted the radio click. A targeted `QA_VIEWPORTS=none` follow-up passed the preceding admin edit/authorization/image/error checks, then the server restart was stopped by the framework security advisory before the final shipping-policy assertion. The complete product suite is **not** claimed as passed. Business/UI source for these cases was not modified.

For intro-specific browser results, see `artifacts/landing-intro/report.json` and the accompanying screenshots. They are local verification artifacts rather than committed application assets.
