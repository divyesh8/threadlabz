# ThreadLabz Progress Log

## Current Snapshot

- **Branch**: `codex/domain-structure`
- **Focus**: Phase 5 — Staging Integration, End-to-End Commerce Validation, and Real-Store Readiness.
- **Production Status**: **Untouched**. Zero deploys, zero production writes, zero production pushes. Remote Supabase and live Vercel deployments are untouched.
- **Verification Baseline**:
  - `npm run lint`: **PASS** (0 errors, 0 warnings with `--max-warnings=0`)
  - `npm run typecheck`: **PASS** (clean type check with full TypeScript AST)
  - `npm test`: **PASS** (46 tests across 5 suites: `phase1`, `phase3`, `phase4`, `phase4-db`, `phase5-commerce-e2e`)
  - `npm run build`: **PASS** (Production Next.js build with Turbopack, all 24 routes generated)
  - `git diff --check`: **PASS** (Clean diff with zero whitespace or line-ending errors)
  - `python scripts/check-sql.py`: **PASS** (All 5 migrations, fixtures, and test suites valid syntax)

---

## Phase 5 Completed Work

### 1. Database History & Lifecycle Functions
- Authored additive migration [`supabase/migrations/20261012010000_phase_5_commerce_lifecycle.sql`](file:///c:/Users/kolli/OneDrive/Desktop/thread%20labz/supabase/migrations/20261012010000_phase_5_commerce_lifecycle.sql):
  - `release_expired_stock_reservations()`: Idempotently finds active reservations where `expires_at <= now()`, transitions status to `EXPIRED`, restores reserved stock to the available pool, and audits the release in `stock_movements`.
  - `finalize_stock_reservation(p_reservation_id)`: Authoritatively transitions active reservation to `CONSUMED`, atomically decrements physical stock and reserved pool, and records sale movement (`reason = 'SALE'`, negative delta).
  - `finalize_order_stock(p_order_id)`: Finalizes all active reservations for a paid order.
  - `release_order_reservations(p_order_id)`: Releases all active reservations for a cancelled or failed order.
- Verified that calling `release_expired_stock_reservations()` repeatedly is strictly idempotent and never double-releases inventory.

### 2. SAFE Development-Only Catalogue Fixtures
- Created [`src/features/catalogue/fixtures/dev-catalogue.ts`](file:///c:/Users/kolli/OneDrive/Desktop/thread%20labz/src/features/catalogue/fixtures/dev-catalogue.ts) and [`supabase/fixtures/01_dev_catalogue.sql`](file:///c:/Users/kolli/OneDrive/Desktop/thread%20labz/supabase/fixtures/01_dev_catalogue.sql):
  - Product A: `[DEV TEST] Multi-Size Standard Tee` (Size M stock 10, Size L stock 5).
  - Product B: `[DEV TEST] Zero-Stock Winter Hoodie` (Size XL stock 0, Out of stock).
  - Product C: `[DEV TEST] Low-Stock Oversized Sweatshirt` (Size S stock 1, Low stock).
  - Fixtures are tagged with `source = 'test'`, which guarantees that public storefront queries (`WHERE source IN ('admin', 'manual')`) exclude them completely from public catalog displays.

### 3. End-to-End Commerce Automated Tests (24 Invariants)
- Implemented [`scripts/phase5-commerce-e2e.test.mjs`](file:///c:/Users/kolli/OneDrive/Desktop/thread%20labz/scripts/phase5-commerce-e2e.test.mjs), executing against PostgreSQL 18.3 via `@electric-sql/pglite` WASM:
  1. Add product to cart
  2. Quantity update
  3. Remove cart item
  4. Cart price recalculation
  5. Guest cart isolation
  6. Authenticated cart ownership
  7. Guest → authenticated cart merge
  8. Invalid variant rejection
  9. Inactive product rejection
  10. Out-of-stock rejection
  11. Checkout order creation
  12. Server-authoritative pricing
  13. Reservation creation
  14. Oversell prevention
  15. Reservation release
  16. Reservation expiry idempotent recovery (initial 5 -> reserve 3 -> avail 2 -> expire -> avail 5 -> expire again -> avail 5)
  17. Razorpay payment signature verification
  18. Razorpay webhook signature verification
  19. Duplicate webhook handling (unique constraint)
  20. Failed payment handling (order payment status updated, reservations released)
  21. Captured payment reconciliation (amount matching verified)
  22. Stock finalization after successful payment (`finalize_order_stock`)
  23. Wrong order/payment association rejection (mismatched amount rejected)
  24. RLS access boundaries (row level security enabled on all commerce tables)

### 4. Interactive Truthful Checkout UX
- Upgraded [`src/features/checkout/components/checkout-view.tsx`](file:///c:/Users/kolli/OneDrive/Desktop/thread%20labz/src/features/checkout/components/checkout-view.tsx):
  - Handles all required states: `ready`, `processing_checkout`, `payment_popup_loading`, `payment_pending_verification`, `payment_failed`, `order_confirmed`, and `empty cart`.
  - Delivery address form with client and server validation (10-digit Indian mobile, 6-digit postal PIN code).
  - Clear stock-error and payment-error banners.
  - Transparent owner preview notice when Razorpay gateway credentials are not configured.
  - Zero fake success states: "Order confirmed" is rendered only when verified by the server.

### 5. Production-Safe Commerce Observability
- Authored [`src/lib/observability/commerce-logger.ts`](file:///c:/Users/kolli/OneDrive/Desktop/thread%20labz/src/lib/observability/commerce-logger.ts):
  - Emits single-line structured JSON logs for all 11 critical lifecycle events: `checkout_started`, `checkout_rejected`, `reservation_created`, `reservation_released`, `razorpay_order_created`, `webhook_received`, `webhook_duplicate`, `payment_captured`, `payment_failed`, `order_paid`, `stock_finalized`.
  - Strictly sanitizes PII: strips passwords, session tokens, signatures, raw request bodies, phone numbers, and full addresses.

---

## Verification Results Summary

| Check | Result | Details |
|---|---|---|
| `npm run lint` | **PASS** | 0 errors, 0 warnings (`eslint . --max-warnings=0`) |
| `npm run typecheck` | **PASS** | `tsc --noEmit` exits 0 with zero type errors |
| `npm test` | **PASS** (46 tests) | All 5 test suites pass: `phase1`, `phase3`, `phase4`, `phase4-db`, `phase5-commerce-e2e` |
| `phase5-commerce-e2e.test.mjs` | **PASS** (25 subtests) | Validates all 24 core commerce invariants on PostgreSQL 18.3 WASM |
| `npm run build` | **PASS** | Production build compiled cleanly with Turbopack |
| `git diff --check` | **PASS** | Zero trailing whitespace or newline discrepancies |
| `python scripts/check-sql.py` | **PASS** | All 5 migration files and test queries pass syntax checks |

---

## Genuine Owner Decisions Required Before First Live Sale

All local engineering, validation, and test harness code are complete. The store owner must provide the following genuine business and provider configurations before checkout can be activated for live sales:

1. **Razorpay Test/Live API Credentials**:
   - Provide `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in `.env.local` / deployment environment.
   - Configure webhook URL in Razorpay Dashboard: `https://<domain>/api/webhooks/razorpay` subscribed to `payment.captured` and `payment.failed`.
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
   - Review and approve applying `supabase/migrations/20261011123446_phase_3_catalogue_boundaries.sql`, `20261012000000_phase_4_commerce_foundation.sql`, and `20261012010000_phase_5_commerce_lifecycle.sql` to an isolated development Supabase instance before running against production.

---

### Earlier phases

- **Phase 0**: Brand assets, responsive preview, domain baseline.
- **Phase 1 & 2**: Auth, admin foundations, catalogue boundary hardening.
- **Phase 3**: Server-authoritative shopping cart with guest and customer merge.
- **Phase 4**: Integer-paise pricing, atomic stock reservation, and Razorpay webhook framework.
- **Phase 5**: Staging integration, 24-invariant E2E validation, reservation expiry, stock finalization, and truthful checkout UX.
