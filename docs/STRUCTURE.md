# Repository structure

ThreadLabz remains one Next.js App Router application, installed and built with npm from the repository root. The 12 October 2026 refactor groups the existing code by domain; it does not introduce another app, a workspace, an ORM, a backend service or a commerce feature.

The supplied `ThreadLabz-Architecture-Blueprint.md` is a proposed long-term design. Its domain ownership informed this layout. Its pnpm/Turborepo packages, Prisma migration, provider interfaces and future commerce modules were not adopted. The explicit structural-refactor objective takes precedence over the blueprint.

## Where code belongs

```text
src/
  app/                         # Existing pages, layouts, route handlers and metadata
  components/
    admin/                     # Shared admin navigation shell
    brand/                     # Supplied artwork presentation
    store/                     # Storefront shell, hero and homepage sections
    ui/                        # Reusable UI primitives
  features/
    auth/
      actions/account.ts       # Existing sign-in/up/out and password Server Actions
      components/auth-form.tsx
      schemas/auth.ts          # Input contracts and existing redirect validation
      services/profile.ts      # Verified-user profile initialization
    catalogue/
      components/              # Product cards, gallery and variant controls
      data/preview.ts          # Labelled homepage moodboard data, not inventory
      schemas/catalogue.ts     # Filters, slugs, image IDs and stable shop URLs
      services/catalogue.ts    # Active public catalogue/detail read path
      services/legacy/         # Retained, currently unreferenced older queries
      types/catalogue.ts       # UI-facing types; type-only imports
    admin/
      actions/catalogue.ts     # Existing guarded mutations and image upload
      components/              # Product editor/table and category/festival/banner managers
      schemas/admin.ts         # Existing admin input validation
    media/
      components/              # Public image fallback and protected admin preview
      services/product-media.ts # Pure Storage-path and raster-signature validation
  lib/
    auth/guards.ts             # Verified-user/profile helpers and requireAdmin
    config/site.ts            # Canonical site-origin parsing
    supabase/                 # Public/browser/session clients, config, proxy, row aliases
    utils/index.ts            # Class-name and INR price helpers
  types/database.ts           # Existing generated shared database contract
  proxy.ts                     # Next.js session refresh entry point
supabase/                      # Existing migrations, tests, templates, seed and CLI config
scripts/                       # Existing npm tests, browser QA, DB preparation and seed helper
public/                        # Unmodified artwork, reference photos and placeholders
docs/
```

Only directories with existing code are created. There is no empty `features/shared`, API route, service abstraction or speculative domain. Feature-specific components belong with their feature; reusable layout/presentation components stay under `components`.

## Dependency and runtime boundaries

- Routes compose features and shared components. Features do not import `app`; the auth and admin Server Actions are imported directly from their dedicated `"use server"` files.
- Domain schemas, types and pure helpers can be used by either rendering environment. Catalogue UI imports types from `features/catalogue/types/catalogue`, not from a server service. Use `import type` for these contracts.
- Database reads, profile initialization and auth guards retain `import "server-only"`. Browser code may call the existing browser Supabase adapter or import an explicit Server Action; it must not import the public/server/service-role clients.
- Each admin mutation and upload still starts with `requireAdmin()`. The `/admin` layout and `/admin/media` route retain their independent guards. Public catalogue/media requests still use the cookieless publishable client, existing visibility predicates and existing RLS behavior.
- Media validation is shared by catalogue, admin uploads and image previews. Its functions are pure and safe to import from either client or server code. The image HTTP handlers remain under their original `app` routes.
- Cross-feature references use explicit `@/features/...` imports. There is no application-wide barrel mixing client and server exports. The retained legacy barrel is confined to its unused legacy directory.
- Infrastructure in `lib` does not import features, components or routes. `src/types` remains reserved for the generated shared database shape. `lib/supabase/database.types.ts` derives row/insert/update aliases from it; it is not a second independently maintained schema.

The existing Next.js build enforces `server-only` boundaries. No package/config changes or new lint/test dependency were needed. The `@/* -> ./src/*` alias, shadcn `@/lib/utils` alias, Tailwind CSS entry, generated Next type paths and `src/proxy.ts` location remain valid.

## Move map

