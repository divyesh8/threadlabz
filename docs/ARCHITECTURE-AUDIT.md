# ThreadLabz architecture and commerce reliability audit

Audit date: 20 October 2026 (Asia/Kolkata). Starting commit: `0fc3056133a7c3bfe7b855c207ebb72e118e8169`, clean `main`. Local work branch: `codex/commerce-reliability-audit`. Changes are uncommitted. No remote database commands, deployment, push, production mutation, or historical migration edits were performed.

**Decision: proceed to isolated staging validation and recovery operations, not another customer-facing commerce feature phase or live sales.** Local tests pass, but the proposed migration is unapplied, the repository's full migration history cannot be replayed, and authenticated real-database/provider validation remains outstanding.

## 1. Current architecture assessment

The existing single Next.js 16.4 App Router application with npm, feature directories, Supabase/Postgres and Razorpay is adequate for this store. The serious defects were transaction and authorization boundaries, not a need for another backend, ORM or monorepo. Routes compose features; browser components call explicit Server Actions; catalogue reads use the public client; admin operations use a verified user's RLS-governed session.

Reviewed AGENTS.md, README.md, PROGRESS.md, docs/STRUCTURE.md, docs/PHASE-3.md, the current action/service/UI code, all five historical migrations and relevant test contracts. The proposed architecture blueprint was not present in the repository. Installed Next guides for Server Actions, client/server boundaries and Route Handlers were consulted. Prior progress claims were treated as historical claims rather than evidence.

Service-role access now enters through the existing `lib/supabase/admin.ts` factory and two approved server-only operation modules: `features/cart/services/cart.ts` and `features/checkout/services/repository.ts`. No raw privileged client is returned to an action or browser. Missing credentials/RPCs fail closed; the former fallback to the session client is removed.

## 2. Severity-ranked confirmed findings

References marked **baseline** refer to the starting commit above, so removed unsafe code can still be reviewed with `git show <commit>:<path>`. Other references name current files/functions.

