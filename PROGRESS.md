# ThreadLabz progress

Updated: 12 October 2026 (Asia/Calcutta)

## Domain structure refactor

**Complete locally and verified; not deployed.** Started from clean `main` at `b326e6bb6f454c6bd2bd6860d31e5f82e2d2833d`, with changes on `codex/domain-structure`. The app remains one root-level Next.js deployment using npm and the existing lockfile.

- Mapped all 167 tracked files and 85 source/script/config modules before moving code. Baseline lint, typecheck, 13 unit tests, production build and responsive layout QA passed.
- Grouped existing auth, catalogue, admin and media code into `src/features`; retained shared shells/brand/UI under `src/components`, and Supabase/auth/config/utilities under `src/lib`.
- Moved 27 files, separated catalogue UI types from server queries, and extracted canonical site-URL parsing. Updated consumers and test paths without changing function behavior.
- Retained all five unreferenced legacy query modules in a documented legacy area and retained the unreferenced server-only service-role client. Historical database files, artwork, styles and framework/deployment configuration are preserved.
- Final lint, typecheck, all 13 unit tests and production build passed. All three existing browser QA scripts passed at 390/1280; seven unauthenticated admin page/media guards also passed. No authenticated admin mutation or real Supabase RLS verification is claimed.
- All 85 original module implementations/types and 79 other preserved files match the baseline. The 87-module import graph resolves without a client/server-only leak. All 23 app-route manifest entries are identical; full-page homepage screenshots are pixel-identical at both widths.
- See [docs/STRUCTURE.md](docs/STRUCTURE.md) for the complete move map, inventories, ownership rules and check results. Phase 3's content/database/production blockers below remain in force.

No commit, push, deployment or production data/configuration change was performed.

## Phase 3 — customer catalogue

**Implemented locally. Not deployed. Production readiness is blocked by catalogue content and unverified database changes.** The starting main working tree was clean; existing work was preserved. No commit, push, deployment, production write or remote configuration change was performed.

### Implemented

- Product cards link to /products/[slug]. Product pages include gallery thumbnails, INR prices preserving paise, category breadcrumbs, genuine stored descriptions, stock-based size/colour radio selection, bounded quantity, same-category related pieces, canonical/social metadata and noindex.
- Separate loading, missing, service-unavailable and error states. Ordering and wishlist controls are disabled and labelled. On mobile, title, price and ordering status are visible before the gallery.
- Server-side newest/price sorting; search, category, festival, available size, INR price range and stock availability filters; exact counts; 24-item pages; active filter chips; clear-all; filter retention and browser-back behavior. Duplicate/invalid/bounded parameters are validated, and child records page beyond the API row cap.
- Images resolve stable database IDs to registered same-project raster Storage paths. Legacy public/signed URLs are normalized and reauthorized. Arbitrary URLs, SVG placeholders, malformed images and unsupported content fail safely with a designed, fixed-ratio fallback. Public media never uses an admin/service key; responses are no-store/nosniff.
- Admin uploads validate raster bytes, use generated durable paths, and default new inventory to zero. Admin thumbnails use a session-protected image endpoint. Every existing admin action guard remains; the new media route has its own guard.
- Source=seed/demo/unknown products are excluded from public queries; active admin/manual records in active categories are the current publication contract. No new schema fields are assumed. Seed generation is localhost-only, inactive and internally labelled.
- Rust/cream design refinement, compact mobile filters, restrained interactions, visible focus, reduced-motion behavior, typography and spacing. Homepage references are explicitly a moodboard; speculative discounts, popularity rankings and shipping claims were removed.

### Confirmed deployment findings

At 390px and 1280px, /shop showed 12 source=seed products and unverified material/GSM/stock/merchandising claims. All 24 image IDs returned 503 because the handler attempted Response.redirect() with a relative placeholder path. All cards lacked detail links; /products/men-oversized-graphic-tee returned 404. These causes are fixed in local code.

