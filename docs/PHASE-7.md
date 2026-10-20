# Phase 7 — Product detail experience

Local implementation, 21 October 2026 (Asia/Kolkata). No deployment, push, hosted database mutation, or production configuration change.

## Starting point and scope

The audit followed the actual active `/products/[slug]` route through `features/catalogue/services/catalogue.ts`, its UI-facing types, `product-gallery`, `product-options`, the `/catalogue-image/[id]` route, the existing admin form/schema/Server Action, generated database contract, migrations, cart service/action/RPCs, and shared styles. The `services/legacy` catalogue path is not used by this page and was not rebuilt.

The workspace already contained uncommitted commerce reliability work. That work was retained. In particular, this phase does not rewrite cart transactions, checkout, orders, payment handling, authorization, or the existing visibility predicates. The starting diff is saved locally in ignored `artifacts/phase-7/baseline.patch`.

Already working:

- Dynamic, server-rendered product lookup with canonical URL, social metadata, and intentional preview `noindex`.
- Public product/category/source checks: only active products in active categories with `source IN ('admin','manual')`.
- Same-category related products using the same public catalogue query.
- Durable Storage paths, raster validation, and per-request authorization through image IDs.
- Real cart Server Action, integer-paise calculations, server-side stock/quantity validation, and guest/session support.
- Admin authorization before every mutation; existing product, variant, image, and festival editors.
- Product loading, missing-product and error routes; native radio controls; reduced-motion styles.

## Before / after audit

| Area | Before | This phase |
| --- | --- | --- |
| Purchase hierarchy | Disabled purchase block above a second live action; disabled wishlist control | One purchase area, no PDP wishlist affordance, clear pending/success/error feedback |
| Price | Existing integer-paise formatter; unconfigured price represented by zero | Same authoritative price; fractional amounts display both decimal places; unconfigured pricing cannot enable Add to bag |
| Gallery | Main photo and clickable thumbnails | Large responsive canvas; previous/next controls; roving thumbnail focus with Left/Right/Home/End; photo count; image loading/error state |
| Zoom | None | Native modal dialog, high-resolution responsive source, zoom control, keyboard-scrollable image, Escape and focus return |
| Image delivery | Original uploads served regardless of screen size | Explicit bounded responsive widths and WebP conversion, inside the same authorization route |
| Variants | Repeated size/colour/stock tiles; raw stock; quantity could exceed the cart's cap | Separate named colour options and size radios; conventional size ordering; reserved units subtracted; unavailable choices labelled; quantity capped at 10 |
| Variant transitions | One combined selection | Retains the selected size only if the new colour has that exact available size; otherwise asks for a new size |
| Cart confirmation | Claimed the requested quantity was added | Uses the item and quantity returned by the real cart summary, including server clamping; selection is locked during requests |
| Size guide | None | Product-specific measurement table with explicit garment/body meaning, cm/in units, measurement instructions, and named rows/columns |
| Materials / care / fit | Description only | Optional server-rendered material, care, fit, model and specification sections; missing facts remain absent |
| Policies | Static placeholder | Optional validated server configuration shared with `/shipping`; separate honest defaults for absent delivery/returns policies |
| PIN checks | None | Server-only provider interface with distinct invalid, not-configured, unavailable and checked outcomes; no pretend PIN checker |
| SEO | Canonical/social metadata, preview noindex | Preserved; descriptive Product JSON-LD with safe serialization; no ratings, discounts, delivery promises, or executable Offer while checkout is gated |
| Error recovery | Existing boundary used `reset()` | Installed Next 16.4 `retry()` re-fetches the failed segment; expected catalogue outages also have a real reload link |
| Admin | General description, variants, images | Optional structured fields added to the existing editor and guarded save action |

## Presentation and accessibility

The product area uses a light neutral background, dark typography, fine dividers and the existing rust-red brand accent. The supplied identity, header, footer and navigation remain intact. The layout is a photographic two-column composition on desktop and a single ordered column on mobile/tablet. Product-specific CSS stays with the catalogue components.

