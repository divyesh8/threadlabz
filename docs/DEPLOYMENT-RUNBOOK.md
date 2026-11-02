# ThreadLabz deployment and recovery runbook

21 October 2026. This is a reviewed local procedure, not evidence of a hosted deployment. No cloud project, remote database, branch protection or deployment was changed during Phase 8. Stop at each external approval gate until the owner authorizes that exact target and change.

## Environment contract

| Setting | Local development / CI | Staging | Production |
| --- | --- | --- | --- |
| `APP_ENV` | `local` | `staging` | `production` |
| `SITE_URL` | Loopback origin | Dedicated HTTPS staging origin | Approved HTTPS store origin |
| `THREADLABZ_SUPABASE_URL` | Blank for disconnected preview, or loopback | Separate staging project URL | Production project URL |
| `THREADLABZ_SUPABASE_PUBLISHABLE_KEY` | Blank or local `sb_publishable_…` | Staging publishable key | Production publishable key |
| `THREADLABZ_SUPABASE_SECRET_KEY` | Local key only, server only | Staging `sb_secret_…`, server only | Production `sb_secret_…`, server only |
| `SUPABASE_PROJECT_REF` | Blank | Exact approved staging reference | Exact approved production reference |
| `PRODUCTION_SUPABASE_PROJECT_REF`, `PRODUCTION_SITE_URL` | Blank | Production identities, not credentials; must differ | Must equal production identities |
| `CHECKOUT_MODE` | `disabled`; `test` only with isolated fixtures/local DB | `disabled` until sandbox configuration is approved, then `test` | `disabled` |
| `RAZORPAY_KEY_ID` | Blank or test-only | `rzp_test_…` only | Blank |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Blank or local test values | Separate TEST API/webhook secrets, server only | Blank |
| `SHOPPING_POLICIES_JSON` | Blank/`{}` or explicit QA copy | Owner-approved staging copy | Owner-approved real policy copy |

The three `THREADLABZ_SUPABASE_*` settings are read only by server modules. The publishable key is still the least-privileged credential used for RLS-protected requests; the secret key is used only by privileged server code. Do not add Supabase configuration to browser-exposed variables or `vercel.json`. Rebuild each target with its own server configuration and never promote a staging build to production.

Runtime instrumentation fails before serving when identities are mismatched, local development points at hosted Supabase, a public variable contains a recognized secret name, or test checkout is incompletely configured. Hosted runtime requires a configured database; disconnected local preview remains supported. `npm run check:env` validates the current process environment only, without printing values or reading `.env.local`. Next performs the same validation after loading its environment files. Key-to-project association still needs a real authenticated staging test; opaque secret keys cannot prove project identity offline.

Tests and `npm run build:local` explicitly blank inherited and dotenv credential names. Existing `.env.local` was not changed. Replace any hosted credentials in your local file with local configuration before running `npm run dev`; the new guard deliberately rejects them. Never copy a production `.env` into local or CI. Use a password manager and protected environment scopes for hosted secrets.

## Local verification