Read-only project inspection matched the local environment and linked reference cshrojhdldkwyqivngsg. The product-images bucket was public, unrestricted by MIME/size, held zero objects, and had a broad public read policy. Child table reads were also broad. Earlier claims that the live bucket was private and demo data excluded were inaccurate. The new local migration tightens these boundaries, but has NOT been applied. The deployment remains unchanged and continues to have its existing exposure until separately reviewed/applied changes.

### Actual verification

| Check | Result |
| --- | --- |
| npm run lint | PASS, no errors/warnings |
| npm run typecheck | PASS |
| npm test | PASS, 13 tests |
| npm run build | PASS (final rerun recorded in this session) |
| Existing check-layout.mjs | PASS against live baseline and local production build, 390/1280; no overflow, broken homepage images or browser exceptions |
| Existing check-phase1.mjs | PASS, both widths; isolated auth/catalogue contract fixtures updated to current schema |
| check-phase3.mjs | PASS, both widths; sorting/filtering/pagination/back navigation, >100 child rows, detail visibility, stock/quantity, image error cases, metadata, keyboard and reduced motion |
| Screenshot review | Desktop/mobile catalogue, product, expanded filters, empty and missing/inaccessible photo states inspected; mobile action placement refined |
| python scripts/check-sql.py | PASS syntax parsing only, including the new migration and pgTAP file |
| npm run test:db / npm run db:lint | BLOCKED: local PostgreSQL connection refused; Docker Linux engine unavailable |
| Real Storage upload/download/unpublication under proposed RLS | NOT VERIFIED; no real product objects and migration not applied |
| Live login/signup | Public page inspection only; no credentials submitted. Live signup says temporarily paused |

The browser contract suites test synthetic services, not Supabase authorization. The local connected build exercises real read-only PostgREST filtering and correctly produces an empty public catalogue because every current record is a seed. No real email delivery, admin write, commerce, RLS execution or Storage upload is claimed verified here.

## Phase 4 — Commerce foundation & payment readiness

**Complete locally and verified; not deployed to production.**
Working branch: `codex/domain-structure`. All operations performed locally in isolation without writing or deploying to production (`threadlabz.vercel.app` or remote Supabase project `cshrojhdldkwyqivngsg`).

### Implemented

1. **Server-Authoritative Cart (`src/features/cart`)**:
   - Guest cart (`tl_cart_session` HTTP-only 30-day cookie) and authenticated customer cart.
   - Idempotent guest cart merge into customer cart upon user sign-in without duplicate line items or losing quantities.
   - Variant-level line identity (`product_variants.id`); client cannot dictate price, title, or discounts.
   - Full publication and purchasability revalidation on every server mutation (excludes inactive, draft, and seed/demo items).
   - Strict server-side quantity bounds (1–10 items per line) and stock on hand clamping.
   - Pure integer-paise calculations: zero floating point decimals.
   - Accessible interactive UI (`/cart`) with empty, loading, live quantity modification, item removal, and explicit disabled checkout banner.
   - Product page "Add to Bag" interaction with optimistic pending transitions, accessible live status feedback, and out-of-stock indicators.

2. **Server-Authoritative Checkout & Pricing (`src/features/checkout`)**:
   - Integer-paise pricing engine (`calculateOrderPricing`): subtotal, inclusive 5% GST, shipping, discounts, and grand total.
   - Immutable order-item snapshots recorded at order creation (`order_items`: title snapshot, variant ID, size, SKU, price in paise, tax).
   - Atomic database inventory hold function `reserve_stock(variant_id, qty, expires_at, order_id)` preventing overselling under concurrent requests.
   - Automatic reservation release on failure/cancellation (`release_stock_reservation`).
   - Shipping address validation (Indian 10-digit mobile `^[6-9]\d{9}$` and 6-digit postal code `^\d{6}$`).

3. **Payment Gateway Integration (Razorpay Test Mode)**:
   - Zero-dependency HMAC-SHA256 signature verification with timing-safe comparison (`crypto.timingSafeEqual`) for both checkout completion and webhooks.
   - Raw request body parsing in Route Handler (`/api/webhooks/razorpay`) verifying `x-razorpay-signature`.
   - Strict webhook idempotency via `webhook_events(provider, event_id)` unique constraint.
   - Payment status reconciliation (`payment.captured`, `order.paid`, `payment.failed`).
   - Graceful fallback when credentials are unconfigured: reports `CONFIG_BLOCKED` with detailed owner guidance and disables live payments.

