# ThreadLabz Catalogue Readiness & Import Checklist

This document details the exact product data, photography specifications, and regulatory disclosures required from the store owner before ThreadLabz can publish real inventory and accept its first live sale.

---

## 1. Required Product Fields per Listing

Every purchasable product must have verified, truthful information. Do not invent marketing claims, speculative discounts, or fabric GSM without supplier lab confirmation.

| Field | Requirement | Format / Validation | Purpose |
|---|---|---|---|
| **Title** | Exact product name | Max 100 characters | Clear identification on storefront and customer invoice |
| **Category** | Existing active category | One of: `Men`, `Women`, `Kids`, `Fancy Dress`, `Accessories` | Department routing and filtering |
| **Description** | Honest fabric composition, fit, cut & styling | 2–4 sentences | Customer confidence and Legal Metrology compliance |
| **MRP / Price** | Retail price in Indian Rupees | Integer paise (e.g. ₹999 = `99900` paise) | Server-authoritative checkout calculations |
| **Compare-at Price** | Optional original price (if authentic discount) | Integer paise (e.g. ₹1299 = `129900` paise) | Shown only when genuine discount exists |
| **HSN Code** | 4 to 8-digit GST Harmonized System Code | e.g. `6109` for T-shirts, `6203` for trousers | Statutory requirement for GST invoices in India |
| **Country of Origin** | Country of manufacture | Standard: `India` | Mandatory under Indian E-Commerce Rules 2020 |
| **Care Instructions** | Machine wash, hand wash, or dry clean | Plain text bullet points | Prevents returns due to wash damage |

---

## 2. Product Variant & Inventory Requirements

To prevent overselling and duplicate orders, stock is tracked at the **variant level** (size + colour):

- **Sizes**: Standard Indian sizes (e.g. `XS`, `S`, `M`, `L`, `XL`, `XXL`, `Free Size`, or age ranges for kids like `3-4Y`, `5-6Y`).
- **Colours**: Specific colour name (e.g. `Rust`, `Charcoal`, `Cream`, `Black`, `Navy`). Use `default` only for single-colour accessories.
- **Stock on Hand**: Actual physical pieces in warehouse/shelf ready to ship. Never list expected or pre-order stock as on-hand inventory.
- **SKU**: Unique internal stock keeping unit code (e.g. `TL-TEE-RST-M`).

---

## 3. Product Photography Standards

Customer confidence depends on studio-quality, authentic photographs of the actual garments.

- **Resolution & Aspect Ratio**: 4:5 vertical aspect ratio (minimum 1200 × 1500 px recommended).
- **Format**: Raster format only (`image/jpeg`, `image/png`, or `image/webp`). SVGs, GIFs, and PDFs are rejected by the upload firewall.
- **File Size**: Maximum 5 MB per image file.
- **Angles per Product**:
  1. Primary Front View (model or clean flat-lay against neutral/cream backdrop)
  2. Back View
  3. Close-up fabric / embroidery / stitching detail
- **Background**: Neutral, warm off-white, cream, or light grey complementing the ThreadLabz palette (`#eee4d8`). Avoid busy backgrounds.
- **Upload Path**: Upload via `/admin/media` or product detail page in `/admin/products`. The server automatically verifies raster magic bytes, assigns secure UUID storage keys, and preserves least-privilege storage policies.

---

## 4. Legal & Regulatory Disclosures (Consumer Protection Rules 2020)

Before opening live checkout, the store owner must confirm and supply:

1. **Entity Name & Registered Address**: Legal business name, registered office address, and contact email/phone number.
2. **Grievance Officer**: Name, email, and designation of the designated grievance officer (mandatory for Indian e-commerce).
3. **Return & Exchange Window**: Explicit terms (e.g. 7-day return policy for unused, tagged items; hygiene exclusions for custom/masks).
4. **Delivery Promises**: Realistic standard delivery transit times (e.g. 3–7 business days).

---

## 5. CSV Import Reference

Use `docs/product-import-template.csv` to organize verified inventory in batch before uploading to Supabase or creating via `/admin/products/new`.
