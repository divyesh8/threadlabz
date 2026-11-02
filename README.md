# ThreadLabz

Make Your Mark. An India-first clothing, costumes and customization storefront.

## Current state

**21 October 2026 — Phase 8:** local environment isolation, canonical migration replay, CI, test-only payment popup/recovery and release procedures are implemented on `codex/phase-8-staging-release`. No commit, push, deployment or remote database mutation was performed. **Production readiness is not demonstrated:** hosted project access, real staging/provider verification and full Supabase local-stack checks remain blocked.

Current capabilities, built on the existing feature architecture:
- **Server-Authoritative Cart (`/cart`)**: Supports guest and authenticated sessions, integer paise calculations, variant stock bounds (1–10), and login merge.
- **Server-Authoritative Checkout (`/checkout`)**: Immutable order line snapshots, atomic PostgreSQL stock reservations (`reserve_stock`), and delivery address validation.
- **Reservation Expiry & Finalization**: 15-minute lease with idempotent recovery (`release_expired_stock_reservations`), stock consumption on captured payment (`finalize_order_stock`), and automatic reservation release on failure (`release_order_reservations`).
- **Razorpay Test Integration**: Explicit test-only gate, browser popup, owner-scoped saved-order recovery, server API capture verification and idempotent signed webhook inbox. Tests use mocked provider transport; genuine Razorpay sandbox is not verified. Production checkout remains disabled.
- **Catalogue Integrity**: Seed/demo/test records (`source IN ('seed', 'test')`) are strictly excluded from public storefront queries.
- **Commerce Observability**: Production-safe, PII-sanitized structured event logging (`src/lib/observability/commerce-logger.ts`) tracking 11 core commerce events.

See [docs/CATALOGUE_CHECKLIST.md](docs/CATALOGUE_CHECKLIST.md) for product import specifications, [PROGRESS.md](PROGRESS.md) for actual test results, and [docs/STRUCTURE.md](docs/STRUCTURE.md) for architecture.

Read [Phase 8 assessment](docs/PHASE-8-STAGING-RELEASE.md), [deployment and recovery runbook](docs/DEPLOYMENT-RUNBOOK.md), and [staging evidence matrix](docs/STAGING-TEST-MATRIX.md) before any hosted operation. Earlier phase documentation is historical and does not prove a hosted test passed.

## Run locally

Use Node 24 LTS (minimum 22.18) and npm:

```powershell
npm ci
npm run dev
```

The app starts without credentials and clearly reports the disconnected catalogue. Set `.env.example` names in ignored `.env.local` only for an isolated **loopback** Supabase stack. The runtime now rejects hosted database URLs in local development, mismatched staging/production identities and live payment keys. Replace any old hosted local configuration before `npm run dev`; tests and `build:local` clear inherited/dotenv service credentials automatically. Public catalogue requests use a cookieless publishable client. Admin actions retain `requireAdmin()` and the verified user's session.

## Verification

Run the full verification suite:

```powershell
npm run lint
npm run typecheck
npm test
npm run check:migrations
npm run build:local
git diff --check
```

The automated test runner (`npm test`) executes 8 test files (94 tests total) using Node's native test runner and disposable `@electric-sql/pglite` PostgreSQL:
- `scripts/phase1.test.mjs`: URL canonicalization, open redirect allowlists, auth bounds.
- `scripts/phase3.test.mjs`: Filter normalization, UUID image paths, raster signatures.
- `scripts/phase4.test.mjs`: Integer-paise calculations, discount clamping, address schemas, HMAC signatures.
- `scripts/phase4-db.test.mjs`: Real migration execution, atomic `reserve_stock`, overselling prevention, and webhook deduplication.
- `scripts/phase5-commerce-e2e.test.mjs`: 24 core commerce invariants, reservation expiry recovery, payment reconciliation, and stock finalization.
- `scripts/commerce-reliability.test.mjs`: actual application services/actions/webhook handler with transactional SQL and injected failures. External transport/auth are synthetic; this is not authenticated staging verification.
- `scripts/phase7.test.mjs`: verified product details, size guide, stock-aware variants, policy data and guarded admin persistence.
- `scripts/phase8.test.mjs`: environment isolation, privilege boundaries, data-preserving upgrades, preflight hazards and schema drift detection.

Browser checks: `node scripts/check-phase1.mjs`, `node scripts/check-phase3.mjs`, `npm run test:product`, `npm run test:release`, run serially with an external installed Playwright/Edge runtime. See the runbook for setup. The release suite builds the optimized app, exercises test checkout at four widths, measures five routes, and runs the shared layout suite. Full-stack `test:db` / `db:lint` require a working local Docker/Supabase engine; disposable SQL tests do not replace them.

## Structure

The app uses a domain-oriented layout within the existing single Next.js project. See [docs/STRUCTURE.md](docs/STRUCTURE.md) for ownership rules and architecture.

- `src/app`: existing routes, layouts, metadata and HTTP handlers, including `/shop`, `/products/[slug]`, `/cart`, `/checkout`, and `/api/webhooks/razorpay`.
- `src/features/auth`: account Server Actions, forms, schemas and profile initialization.
- `src/features/catalogue`: public catalogue queries, filters, product UI, types, and safe dev fixtures.
- `src/features/cart`: types, schemas, services, actions, and interactive UI for shopping bag.
- `src/features/checkout`: pricing engine, signatures, payment services, order creation, and truthful checkout UI.
- `src/features/admin`: guarded mutations/uploads, management forms and validation.
- `src/features/media`: image components and shared Storage-path/raster validation.
- `src/lib/observability`: structured commerce event logger.
- `src/lib/config`: runtime environment validation and server-only configuration.
- `supabase`: seven canonical migrations through Phase 8, preserved alternative history, reviewed migration hashes, drift contract, read-only preflight and isolated test fixtures.
- `.github/workflows/ci.yml`: least-privilege PR/develop quality checks; no deploy job. `vercel.json` disables Git-triggered deployments and validates build configuration.

## Release gates

The next work should be an owner-approved staging verification and operational rehearsal: confirm the correct Supabase project, provision/select a separate staging target, inspect its applied history read-only, rehearse migrations, verify real Auth/Storage/RLS and exercise genuine Razorpay TEST payments. Resolve the existing dependency-toolchain advisory, performance/accessibility findings and recovery ownership before assessing production readiness. Real tax, shipping, inventory and product policy data remain owner responsibilities. Live payments require a separate reviewed phase; this code rejects live credentials.
