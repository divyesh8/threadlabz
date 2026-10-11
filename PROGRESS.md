# ThreadLabz progress

Updated: 11 October 2026 (Asia/Calcutta)

## Phase 0 — setup

Status: COMPLETE. Required code and responsive browser checks passed.

### Plan and build

- Created a new Next.js App Router + TypeScript project in the workspace.
- Installed pinned Next/React, Tailwind, shadcn primitive dependencies, Lucide, Framer Motion and Embla; saved npm lockfile.
- Added sampled rust/cream brand tokens, brief charcoal/tan/black colours, semantic shadcn tokens, Outfit and Inter typography.
- Preserved supplied logo files; added logo, monogram loading, favicon and app manifest.
- Built responsive header, search, category chips, mobile menu, footer and five-item fixed mobile navigation.
- Added homepage shell in requested order: hero slider, trust strip, categories, arrivals, festive banner, 20 festivals, costume concepts and 10% newsletter preview.

---

## Phase 1 — Data Layer, Authentication and Storage

Status: COMPLETE & VERIFIED against live Supabase project `cshrojhdldkwyqivngsg` (US East).

### Key Accomplishments

- **Database Schema Alignment:** Authoritative live schema matches `supabase/migrations/001_schema.sql` (profiles with `role`, categories, festivals, products with `total_sold`, product_variants with `stock`, product_images, product_festivals, banners, orders, order_items, newsletter_subscribers).
- **TypeScript Generation:** Types generated via Supabase CLI and re-exported in `src/types/database.ts` and `src/lib/supabase/database.types.ts`.
- **Supabase Clients:**
  - `src/lib/supabase/client.ts` — browser client.
  - `src/lib/supabase/server.ts` — SSR server client with cookie management.
  - `src/lib/supabase/admin.ts` — privileged service-role client (`server-only`).
  - `src/lib/supabase/public.ts` — cookieless public query client.
- **Authentication:**
  - Next 16 session proxy (`src/proxy.ts`) refreshes sessions across `/account`, `/admin`, `/auth`, `/login`, `/signup`.
  - Accessible routes: `/login`, `/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/callback`.
  - Google OAuth wired with graceful configuration fallback.
  - Server auth helpers in `src/lib/auth.ts`: `getUser()`, `getProfile()`, `requireAdmin()`.
- **Catalogue Queries:**
  - `src/lib/queries/products.ts`: `getNewArrivals(8)`, `getTrendingProducts(8)`, `getProductsByCategorySlug`, `getProductsByFestivalSlug`, `getProductBySlug`.
  - `src/lib/queries/categories.ts`, `src/lib/queries/festivals.ts`, `src/lib/queries/banners.ts`.
- **Seed Script:**
  - `scripts/seed-products.ts`: idempotent seeder populating 12 products across 5 categories, 38 variants, 24 images, 20 festivals, and 3 banners. Tested idempotent (0 duplicates on re-run).

---

## Phase 2 — Protected Administration

Status: COMPLETE & VERIFIED.

### Architecture & Security

- **Server-Side Authorization Boundary:**
  - Every route under `/admin` enforces `await requireAdmin()` via `src/app/admin/layout.tsx`.
  - Unauthenticated visitors are redirected to `/login?next=%2Fadmin`.
  - Authenticated non-admin users are rejected and redirected to `/account?error=unauthorized`.
  - Every server action in `src/app/admin/actions.ts` independently calls `await requireAdmin()`. No client roles or user metadata are trusted.
- **Validation:** Strict Zod schemas in `src/lib/admin/validation.ts` for products, variants, categories, festivals, and banners.
- **Safe Deletion Policy:**
  - `deleteOrDeactivateProduct`: checks `order_items` for existing references; deactivates (`is_active = false`) instead of hard deletion to preserve historical order records.
  - `deleteCategory`: deactivates if products belong to the category.

### Features Implemented

