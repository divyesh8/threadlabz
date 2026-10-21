# Phase 8 — Staging and release readiness

21 October 2026. Branch: `codex/phase-8-staging-release`, based on clean `main` at `4e7adec`. Changes are local and uncommitted. No push, deployment, cloud provisioning, hosted configuration change or remote database mutation occurred. **Production readiness is not demonstrated.** This phase establishes a repeatable local process and documents the exact external gates still blocked.

## Actual starting point

Inspected AGENTS.md, README, PROGRESS, structure/architecture/Phase 7 documentation, Git history/status, package and lockfile, environment names, deployment setup, Auth/Storage clients, catalogue/admin/media paths, cart/checkout actions/services, migrations and all existing tests. Read the installed Next.js 16.4 guides before implementation and reviewed official Supabase/Razorpay/Vercel/GitHub references linked in the runbook.

Phase 7 already supplied the polished product page, verified optional product details, responsive authorized images, accessible size/colour selection, admin editing and browser coverage. Phase 6 already supplied service-only commerce RPCs, transactional reservations, immutable order snapshots, a durable signed-payment inbox, ownership checks and recovery functions. These were reused, not rebuilt. The existing feature architecture and current brand/layout are retained.

The initial automated baseline was **83 passing tests**. Historical documentation calling staging complete did not establish real hosted-provider evidence.

## Before / after audit

| Area | Confirmed before | Phase 8 result |
| --- | --- | --- |
| Environment separation | Public/server credential parsing existed; no explicit deployment identity contract; local tools could inherit hosted configuration | `local/staging/production` validation, loopback-only local access, explicit staging-vs-production project/origin checks, public/server mismatch guard, test-only payment gate and isolated test/build environments |
| Migration history | `001` and a different Phase 1 design both created incompatible catalogue tables; root seed targeted that alternative | Canonical seven-file chain; conflicting migration/test/seed archived byte-preserving; automatic seed disabled; manifest, fresh replay, existing-data preflight and drift contract |
| Database privileges | Profile initializer needed INSERT(id); fresh banner administration lacked explicit grants | Additive Phase 8 grants/policies preserve role-assignment boundaries and scheduled banner visibility; actual RLS/column-grant regressions |
| CI/deployment | No repository GitHub Actions or Vercel release configuration | Pinned-action, least-privilege PR/develop quality checks; environment-validated Vercel build; Git auto-deploy disabled in repository configuration; no deploy job or DB push |
| Payment UI | Backend order/webhook/recovery primitives existed; checkout did not open Razorpay | Lazy test Checkout popup, dismiss/failure states, strict server callback verification, bounded polling and manual status refresh |
| Retry/reload | Backend idempotency existed; prepared checkout could lose its UI when the cart cleared | Principal-scoped attempt recovery, saved order snapshot, same provider order reuse, paid-page reload and preserved recovery URL during lookup outage |
| Price/policy clarity | Cart/checkout used placeholder delivery/free-shipping/tax language | Test checkout makes no delivery quote or real invoice claim; saved tax/amounts derive from actual snapshots; production checkout remains disabled |
| Accessibility | PDP already tested; checkout fields lacked programmatic associations; narrow fields/summary contrast needed work | Address labels/error associations, keyboard submit, narrow-layout correction, clearer existing brand colour for cart/checkout amounts, loading/error handling; no broad redesign |
| Release evidence | Historical local/mock evidence and hosted claims were mixed | Explicit MOCK / LOCAL DATABASE / HOSTED STAGING / RAZORPAY SANDBOX matrix; manual approval, migration, rollback, smoke and incident procedures |

## Architecture and safety decisions

- Keep one Next.js application and Supabase. Route pages stay Server Components; payment popup behavior stays within the existing checkout client component. Privileged database access still uses the approved cart/checkout service factories. Import-boundary validation remains mandatory.
- `src/instrumentation.ts` validates runtime configuration. The pure validator is also callable in CI; no secrets or values are printed. New browser-exposed data is the **test public gateway key** and the owning user's saved checkout snapshot, never API/service secrets.
- The server callback checks ownership, persisted provider association, HMAC, fetched provider payment ID, amount, currency and capture. It records a deterministic callback event in the existing durable inbox and invokes the existing atomic processor. Callback and webhook retries share stock-finalization logic. A browser event or authorization alone cannot show paid.
- The UI stores only a random attempt/order identifier in the recovery URL; access still requires the account or HTTP-only guest capability. Missing/inaccessible saved orders show generic recovery guidance, never another customer's details. Ambiguous provider POSTs are not repeated. New checkout may be disabled while in-flight test webhook recovery remains configured.
- The application gateway endpoint remains fixed. The test harness intercepts it in a separate Node preload and blocks non-loopback network fallback; no fake payment endpoint is shipped in application runtime configuration.
- Production checkout is disabled in this phase. Live keys and test checkout on a production target are rejected. Existing 5% inclusive arithmetic is expressly a **test model**, not verified GST policy or a valid invoice. Real payment/capture/tax/shipping decisions need separate work and owner data.

## Migration reconciliation

