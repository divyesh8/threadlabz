# Phase 3: catalogue implementation and audit

## Scope and current data contract

The 11 October 2026 implementation is local only. The installed packages are Next 16.4.0, React 19.3.0, supabase-js 2.117.3 and @supabase/ssr 0.12.7. Installed Next guides for page/route parameters, loading and metadata were read before coding. No dependencies, deployment or remote mutations were added.

The actual database matches 001_schema.sql and generated types: products.title, price_paise, source, is_active; variants.size/color/stock; images.url/alt. It has no status, is_demo, published_at, content-verification fields, authentic measurement chart, or separate verified care/material fields. Public app queries therefore require active products with source in admin/manual and an active category. Unknown sources, seed and demo fail closed. Admin/manual represents owner-authored content, not independent evidence of any claim: only enter verified facts there. Zero-price records explicitly say price unavailable. Badges, compare-at discounts, total_sold, ratings and reviews are not presented.

There is no featured ranking field with verified curation; sorting is newest, price ascending and descending. Size facets derive only from positive-stock variants of visible products. Facets scan at most 2,000 rows on the server and hide if incomplete; larger catalogues need a measured distinct-size RPC. Product pages and gallery data use the same public server layer. Child reads paginate in 100-row batches with a protective 10,000-row cap, failing unavailable if exceeded rather than silently truncating.

## Reproduction log

