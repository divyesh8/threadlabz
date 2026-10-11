# ThreadLabz

Make Your Mark. An India-first clothing, costumes and customization store.

## Run locally

Use Node 24 LTS and npm. From this directory:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. Phase 0 runs without any service credentials.

```powershell
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

Do not run `dev` and `start` on the same port simultaneously.

## Current state

This is a store preview, not a transactional store. The layout shell includes all requested homepage sections, responsive navigation, a controllable Embla slider, brand assets, fonts, loading/error pages and a web app manifest. Collection cards are visual fixtures; search, accounts, wishlist, checkout and newsletter explicitly explain their preview status. No payment or email collection is simulated. Indexing stays disabled until launch.

Follow `PROGRESS.md` for completed phases, verification, blockers and next work. The project starts without a remote Git repository; connect the intended origin before publishing.

## Project structure

```text
src/app/                    App Router pages and shared theme
src/components/brand/       Supplied logo and loading monogram
src/components/store/       Header, footer, mobile nav, homepage sections
src/components/ui/          shadcn-compatible component primitives
src/lib/                    Shared utilities and labelled catalogue fixtures
public/brand/               Original user-supplied logo files
public/images/previews/     Photography extracted from user-supplied PDFs
public/images/placeholders/ Original SVG collection illustrations
scripts/                   Local verification tools
docs/                      Brand provenance and implementation decisions
```

## Secrets

Store credentials in `.env.local` only. `.env*` is ignored except the empty template `.env.example`. Never add service-role, Razorpay or Resend secrets to any `NEXT_PUBLIC_*` variable. Local previews do not need credentials. Deployment environment configuration will be handled in the deployment phase.

## Browser QA

`scripts/check-layout.mjs` uses an existing Playwright installation and the installed Edge browser. It is a development verification tool, not an additional application library. Start the production server first, then point `PLAYWRIGHT_MODULE` to the available Playwright package:

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/kolli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node scripts/check-layout.mjs
```

Reports and full-page screenshots are written under ignored `artifacts/phase-0/`. QA checks 390px and 1280px viewports, page overflow, broken images, control sizes, carousel, mobile menu, search handoff, status routes, 404 and browser exceptions. Manual screenshot inspection is still required.

## Dependencies

Packages are pinned and `package-lock.json` is tracked. Production dependency audit passed at setup. There is an upstream development-only `braces` advisory via Next's ESLint plugin; no patched braces version was published at verification. Do not use `npm audit fix --force`, which proposes downgrading Next's lint config across major versions. Track the advisory in `PROGRESS.md`.
