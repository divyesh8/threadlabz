# ThreadLabz progress

Updated: 11 October 2026 (Asia/Calcutta)

## Phase 0 — setup

Status: COMPLETE. Required code and responsive browser checks passed.

### Plan and build

- Created a new Next.js App Router + TypeScript project in the empty workspace.
- Installed pinned Next/React, Tailwind, shadcn primitive dependencies, Lucide, Framer Motion and Embla; saved npm lockfile.
- Added sampled rust/cream brand tokens, brief charcoal/tan/black colours, semantic shadcn tokens, Outfit and Inter.
- Preserved supplied logo files; added logo, monogram loading, favicon and app manifest.
- Built responsive header, search, category chips, mobile menu, footer and five-item fixed mobile navigation.
- Added homepage shell in requested order: hero slider, trust strip, categories, arrivals, festive banner, 20 festivals, costume concepts and 10% newsletter preview.
- Added honest preview destinations, loading/error/not-found pages and catalogue preview.
- Kept the public site noindex until genuine catalogue, policies and transactional flows are ready.

### Verify and review

- `npm run lint`: passed with zero warnings after fixing the PostCSS export.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Production browser checks at 390×900 and 1280×900: no document overflow, broken images, undersized interactive controls or runtime exceptions; 20 festivals; carousel/menu/search handoff/status routes/404 passed.
- Token contrast ratios: rust/cream 5.25:1, muted/cream 5.68:1, muted/tan 4.78:1, white/rust 6.09:1 and white/black button 18.88:1.
- Inspected full-page screenshots at both required widths. Fixed button text contrast (global anchor colour override), excessive mobile hero wrapping, desktop photo focal point and logo whitespace.
- Final rerun after image/focal-point/logo refinements passed. Replaced Windows flag emoji fallback with original SVG flags.
- `npm audit --omit=dev`: zero vulnerabilities. Full audit has five high findings in the same development-only chain: Next ESLint plugin → fast-glob → micromatch → braces. `braces@3.0.3` is the latest published version with no fixed release at the time of checking. Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm. Do not force-downgrade lint config. Recheck before release.

### Decisions and gaps

- User-provided PNG artwork overrides the different monogram description. Sampled rust `#A74224`, cream `#F4EDE5`; details in `docs/BRAND.md`.
- Supplied PDF photography is used only for clearly labelled preview collections. No prices, stock, material specifications or sales rankings were invented.
- Republic Day is the twentieth festival. Other product photos and festival artwork remain placeholders.
- Newsletter is a launch preview with no email collection. Shipping/return policies are not asserted without business settings.
- Phase 0 is the layout foundation; production shopping, search/filtering, auth, admin and checkout are not implemented yet.
- Source stack remains as requested. Playwright is a preinstalled QA tool only, not an app dependency.
- Retained ESLint 9.39.5 because the Next lint plugin dependency tree does not yet support ESLint 10 cleanly. ESLint 10 was evaluated and reverted; no invalid peer dependencies remain. Track the ESLint maintenance upgrade alongside the upstream advisory.

## Phase 1 — local database and authentication foundation

Status: IMPLEMENTED LOCALLY; real Supabase integration verification is BLOCKED. Not deployed or production-ready.

### Inspect and plan

- Began on clean `main`, commit `7c37720`, with the user-configured `origin` pointing to `https://github.com/divyesh8/threadlabz`. Preserved existing work/assets; no push or commit performed.
- Read the repository and checked current official Supabase changelog/SSR/Storage/testing docs, PostgREST filtering docs, pgTAP docs and installed Next 16.4 cookie/proxy/action/logging docs.
- Narrowed this run to the user's new Phase 1 scope: catalogue, personal-data ownership, auth and safe read integration. Payments/orders/coupons/email collection/admin mutation flows remain deferred.

### Build

