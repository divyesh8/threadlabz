# ThreadLabz

Make Your Mark. An India-first clothing, costumes and customization storefront.

## Current state

Phase 5 (Staging Integration, E2E Commerce Validation, and Lifecycle Readiness) is verified and implemented locally on branch `codex/domain-structure`:
- **Server-Authoritative Cart (`/cart`)**: Supports guest and authenticated sessions, integer paise calculations, variant stock bounds (1–10), and login merge.
- **Server-Authoritative Checkout (`/checkout`)**: Immutable order line snapshots, atomic PostgreSQL stock reservations (`reserve_stock`), and delivery address validation.
- **Reservation Expiry & Finalization**: 15-minute lease with idempotent recovery (`release_expired_stock_reservations`), stock consumption on captured payment (`finalize_order_stock`), and automatic reservation release on failure (`release_order_reservations`).
- **Razorpay Test Integration**: Timing-safe HMAC-SHA256 signature verification and idempotent webhook handling (`/api/webhooks/razorpay`) with `webhook_events` audit tracking.
- **Catalogue Integrity**: Seed/demo/test records (`source IN ('seed', 'test')`) are strictly excluded from public storefront queries.
- **Commerce Observability**: Production-safe, PII-sanitized structured event logging (`src/lib/observability/commerce-logger.ts`) tracking 11 core commerce events.

See [docs/CATALOGUE_CHECKLIST.md](docs/CATALOGUE_CHECKLIST.md) for product import specifications, [PROGRESS.md](PROGRESS.md) for actual test results, and [docs/STRUCTURE.md](docs/STRUCTURE.md) for architecture.

## Run locally

Use Node 24 LTS (minimum 22.18) and npm:

```powershell
npm ci
npm run dev
```

The app starts without credentials and clearly reports the disconnected catalogue. To connect, set names from `.env.example` in ignored `.env.local`; never paste credentials into chat or commit them. Public catalogue requests use a cookieless publishable client, with no service key. `SITE_URL` is the canonical origin. Admin actions retain `requireAdmin()` and use the verified user's session.

## Verification

Run the full verification suite:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The automated test runner (`npm test`) executes all 5 test suites (46 tests total) using Node's native test runner and `@electric-sql/pglite` WASM Postgres:
- `scripts/phase1.test.mjs`: URL canonicalization, open redirect allowlists, auth bounds.
- `scripts/phase3.test.mjs`: Filter normalization, UUID image paths, raster signatures.
- `scripts/phase4.test.mjs`: Integer-paise calculations, discount clamping, address schemas, HMAC signatures.
- `scripts/phase4-db.test.mjs`: Real migration execution, atomic `reserve_stock`, overselling prevention, and webhook deduplication.
- `scripts/phase5-commerce-e2e.test.mjs`: 24 core commerce invariants, reservation expiry recovery, payment reconciliation, and stock finalization.

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
- `supabase`: migrations (`001_schema.sql` through `20261012010000_phase_5_commerce_lifecycle.sql`), fixtures, and test scripts.

## Next phase

Before activating live production sales, the store owner must configure:
1. Razorpay API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
2. GSTIN registration and tax slab confirmation (5% vs 12%).
3. Courier delivery partner and serviceable Indian postal PIN codes.
4. Genuine garment inventory with verified stock counts and approved 4:5 studio photography.
5. Review and approve database migrations on the dedicated development Supabase instance.
