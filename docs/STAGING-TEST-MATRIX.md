# Phase 8 integration evidence matrix

21 October 2026. **HOSTED STAGING and RAZORPAY SANDBOX are blocked/unperformed for every row.** No real provider transaction, hosted database write or deployment occurred. Local evidence below cannot establish production readiness.

Evidence labels:

- **MOCK:** synthetic Auth/PostgREST/Storage/gateway/browser transports. Actual Next pages/actions still execute in browser suites.
- **LOCAL DATABASE:** actual migrations, SQL constraints, policies, triggers and transactional commerce RPCs execute in disposable PGlite PostgreSQL. This is not the full Supabase stack; WASM tests serialize requests and cannot establish independent-connection lock behavior.
- **HOSTED STAGING:** actual isolated Supabase Auth/PostgREST/Storage/RLS and Vercel target. Requires owner-approved target/access and real accounts.
- **RAZORPAY SANDBOX:** actual Razorpay test API, Checkout and signed provider webhook delivery. Requires genuine TEST credentials and approved staging.

## Test matrix

| Scenario | Verified local evidence | Hosted/sandbox acceptance still required |
| --- | --- | --- |
| Guest cart and quantity bounds | LOCAL DATABASE + MOCK: actual cart actions/RPCs, distinct guest tokens, stock bounds, integer totals; Phase 7/8 browser flows | Two clean browsers; HTTP-only cookie survives navigation; neither can read/change the other's cart |
| Customer account cart | LOCAL DATABASE + MOCK: verified-user context contracts; authenticated cart ownership | Real signup/confirmation/login/session refresh/logout, same account across browsers, second-account denial |
| Cart merge | LOCAL DATABASE + MOCK: repeat merge adds once, failures roll back, old attached guest tokens rejected | Real login merges the guest cart once; fresh refresh/login does not duplicate lines |
| Product availability | LOCAL DATABASE + MOCK: inactive product/category, seed/test exclusion, fully reserved stock, zero price, unavailable size | Real PostgREST + RLS queries match UI; stock change after render is rejected on action |
| Admin guards and product updates | LOCAL DATABASE + MOCK: guarded admin save, customer role cannot be inserted/updated, anonymous privileged RPC denied | Real customer denied `/admin` and direct writes; verified admin can save; profile initialization and banner edit work |
| Product details persistence | LOCAL DATABASE + MOCK: additive Phase 7 JSON details, old rows preserved, actual save/reload, missing fields | Real admin save/readback and customer-visible publication on isolated staging product |
| Image access | MOCK: actual authorized image route, resize/format checks, unpublish/cache behavior and error fallback; LOCAL DATABASE publication policies | Actual private Storage: deny listing/signing/unregistered/hidden object access; authorized raster load and immediate unpublish denial |
| Order creation and immutable price | LOCAL DATABASE + MOCK: actual checkout action prepares snapshots and server totals; conflicting idempotency payload rejected | Actual PostgREST RPC grants; amounts match provider order and snapshot despite browser manipulation |
| Stock reservation | LOCAL DATABASE: multi-line rollback, insufficient stock, reservation bounds and once-only prepare | Two independent connections race on last units; lock/serialization behavior and ledger invariants verified on PG17 |
| Checkout popup / callback | MOCK + LOCAL DATABASE: official script URL loader intercepted locally; four viewports, keyboard submit, exact provider order/amount, signed callback verified by server | Real Razorpay TEST popup opens, no browser/network/CSP/protection errors, real callback accepted only for owning principal |
| Payment success | LOCAL DATABASE + MOCK: captured payment fetched, exact order/amount/currency checked, event processor atomically confirms stock + paid marker | Actual test API capture + signed provider webhook; Dashboard and database agree |
| Authorized payment remains pending | MOCK + LOCAL DATABASE: valid callback/HMAC with provider status `authorized` cannot show paid | Real authorized-not-captured flow; later genuine capture updates authoritative status |
| Payment failure | LOCAL DATABASE + MOCK: failed webhook releases hold, browser failure remains pending until server confirms | Real failed TEST event, no paid UI, reservation released once |
| Duplicate callback / webhook | LOCAL DATABASE + MOCK: duplicate callback, same/different webhook delivery IDs, callback then webhook consume stock once; payload-hash collision rejected | Provider redelivery after network failure and real callback/webhook race |
| Abandonment and reload | LOCAL DATABASE + MOCK: modal dismissal, bounded polling, saved URL, same order/provider reused, paid reload; foreign browser sees no details | Real popup dismissal/browser close/reopen; same account/browser recovery, no duplicate provider POST |
| Reservation expiration | LOCAL DATABASE: expiry function idempotent; browser/server cannot resume elapsed checkout | Real operator/scheduler execution at lease boundary, observed counter reconciliation |
| Late capture | LOCAL DATABASE + MOCK: capture after failure, expiration or elapsed lease enters `captured_review`; no safe-to-fulfil success | Actual test payment arrives after release; responsible operator resolves without blind repayment/fulfilment |
| Stock finalization | LOCAL DATABASE + MOCK: complete snapshot holds consumed once; injected finalization/write failures roll back | Real provider callback + webhook concurrency with physical/reserved counters and movement audit |
| Unauthorized customer access | LOCAL DATABASE + MOCK: other guest/customer cannot query status, resume, verify callback or call privileged snapshot RPC | Actual JWT sessions and service-key boundary; direct RPC, forged user and stale cookie attempts |
| Interrupted processing | LOCAL DATABASE + MOCK: lost provider POST response not retried, trusted association reconciliation, durable inbox retries, provider GET failure, failed SQL write recovery | Provider timeout after accepting order; operator finds exact receipt; replay original signed event and verify one deduction |
| Environment isolation | Unit + MOCK: mismatched project/origin/Vercel scopes, local hosted URL, exposed secrets, live keys and incomplete config rejected | Vercel build/runtime public values match, stage and production genuinely separate, credentials scoped correctly |
| Migration install / upgrade / drift | LOCAL DATABASE: seven-file fresh replay, archive conflict, hash manifest, upgrade field preservation, preflight hazards, altered contract detection | Actual applied ledger + schema exported read-only, pending suffix approved/rehearsed, full local pgTAP/lint then staging apply/drift check |