| Severity | Confirmed defect and exact reference | Local disposition |
| --- | --- | --- |
| **CRITICAL** | `supabase/migrations/20261012000000_phase_4_commerce_foundation.sql`, `reserve_stock` (line 89), `release_stock_reservation`; phase-5 migration's `finalize_stock_reservation`, `finalize_order_stock`, `release_order_reservations`, `release_expired_stock_reservations`: SECURITY DEFINER functions have no EXECUTE revocation. PostgreSQL's PUBLIC grant lets anonymous/authenticated callers invoke inventory mutations independently of table RLS. | New migration revokes PUBLIC/anon/authenticated execution from every commerce/stock RPC and grants service_role only. Runtime privilege assertions and an actual anonymous execution-denial test pass locally. Remote grants remain unverified. |
| **HIGH** | Baseline `src/features/checkout/actions/checkout.ts:45`, `checkOrderStatusAction`: privileged query by order ID with no ownership predicate; line 73 treats either an order status or payment flag as sufficient proof. | Action derives identity from `getUser()`/HTTP-only cookie, delegates to `getOwnedOrderStatus`, and requires the user ID or a guest-token hash. Success requires fulfilment status, captured payment, and the new atomic verification marker. Missing/unauthorized results are indistinguishable. |
| **HIGH** | Baseline `src/features/cart/services/cart.ts:97`, `getOrCreateCart`, and line 429, `mergeGuestCartIntoUserCart`: guest-token lookup lacks `user_id IS NULL`; authenticated carts can carry guest tokens. Merge performs unchecked independent writes then deletes the source cart. Customer carts have no unique user constraint. | Principal-scoped cart locking, a partial unique user index, guest-only token lookup, user carts without guest tokens, and transactional/idempotent merge. Direct browser cart writes are revoked so all mutations follow the same lock protocol. Legacy attached tokens fail closed. |
| **HIGH** | Baseline `src/features/checkout/services/checkout.ts:31`, `createCheckoutOrder`, especially line 176 and lines 215/226: reservations, line inserts, payment inserts and cart deletion are separate; errors on several writes/rollback calls are ignored. Gateway failure can still produce a success result. | `commerce_prepare_checkout` makes all local effects one transaction. Checked gateway creation/attachment follows a durable single-attempt claim. No synthetic payment success or placeholder provider order is returned. |
| **HIGH** | Same baseline `createCheckoutOrder`: global idempotency lookup is unscoped, returns another order's shipping address, is not request-bound, and invents a fresh reservation expiry. The action never supplies a retry key. | UUID attempt key from the browser; principal-scoped SHA-256 database key; SQL verifies ownership, cart, address and cart fingerprint. Retries return the original snapshots/expiry/provider association. Cart locking prevents concurrent duplicate orders even with different request keys. |
| **HIGH** | Baseline `src/features/checkout/services/payment.ts:110`, `handleRazorpayWebhook`: dedupe falls back to payment ID (line 173), so different event types can collide; event insertion/updates are unchecked; records are marked processed even with missing associations or failed writes; concurrent read-then-write handling is unsafe. | Header event ID with deterministic raw-body-hash fallback, payload binding, durable inbox insertion, and one transactional event processor with row locks. Noncommitted work returns HTTP 500; processed duplicates do not mutate state. |
| **HIGH** | Same baseline handler, line 235: `amountPaidPaise >= paymentRecord.amount_paise`; currency, exact local order total and persisted association are not fully checked. A later failure can overwrite captured state. | Exact integer amount/currency, provider order, local order and unique captured-payment association are checked together. Captured/refunded payments cannot be downgraded by failure events. Conflicting captures remain pending reconciliation. |
| **HIGH** | Baseline phase-5 `finalize_order_stock` only processes ACTIVE reservations, so zero finalized lines still accompany “paid”; `finalize_stock_reservation` clamps stock to zero. `runReservationExpiryCleanup` reports zero even after failure and has no scheduler. | Capture verifies complete matching unexpired reservations. Expired/released/missing holds create `captured_review` with a durable reason, never verified customer success. Finalization rejects inconsistent stock. Expiry takes order/reservation locks and propagates errors. Scheduling remains an owner task. |
| **HIGH** | Baseline payment/order writes can be partly committed before stock finalization. Blind duplicate handling would preserve these legacy inconsistencies. | New `payment_verified_at` is written only with successful transactional capture. Historical partial captures are held for review, not implicitly certified or automatically backfilled. |
| **HIGH** | `001_schema.sql` and `20261011061713_phase_1_catalogue_auth.sql` both create catalogue tables with incompatible columns/roles. The phase-1 file's plain `CREATE TABLE public.categories` fails after 001. | Reproduced in a regression test. History preserved. A selected baseline is explicitly tested; repairing remote migration history requires owner review and staging evidence. |
| **HIGH** | Baseline `src/features/admin/actions/catalogue.ts`, `saveProduct`: removed variants are deleted, cascading inventory ledgers and nulling historical references; stock may be set below reserved units; child-write errors are ignored. | Proposed trigger rejects deleting ordered/reserved variants; NOT VALID stock constraint protects subsequent writes without rewriting legacy data. Admin reads/writes now check errors. The existing multi-request catalogue editor can still partially update metadata; see medium risks. |
| **MEDIUM** | `src/features/cart/actions/cart.ts`, `getCartContext`/`getCartAction`: a page render invokes code that sets a cookie when no session exists, which Next forbids in Server Component rendering. | Read path no longer sets cookies; mutation actions create sessions. Covered by the application test. |
| **MEDIUM** | Baseline `src/lib/observability/commerce-logger.ts`, `logCommerceEvent`: lowercases input keys against a mixed-case denylist and accepts nested/arbitrary values. Provider failure text is also passed as a reason. | Fixed scalar allowlist; provider bodies/descriptions are not exposed in the new payment responses/inbox. This proves sanitizer behavior, not that any production PII leak occurred. |
| **MEDIUM** | `scripts/phase5-commerce-e2e.test.mjs`, tests 5–7 and 19–24: manually execute SQL, check row flags/constraints, and even compute the old `>=` reconciliation predicate in the test. They do not invoke checkout, cart actions or webhook handlers. | Retained as historical invariant coverage. New handler/service tests execute the actual current code and migration with failure injection. “E2E” in the old filename is not evidence of browser-to-provider validation. |
| **LOW** | `docs/STRUCTURE.md` boundary rules previously relied on conventions/build checks, with no repeatable import graph enforcement. | `scripts/check-boundaries.mjs`, run by lint, checks privileged-client import allowlist, layer direction, transitive browser/server leakage (including Node built-ins), unresolved imports and runtime cycles. 96 modules/19 client entries pass. |