| Before | After |
| --- | --- |
| `src/app/account/actions.ts` | `src/features/auth/actions/account.ts` |
| `src/components/auth/auth-form.tsx` | `src/features/auth/components/auth-form.tsx` |
| `src/lib/auth/validation.ts` | `src/features/auth/schemas/auth.ts` |
| `src/lib/auth/profile.ts` | `src/features/auth/services/profile.ts` |
| `src/lib/auth.ts` | `src/lib/auth/guards.ts` |
| `src/app/admin/actions.ts` | `src/features/admin/actions/catalogue.ts` |
| `src/lib/admin/validation.ts` | `src/features/admin/schemas/admin.ts` |
| `src/components/admin/{product-form,product-table,category-manager,festival-manager,banner-manager}.tsx` | Same filenames in `src/features/admin/components/` |
| `src/lib/catalogue/query.ts` | `src/features/catalogue/services/catalogue.ts`; its three exported UI types move to `types/catalogue.ts` |
| `src/lib/catalogue/validation.ts` | `src/features/catalogue/schemas/catalogue.ts` |
| `src/lib/catalog-preview.ts` | `src/features/catalogue/data/preview.ts` |
| `src/lib/queries/{index,products,categories,festivals,banners}.ts` | Same filenames in `src/features/catalogue/services/legacy/` |
| `src/components/store/{product-card,product-gallery,product-options}.tsx` | Same filenames in `src/features/catalogue/components/` |
| `src/lib/catalogue/media.ts` | `src/features/media/services/product-media.ts` |
| `src/components/store/catalogue-image.tsx` | `src/features/media/components/catalogue-image.tsx` |
| `src/components/admin/admin-image.tsx` | `src/features/media/components/admin-image.tsx` |
| `src/lib/utils.ts` | `src/lib/utils/index.ts`; existing imports still resolve |
| `parseSiteUrl` in `src/lib/supabase/config.ts` | `src/lib/config/site.ts`; Supabase configuration stays in place |

There are 27 whole-file moves and two extractions. Import specifiers and the two unit-test import lists were updated. No route, UI markup, style declaration, asset URL, query predicate, mutation, validation rule, authorization check or cache policy was intentionally changed.

## Legacy and duplicate-code audit

The starting tree was clean on `main` at `b326e6bb6f454c6bd2bd6860d31e5f82e2d2833d`. Inspection covered all 167 tracked files in the file inventory and 85 TypeScript/TSX/MJS modules in the import graph, plus documentation/config/script path searches. The graph had no unresolved local imports. Changes are on `codex/domain-structure`.

`src/lib/catalogue/query.ts` was the active Phase 3 path: the shop and homepage call `getCatalogue`; product pages call `getProductDetail`. The five old `src/lib/queries` modules had no consumers outside their own barrel. Their product representation and behavior differ: `title/color/primary_image` versus `name/colour/image IDs`, embedded child reads versus explicit child pagination, and older merchandising helpers versus the current filter/visibility contract. They were retained together in `services/legacy` without merging their incompatible semantics into the active path. New callers should use the active service.

`src/lib/supabase/admin.ts` also had no import consumers. It is retained as an existing server-only service-role adapter; no feature was wired to it. The local seed script creates its own client and still rejects hosted targets. Unused exports within otherwise active modules (such as auth helpers) were retained.

The generated `src/types/database.ts` and `lib/supabase/database.types.ts` are complementary, not duplicate schemas. The two placeholder asset directories are also retained: legacy seed URLs and admin previews can still reference them. File names or duplicate-looking content alone are not evidence that deletion is safe.

Historical Phase 1 documentation, its incompatible migration/seed/test artifacts, and the unapplied Phase 3 policy proposal stay intact. Their history is not dead application code. The existing database-history conflict and production-readiness blockers remain as documented in [Phase 3](PHASE-3.md).

## Verification record

Checks run on 12 October 2026 with Node `v24.19.0` and npm `11.17.0`, using the existing installed dependencies. Full logs, import graph and path-reference search are in ignored `artifacts/structure-refactor/`. These are local QA artifacts, not deployed content.

