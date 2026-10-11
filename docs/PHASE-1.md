# Phase 1: local foundation and verification

Status: implemented locally, not deployed. Real PostgreSQL/RLS, email delivery and Storage integration remain unverified because no reachable local database or explicitly identified ThreadLabz project is available.

## Scope and access model

The additive migration defines nine public tables: categories, festivals, products, product_variants, product_images, product_festivals, profiles, addresses and wishlist. Inventory belongs to a variant. Prices are positive integer INR paise; unpublished demo variants have a null price, zero stock and inactive status. Formatting preserves paise rather than rounding to whole rupees.

| Resource | Visitor | Signed-in customer | Trusted admin claim |
| --- | --- | --- | --- |
| Active categories/festivals | Read | Read | Read all |
| Products | Active, published, non-demo, publication time reached, active category | Same | Read drafts too |
| Variants/images | Active/published child of a visible product | Same | Read all |
| Profile | None | Read/create own; update own display name only | Same ownership restrictions |
| Addresses | None | Own rows only; ownership column cannot be reassigned | Same ownership restrictions |
| Wishlist | None | Own rows only; insert only visible real products | Same ownership restrictions |
| Product Storage | Download published asset only | Same | Read and write registered product image paths only |
| Catalogue writes / role assignment | None | None | No application/API catalogue write grants in this phase |

Every exposed table has RLS and explicit grants. `private.is_admin()` is a security-invoker SQL helper that checks an authenticated `auth.uid()` and **app_metadata.threadlabz_role = admin**. There is no role column on profiles and no role-assignment endpoint. User metadata is never an authorization source. JWT claims can remain stale until refresh: future admin mutation code must verify the current server-side user/role, and role revocation must include appropriate session controls.

Customer access is supported at the schema level; saved-address and wishlist UI/mutations are deliberately deferred. No orders, payments, coupon redemption, stock reservation, newsletter subscription or admin mutation endpoints are included.

## Storage

`product-images` is a private bucket restricted to JPEG, PNG and WebP files of at most 5 MiB. Paths must match `<product UUID>/<safe filename>.<extension>` and an existing product image record. A read requires both the image and its real product to be published and the parent category active.

The public branch of the Storage policy allows only `object.get_authenticated` and `object.get_authenticated_info` operations. Visitors cannot list the bucket or mint signed URLs that could outlive publication. This uses the current `storage.allow_any_operation(text[])` helper; verify the target's Storage migrations include it before applying the app migration. Do not remove the restriction to accommodate an older target.

`/catalogue-image/[id]` looks up the image and downloads it using a cookieless publishable client. RLS remains in force even when the visitor is an admin. It never uses a privileged key or public bucket URL. Images are served with `no-store`, a raster content-type allowlist and `nosniff`; Next image optimization is disabled on this route to avoid retaining an image after unpublishing. Request-time unpublishing and caching behavior still needs real integration testing.

## Preview versus real catalogue

- No valid configuration: retain the supplied photo moodboard and an explicit disconnected preview message.
- Configured but no matching published products: empty state, without substituting demo or PDF photos.
- Configured with real published products: server-side name, category and festival filters; 24 products per page, real variant prices and size labels. Checkout stays unavailable.
- Service/query failure: explicit unavailable state. Errors never silently fall back to a fake catalogue.
- Demo product fixtures are private drafts and cannot be published because of a database constraint. The seed does not upload files or assert verified product facts.

Public catalogue queries deliberately omit user cookies. Both RLS and explicit query predicates exclude inactive, draft, demo and future products. Literal search escapes SQL wildcard characters. Festival filtering uses a filtered embedded relation and `not.is.null`. Variant queries are paged to avoid silently dropping sizes/prices at the local API row cap. Name search is a bounded, parameterized `ilike` suitable for the initial catalogue; assess a trigram/search index after real query plans exist.

## Auth and environment

Copy `.env.example` to `.env.local` and set values locally only after choosing the correct project. The template contains names and empty values only:

- `NEXT_PUBLIC_SUPABASE_URL`: the selected project's API origin.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its **publishable** key. Legacy JWT keys and `sb_secret_*` are rejected by the client factory. Never put a privileged credential in any `NEXT_PUBLIC_*` variable; Next can embed public variables in browser builds before runtime validation.
- `SITE_URL`: the canonical app origin, including the local port during development. HTTPS is required except for loopback origins.

No service-role, payment, email-provider or database password is needed by this implementation. No `.env.local` was created in this run. Restart/rebuild after changing public configuration.

The current `@supabase/ssr` cookie adapter uses `getAll`/`setAll`. `src/proxy.ts` refreshes sessions on account/auth routes with `getClaims`, preserves response cookies and the SDK cache headers, and applies private/no-store. Account and auth actions verify identity with **getUser** before using user IDs. The public storefront remains independent of sessions. Server Actions validate input, rely on Next's origin checks, and return generic errors rather than raw service messages. Redirects accept a small allowlist of app paths; callbacks use the configured canonical origin and discard tokens from the destination URL.