## Local commands and artifacts

`npm test` passes **94 tests**. The original Phase 1/3/4/5/6/7 cases remain; Phase 8 adds environment, permissions, upgrade/drift, callback and recovery regressions. See `scripts/phase8.test.mjs` and `scripts/commerce-reliability.test.mjs`.

Browser suites are `scripts/check-phase1.mjs`, `scripts/check-phase3.mjs`, `scripts/check-phase7.mjs`, and `scripts/check-phase8.mjs`. Phase 8 uses an actual optimized Next production build with four checkout viewport widths (390, 768, 1280, 1440), then observations at 390/1280 for home/shop/PDP/cart/checkout. It also invokes the existing `scripts/check-layout.mjs`. Payment API calls are intercepted by a test-only preload; non-loopback server fetches are forbidden. The app itself retains its fixed official Razorpay API URL. The provider Checkout script is fulfilled by a local browser mock; **the genuine Razorpay widget was not tested**.

Ignored evidence is stored under `artifacts/phase-8/`: command logs, dependency audit, browser results, screenshots, accessibility findings, server output and build output. Earlier suites retain their existing artifact locations. Do not commit session credentials or real customer screenshots into evidence.

## Performance interpretation

The Phase 8 report records three same-browser navigations per route/viewport using Chromium Navigation Timing, Largest Contentful Paint and Layout Shift observers against a loopback production build. No CPU/network throttling, real user traffic, field data or Lighthouse score is claimed. Browser cache is shared within each viewport run: transferred JavaScript bytes are **not** a bundle-size comparison. Fixture image processing and local services differ from hosted latency. The measurements establish a repeatable local baseline, not a regression budget or proof of international performance.

Record timings and remaining accessibility findings in `PHASE-8-STAGING-RELEASE.md` from the final run. Automated axe checks do not replace manual screen-reader, provider-widget accessibility or real-device review.

## Completing blocked evidence

Use `DEPLOYMENT-RUNBOOK.md` for exact environment, Auth/Storage, migration, webhook and release steps. For each hosted/sandbox row, attach: commit, target origin/reference, tester/date, fixture IDs, before/after assertions, redacted evidence and PASS/FAIL. Do not mark a row passed merely because a page renders. Current blockers are inaccessible/mismatched hosted project access, unavailable local Docker engine, unapproved/unprovisioned staging target, missing approved TEST credentials, and unexecuted hosted CI/deployment/provider checks.
