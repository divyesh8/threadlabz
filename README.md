# ⚡ THREADLAB — Premium Custom Clothing E-Commerce Platform
> **Brand Concept:** *"Your Style. Your Canvas."*  
> **Platform Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Integer Paise Currency Engine, Vector SVG Garment Mockups, In-Browser 2D Design Studio.

---

## 🌟 Highlights & Architecture

THREADLAB is a production-oriented e-commerce clothing brand and garment customization studio engineered from the ground up for Indian e-commerce standards.

1. **Interactive 2D Customization Studio (`/design-studio` & `/design-studio/[designId]`):**
   - High-fidelity vector SVG garments with front and back interactive workplanes.
   - Dynamic garment color re-tinting across 6+ street-luxe swatches (Jet Black, Cloud White, Heather Gray, Vintage Olive, Deep Navy, Crimson).
   - Real-time manipulation: Text typography (Bebas Neue, Space Grotesk, Inter, Outfit, Oswald), font size, rotation, letter-spacing, color picker.
   - High-contrast streetwear & retro graphic badges library.
   - Client-side image upload with validation (<10MB size limit, automatic dimension calculation).
   - Multi-layer manipulation (Layer stacking order: Bring Forward, Send Backward, Delete, Duplicate).
   - History engine with multi-level **Undo** and **Redo**.
   - Zoom controls (50% to 200%).
   - One-click **"Add Custom Garment to Bag"** or **"Save Design"** to customer account.

2. **Full Product Catalogue (`/shop` & `/shop/[category]`):**
   - 9 clothing categories: **T-shirts**, **Oversized fits**, **Hoodies**, **Polo shirts**, **Shirts**, **Sweatshirts**, **Jeans**, **Trousers**, and **Shorts**.
   - Multi-faceted filter sidebar with instant URL parameter synchronization:
     - Real-time keyword search.
     - Category filter pills.
     - Dynamic price range slider (in ₹).
     - Garment color swatches.
     - Size matrix (XS, S, M, L, XL, 2XL, 3XL).
     - Garment fit filters (Oversized, Relaxed, Regular, Slim).
     - Sorting (Featured, Newest, Price: Low to High, Price: High to Low).

3. **Product Details Page (`/product/[slug]`):**
   - Interactive front/back garment switcher.
   - Live color swatch selector with synchronized vector previews.
   - Comprehensive size guide matrix with exact Chest and Length measurements (in inches).
   - Real-time inventory and stock status badges (e.g., "Only 3 left!").
   - Fabric composition (e.g. 100% Combed Cotton, 240 GSM French Terry).
   - Direct-to-Studio CTA (**"Customize This Garment"**) pre-loading the selected garment and color.

4. **Cart & Slide-Over Bag Drawer (`/cart` & Global Drawer):**
   - Persistent client-side cart with automatic localStorage persistence.
   - Visual **Free Shipping Progress Meter** (Free delivery above ₹999 threshold).
   - Custom print fee breakdown (₹200 per customized garment).
   - Promo code validation engine supporting:
     - `LAB15` — 15% discount (Min order ₹999).
     - `CANVAS20` — 20% discount (Min order ₹1,499).
     - `THREAD50` — ₹50 instant discount (Min order ₹499).
     - `FREESHIP` — 100% shipping waiver.

5. **Indian 4-Step Checkout Wizard (`/checkout`):**
   - **Step 1: Delivery Address:** Validated Indian phone numbers (+91), 6-digit postal PIN code, state, city, and address lines.
   - **Step 2: Shipping Tier:** Standard Shipping vs. Express Priority Air (Next Day Metro Dispatch).
   - **Step 3: Razorpay Sandbox Payment Simulation:**
     - Simulates Razorpay UPI QR code, Net Banking, and Cards.
     - Sandbox toggle for 1-click test approval or intentional failure simulation.
     - Fully isolated dev mock that transitions smoothly into live production Razorpay Checkout JS.
   - **Step 4: Order Confirmation & Live Tracking (`/order-confirmation/[orderId]` & `/track-order`):**
     - Complete digital invoice with itemized 5% GST and order snapshot.
     - Real-time 5-stage status timeline: *Confirmed → In Production → Quality Check → Dispatched → Delivered*.
     - High-resolution SVG proof preview of the exact customized garment.

6. **Customer Account Portal (`/account`):**
   - Profile management with 1-click switcher between Demo Customer and Demo Admin.
   - Address book (`/account/addresses`) with default delivery address selection.
   - Order history (`/account/orders`) with instant re-order and track links.
   - Saved designs gallery (`/account/designs`) with direct "Open in Studio" re-editing.

7. **Admin Operations Portal (`/admin`):**
   - Operational dashboard with total revenue in ₹, total orders, active customer count, and AOV metrics.
   - Order fulfillment manager (`/admin/orders`):
     - Filter orders by status (*All, Pending, Confirmed, In Production, Dispatched, Delivered*).
     - Micro-factory status advance button (advances orders from Confirmed to Production to Dispatch with automatic AWB tracking assignment).
     - Custom design inspection modal viewing the customer's front and back vector artwork.
   - Product inventory manager (`/admin/products`):
     - SKU catalog, category indicators, stock level badges, and price breakdown.