Next's development Server Function argument logging is disabled because arguments include passwords. Incoming account/auth request logging and browser console forwarding are also disabled. Production platform access-log redaction for `/auth/*` remains a deployment check; never log callback codes or token hashes.

The configured signup form requires 12–128 characters. The local Auth config requires confirmed email and enables refresh-token rotation. The local email template uses `/auth/confirm?token_hash=...&type=email`; the PKCE `/auth/callback` route is also implemented. Only confirmation is supported, not password reset or email changes. Sign-out ends the local browser session; it does not claim instant revocation of previously issued JWTs.

Before real auth verification: configure matching Site URL/redirect allowlist, enable confirmations, install the confirmation email template, and confirm delivery/rate-limit settings. Public registration remains gated by missing environment configuration here. Evaluate CAPTCHA and production email sending limits before opening registration to the public. No marketing email collection or Resend transaction email code was added.

## Local database verification path (non-destructive)

Commands were checked against installed Supabase CLI 2.116.0 help. The config, migration filename and pgTAP file were created by `supabase init`, `supabase migration new phase_1_catalogue_auth`, and `supabase test new access_control` respectively. No project link or remote mutation was made.

Once Docker's Linux engine works, use this repo's isolated local project (`threadlabz_local`):

```powershell
supabase start
supabase migration up --local
supabase migration list --local
supabase db query --local --file supabase/seed.sql
npm run db:lint
npm run test:db
supabase db advisors --local
```

`start` applies migrations/seeds on a fresh local instance. Repeating the seed is additive and does not overwrite existing rows. **Do not use `db reset`, link an unknown remote, or apply this migration over an existing unrelated schema.** Tests run within a transaction and roll back all synthetic identities, products, prices and writes. They do not publish live fixtures.

The pgTAP suite covers RLS enablement, private bucket, draft/demo/inactive/future/category visibility, immutable ownership, cross-user reads/writes, customer price tampering, user-metadata privilege spoofing, registered-path admin writes, bucket isolation, public listing/signing denial, and constraints. Merely parsing this SQL is not evidence these policies execute correctly.

Generate database types only after the migration succeeds:

```powershell
supabase gen types --local --lang typescript --schema public
```

The current `database.types.ts` is a migration-derived local contract, **not** claimed to be generated from a running database. Capture generated output to a temporary file, verify the command succeeded, then replace the `Database` shape and preserve/move the named row aliases used by the app. Never redirect a failed generation command over the working types file.

## App and offline verification

Use Node 24 LTS (minimum 22.18 for built-in TypeScript test support):

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

In a second terminal, use the existing bundled Playwright/Edge setup:

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/kolli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:QA_BASE_URL='http://127.0.0.1:3000'
$env:QA_OUTPUT='artifacts/phase-1/preview'
node scripts/check-layout.mjs
node scripts/check-phase1.mjs
```

`check-phase1.mjs` owns a temporary dev server on 3101 and an ephemeral loopback HTTP mock. Stop any separate `next dev` in this checkout first. All credentials and records are explicitly artificial; no real Supabase endpoint is called. It tests client/server contracts and UI at 390px and 1280px: form validation, error states, mocked sign-in/verified-user lookup/sign-out/signup feedback, configured empty/populated/failure catalogue, filter request parameters, paise formatting, image response headers and safe callback redirects. This cannot validate PostgreSQL/RLS, Supabase token validation, email delivery or actual Storage operations.

Optional syntax checks use a parser installed under ignored `tmp`, outside application dependencies:

```powershell
python -m pip install --target tmp/sql-parser pglast==8.5
python scripts/check-sql.py
```

The parser checks the migration, seed, pgTAP outer SQL and embedded test queries, plus selected local TOML settings. It does not validate function resolution, grants at runtime or policy semantics.

## Sources checked during implementation

- [Supabase changelog](https://supabase.com/changelog): current index reviewed; no extension pinning or affected legacy encryption/indexes introduced.
- [Supabase SSR and Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs): cookies, proxy refresh, verified identity.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) and [operation helpers](https://supabase.com/docs/guides/storage/schema/helper-functions).
- [PostgREST relation filtering](https://docs.postgrest.org/en/v13/references/api/resource_embedding.html#null-filtering-on-embedded-resources).
- [Supabase database tests](https://supabase.com/docs/guides/database/testing) and [pgTAP](https://pgtap.org/documentation.html).
- Installed Next 16.4 docs for cookies, Server Actions, Proxy and logging.

## Remaining blocker and next phase

The only project returned by the connected account remains an inactive “divyesh's Project”. Its identity as ThreadLabz is not established. It was not restored or modified. Confirm the intended project ID; keep credentials in `.env.local`, never chat. Alternatively a working local Docker engine enables the full local checks before selecting a remote.

Next work is **real Phase 1 integration verification**, not Phase 2 admin development: apply to a verified empty development target, run pgTAP/lint/advisors, regenerate types, verify confirmation/session refresh/sign-out and publication/unpublication through the actual APIs. Then begin protected admin/catalogue editing. No deployment or production-readiness claim is made.