Use Node 24 and the committed npm lockfile. No hosted credentials are required:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run check:migrations
npm run build:local
git diff --check
```

For browser checks, use an installed Playwright package and Chromium/Edge. Set `PLAYWRIGHT_MODULE` to its absolute package path if it is outside this project; `QA_BROWSER_CHANNEL` defaults to `msedge`. This follows the existing repository workflow and adds no browser dependency to the application.

```powershell
node scripts/check-phase1.mjs
node scripts/check-phase3.mjs
npm run test:product
npm run test:release
```

Run serially: suites own local servers and Next build/dev directories. `test:release` builds a production app with synthetic loopback services, exercises checkout, records five-route performance observations, then runs the existing shared-layout suite. All fixture services bind to loopback and shut down in `finally`. Test photography/data are visibly labelled and live only in disposable PostgreSQL. The optional offline SQL parser is `python scripts/check-sql.py` (see its pinned, temporary installation instructions).

For the full Supabase stack, first make Docker's Linux engine healthy. Then:

```powershell
node scripts/prepare-phase3-db.mjs
supabase start --workdir tmp/phase3-db
supabase migration up --local --workdir tmp/phase3-db
npm run test:db
npm run db:lint
```

The historical directory name is retained so existing commands keep working; it now contains the entire canonical sequence and all active pgTAP tests. Inspect the project ID (`threadlabz_phase3_qa`) and loopback ports before executing. Do not use reset as an upgrade procedure. A genuinely fresh local project can be recreated only after positively identifying it as disposable; this runbook requires no destructive reset.

## Canonical migration strategy

The active sequence is `001_schema.sql`, Phase 3 boundaries, Phase 4 commerce foundation, Phase 5 lifecycle, Phase 6 reliability, Phase 7 product details, and `20261021082348_phase_8_release_permissions.sql`.

The independent `20261011061713_phase_1_catalogue_auth.sql` used different product/variant/profile contracts and failed after `001`. It, its test and its matching seed are preserved unchanged under `supabase/history/phase-1-alternative/`. They must not execute in the canonical chain. Default automatic seeding is disabled. The source-controlled manifest checks normalized SQL hashes, ordering and archive integrity; CI replays all seven canonical files and compares the resulting schema contract. Historical applied migration bodies were not rewritten.

**Fresh approved staging database:** verify it is empty and the target identity is correct, obtain migration approval, then apply the complete active directory with the Supabase CLI. Do not apply the archive or import real customers. `supabase/fixtures/01_dev_catalogue.sql` is optional QA data with `source='test'`; public RLS and application queries exclude it. Browser fixtures with visible sources exist only in the in-memory test harness and are not an import script. To test a real hosted PDP, an owner must enter an approved genuine staging-only product through the admin editor; do not relabel synthetic fixtures as real inventory.

**Existing database:** first obtain read-only access and export the applied migration ledger, server version, schema, grants/policies and a data-preserving backup. Run `supabase/ops/upgrade-preflight.sql` using a reviewed database connection. It checks canonical shape, a contiguous known ledger, conflicting history, duplicate customer carts, legacy attached guest tokens and invalid stock counters, and rolls back its read-only transaction. It never fixes data. Any failure requires a separately reviewed reconciliation; do not mark migrations applied or delete ledger rows to bypass it. The alternate schema needs an explicit field/data mapping and rehearsal, not this upgrade path.

Compare the actual migration ledger against `supabase/migration-manifest.json`. Apply only the pending suffix after approval and a rehearsal on a sanitized, isolated copy. Phase 6 deliberately rejects unsafe duplicate carts and leaves existing invalid inventory for review; Phase 7 adds nullable product details; Phase 8 adjusts grants and policies without rewriting rows. The automated upgrade test preserves profiles, categories, products, variants and order fields across the Phase 5 → 8 upgrade. It does not establish that an inaccessible hosted database has the same history.

For drift detection, use a local PostgreSQL service entry configured outside this repository, with TLS and owner-visible catalog metadata, forcing `default_transaction_read_only=on` in the connection options. A restricted metadata role may omit grants from `information_schema`, producing an incomplete comparison; treat that as unverified. Do not put a password in a command argument or log:

```powershell
psql "service=threadlabz_staging_readonly" -X -v ON_ERROR_STOP=1 -f supabase/ops/upgrade-preflight.sql
psql "service=threadlabz_staging_readonly" -X -A -t -v ON_ERROR_STOP=1 -f supabase/ops/schema-contract.sql -o artifacts/staging-schema-contract.json
node scripts/schema-drift.mjs supabase/schema-contract.json artifacts/staging-schema-contract.json
```

The contract covers application columns, constraints, indexes, policies, function definitions/execute privileges, triggers, table/column grants and the private product bucket. It excludes customer rows and provider-owned function bodies. Compare the complete contract after the pending suffix is applied; before upgrading, compare against an isolated replay through the actual applied checkpoint. PostgreSQL/provider differences may need review: a reported difference is **not** permission to overwrite the snapshot or change the hosted schema. PG18 not-null constraint catalog entries are deliberately excluded to compare the local WASM engine with the configured PG17 target.

## GitHub and Vercel release flow

Use short `codex/*` feature branches → reviewed PR to `develop` → manually approved staging candidate → reviewed PR to `main`. This phase adds the workflow, not remote branches or branch protection. Ask the owner to require the `quality` job and human review once the first actual workflow run has been verified. CI uses Node 24, `npm ci`, caching, pinned checkout/setup-node actions, `contents: read`, no persistent Git credentials, and no deploy/database secrets. It runs environment validation, lint/boundaries, types, all Node/SQL integration tests, migration replay/drift, production build and meaningful diff checks. Browser checks are a separate release gate run with the documented local tooling.

`vercel.json` keeps Next routing intact, uses `npm ci` and an environment-validated build, and disables Git-triggered deployments. It does not change existing hosted settings until an approved deployment. Never import/connect a repository assuming that automatic deployments are harmless: inspect existing Git integration settings first. No automatic production migration or deploy workflow is provided.

Owner staging setup, with approval before creating any resource:

1. Identify the authoritative production Supabase project and production origin. Record project references and access owners, never secrets, in the release ticket. Approve a **different** staging Supabase project and isolated storage/auth users. Do not use a production database branch containing customers without an approved sanitization process.
2. Approve/select a Vercel target. Use **Preview** scoped variables for staging (`VERCEL_ENV=preview`, `APP_ENV=staging`) and **Production** scoped variables only for production. A separate Vercel project is also acceptable, but staging must still be deployed to its Preview target; this validator intentionally rejects `APP_ENV=staging` on a Vercel Production deployment. Use a stable approved staging domain/origin and rebuild when server configuration changes. Never share `.vercel/project.json` between targets blindly.
3. Configure staging Supabase Auth Site URL and exact redirect allowlist for the staging origin and `/auth/callback`; install the repository confirmation email template and test `/auth/confirm` with the expected token-hash flow. Keep email confirmations on. Use dedicated test mailboxes/SMTP; never copy production sessions/users. Verify signup, confirmation, login, refresh, logout and blocked cross-origin redirects. Avoid broad production/staging redirect wildcards.
4. Use the private `product-images` bucket, 5 MiB limit, JPEG/PNG/WebP types and reviewed storage policies. Verify anonymous direct-list/sign access is denied, registered visible images load through `/catalogue-image/[id]`, and unpublishing removes access. Admin role assignment is an owner-controlled database operation after verifying the test account, not browser-supplied metadata.
5. Approve and rehearse the migration suffix. Configure keys through Vercel's protected UI/CLI prompts, validate configuration, then approve a **manual Preview deployment** of the exact reviewed commit. Check project and target in the confirmation before deploying. No command was executed here to create, link or deploy a cloud project.
6. Run every HOSTED STAGING row in `STAGING-TEST-MATRIX.md`. Store date, tester, commit, target project, assertions and redacted evidence. Do not substitute local mocks for these results.

## Razorpay sandbox gate

Only after the previous gates pass, obtain genuine **test-mode** keys and a separate webhook signing secret. Configure test webhook `https://<approved-staging-origin>/api/webhooks/razorpay` for `payment.captured`, `payment.failed`, `order.paid`. Confirm deployment protection allows that signed server-to-server route while maintaining the intended staging access policy; do not disable all protection without approval. Verify the account's capture configuration. The app does not implement capture requests or enable live checkout.

Start one synthetic checkout using an approved staging-only garment. Record the local order UUID, provider order/payment IDs, expected amount/currency, and stock before/after without customer PII. Exercise success, failure, dismissal, reload, delayed webhook, duplicate delivery and reservation expiry. Confirm the signed browser callback alone never marks paid; the server fetches the payment, verifies exact association/amount/currency and capture, then uses the same atomic event processor as webhooks. A valid authorization remains pending. A capture after release/expiry becomes `captured_review`, never safe-to-fulfil confirmation. Observe actual Razorpay test Dashboard events before marking RAZORPAY SANDBOX passed.

## Release, rollback and incident handling

Production deployment is a separate owner decision. This release leaves `CHECKOUT_MODE=disabled` and rejects live credentials. Live sales require a later reviewed tax/shipping/payment-capture/fulfilment decision and genuine staging evidence.

Before any approved production preview deployment: record exact commit/build, migration manifest, approvals, backup/restore rehearsal, verified staging matrix, previous compatible deployment ID, environment identity and incident owner. Obtain separate approval for the production migration suffix and application deployment. Keep checkout disabled. Review `supabase db push --linked --dry-run` only after positively identifying the linked project; an approved operator may apply the reviewed suffix with `supabase db push --linked`. Never use migration repair, reset, `--include-all` or metadata edits to make a failing plan pass. Do not auto-promote a staging build.

After deployment, smoke-test home/shop/PDP and authorized images, exact pricing, guest/cart ownership, login/logout/admin denial, no console/server errors, no secret exposure, private-bucket permissions, schema contract and disabled production checkout. Monitor order/payment states and storage access errors; smoke tests must not create real payments.

If the app regresses, disable new checkout (`CHECKOUT_MODE=disabled`) while retaining **test** secrets needed to drain existing sandbox events. Manually restore the last reviewed **schema-compatible** application deployment after owner approval. Keep additive columns and security grants; do not blindly roll back SQL or relax RLS. Old code that depended on removed privileges is not a safe rollback. Prefer a reviewed forward migration. Restore a database backup only as an incident operation with explicit data-loss assessment and approval; never automatically reset it.

For pending payments, operators must distinguish these cases:

| Symptom | Safe recovery |
| --- | --- |
| Browser interrupted / modal dismissed | Same browser/account opens saved `/checkout?order=…` (or attempt URL), checks server status, resumes the same provider order while payable. Never create another order to resolve an ambiguous payment. |
| Provider order POST response lost | Keep `gateway_attempted_at`; do not clear it or repeat POST. Find the exact local UUID as Razorpay receipt, verify provider ID/amount/currency through trusted test API/Dashboard, then invoke the existing server-only `reconcileCheckoutPayment(localId, providerId)` from a reviewed operator/server context. It fetches and verifies receipt before association. There is deliberately no public recovery endpoint. |
| Inbox event processing interrupted | Inspect `webhook_events` with `processed_at is null`, `payload_hash is not null`, `last_error` and age. Retry the original signed webhook, or run the existing server-only `reconcilePendingPaymentEvents(50)`. For an approved privileged SQL session, process specific reviewed UUIDs with `select public.commerce_process_event('<event-uuid>'::uuid);`; never insert fabricated capture events. |
| Expired holds | An approved service/operator runs `select public.release_expired_stock_reservations();` and checks counters/reservation states. Repetition is idempotent. A late capture needs review, not stock resurrection. |
| `captured_review`, payment mismatch, conflicting capture | Stop fulfilment/re-payment, compare the provider record and inventory ledger, assign an owner, and resolve refund/fulfilment manually under a separate approved procedure. Never directly set `paid` or decrement stock to hide the discrepancy. |
| Database/storage/auth outage | Fail closed, retain identifiers and sanitized logs, restore connectivity/configuration, then replay pending events and repeat ownership checks. Never fall back to privileged public catalogue access. |

Before any real sales, assign an operator and approve a protected scheduler for expiry/inbox recovery. Suggested staging rehearsal: run every minute, alert on unprocessed events older than 5 minutes, `captured_review`, and reservations active beyond their lease. These are proposed operating thresholds, not installed monitoring or delivery promises. No cron, public maintenance route or paid service was enabled in this phase.

## External verification status

The repository's configured Supabase reference could not be inspected through the connected account. The only listed project was a different inactive project; its migration lookup failed authentication. The configured project lookup was denied. Applied hosted versions, hosted drift, Auth/Storage behavior and actual staging identity remain unknown. Docker's Linux engine was unavailable, so full local Supabase pgTAP/lint remain blocked despite successful disposable PostgreSQL replay. Genuine Razorpay and Vercel checks were not performed. See the evidence matrix before approving a release.

## Primary references

- [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase PostgreSQL security changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
- [Vercel environment scopes](https://vercel.com/docs/deployments/environments) and [Git deployment switch](https://vercel.com/docs/project-configuration/git-configuration)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [Razorpay Standard Checkout and server signature verification](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- Installed Next.js 16.4 docs: environment variables, instrumentation, Server Functions and Server/Client Components.
