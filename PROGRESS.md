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

## Phase 1 — database and authentication

Status: BLOCKED before database implementation; target project selection required.

Plan:

1. Create `supabase/config.toml`, a CLI-generated migration, seed and SQL access tests for all thirteen requested tables.
2. Add product/catalogue, ownership and admin RLS, stock/price constraints and Storage policies.
3. Add `src/lib/supabase/` browser/server clients and session refresh using current Supabase guidance.
4. Add account authentication forms and callback/sign-out routes with server verification.
5. Add a names-only `.env.example`, update README and this log.
6. Run database/RLS/Auth checks plus lint, TypeScript, build and both browser widths before phase 2.

Environment discovery: no `.env.local` or linked Supabase config was present. Connected Supabase account lists only an inactive project named “divyesh's Project” (`jzyrcyzygtoecszmiywr`), with no evidence identifying it as ThreadLabz. No remote database changes made. Local Docker CLI exists, but its Linux engine is unreachable (`dockerDesktopLinuxEngine` named pipe missing); launching installed Docker Desktop did not make the engine available. Supabase CLI is installed. Current Supabase changelog was inspected; implementation will use current SSR/Auth documentation when the target is available.

One question: should ThreadLabz use the existing inactive “divyesh's Project” (restore it), or a different Supabase project? A project choice is needed to avoid altering an unrelated database. No credentials need to be pasted into chat.

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
