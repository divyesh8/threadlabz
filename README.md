# ThreadLabz

Make Your Mark. An India-first clothing, costumes and customization store.

## Run locally

Use Node 24 LTS and npm. From this directory:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. The preview runs without service credentials. Node 22.18+ is required for the built-in TypeScript tests; Node 24 LTS is recommended.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

Do not run `dev` and `start` on the same port simultaneously.

## Current state

This is a store preview with a local Phase 1 foundation, not a transactional store. The design and supplied assets are preserved. Supabase schema/RLS, private product imagery, SSR auth and a real catalogue query path are implemented. Without configuration, accounts remain unavailable and the shop keeps clearly labelled preview photos. When configured, `/shop` reads only published non-demo products, or shows an explicit empty/error state. Wishlist/address UI, payments, orders, newsletter collection and admin mutations remain unavailable. Indexing stays disabled until launch.

Follow `PROGRESS.md` for exact verification and blockers, and [docs/PHASE-1.md](docs/PHASE-1.md) for the schema, access model, configuration and non-destructive local database verification commands. The existing Git remote is `https://github.com/divyesh8/threadlabz`; this run does not push or deploy changes.

## Project structure

```text
src/app/                    App Router pages and shared theme
src/components/brand/       Supplied logo and loading monogram
src/components/store/       Header, footer, mobile nav, homepage sections
src/components/ui/          shadcn-compatible component primitives
src/lib/                    Shared utilities and labelled catalogue fixtures
src/lib/supabase/           Typed browser/server/public clients and session refresh
src/lib/auth/               Auth validation and verified profile initialization
src/lib/catalogue/          Validated server-side catalogue queries
supabase/                  Local config, additive migration, demo seed and pgTAP tests
public/brand/               Original user-supplied logo files
public/images/previews/     Photography extracted from user-supplied PDFs
public/images/placeholders/ Original SVG collection illustrations
scripts/                   Local verification tools
docs/                      Brand provenance and implementation decisions
```

## Secrets

Store credentials in `.env.local` only. `.env*` is ignored except the names-only `.env.example`. The app uses a Supabase URL, publishable key and canonical `SITE_URL`; no privileged key is needed. Never add service-role, Razorpay or Resend secrets to any `NEXT_PUBLIC_*` variable. Local previews do not need credentials. Confirm the project identity before any remote mutation. Never paste secrets into chat.

## Browser QA

`scripts/check-layout.mjs` uses an existing Playwright installation and the installed Edge browser. It is a development verification tool, not an additional application library. Start the production server first, then point `PLAYWRIGHT_MODULE` to the available Playwright package:

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/kolli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node scripts/check-layout.mjs
```

Reports and screenshots default to ignored `artifacts/phase-0/`; `QA_OUTPUT` and `QA_BASE_URL` can override the output folder and server. QA checks 390px and 1280px viewports, page overflow, broken images, control sizes, carousel, mobile menu, search handoff, status routes, 404 and browser exceptions. `node scripts/check-phase1.mjs` adds isolated mocked auth/catalogue tests; these are not real Supabase integration tests. Manual screenshot inspection is still required. See the Phase 1 guide for exact commands and limitations.

## Dependencies

Packages are pinned and `package-lock.json` is tracked. Production dependency audit passed at setup. There is an upstream development-only `braces` advisory via Next's ESLint plugin; no patched braces version was published at verification. Do not use `npm audit fix --force`, which proposes downgrading Next's lint config across major versions. Track the advisory in `PROGRESS.md`.