- CLI-created config, additive migration `20261011061713_phase_1_catalogue_auth.sql`, demo seed and pgTAP tests. Nine public tables have RLS and explicit grants; price/stock belong to variants. Demo products cannot be published.
- Customer profile/address/wishlist rows are owner-only, with immutable ownership columns. Trusted `app_metadata.threadlabz_role` controls admin draft inspection and scoped Storage writes; user metadata cannot grant privileges. No security-definer helpers or catalogue write endpoints.
- Private raster-only product bucket with publication checks and operation-aware public download policies. Public list/sign operations are denied. Anonymous, uncached image-serving route never bypasses RLS.
- Pinned Supabase JS/SSR, Zod, React Hook Form/resolver and server-only; updated lockfile. Minimum Node 22.18 supports native TypeScript tests; Node 24 recommended. No new app stack beyond the brief.
- Added typed browser/server/public clients, guarded environment parsing, `getClaims` cookie refresh, verified `getUser` account flows, signup/signin/signout and confirmation/PKCE callbacks. Tokens are removed from redirect destinations; no privileged key is needed.
- Added names-only `.env.example`; no `.env.local` or real credentials were created, read or printed.
- `/shop` now queries real, active, published, non-demo records when configured, with literal search, category/festival filtering, paging, paise formatting and variant sizes. Missing config preserves the preview; empty/error states never substitute demo products.
- Preserved homepage/brand assets. Added only account/filter styling and truthful availability copy. Disabled Next development logging of auth arguments/requests to prevent passwords and callback tokens entering logs.
- Added unit tests, isolated HTTP/UI contract tests, optional offline SQL/TOML syntax checker, and `docs/PHASE-1.md`. Next dev generated a small AGENTS.md pointing to its installed version's docs; retained it so it is not repeatedly recreated.

### Verification results

- `npm run lint`: passed, zero warnings.
- `npm run typecheck`: passed.
- `npm test`: 9 validation tests passed (configuration, unsafe keys/origins, redirect allowlist, auth bounds, filter validation/wildcards and image IDs).
- `npm run build`: passed, including account/auth/image routes and Proxy.
- `npm audit --omit=dev`: zero vulnerabilities. The previously documented dev-only braces chain remains; no forced downgrade applied.
- `python scripts/check-sql.py`: local TOML checked; migration 67 statements, seed 5 statements, pgTAP 72 statements plus 26 embedded SQL queries parsed successfully. This is syntax validation, NOT PostgreSQL/RLS execution.
- `supabase migration list --local`, `supabase db lint --local --schema public,private --fail-on warning`, and `supabase test db --local`: attempted, all blocked by `ECONNREFUSED 127.0.0.1:54322`.
- `supabase start`: attempted, failed because Docker's Linux-engine named pipe is missing. No containers/database were altered, no reset was run, and no remote project was linked.
- Production browser checks at 390px and 1280px: passed; no overflow, broken images, undersized interactive controls or runtime exceptions; navigation, carousel, preview search, routes and 404 passed.
- Isolated HTTP-mock browser contracts at 390px and 1280px: passed signup feedback, invalid and valid signin, verified-user lookup, signout, configured empty/populated/error catalogue, filters, paise display, image responses and safe callback redirects. These results do NOT establish real Auth/email/Storage/RLS correctness.
- Visual review retained brand/layout and caught square auth buttons, corrected to the shared pill shape. Contract tests caught localhost/127.0.0.1 callback origin drift; fixed by using canonical SITE_URL. A dev 404-streaming mismatch was fixed with static destination restrictions.
- A reference-source checkout under ignored tmp initially entered TypeScript's broad include; fixed by excluding tmp/artifacts, then rebuilt successfully. This did not require adding any reference-repo dependencies to the app.

### Blockers and next action

- Connected project discovery still returns only inactive “divyesh's Project” (`jzyrcyzygtoecszmiywr`). It is not verified as ThreadLabz. It was NOT restored, modified or deployed to.
- Need the intended Supabase project ID, or a working local Docker engine, to run migration/RLS tests, advisors, generated-type comparison, actual confirmation/session-refresh/signout tests and publication/Storage integration checks.
- The current database types are explicitly migration-derived, not generated from a running database. Follow docs/PHASE-1.md to replace the Database shape after successful CLI generation.
- No supplied PDF photo became a purchasable SKU; no prices/stock/discounts/bestseller facts were invented. Synthetic prices exist only inside rolled-back SQL tests and isolated HTTP mocks.
- Complete real Phase 1 verification before starting Phase 2 admin mutations. Review target schema/Storage-helper compatibility, Auth URL/template/confirmation/rate limits and deployment-log redaction first.

## Remaining phases

2. Protected admin, products/image uploads, categories/festivals.
3. Live storefront catalogue, filters, search and product details.
4. Cart, wishlist, trusted pricing/inventory, Razorpay checkout, signed webhook verification and order success.
5. Order history/tracking, saved addresses and Resend confirmations.
6. Konva T-shirt/hoodie studio, text/uploads/stickers, persistence and print export.
7. Full admin, imports/banners/stock, accessibility/performance/SEO/PWA and deployment checklist.
8. Optional extras, one at a time after 0–7 are complete.

## Commands

```powershell
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

Never run a destructive database change without asking. Secrets must remain in ignored `.env.local` and must never be printed or committed.