The page, description, disclosures, policies, size-guide table and related items are composed by Server Components. Client code is limited to interactive gallery, dialogs and purchasing controls. There is no new animation library. Native `<details>`, `<dialog>`, buttons, fieldsets, radio groups, table headers and live status messages supply the interaction semantics. Reduced motion removes the small button transition.

Dialogs open with `showModal()`, make the background inert, contain keyboard focus, close with Escape, return focus to their trigger, and lock background scrolling. A zoomed image and wide measurement tables can be scrolled with a keyboard.

## Product data and admin contract

Migration: `supabase/migrations/20261020182652_phase_7_product_details.sql`, created with the installed Supabase CLI. It adds **one nullable `products.product_details` JSONB column** and a bounded version/object check. It does not backfill facts, create tables or functions, change existing rows, or add grants/policies. Existing product RLS applies to the column.

`features/catalogue/schemas/product-details.ts` is the runtime contract:

- `version: 1`
- `materials`, `care`: optional text checked by the owner against the actual garment/label.
- `fit`: optional text; requires a populated measurement guide.
- `model`: optional paired `height_cm` and `wears_size`.
- `specifications`: up to 12 unique label/value pairs.
- `size_guide`: `unit` (`cm`/`in`), `kind` (`garment`/`body`), required measurement instructions, up to six unique columns and 30 unique measured-size rows.

Values must be positive finite measurements; every row must match the number of columns. The admin schema checks that measured sizes and the model's worn size belong to that product's variants. The editor leaves numeric inputs empty until the owner supplies values; it does not populate example measurements. Changing units does not silently convert measurements. Validation also runs on the server before any write.

The editor is part of `ProductForm`; it uses the existing `saveProduct` action and session client. Omitted `product_details` is not sent in an update, preserving existing data and compatibility with callers that have not adopted the new fields. Editing the new fields submits the complete validated object. Invalid/missing/unsupported public data yields empty optional details, not invented defaults or an unavailable product.

The generated database type has the matching nullable JSON field in Row/Insert/Update. This is a local additive contract update, not a claim that a remote schema has been regenerated or migrated.

**Migration prerequisite:** the repository's pre-existing Phase 1 migration-history conflict remains. See `ARCHITECTURE-AUDIT.md`. Do not apply all historical files blindly. The isolated tests use the explicitly reviewed baseline from the existing commerce tests, followed by this migration. No remote migration was applied. Existing product reads and saves without new data continue to work before the column is added; saving new facts requires the migration.

## Delivery configuration and future serviceability

Set server-only `SHOPPING_POLICIES_JSON` to owner-approved copy. `.env.example` documents its shape. Each optional `delivery` / `returns` object contains required nonempty `summary` and optional HTTPS `url`. Neither an omitted policy nor invalid JSON creates a shipping charge, arrival date, return eligibility claim or free-shipping claim. Restart/rebuild after changing environment configuration; the existing `/shipping` informational route is statically built.

`features/catalogue/services/delivery.ts` defines `ServiceabilityProvider.check({pinCode, productId, variantId?})`. `checkServiceability` validates the six-digit PIN and returns `not-configured` without a provider, or `unavailable` on provider failure. No PIN is collected, stored, logged or transmitted by this phase. Connect a real courier provider before adding a shopper-facing form.

Checkout's existing gate is preserved and stated on the page. Descriptive Product JSON-LD intentionally omits an Offer until the store can genuinely accept an order.

## Media and authorization

`CatalogueImage` uses a custom `next/image` loader that creates same-origin image-ID URLs with a bounded `w` parameter. The route:

1. Validates the UUID and width candidate.
2. Performs the existing public product, source and category checks.
3. Resolves only an approved same-project Storage path.
4. Downloads using the publishable client, retaining the existing 5 MB and raster-signature checks.
5. For responsive requests, decodes with Sharp's 40-megapixel input limit, auto-orients, resizes without enlargement and encodes WebP at quality 85.
6. Retains `private, no-store`, `nosniff` and the image CSP.