### Every exported Server Action

| Action module and exports | Authorization assessment |
| --- | --- |
| `features/auth/actions/account.ts`: `signIn`, `signUp`, `requestPasswordReset` | Intentionally public; schema validation and provider authentication/reset flow. Redirect allowlist preserved. Rate limits/email delivery are staging/provider concerns. |
| Same file: `signOut`, `updatePassword` | Operate on the current Supabase session; no target user ID is accepted. Password update is authorized by Supabase Auth. |
| `features/admin/actions/catalogue.ts`: `saveProduct`, `toggleProductActive`, `deleteOrDeactivateProduct`, `saveCategory`, `toggleCategoryActive`, `deleteCategory`, `saveFestival`, `toggleFestivalActive`, `deleteFestival`, `saveBanner`, `toggleBannerActive`, `deleteBanner`, `uploadAdminImage` | Every export calls `requireAdmin()` before data access. Guard verifies `auth.getUser()` and stored profile role, not user-editable metadata. Mutations retain the user's session client/RLS. |
| `features/cart/actions/cart.ts`: `getCartAction`, `addToCartAction`, `updateQuantityAction`, `removeItemAction` | Derive user from verified auth and guest capability from the cookie. User/cart IDs from browser input never establish ownership; item IDs are constrained by the resolved cart. Mutation inputs remain schema-validated. |
| `features/checkout/actions/checkout.ts`: `getGatewayStatusAction` | Intentionally public configuration booleans/mode; does not return credentials. |
| Same file: `createCheckoutOrderAction`, `checkOrderStatusAction` | Validated address/key or order reference; identity derived independently from auth/cookie; privileged queries are ownership-scoped. Extra supplied identity fields do not become authorization. |

### Risks and incomplete workflows requiring runtime/owner verification

- **HIGH deployment blocker:** RPC revocations and transaction fixes are local proposals. Actual deployed schema, grants, migration tracking and existing inconsistent orders were not inspected or changed remotely.
- **HIGH functional blocker, confirmed code:** `features/checkout/components/checkout-view.tsx`, `handleSubmitOrder`, creates an order and polls once but never opens Razorpay Checkout. It cannot complete a new customer payment in the browser. Building the payment UI was intentionally deferred until staging/provider setup; no design changes were made.
- **HIGH operational blocker:** there is no scheduled expiry/reconciliation consumer or owner review/refund workflow. The new internal recovery operations and durable reasons need an operator and a schedule before sales. Provider retries are finite. No public cron/admin endpoint or infrastructure was invented.
- **HIGH validation gap:** multi-connection Postgres locking, actual Supabase roles/PostgREST behavior, verified login/guest conversion and Razorpay delivery/capture have not been exercised against authenticated staging. PGlite serializes database statements even when application calls overlap.
- **MEDIUM:** admin product/image/festival edits still span requests; checked errors prevent false success but metadata may partially change. Stock/history protections are in SQL. A transactional catalogue editor can be a later focused task.
- **MEDIUM:** existing profile provisioning (`features/auth/services/profile.ts`, `ensureProfile`) and profile UPDATE policy/grants need real Supabase RLS validation. The mock browser suite is not evidence that hosted auth grants or profile initialization work.
- **MEDIUM:** cart summary clamps displayed quantities and omits hidden products; atomic checkout validates the complete underlying cart and can reject it. The current generic error can require a reload/edit.
- **MEDIUM:** webhook route has no application-level request-size cap and guest mutations have no application rate limiter. Verify platform limits/traffic before choosing a minimal control.
- **MEDIUM:** recovery batches are bounded; a backlog of permanently mismatched events needs operator triage so unresolved early events do not monopolize repeated batches.
- **LOW:** retained legacy catalogue services are unused; no confirmed runtime circular dependency was found. Removal is unnecessary for this task.

## 3. Changes made and why

The proposed migration is `supabase/migrations/20261020180305_commerce_reliability.sql`, generated with the installed Supabase CLI. It extends the current schema; it does not delete production rows or historical migrations.