4. **Database & Migrations (`supabase/migrations`)**:
   - Created additive migration `20261012000000_phase_4_commerce_foundation.sql` covering `carts`, `cart_items`, `inventory_reservations`, `stock_movements`, `webhook_events`, `payments`, additive columns on `orders` and `order_items`, atomic reservation functions, and RLS policies.
   - Updated TypeScript schemas in `src/types/database.ts` and `src/lib/supabase/database.types.ts`.
   - Executed and verified real PostgreSQL 18.3 migrations, constraints, triggers, and functions directly in Node via `@electric-sql/pglite` WASM without requiring external Docker.

### Verification Results

| Check | Result | Details |
|---|---|---|
| `npm run lint` | **PASS** | 0 errors, 0 warnings (`eslint . --max-warnings=0`) |
| `npm run typecheck` | **PASS** | `tsc --noEmit` exits 0 cleanly with all types aligned |
| `npm test` | **PASS** (21 tests) | Runs `scripts/phase1.test.mjs`, `scripts/phase3.test.mjs`, `scripts/phase4.test.mjs`, and `scripts/phase4-db.test.mjs` |
| `phase4.test.mjs` | **PASS** (7 tests) | Integer-paise calculations, discount clamping, cart bounds, Indian address validation, HMAC signature verification, raw webhook payload verification, gateway unconfigured status |
| `phase4-db.test.mjs` | **PASS** (1 test) | Full migration chain applied to isolated WASM Postgres; catalogue exclusion verified; atomic `reserve_stock` proved to prevent overselling; `release_stock_reservation` proved to restore stock; webhook unique constraint proved |
| `npm run build` | **PASS** | Next.js production build succeeded with Turbopack; all 23+ routes generated cleanly |
| `git diff --check` | **PASS** | Clean diff with zero whitespace or line-ending errors |

### Genuine Owner Decisions Required Before First Live Sale

All safe local engineering work is complete. The store owner must provide the following genuine business and provider configurations before checkout can be activated:

1. **Razorpay Test/Live API Credentials**:
   - Provide `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in `.env.local` / deployment environment.
   - *Status: Missing in repository environment.*
2. **GST Registration & Invoicing Treatment**:
   - Provide registered GSTIN (Goods and Services Tax Identification Number), registered business address, and state code.
   - Confirm apparel GST slab (5% for items <= ₹1,000, 12% for items > ₹1,000, or uniform inclusive pricing).
   - *Status: Not configured.*
3. **Logistics & Delivery Operations**:
   - Specify courier partner (e.g., Shiprocket, Delhivery, BlueDart) and list of serviceable Indian PIN codes.
   - Determine shipping fee rules (e.g. flat ₹50 fee or free shipping on orders above ₹999).
   - Confirm standard delivery estimate and return window (e.g., 7-day return policy).
   - *Status: Not configured.*
4. **Real Product Inventory & Studio Photography**:
   - Replace demo/seed records by uploading verified real garments via `/admin/products/new` or the CSV import template (`docs/product-import-template.csv`).
   - Each product must have at least one approved 4:5 raster studio photograph (`.webp`, `.jpg`, `.png`), genuine description, verified sizes/colours, and physical stock count.
   - Follow `docs/CATALOGUE_CHECKLIST.md` for guidelines.
   - *Status: Storefront currently displays only seed records, which are correctly hidden from public sales.*
5. **Database Migration Deployment Plan**:
   - Review and approve applying `supabase/migrations/20261011123446_phase_3_catalogue_boundaries.sql` and `20261012000000_phase_4_commerce_foundation.sql` to an isolated development Supabase instance before running against production.

### Earlier phases

Phase 0 supplied the brand assets and responsive preview; Phases 1/2 supplied the current auth/admin and database foundation. Phase 3 hardened catalogue boundaries and public media delivery.