Canonical contract: `products.title`, integer `price_paise`, `source`-based publication, `product_variants.color/stock`, and `profiles.role`-based authorization. This matches the running application and Phase 3–7 work. The alternative used different product fields, variant prices and admin authority; executing both failed immediately on duplicate table creation.

Active sequence:

1. `001_schema.sql`
2. `20261011123446_phase_3_catalogue_boundaries.sql`
3. `20261012000000_phase_4_commerce_foundation.sql`
4. `20261012010000_phase_5_commerce_lifecycle.sql`
5. `20261020180305_commerce_reliability.sql`
6. `20261020182652_phase_7_product_details.sql`
7. `20261021082348_phase_8_release_permissions.sql`

The conflicting `20261011061713_phase_1_catalogue_auth.sql`, its incompatible access test and root seed are preserved under `supabase/history/phase-1-alternative/`. Git history and original SQL bodies remain intact. No hosted migration metadata was repaired or invented. Tests create their own synthetic ledger only after actually executing each migration successfully.

`supabase/migration-manifest.json` verifies canonical ordering and normalized hashes, including archive hashes. `check:migrations` runs the complete sequence against disposable PostgreSQL and checks `schema-contract.json`. `upgrade-preflight.sql` is read-only and rejects unknown/non-contiguous/alternative history and known data hazards. The upgrade regression preserves existing profile/category/product/variant/order fields through the Phase 6/7/8 suffix. The new migration changes grants/policies only; no product facts, customers or orders are backfilled.

**Applied hosted versions remain unknown.** The repository's configured Supabase reference `cshrojhdldkwyqivngsg` returned access denied. The connected account listed a different inactive project, `jzyrcyzygtoecszmiywr`; migration lookup there failed authentication. These are project identifiers, not credentials. No environment-file secret was used to bypass that access problem. A data-preserving conversion cannot responsibly be authored for an uninspected alternative hosted schema. The runbook requires read-only ledger/schema inspection and approval before any pending suffix is applied.

PGlite verifies PostgreSQL semantics but does not emulate every Supabase provider function or independent concurrent connection. Full Supabase CLI replay/pgTAP/lint and real PG17 concurrency remain separate gates.

## Files and responsibilities

| Files | Purpose |
| --- | --- |
| `.env.example`, `src/lib/config/environment.ts`, `runtime.ts`, `src/instrumentation.ts`, Supabase config/admin client | Safe environment identities and fail-closed startup |
| `scripts/fixtures/isolated-env.mjs`, `resolve-ts.mjs`, `run-isolated.mjs`, `check-env.mjs`, existing browser launchers | Prevent inherited production credentials and preserve native test tooling |
| `supabase/history/`, new Phase 8 migration, root seed/config | Preserve conflicting history and establish additive canonical replay |
| `supabase/migration-manifest.json`, `schema-contract.json`, `ops/`, `scripts/check-migrations.mjs`, `schema-drift.mjs` | Migration integrity, upgrade preflight and schema/privilege drift detection |
| `.github/workflows/ci.yml`, PR template, `vercel.json` | Required quality checks and manual release configuration |
| Checkout route/actions/services/types/schema and `razorpay-browser.ts`; cart gate | Verified test payment, immutable resume state and consistent owner authorization |
| `scripts/phase8.test.mjs`, extended commerce tests, `check-phase8.mjs`, test fixtures, pgTAP test | Environment/upgrade/privilege/payment/browser regression evidence |
| README, PROGRESS and the three Phase 8 documents | Current status, owner setup, release/rollback/recovery and precise evidence labels |

## Verification results

Commands run without real service credentials; generated logs/screenshots live in ignored `artifacts/phase-8/`.

| Command / check | Actual result |
| --- | --- |
| `npm ci` | PASS; lockfile unchanged. Warned that ESLint 9 is unsupported and `unrs-resolver` has a pending install-script approval; lint/build nevertheless completed. No automatic approval or dependency downgrade was applied. |
| `npm run lint` | PASS, zero warnings; 108 modules / 22 client entries; no runtime import cycles |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 94 tests, eight files, no skips; MOCK + LOCAL DATABASE |
| `npm run check:env` | PASS for disconnected local environment; invalid configurations also covered by unit tests |
| `npm run check:migrations` | PASS: all seven canonical migrations, archived SQL hashes, fresh schema contract and hidden fixture exclusion |
| `node scripts/schema-drift.mjs supabase/schema-contract.json supabase/schema-contract.json` | MATCH; negative policy/function/privilege changes and literal-whitespace changes covered in regression tests |
| `python scripts/check-sql.py` | PASS: seven active migrations, seed, two pgTAP files, two operational SQL files and local TOML assertions; syntax check only |
| `npm run build:local` | PASS: optimized Next 16.4 production build with all service credentials blanked; same `next build` compiler invoked by `npm run build` |
| `node scripts/check-phase8.mjs` | PASS: separate optimized production build with isolated loopback services; 390/768/1280/1440 checkout, keyboard/labels, axe, script-load failure/retry, dismissal, provider authorization staying pending, failure callback, capture, reload/lookup outage recovery, same provider order and cross-customer denial |
| `node scripts/check-phase1.mjs` | PASS at 390/1280: existing Auth/catalogue HTTP contracts; genuine Supabase remains unverified |
| `node scripts/check-phase3.mjs` | PASS at 390/1280: catalogue filters, pagination, states, images, keyboard and reduced motion |
| `node scripts/check-phase7.mjs` | PASS at 390/768/1280/1440: PDP, actual cart RPC, guarded admin round trip, configured policies, image authorization/error/loading, route loading/error retry and keyboard/dialog focus |
| `node scripts/check-layout.mjs` | PASS via Phase 8 runner at 390/1280 against the production build; shared shell/routes, no broken images/overflow/undersized controls or JavaScript errors |
| CI YAML / Vercel configuration | YAML parsed; single least-privilege job reviewed, action revision IDs verified, JSON configuration checked. Actual GitHub/Vercel execution not performed. |
| `git diff --check` | PASS |
| `npm run test:db`, `npm run db:lint` | **BLOCKED / failed to connect** to local `127.0.0.1:54322`; Docker Linux engine pipe missing. Neither pgTAP nor full database lint passed. |
| Dependency audit | **5 high** findings in existing development ESLint → fast-glob/micromatch/braces chain. `npm audit --omit=dev --json`: **0** reported vulnerabilities. Suggested forced fix downgrades the Next ESLint major; left for reviewed tooling work. |
| Hosted project / real Razorpay / remote CI | **BLOCKED / NOT PERFORMED**, not represented as successful local checks |