- `commerce_cart`, `commerce_mutate_cart`, `commerce_merge_cart`: derive a principal's cart, serialize mutations/merge/checkout, and prevent guest access to a customer cart.
- `commerce_prepare_checkout`: lock/revalidate real catalogue rows, use integer paise, snapshot order lines, reserve all stock, insert a durable payment intent and remove exactly that locked cart's items in one transaction.
- `commerce_claim_gateway` / `commerce_attach_gateway`: allow one provider creation attempt and persist only an exact verified response. Timeout, crash or attachment failure leaves `gateway_creation_pending`. Retrying does not blindly POST another provider order. Placeholder IDs remain internal intent state only.
- `commerce_record_event` / `commerce_process_event`: retain only authenticated payment facts and the body digest, lock/dedupe event/order/payment, reconcile exact amounts and stock, and commit the processed marker with business effects. The raw payload, contact details, signatures and card metadata are not stored by the new handler.
- `getOwnedOrderStatus`: minimal safe response; a historical “captured” string alone is no longer proof.
- Internal `reconcileCheckoutPayment` fetches the provider order by ID, verifies its receipt equals the local order UUID, binds the expected amount/currency, then replays the inbox. `reconcilePendingPaymentEvents` and `runReservationExpiryCleanup` are server-only operations, not public Server Actions.
- Browser markup/styles are unchanged. The checkout component now retains an attempt UUID for retries. Existing action names/routes remain. Safe behavior changes include refusing checkout without webhook configuration and surfacing failures instead of returning fabricated success.
- `prepare-phase3-db.mjs` now includes the explicit 001 + phase 3/4/5 + reliability sequence in the ignored isolated workspace; it does not start/reset/apply a database. The incompatible phase-1 migration remains in history and is deliberately excluded from this *local test baseline*.

## 4. Changes intentionally rejected

No Turborepo, workspaces, Prisma, microservices, backend split, queue service, new runtime dependency, visual redesign, speculative modules or generic provider abstraction. No automatic refund/reacquisition of expired stock: late captured funds need a truthful review state and an explicit owner decision. No automatic migration-history repair, legacy payment verification backfill, customer-cart deletion/consolidation, or production data cleanup. No new payment popup was added without a verified staging flow.

## 5. Verification and test results

`scripts/commerce-reliability.test.mjs` imports the actual cart/checkout services, checkout actions and webhook `POST` handler. Its transport adapter replaces only Supabase transport, auth/cookies and external gateway HTTP; actual PostgreSQL RPCs, constraints, locks and failure triggers execute in PGlite. Test database/auth/storage scaffolding is isolated and synthetic. The historical sequence's failure is explicitly asserted, not silently claimed as a successful full replay.

New coverage includes unauthorized user/guest status, legacy guest-token isolation, foreign cart items, transactional/repeatable merge, render-safe cart reads, duplicate checkout/actions, request binding, failing order lines, second-reservation failure, payment insertion, cart deletion, missing configuration/RPCs, lost gateway response, failed association persistence, verified-receipt recovery, duplicate/out-of-order/overlapping webhooks, exact amount/currency/association, cross-order reuse of a payment ID, legacy partial capture, inbox failure, failures updating payments/orders/inventory/event completion, durable replay, expired/released holds, RPC grants and log redaction.

| Check | Result |
| --- | --- |
| `npm run lint` | PASS, including import graph enforcement |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 74 tests, 0 failures; 28 tests including the new parent suite |
| `npm run build` | PASS: Next production compile/type analysis/routes |
| `git diff --check` | PASS |
| `node scripts/check-phase1.mjs` | PASS: Edge, 390/1280, isolated auth/catalogue mocks |
| `node scripts/check-phase3.mjs` | PASS: Edge, 390/1280, catalogue/media/keyboard/reduced-motion and cart-backend failure contracts |
| `python scripts/check-sql.py` | Blocked: optional `pglast` parser absent. New SQL is executed by the PGlite suite instead |
| Full local Supabase/pgTAP/advisors | Blocked: Docker Desktop Linux engine pipe unavailable |
| Authenticated staging and real Razorpay browser payment | NOT RUN; credentials/setup/owner action required |