---

## 🛠️ Tech Stack & Directory Structure

```
├── src/
│   ├── app/                         # Next.js 15 App Router pages & layouts
│   │   ├── page.tsx                 # Homepage (Hero, Categories, Trending, How it Works)
│   │   ├── shop/                    # Catalogue with filter sidebar
│   │   ├── product/[slug]/          # Product details page with customizer link
│   │   ├── design-studio/           # Interactive 2D customizer
│   │   ├── cart/                    # Dedicated cart view
│   │   ├── checkout/                # 4-stage Indian checkout wizard
│   │   ├── order-confirmation/      # Order invoice and proof viewer
│   │   ├── track-order/             # Live tracking via Order ID / AWB
│   │   ├── account/                 # Customer portal (Orders, Designs, Addresses)
│   │   ├── admin/                   # Admin operational portal (Orders, Products)
│   │   ├── about/, contact/, faq/   # Brand story & customer support
│   │   └── shipping-policy/, terms/ # E-commerce policies & return terms
│   ├── components/
│   │   ├── layout/                  # Header, AnnouncementBar, Footer
│   │   ├── product/                 # ProductCard, ProductFilters, SizeChartModal
│   │   ├── studio/                  # StudioCanvas, DesignStudio, ColorPicker
│   │   ├── cart/                    # CartDrawer
│   │   └── checkout/                # CheckoutWizard
│   ├── context/
│   │   ├── CartContext.tsx          # Shopping bag state & drawer controls
│   │   └── AuthContext.tsx          # Demo customer / admin session switcher
│   ├── lib/
│   │   ├── config.ts                # Store policy constants, fees, GST rules
│   │   ├── currency.ts              # Integer paise INR formatter (₹1,499)
│   │   ├── pricing.ts               # Server-side pricing calculation engine
│   │   ├── mockups.ts               # High-fidelity SVG vector garments
│   │   └── db/
│   │       ├── seed-data.ts         # 9 clothing products with full variants
│   │       ├── store.ts             # Central store repository & CRUD
│   │       ├── templates.ts         # Streetwear studio design templates
│   │       ├── graphics.ts          # Vector badge & sticker library
│   │       └── schema.sql           # Production PostgreSQL & Supabase schema
│   └── types/
│       ├── product.ts               # Products, variants, print areas, fits
│       ├── studio.ts                # DesignDocument, elements, layers
│       ├── cart.ts                  # Cart items, snapshots, promo codes
│       └── order.ts                 # Orders, addresses, payments, timelines
└── test/
    └── run-tests.mjs                # Automated verification test suite
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20 or higher (Tested with v24.19.0)
- **Package Manager**: `pnpm` (recommended)

### 2. Run the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests
```bash
pnpm test
```
Runs the 8 domain test suites covering:
1. Catalogue loading & category coverage
2. Product schema & pricing precision (in paise)
3. Search and multi-criteria filtering engine
4. Server-side price calculation with customization charges
5. Promo code discount calculation & minimum requirement
6. Design studio templates & vector presets
7. Order creation, status progression, and immutability
8. Indian Rupee currency formatting & paise conversion

### 4. Build for Production
```bash
pnpm build
```
Generates the optimized static and dynamic production bundle with zero SSR/prerendering errors.

---

## 💳 Razorpay & Supabase Integration Guide

### Razorpay Production Setup
1. Sign up at [Razorpay](https://razorpay.com) and obtain your **Key ID** and **Key Secret**.
2. Add your keys to `.env.local`:
   ```bash
   NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
   RAZORPAY_KEY_SECRET="your_razorpay_secret"
   ```
3. Load the Razorpay Checkout script in `src/app/checkout/page.tsx` via `next/script`:
   ```html
   <Script src="https://checkout.razorpay.com/v1/checkout.js" />
   ```
4. Replace the sandbox simulator with `new window.Razorpay(options).open()`.

### Supabase Database & Auth Setup
1. Create a project at [Supabase](https://supabase.com).
2. Run the schema migrations provided in [src/lib/db/schema.sql](file:///c:/Users/kolli/OneDrive/Desktop/textile%20website/src/lib/db/schema.sql) in the Supabase SQL Editor.
3. Configure authentication redirect URLs and copy project credentials into `.env.local`.

---

## 🎨 Brand Design Tokens
- **Canvas / Background**: `#0B0C0E` (Deep Studio Charcoal)
- **Surfaces / Cards**: `#121418` (Card Surface) / `#1A1D23` (Elevated Panel)
- **Brand Accent**: `#CCFF00` (Electric Lime)
- **Text Primary**: `#F4F5F7` (Off-white)
- **Text Muted**: `#9CA3AF` (Refined silver)
- **Typography**: Display Headings (`font-display`), Clean Body Sans (`font-sans`)