| Route / widths | Steps | Observed before change | Local fix |
| --- | --- | --- | --- |
| /shop, 390 & 1280 | Open shop; inspect 12 cards | All 12 are active seed records; descriptions assert GSM/materials without provenance | Exclude all non-curated sources; do not print demo claims |
| /catalogue-image/[id], all 24 records | Request each visible image ID | Every response 503; stored URLs are /placeholders/*.svg | Remove relative/arbitrary redirects; accept only same-project Storage raster paths; use intentional fallback |
| /shop, both widths | Click/focus a product card | Cards were articles with no destination | Whole card is a keyboard-focusable detail link |
| /products/men-oversized-graphic-tee | Direct navigation | HTTP 404 because route did not exist | Dynamic detail route exists; this particular seed intentionally remains not-found |
| /shop, both widths | Inspect count/filter/pagination | Only current page length; no size/price/availability/sort | Validated server filtering, exact counts, stable ordering and retained URL state |
| Main header, both widths | Inspect search action | Submit button used a sliders icon; leading magnifier was decorative | Explicit submit button uses the search icon; Enter/button tested |
| /login, /signup, /account | Open public pages only | Login/account accessible; live signup explicitly paused | No credentials submitted; no auth-readiness claim added |
| /cart, /wishlist, /customize | Open destinations | Status pages; no active commerce | Keep honest unavailable states and link back to /shop |

Homepage/mobile menu/carousel/search handoff and navigation passed the existing live QA. No horizontal overflow was observed in the baseline. Typography, editorial rhythm and compact filters were improvements, not claimed pre-existing functional bugs.

All 12 seeded slugs were audited: accessory-embroidered-heritage-cap, accessory-heavy-cotton-canvas-tote, costume-little-bal-krishna-set, costume-superhero-cape-and-cuff-set, kids-diwali-jacquard-kurta-pajama, kids-festive-ghagra-choli-set, men-festive-silk-blend-kurta, men-oversized-graphic-tee, men-streetwear-relaxed-hoodie, women-boxy-streetwear-crop-tee, women-festive-woven-saree, women-royal-anarkali-suit. Each had two placeholder records and zero verified product photos. Their seeded prices, stock, sales counts, comparison prices, badges and detailed claims are not owner evidence. The supplied PDF photographs remain labelled reference/moodboard assets only.

## Media and authorization

The confirmed linked project and local environment identify cshrojhdldkwyqivngsg. The connected MCP account listed a different inactive project, so read-only inspection used the already-linked CLI and public client. No identity was guessed for a mutation. Actual bucket state: public=true, zero objects, no MIME/size restriction. Actual public Storage policy allowed the entire product-images bucket; image/variant SELECT policies allowed all rows. storage.allow_any_operation(text[]) exists on the linked database.

The public image route accepts a UUID, joins its parent product and category with explicit visibility/source predicates, and resolves only uploads/<safe raster filename> or <UUID>/<safe raster filename>. Same-project legacy public/authenticated/signed URLs are normalized to that path; expired tokens are discarded and access is checked again through download(). Other origins, SVGs, reference images, paths with traversal, unsupported MIME/signatures and >5 MiB objects are rejected. Missing/inaccessible assets return 404; unexpected service failures return 503. All responses are private/no-store and nosniff. Valid images include a restrictive CSP. Next image optimization is deliberately disabled for these images to avoid retaining unpublished assets.

Uploads retain requireAdmin(), validate JPEG/PNG/WebP signatures and size, generate UUID filenames, and store durable paths. AdminImage uses /admin/media, which independently verifies the admin and downloads with that user's session/RLS. No service-role credential is used in either media endpoint. Admin SVG/static reference previews remain internal; no public product substitution occurs.

The new migration is a **proposal, not a deployed fix**. It narrows catalogue/child reads, makes the existing bucket private, bounds raster uploads and limits public object access to registered images whose product is visible. Visitors cannot list or mint signed URLs; verified admins retain management. Indexes support actual ordered product pagination, category/junction filtering and child lookup. No data is deleted or relabelled. Other auth, profile, orders/reviews policies remain outside this phase's audit scope; this is not a complete security certification.

## Local verification commands

Application and browser commands are in README.md. Contract scripts use existing Playwright and Edge, no new browser dependency. Run check-phase1 and check-phase3 sequentially; both own a temporary next dev server. Reports and screenshots are ignored under artifacts/phase-3 (and artifacts/phase-1/contracts for the existing suite).

The checked-in migration history is incompatible: 001_schema.sql and 20261011061713_phase_1_catalogue_auth.sql both create the same tables with different names/fields and authorization models. The latter and the root seed.sql/old pgTAP test are historical, not safe to run after 001. The live database currently has no supabase_migrations.schema_migrations table. Do not modify history or run db push to paper over this.

Prepare a separate ignored local workspace with only the current baseline, new migration and matching tests:

```powershell
node scripts/prepare-phase3-db.mjs
supabase start --workdir tmp/phase3-db
supabase migration list --local --workdir tmp/phase3-db
npm run db:lint
npm run test:db
supabase db advisors --local --workdir tmp/phase3-db
```

The helper copies configuration with a distinct local project ID, disables the incompatible seed, and does not start, delete or modify a database. It does not copy remote link state or credentials. The new pgTAP suite rolls back synthetic rows and verifies visibility, Storage listing/signing denial, unpublication, price/inventory write denial, user-metadata spoofing and admin access. Docker is unavailable in this session, so none of those execution results are claimed. Optional installed SQL parser: python scripts/check-sql.py (syntax only).

Installed CLI 2.116.0 help was used; the new migration filename was generated with supabase migration new phase_3_catalogue_boundaries. Before any future remote apply, confirm project identity, reconcile the migration baseline, execute local tests, review advisors and obtain separate authorization. No remote apply command is provided as part of QA.

## Verification evidence and limits

- 13 Node unit tests: validation/retention, auth boundaries, media origin/path/signature cases.
- Existing auth/catalogue mock suite passes 390/1280.
- Expanded mock suite passes 390/1280: 27-product/24-per-page traversal, all filters/sorts, back navigation, chip reset, exact INR/metadata, >100 child rows, valid/demo/inactive/inactive-category/missing/unavailable detail states, gallery thumbnails, unavailable variants, low stock, bounded quantity, keyboard focus, reduced motion and imagery (valid/missing/expired legacy URL/inaccessible/malformed/corrupt).
- Existing layout suite passes live baseline and local production build: no overflow/broken homepage images/browser exceptions; public status routes, mobile menu, carousel, search and 404 checked.
- Final screenshots inspected at both widths, including populated fixture product/gallery, shop, expanded filters and fallbacks. Synthetic reference-photo screenshots do not verify real product photos.
- No live credentials submitted. Real Storage downloads/uploads, revoked publication under real RLS and database suite execution remain blocked.

## Owner inputs and next phase

Provide approved SKU photographs and a verified product sheet (title, INR price, description, category, variant size/colour and stock; optional evidenced materials/care/measurements). At least one approved photo is needed for every public SKU. Create real records rather than treating seed text or reference photographs as facts.

Start Docker and execute the isolated database verification. After policy/history review and a separately authorized deployment, real catalogue/Storage smoke tests must pass before launch. Cart, wishlist saving, checkout/payment, orders/fulfilment, reviews, newsletter and customization are future work; business support/shipping/returns terms require approval. No sitemap or search indexing is enabled.

References consulted: [Supabase Storage access models](https://supabase.com/docs/guides/storage/buckets/fundamentals), [serving assets](https://supabase.com/docs/guides/storage/serving/downloads), and the [changelog](https://supabase.com/changelog). The downloaded changelog index contained no relevant tagged breaking change requiring a different implementation.

## Changed files

- PROGRESS.md
- README.md
- docs/PHASE-1.md
- docs/PHASE-3.md
- package.json
- scripts/check-phase1.mjs
- scripts/check-phase3.mjs
- scripts/phase1.test.mjs
- scripts/phase3.test.mjs
- scripts/prepare-phase3-db.mjs
- scripts/seed-products.ts
- src/app/[section]/page.tsx
- src/app/admin/actions.ts
- src/app/admin/media/route.ts
- src/app/catalogue-image/[id]/route.ts
- src/app/globals.css
- src/app/products/[slug]/error.tsx
- src/app/products/[slug]/loading.tsx
- src/app/products/[slug]/not-found.tsx
- src/app/products/[slug]/page.tsx
- src/app/shop/loading.tsx
- src/app/shop/page.tsx
- src/components/admin/admin-image.tsx
- src/components/admin/banner-manager.tsx
- src/components/admin/category-manager.tsx
- src/components/admin/festival-manager.tsx
- src/components/admin/product-form.tsx
- src/components/admin/product-table.tsx
- src/components/store/catalogue-image.tsx
- src/components/store/header.tsx
- src/components/store/home-sections.tsx
- src/components/store/product-card.tsx
- src/components/store/product-gallery.tsx
- src/components/store/product-options.tsx
- src/lib/catalogue/media.ts
- src/lib/catalogue/query.ts
- src/lib/catalogue/validation.ts
- src/lib/queries/products.ts
- supabase/migrations/20261011123446_phase_3_catalogue_boundaries.sql
- supabase/tests/phase3_catalogue_test.sql