1. **Admin Navigation & Layout:**
   - `src/components/admin/admin-nav.tsx`: Responsive navigation supporting mobile (390px drawer) and desktop (1280px sidebar), brand TL monogram, user badge, and sign-out action.
2. **Dashboard Overview:**
   - `src/app/admin/page.tsx`: Real-time metric cards (Total Products, Active Products, Categories, Orders, Newsletter Subscribers) and recent product activity table.
3. **Product Administration:**
   - `src/app/admin/products/page.tsx`: Catalogue list with search by title, category filter dropdown, active/draft filter, stock indicators, and quick active toggle.
   - `src/components/admin/product-table.tsx`: Responsive table with desktop rows and mobile cards, active toggle with optimistic state, and delete confirmation modal.
   - `src/components/admin/product-form.tsx`: Full form for creating and editing garments:
     - Title, auto-slug generator with regex validation, description, category select, target audience, merchandising badge, active toggle.
     - Pricing in Rupees (₹) with automatic integer paise conversion.
     - Dynamic variants table with quick size presets (XS–XXL, Free Size), color, stock count, and SKU.
     - Media asset manager: direct file uploads to Supabase Storage `product-images` bucket, image previews, primary image selector, alt text, and reordering.
     - Multi-select festival affiliation chips.
   - `src/app/admin/products/new/page.tsx` and `src/app/admin/products/[id]/page.tsx`.
4. **Category Administration:**
   - `src/app/admin/categories/page.tsx` & `src/components/admin/category-manager.tsx`: Department list with product counts, sort order, active toggle, and modal for adding/editing categories with image upload.
5. **Festival Administration:**
   - `src/app/admin/festivals/page.tsx` & `src/components/admin/festival-manager.tsx`: 20 Indian festivals manager with icon/artwork upload, calendar date picker, sort order, active toggle, and modal editor.
6. **Banner Administration:**
   - `src/app/admin/banners/page.tsx` & `src/components/admin/banner-manager.tsx`: Curate Hero carousel slides and Festive promotional banners with placement, image upload, headline, CTA label/URL, and sorting.

---

## Verification & Test Results

- `npm test`: **9/9 passed** (configuration bounds, redirect safety, password limits, filter normalization, image ID isolation).
- `npx tsc --noEmit`: **0 errors** (all types strictly verified).
- `npm run lint`: **0 errors, 0 warnings** (strict ESLint max-warnings=0 passed).
- `npm run build`: **Compiled successfully** (Next.js 16.4 Turbopack build with all static and dynamic admin routes).

---

## Manual Test Instructions (Phase 1 & Phase 2)

1. **Authentication Flows:**
   - Visit `/login` or `/signup`. Test email and password validation.
   - Sign in as a regular customer: attempt navigating to `/admin` -> verifies redirect to `/account?error=unauthorized`.
   - Update user profile role in Supabase (`UPDATE profiles SET role = 'admin' WHERE id = '...';`).
   - Sign in as admin: navigate to `/admin` -> verifies access to Admin Dashboard.
2. **Product Administration:**
   - Navigate to `/admin/products`.
   - Test search by title and category filter dropdown.
   - Click "Active" toggle on any product -> verify status flips in database.
   - Click "Add New Product" (`/admin/products/new`). Enter title, click "Regenerate Slug", enter price ₹1,299, add size variants, upload or enter an image URL, choose festivals, and save -> verify redirect to `/admin/products`.
   - Edit an existing product (`/admin/products/[id]`) -> modify stock or price and save.
   - Click "Delete" on a product -> verify confirmation modal.
3. **Category, Festival & Banner Management:**
   - Navigate to `/admin/categories`: add or edit a department.
   - Navigate to `/admin/festivals`: edit festival date or icon.
   - Navigate to `/admin/banners`: create or toggle hero/festive banners.

---

## Next Phase

- **Phase 3 — Storefront Implementation:** Live storefront catalogue, dynamic product grids, category and festival browsing, faceted search, and product detail page (`/products/[slug]`).