This avoids a public image-optimizer cache continuing to serve a photo after its product becomes private. Original image-ID URLs still work for metadata. Sharp `0.35.5` was already installed through Next; it is now an explicit pinned dependency because the route imports it directly. `@axe-core/playwright` `4.14.0` is a pinned development-only accessibility test dependency.

## Verification

Commands and reports are recorded in ignored `artifacts/phase-7/`. Baseline: the existing 74 tests passed, and the original Phase 3 browser suite passed at 390/1280 before the presentation changes. Before screenshots are `artifacts/phase-7/product-{390,1280}.png`; after screenshots are under `artifacts/phase-7/browser/`. All browser merchandise, measurements, policies and images are clearly labelled isolated QA fixtures. No fixture path was added to the application.

The new `scripts/phase7.test.mjs` checks data validation, missing/malformed records, measurement consistency, admin size relationships, stock reservations, quantity cap, price display, policy parsing, PIN-provider outcomes, media widths, script-safe structured data, additive migration constraints, anonymous read/write boundaries and the actual guarded save action.

The new `npm run test:product` runs `scripts/check-phase7.mjs`: actual Next routes and Server Actions against a local HTTP adapter and disposable PGlite PostgreSQL. Cart calls execute the existing `commerce_cart` and `commerce_mutate_cart` functions; the browser navigates to the real `/cart` page and verifies the returned price/quantity. The tests check server clamping, stock changing after page load and cart outages. Admin tests exercise an edit/save/public-read round trip.

The browser matrix covers 390, 768, 1280 and 1440 pixels; no horizontal overflow; native keyboard selection; thumbnail navigation; zoom; measurement table; dialog focus/Escape; automatic screen-reader-tree snapshots; axe accessibility checks; missing fields/photos/variants; unavailable and fully reserved variants; image access/format errors; loading; reduced and ordinary motion; configured and absent policies; metadata; hidden/seed/category-inactive products and admin protection.

Auth, PostgREST transport and Storage are fixtures. PGlite runs the real PostgreSQL migrations/RPCs; this is **not authenticated hosted Supabase verification**, and automated accessibility checks are **not manual NVDA/VoiceOver certification**.

Final command outcomes are appended after verification below.

## Owner data and remaining limitations

- Supply approved product photography and useful alt text for each actual garment. The application verifies image provenance/access/format; a person must verify that a photo depicts the listed product. Existing reference photographs are used only by the isolated test harness.
- Supply measured product-specific size charts, measurement method, confirmed composition/care and relevant specifications. Model fields should be entered only for the pictured model and known worn size. Empty optional information stays absent.
- Supply actual delivery/returns copy and policy links. Carrier serviceability and dates remain unavailable until a real integration exists.
- Reconcile migration history and apply the additive migration to an approved non-production environment before owner data entry and authenticated staging checks.
- Photography remains product-level: the current schema has no verified image-to-colour association. Selecting a colour never invents a matching image or a visual colour swatch.
- Size guides currently apply to all variants of one product. Products with materially different cuts need separate measured guides/products rather than guessed shared measurements.
- The existing admin product/child save flow is sequential, not one database transaction. This phase preserves its checked-write behavior; a failure in a later child write can still leave an earlier product update persisted. Reload before retrying.
- Authorized image resizing trades caching for immediate visibility enforcement. Production traffic may eventually need an authorization-aware derivative store or cache invalidation design.
- The existing preview `noindex` and checkout gate remain. No discounts, ratings, reviews, popularity, urgency, wishlist, custom studio or AI recommendation feature was added.

## References consulted

Implementation follows the installed Next.js 16.4 docs in `node_modules/next/dist/docs/`, especially Server/Client Components, Image, Server Functions and `error.js` (`retry` became stable in 16.3). Supabase's [changelog](https://supabase.com/changelog) and [JSON guidance](https://supabase.com/docs/guides/database/json) were reviewed; [Sharp resize](https://sharp.pixelplumbing.com/api-resize/) and [input limits](https://sharp.pixelplumbing.com/api-constructor/) informed the media implementation. The supplied Nike, UNIQLO, Zara and ASOS references informed clarity and exploration goals; no reference-brand UI, imagery, asset or identity was copied.