| Check | Before moves | After refactor |
| --- | --- | --- |
| `npm run lint` | PASS, zero warnings | PASS, zero warnings |
| `npm run typecheck` | PASS | PASS |
| `npm test` | PASS, 13 tests | PASS, 13 tests |
| `npm run build` | PASS | PASS |
| `scripts/check-layout.mjs`, 390/1280 | PASS against production build | PASS: navigation/menu/carousel/search, no overflow, broken images, undersized controls or browser exceptions |
| `scripts/check-phase1.mjs` | Existing suite inspected | PASS, auth/session/callback and catalogue contracts at 390/1280 |
| `scripts/check-phase3.mjs` | Existing suite inspected | PASS, filters/pagination/product/media/keyboard/reduced-motion at 390/1280 |
| Import resolution, implementation/type preservation and asset/config comparison | Baseline saved | PASS: all 85 original modules preserved; 79 other files unchanged; 87 current modules resolve; 17 client entries have no server-only import leak |
| Production route manifests | Baseline saved | PASS: all 23 app entries identical; route manifest identical after normalizing the generated build ID |
| Unauthenticated admin protection | Guard implementations preserved | PASS: six admin pages navigate to login; `/admin/media` returns a 307 login redirect |
| Homepage screenshot comparison | Production screenshots saved | Full-page images at 390/1280 and desktop viewport are pixel-identical; the first mobile viewport captures a different instant of the existing hero entrance animation |
| `git diff --check` | Clean working tree | PASS |

The preservation audit compares parsed implementation statements and type declarations after accounting for moved imports and the two explicit extractions. Git blob comparisons cover all remaining unchanged files, including `public`, `globals.css`, package/lock/config files and all Supabase files. All original client/server directives and guard bodies are preserved. No permanent test suite or application dependency was added for the one-time structural audit.

The first baseline preview attempt on port 3200 returned `EADDRINUSE: address already in use 127.0.0.1:3200`; an existing user process owned that port. QA used port 3217 successfully and did not stop the existing process. Auth/catalogue contract suites run sequentially on their existing loopback fixtures (3101/3102). They do not prove real Supabase RLS, email delivery or authenticated admin writes. No database apply/reset, seeding, production data mutation, push or deployment belongs to this refactor.

The additional admin smoke check initially assumed every redirect had HTTP status 307. `/admin` streams a 200 response before navigation, so the check was corrected to verify the browser's login destination for pages and the actual 307 for the media handler. No application behavior was changed to satisfy that check. Database runtime suites were not rerun: database files are unchanged, and the existing Phase 3 database verification limits remain unresolved.

Complete inventories excluding generated/ignored files: [before](refactor/file-tree-before.txt) and [after](refactor/file-tree-after.txt). Historical phase change lists retain their original paths; use the move map above to find those files today.

## Phase 4 — Commerce foundation additions

Under the feature-oriented folder layout, commerce capabilities are placed in dedicated feature domains without modifying existing brand shells or layout patterns:

- `src/features/cart/`:
  - `types/cart.ts`: Domain types for cart lines, summaries, and paise calculations.
  - `schemas/cart.ts`: Zod validation for variant ID, bounded quantities (1–10).
  - `services/cart.ts`: Server-authoritative item validation, active DB revalidation, paise math, guest & authenticated carts, login merge.
  - `actions/cart.ts`: Server Actions managing `tl_cart_session` HTTP-only cookie.
  - `components/cart-view.tsx`: Client view with live quantity updates, item removal, and preview checkout banner.
- `src/features/checkout/`:
  - `types/checkout.ts`: Order snapshot items, pricing summaries, shipping address, gateway status.
  - `schemas/checkout.ts`: Zod schema for Indian addresses (PIN code, 10-digit phone).
  - `services/pricing.ts`: Pure integer-paise calculations, inclusive 5% GST, discounts, and shipping.
  - `services/signatures.ts`: HMAC-SHA256 signature verification with `crypto.timingSafeEqual` for payments and webhooks.
  - `services/payment.ts`: Razorpay order creation and idempotent webhook event handling (`webhook_events`).
  - `services/checkout.ts`: Server-authoritative order creation, atomic `reserve_stock()` execution, and reservation rollback.
  - `actions/checkout.ts`: Server Actions for checkout initiation.
  - `components/checkout-view.tsx`: Truthful checkout review page displaying required owner actions and server pricing.
- Route Handlers & Pages:
  - `src/app/cart/page.tsx`: Dynamic cart page route.
  - `src/app/checkout/page.tsx`: Dynamic checkout page route.
  - `src/app/api/webhooks/razorpay/route.ts`: Raw-body POST webhook receiver.
- Database & Automated Verification:
  - `supabase/migrations/20261012000000_phase_4_commerce_foundation.sql`: Additive migration for commerce tables, RLS, and stock reservation functions.
  - `scripts/phase4.test.mjs`: Node test suite for pricing, cart bounds, and Razorpay signature verification.
  - `scripts/phase4-db.test.mjs`: PGlite WASM Postgres integration suite verifying real migrations, atomic reservations, overselling prevention, and webhook idempotency.