The first new checkout browser run found low-contrast summary colours; the corrected existing brand shades pass the final checkout/cart axe observations. An initial test fixture retained the prior admin JWT while switching to anonymous and an expiry test changed the order timestamp without changing its reservation; those fixtures were corrected, and the final 94-test run passes. No failing check was suppressed or skipped. Full local Supabase and remote-provider blockers remain visible above.

### Local production performance baseline

Three unthrottled navigations per route/viewport, same browser context/cache within each viewport. Values are median TTFB/LCP in milliseconds and maximum observed CLS. These are local Chromium observations, **not Lighthouse scores**, mobile hardware emulation or field Web Vitals. Images use the actual local authorized resize route with fixture Storage transport. No baseline supports a before/after performance improvement claim.

| Route | 390px TTFB / LCP / max CLS | 1280px TTFB / LCP / max CLS |
| --- | --- | --- |
| Home | 44 / 420 / 0.169 | 31 / 144 / 0 |
| Shop | 38 / 468 / 0 | 29 / 212 / 0 |
| Product detail | 22 / 412 / 0 | 23 / 412 / 0 |
| Cart | 21 / 112 / 0 | 23 / 100 / 0 |
| Checkout | 20 / 116 / 0 | 21 / 120 / 0.072 |

Across these observations: zero JavaScript errors, broken loaded images or horizontal overflow. Axe reported no violations for shop/PDP/cart/checkout; the desktop homepage retains a **colour-contrast finding on `.slide-counter > span`**. Mobile homepage CLS reached 0.169; desktop checkout had a 0.072 sample. These merit a focused accessibility/performance follow-up and genuine staging measurements; this infrastructure phase does not redesign the homepage. Shared browser caching makes transferred-script byte counts unsuitable as bundle-size comparisons. Manual screen-reader/provider-widget and real-device checks remain outstanding.

## Remaining owner actions and limitations

1. Identify the authoritative production project/origin, restore read-only access to the configured project, and approve/select an actually separate staging Supabase/Vercel environment. No cloud resource is provisioned by this work.
2. Start a functioning Docker engine and run the full local Supabase migration, pgTAP and lint steps. Rehearse approved existing-data upgrades, inspect hosted drift and verify independent-connection stock races.
3. Perform real staging signup/confirmation/refresh/logout, role/admin denial, catalogue visibility, private image access, cart ownership and product-detail persistence checks. Exact Auth redirects, SMTP, bucket permissions and deployment protection need verification in the actual target.
4. Supply genuine Razorpay TEST credentials and an approved reachable webhook target. Run all sandbox acceptance rows, including authorized/pending, delayed/duplicate capture, expiry, timeout and inbox recovery. Local intercepted Checkout does not verify the provider's actual widget, API account or webhook delivery.
5. Approve the PR/remote CI run and any branch-protection setting, migration application or deployment separately. The workflow is locally inspected; it has not run on GitHub because no push was authorized.
6. Assign expiry/inbox recovery ownership and rehearse incident handling before real commerce. No scheduler/monitoring service or public maintenance endpoint was installed. Resolve the existing ESLint dependency advisory and measured UI/performance limitations before claiming release readiness.
7. Real stock/photography, garment facts, return/delivery policies, tax treatment, payment capture and fulfilment remain owner/product prerequisites. Existing sequential admin child writes and per-request image authorization/resize tradeoffs remain as documented in Phase 7. Manual screen-reader, real-device and provider-widget accessibility remain unverified.

The recommended next phase is **owner-approved hosted staging validation and operational rehearsal**, using [the runbook](DEPLOYMENT-RUNBOOK.md) and [evidence matrix](STAGING-TEST-MATRIX.md). It has not been started automatically.
