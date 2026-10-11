# ThreadLabz progress

Updated: 11 October 2026 (Asia/Calcutta)

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

### Remaining blockers and next phase

1. Owner must supply at least one approved photograph per real SKU plus verified title, price, description, variant size/colour and stock. Material/care/measurements require provenance before publishing; no size guide is fabricated. Create curated real records; do not simply relabel fixtures.
2. Start Docker's Linux engine and run the isolated Phase 3 workflow in docs/PHASE-3.md. The baseline and old Phase 1 migration both create the same tables using incompatible columns, and the live database has no Supabase migration-history table. Reconcile history on an approved development target before any production migration.
3. After content/security verification and separate deployment authorization, plan the next commerce phase. Cart, wishlist saving, checkout, payments, orders, reviews, customization, newsletter, shipping promises and approved policies remain unavailable.

### Earlier phases

Phase 0 supplied the brand assets and responsive preview; Phases 1/2 supplied the current auth/admin and database foundation. Earlier entries saying COMPLETE & VERIFIED broadly are superseded by the check matrix above. docs/PHASE-1.md is retained as historical context, not current schema or deployment guidance. Brand provenance remains in docs/BRAND.md.
