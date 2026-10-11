# ThreadLabz

Make Your Mark. An India-first clothing, costumes and customization storefront.

## Current state

Phase 4 (Commerce & Payment Readiness Foundation) is implemented locally on branch `codex/domain-structure`:
- Server-authoritative Cart (`/cart`) supporting guest and authenticated sessions, integer paise calculations, and stock revalidation.
- Server-authoritative Checkout (`/checkout`) with immutable order line snapshots and atomic PostgreSQL stock reservations (`reserve_stock`).
- Razorpay test mode integration with timing-safe HMAC-SHA256 signature verification and idempotent webhook handling (`/api/webhooks/razorpay`).
- Catalogue data integrity: seed/demo records are excluded from public storefront queries. The store will not accept real orders until the owner provides real inventory, courier rules, GST details, and payment credentials.

See [docs/CATALOGUE_CHECKLIST.md](docs/CATALOGUE_CHECKLIST.md) for the product import specifications, [PROGRESS.md](PROGRESS.md) for actual test results, and [docs/STRUCTURE.md](docs/STRUCTURE.md) for architecture.

## Run locally

Use Node 24 LTS (minimum 22.18) and npm:

```powershell
npm ci
npm run dev
```

The app starts without credentials and clearly reports the disconnected catalogue. To connect, set names from .env.example in ignored .env.local; never paste credentials into chat or commit them. Public catalogue requests use a cookieless publishable client, with no service key. SITE_URL is the canonical origin. Admin actions retain requireAdmin() and use the verified user's session.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run start -- --hostname 127.0.0.1 --port 3200
```

Use a free port. Do not run dev and start against the same port. In a second terminal:

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/kolli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:QA_BASE_URL='http://127.0.0.1:3200'
$env:QA_OUTPUT='artifacts/phase-3/local'
node scripts/check-layout.mjs
node scripts/check-phase1.mjs
node scripts/check-phase3.mjs
```

The contract suites own temporary dev servers on 3101/3102 and must run **sequentially**, with other next dev instances in this checkout stopped. They use synthetic loopback services and do not write real data. Screenshots/reports are under ignored artifacts/. The Phase 3 suite uses clearly labelled local fixtures with reference photography solely for layout QA. It is not evidence that real SKU photography exists.

Database runtime checks need Docker's Linux engine. The existing schema histories conflict, so **do not run the root migration chain against any database**. Prepare the isolated local workspace first:

```powershell
node scripts/prepare-phase3-db.mjs
supabase start --workdir tmp/phase3-db
supabase migration list --local --workdir tmp/phase3-db
npm run db:lint
npm run test:db
```

No reset or remote apply is needed. See the Phase 3 guide before reviewing the unapplied security migration. The older root seed.sql and access_control_test.sql target the superseded Phase 1 model. scripts/seed-products.ts is now restricted to localhost and creates inactive, labelled demo products; never use demo data for commerce.

## Structure

The app uses a domain-oriented layout within the existing single Next.js project. See [docs/STRUCTURE.md](docs/STRUCTURE.md) for ownership rules, the move map, legacy-code findings and before/after verification.

- `src/app`: existing routes, layouts, metadata and HTTP handlers, including `/shop`, `/products/[slug]`, `/catalogue-image/[id]` and protected `/admin/media`.
- `src/features/auth`: account Server Actions, forms, schemas and profile initialization.
- `src/features/catalogue`: public catalogue queries, filters, product UI, types and labelled moodboard data. Older unused queries are retained under `services/legacy`.
- `src/features/admin`: guarded mutations/uploads, management forms and validation.
- `src/features/media`: image components and shared Storage-path/raster validation.
- `src/components`: shared storefront/admin shells, brand presentation and UI primitives.
- `src/lib`: auth guards, Supabase adapters, canonical site config and utilities; `src/types/database.ts` remains the generated shared database contract.
- `supabase` and `scripts`: unchanged database layout and existing QA/seed workflows; npm unit-test imports follow the moved modules.

No application dependency was added. Next.js 16.4.0, React 19.3.0 and Supabase packages remain pinned with the existing lockfile.

## Next phase

Curate verified product records and approved SKU photographs, then verify the proposed database boundaries on the isolated local/development target. Reconcile migration history before any separately authorized deployment. Only then plan cart/wishlist, checkout, payment, fulfilment and approved customer policies.