The original catalogue browser suite expected an “Ordering unavailable” button already replaced by earlier commerce work. Its selectors now check the existing “Select options below” / “Add to bag” UI and the genuine cart-backend failure response. No UI was changed to satisfy those assertions.

No production readiness claim follows from these results. Historical Phase 5 documentation overstates staging/E2E evidence.

## 6. Remaining owner actions

1. Establish a separate Supabase staging project/local Docker environment; confirm identity and inspect migration tracking/schema/grants. Reconcile the incompatible historical baseline with backups and explicit approval. Do not run an unreviewed root `db push`.
2. Review duplicate customer carts, invalid stock counters, legacy guest-token attachments, orphan provider orders, payment/order/stock disagreements and already-processed historical events. Resolve through a reviewed recovery plan, preserving history.
3. Review/apply the additive migration in staging, regenerate database types, verify service-role execution and anonymous/authenticated denial over actual PostgREST. Deploy code and schema as a coordinated change only after separate authorization.
4. Configure Razorpay test keys/webhook secret and execute real capture, failure, late payment, duplicate delivery, dropped-response and competing-checkout tests across multiple connections.
5. Assign ownership/scheduling for expiry and reconciliation. Inspect `orders.reconciliation_reason`, `payment_status='captured_review'`, and unprocessed `webhook_events.last_error`. Never set `payment_verified_at` to bypass review. Resolve captures without stock through verified fulfilment or a separately authorized refund.
6. Complete the actual Razorpay Checkout interaction, recovery/resume UX and order history only after these checks. Confirm inventory, tax, shipping/serviceable PIN codes and customer support arrangements before any live sales.

## 7. Migration safety and recovery notes

- The unique customer-cart index deliberately fails if historical duplicates exist. It never arbitrarily keeps/deletes one. This is a blocker to resolve before apply, not a reason to reset data.
- `stock_covers_reservations` is NOT VALID: it enforces future writes without certifying old inventory. Audit old rows and validate the constraint separately after repair.
- Existing orders get null guest authorization/verification fields. Guest ownership cannot be reconstructed from an order ID; no access is granted to legacy guest orders by guessing. Previously “paid” rows require reconciliation before being certified by the new status endpoint.
- Historical payments may have provider IDs only in `payments`, while `orders.razorpay_order_id` is null. They will fail exact association checks until the provider receipt and local ledger have been verified. Do not bulk infer a paid/verified state from a single status field.
- Unprocessed legacy webhook payloads have no new digest and are excluded from automatic new-format replay. Previously processed events may conceal partial writes. Owner review/provider verification is required; this migration neither rewrites nor discards them.
- Failed local checkout transactions leave the original cart and no order/holds. Once preparation commits, the cart lines belong to the saved order. An external gateway failure leaves the durable order/payment intent for reconciliation; restoring the cart automatically could enable duplicate purchases.
- After an ambiguous gateway POST, use the local order UUID as Razorpay receipt to locate the provider order. The internal recovery operation fetches it from Razorpay before binding. If no provider order exists, the owner must resolve/cancel the pending attempt and handle released inventory deliberately; automatic recreation is intentionally disabled.
- A verified capture without a valid reservation is acknowledged only after durable `captured_review` recording. It is **not** a fulfilment success. Conflicting/missing associations remain unprocessed and return 500 for retry/triage.
- New and old application versions must not run together against the changed cart-write permissions. The new app refuses unavailable RPCs; the old privileged app could bypass the new cart lock protocol. Coordinate rollout and rollback.

## 8. Recommended next implementation phase

Run a staging acceptance/recovery phase: reconcile migration history, apply reviewed schema locally/staging, exercise authenticated permissions and real provider events, test multi-connection races, and prove the operator can recover every durable pending/review state. Then complete the existing checkout payment interaction and customer order-resume flow without changing the storefront design. Defer unrelated features until that acceptance gate passes.

Reference guidance: [Supabase database functions and function privileges](https://supabase.com/docs/guides/database/functions), [Razorpay webhook duplicates/retries](https://razorpay.com/docs/webhooks/best-practices/), [Razorpay payment/order event payloads](https://razorpay.com/docs/webhooks/payments), [Razorpay order creation and receipt](https://razorpay.com/docs/api/orders/create/). Supabase's current changelog and relevant Postgres security release notice were consulted; this patch adds no extension/version dependency.
