import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Error: Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface SeedProduct {
  title: string;
  slug: string;
  description: string;
  category_slug: string;
  audience: "men" | "women" | "kids" | "unisex";
  price_paise: number;
  compare_at_paise: number;
  badge: string;
  total_sold: number;
  variants: { size: string; color: string; stock: number; sku: string }[];
  images: { url: string; alt: string; sort_order: number; is_primary: boolean }[];
  festivals: string[];
}

const PRODUCTS: SeedProduct[] = [
  // Men
  {
    title: "ThreadLabz Heavyweight Oversized Tee",
    slug: "men-oversized-graphic-tee",
    description: "260 GSM dense combed cotton with structured drop shoulders and signature ThreadLabz monogram wash.",
    category_slug: "men",
    audience: "men",
    price_paise: 129900,
    compare_at_paise: 189900,
    badge: "Best Seller",
    total_sold: 142,
    variants: [
      { size: "S", color: "Charcoal Black", stock: 25, sku: "TL-M-TEE-S-BLK" },
      { size: "M", color: "Charcoal Black", stock: 40, sku: "TL-M-TEE-M-BLK" },
      { size: "L", color: "Charcoal Black", stock: 35, sku: "TL-M-TEE-L-BLK" },
      { size: "XL", color: "Charcoal Black", stock: 20, sku: "TL-M-TEE-XL-BLK" },
    ],
    images: [
      { url: "/placeholders/men-oversized-tee-front.svg", alt: "ThreadLabz Heavyweight Tee Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/men-oversized-tee-back.svg", alt: "ThreadLabz Heavyweight Tee Back View", sort_order: 1, is_primary: false },
    ],
    festivals: [],
  },
  {
    title: "Heritage Embroidered Silk Blend Kurta",
    slug: "men-festive-silk-blend-kurta",
    description: "Traditional mandarin collar kurta with intricate tone-on-tone threadwork in festive terracotta.",
    category_slug: "men",
    audience: "men",
    price_paise: 249900,
    compare_at_paise: 349900,
    badge: "Festive Pick",
    total_sold: 88,
    variants: [
      { size: "M", color: "Terracotta Rust", stock: 15, sku: "TL-M-KRT-M-RST" },
      { size: "L", color: "Terracotta Rust", stock: 25, sku: "TL-M-KRT-L-RST" },
      { size: "XL", color: "Terracotta Rust", stock: 18, sku: "TL-M-KRT-XL-RST" },
    ],
    images: [
      { url: "/placeholders/men-festive-kurta-front.svg", alt: "Heritage Silk Kurta Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/men-festive-kurta-detail.svg", alt: "Heritage Silk Kurta Embroidery", sort_order: 1, is_primary: false },
    ],
    festivals: ["diwali", "dussehra"],
  },
  {
    title: "Raw Edge Heavy Fleece Hoodie",
    slug: "men-streetwear-relaxed-hoodie",
    description: "Relaxed-fit 400 GSM custom fleece hoodie with kangaroo pocket and high-density branding print.",
    category_slug: "men",
    audience: "men",
    price_paise: 299900,
    compare_at_paise: 399900,
    badge: "New Drop",
    total_sold: 64,
    variants: [
      { size: "M", color: "Cream Stone", stock: 20, sku: "TL-M-HD-M-CRM" },
      { size: "L", color: "Cream Stone", stock: 30, sku: "TL-M-HD-L-CRM" },
      { size: "XL", color: "Cream Stone", stock: 15, sku: "TL-M-HD-XL-CRM" },
    ],
    images: [
      { url: "/placeholders/men-streetwear-hoodie-front.svg", alt: "Heavy Fleece Hoodie Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/men-streetwear-hoodie-back.svg", alt: "Heavy Fleece Hoodie Back Graphic", sort_order: 1, is_primary: false },
    ],
    festivals: [],
  },

  // Women
  {
    title: "Royal Chanderi Anarkali Suit Set",
    slug: "women-royal-anarkali-suit",
    description: "Flowing Chanderi silhouette with hand-detailed gota patti border, matching churidar and sheer dupatta.",
    category_slug: "women",
    audience: "women",
    price_paise: 399900,
    compare_at_paise: 549900,
    badge: "Festive Exclusive",
    total_sold: 95,
    variants: [
      { size: "S", color: "Maroon Rust", stock: 12, sku: "TL-W-ARK-S-MRN" },
      { size: "M", color: "Maroon Rust", stock: 20, sku: "TL-W-ARK-M-MRN" },
      { size: "L", color: "Maroon Rust", stock: 18, sku: "TL-W-ARK-L-MRN" },
      { size: "XL", color: "Maroon Rust", stock: 10, sku: "TL-W-ARK-XL-MRN" },
    ],
    images: [
      { url: "/placeholders/women-anarkali-suit-front.svg", alt: "Royal Chanderi Anarkali Set", sort_order: 0, is_primary: true },
      { url: "/placeholders/women-anarkali-suit-detail.svg", alt: "Anarkali Embroidery Detail", sort_order: 1, is_primary: false },
    ],
    festivals: ["diwali", "navratri", "eid"],
  },
  {
    title: "Woven Zari Banarasi Blend Saree",
    slug: "women-festive-woven-saree",
    description: "Lustrous woven saree inspired by Indian artisan weaves with rich pallu patterning and unstitched blouse.",
    category_slug: "women",
    audience: "women",
    price_paise: 449900,
    compare_at_paise: 699900,
    badge: "Handloom",
    total_sold: 110,
    variants: [
      { size: "Free Size", color: "Deep Wine", stock: 15, sku: "TL-W-SRE-FS-WIN" },
      { size: "Free Size", color: "Mustard Gold", stock: 20, sku: "TL-W-SRE-FS-GLD" },
      { size: "Free Size", color: "Forest Green", stock: 12, sku: "TL-W-SRE-FS-GRN" },
    ],
    images: [
      { url: "/placeholders/women-festive-saree-front.svg", alt: "Banarasi Blend Saree Drape", sort_order: 0, is_primary: true },
      { url: "/placeholders/women-festive-saree-detail.svg", alt: "Banarasi Saree Pallu Motif", sort_order: 1, is_primary: false },
    ],
    festivals: ["durga-puja", "onam", "diwali"],
  },
  {
    title: "Boxy Vintage Wash Graphic Crop Tee",
    slug: "women-boxy-streetwear-crop-tee",
    description: "Premium cotton crop top featuring subtle enzyme distress wash and relaxed drop shoulders.",
    category_slug: "women",
    audience: "women",
    price_paise: 99900,
    compare_at_paise: 149900,
    badge: "Trending",
    total_sold: 135,
    variants: [
      { size: "XS", color: "Vintage Sand", stock: 15, sku: "TL-W-CRP-XS-SND" },
      { size: "S", color: "Vintage Sand", stock: 25, sku: "TL-W-CRP-S-SND" },
      { size: "M", color: "Vintage Sand", stock: 30, sku: "TL-W-CRP-M-SND" },
      { size: "L", color: "Vintage Sand", stock: 20, sku: "TL-W-CRP-L-SND" },
    ],
    images: [
      { url: "/placeholders/women-oversized-crop-tee-front.svg", alt: "Graphic Crop Tee Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/women-oversized-crop-tee-back.svg", alt: "Graphic Crop Tee Back", sort_order: 1, is_primary: false },
    ],
    festivals: [],
  },

  // Kids
  {
    title: "Little Nawab Jacquard Kurta Pajama",
    slug: "kids-diwali-jacquard-kurta-pajama",
    description: "Soft breathable cotton jacquard kurta with elasticated comfort pajama for festive celebrations.",
    category_slug: "kids",
    audience: "kids",
    price_paise: 149900,
    compare_at_paise: 219900,
    badge: "Festive Kids",
    total_sold: 72,
    variants: [
      { size: "2-3Y", color: "Festive Mustard", stock: 15, sku: "TL-K-NWB-23Y-MST" },
      { size: "4-5Y", color: "Festive Mustard", stock: 20, sku: "TL-K-NWB-45Y-MST" },
      { size: "6-7Y", color: "Festive Mustard", stock: 15, sku: "TL-K-NWB-67Y-MST" },
      { size: "8-9Y", color: "Festive Mustard", stock: 10, sku: "TL-K-NWB-89Y-MST" },
    ],
    images: [
      { url: "/placeholders/kids-diwali-kurta-pajama-front.svg", alt: "Kids Jacquard Kurta Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/kids-diwali-kurta-pajama-detail.svg", alt: "Kids Jacquard Fabric Detail", sort_order: 1, is_primary: false },
    ],
    festivals: ["diwali", "ganesh-chaturthi"],
  },
  {
    title: "Sparkle Mirror Work Ghagra Choli",
    slug: "kids-festive-ghagra-choli-set",
    description: "Twirl-ready tiered ghagra with soft inner cotton lining and foil mirror accents on the choli.",
    category_slug: "kids",
    audience: "kids",
    price_paise: 179900,
    compare_at_paise: 249900,
    badge: "Navratri Special",
    total_sold: 68,
    variants: [
      { size: "3-4Y", color: "Peacock Blue", stock: 12, sku: "TL-K-GHG-34Y-BLU" },
      { size: "5-6Y", color: "Peacock Blue", stock: 18, sku: "TL-K-GHG-56Y-BLU" },
      { size: "7-8Y", color: "Peacock Blue", stock: 14, sku: "TL-K-GHG-78Y-BLU" },
    ],
    images: [
      { url: "/placeholders/kids-festive-lehenga-front.svg", alt: "Girls Ghagra Choli Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/kids-festive-lehenga-detail.svg", alt: "Girls Ghagra Detail", sort_order: 1, is_primary: false },
    ],
    festivals: ["navratri", "diwali"],
  },

  // Fancy Dress Costumes
  {
    title: "Bal Krishna Complete Fancy Dress Costume",
    slug: "costume-little-bal-krishna-set",
    description: "Authentic Janmashtami costume set including dhoti, patka, mor pankh mukut, and flute accessory.",
    category_slug: "fancy-dress",
    audience: "kids",
    price_paise: 129900,
    compare_at_paise: 179900,
    badge: "School Ready",
    total_sold: 124,
    variants: [
      { size: "2-4Y", color: "Saffron Yellow", stock: 25, sku: "TL-C-KRS-24Y-YEL" },
      { size: "4-6Y", color: "Saffron Yellow", stock: 35, sku: "TL-C-KRS-46Y-YEL" },
      { size: "6-8Y", color: "Saffron Yellow", stock: 20, sku: "TL-C-KRS-68Y-YEL" },
    ],
    images: [
      { url: "/placeholders/costume-little-krishna-front.svg", alt: "Bal Krishna Costume Full Set", sort_order: 0, is_primary: true },
      { url: "/placeholders/costume-little-krishna-detail.svg", alt: "Bal Krishna Crown & Accessories", sort_order: 1, is_primary: false },
    ],
    festivals: ["janmashtami"],
  },
  {
    title: "Cosmic Defender Superhero Cape & Gauntlets",
    slug: "costume-superhero-cape-and-cuff-set",
    description: "Double-layered satin hero cape with adjustable velcro collar and padded arm gauntlets.",
    category_slug: "fancy-dress",
    audience: "kids",
    price_paise: 89900,
    compare_at_paise: 129900,
    badge: "Fan Favourite",
    total_sold: 92,
    variants: [
      { size: "3-6Y", color: "Crimson & Gold", stock: 30, sku: "TL-C-SUP-36Y-RED" },
      { size: "7-10Y", color: "Crimson & Gold", stock: 35, sku: "TL-C-SUP-710Y-RED" },
      { size: "11-14Y", color: "Crimson & Gold", stock: 20, sku: "TL-C-SUP-1114Y-RED" },
    ],
    images: [
      { url: "/placeholders/costume-superhero-cape-front.svg", alt: "Superhero Cape Set Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/costume-superhero-cape-back.svg", alt: "Superhero Cape Emblem Back", sort_order: 1, is_primary: false },
    ],
    festivals: ["childrens-day"],
  },

  // Accessories
  {
    title: "TL Monogram 6-Panel Distressed Cap",
    slug: "accessory-embroidered-heritage-cap",
    description: "Heavy twill baseball cap with washed patina finish, 3D embroidered monogram, and brass slider.",
    category_slug: "accessories",
    audience: "unisex",
    price_paise: 79900,
    compare_at_paise: 119900,
    badge: "Labz Edition",
    total_sold: 156,
    variants: [
      { size: "Standard One Size", color: "Faded Terracotta", stock: 25, sku: "TL-A-CAP-OS-RST" },
      { size: "Standard One Size", color: "Charcoal", stock: 30, sku: "TL-A-CAP-OS-BLK" },
      { size: "Standard One Size", color: "Bone White", stock: 20, sku: "TL-A-CAP-OS-WHT" },
    ],
    images: [
      { url: "/placeholders/accessory-embroidered-cap-front.svg", alt: "TL Monogram Cap Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/accessory-embroidered-cap-side.svg", alt: "TL Monogram Cap Profile", sort_order: 1, is_primary: false },
    ],
    festivals: [],
  },
  {
    title: "ThreadLabz 'Make Your Mark' Daily Tote",
    slug: "accessory-heavy-cotton-canvas-tote",
    description: "450 GSM unbleached heavy canvas carryall with internal zip pocket and reinforced cross-stitched handles.",
    category_slug: "accessories",
    audience: "unisex",
    price_paise: 69900,
    compare_at_paise: 99900,
    badge: "Eco Living",
    total_sold: 178,
    variants: [
      { size: "Standard", color: "Natural Raw", stock: 45, sku: "TL-A-TOT-OS-NAT" },
      { size: "Standard", color: "Olive Drab", stock: 35, sku: "TL-A-TOT-OS-OLV" },
      { size: "Standard", color: "Washed Black", stock: 40, sku: "TL-A-TOT-OS-BLK" },
    ],
    images: [
      { url: "/placeholders/accessory-canvas-tote-front.svg", alt: "Make Your Mark Tote Front", sort_order: 0, is_primary: true },
      { url: "/placeholders/accessory-canvas-tote-detail.svg", alt: "Canvas Tote Stitch Detail", sort_order: 1, is_primary: false },
    ],
    festivals: [],
  },
];

const BANNERS = [
  {
    placement: "hero" as const,
    title: "MAKE YOUR MARK",
    subtitle: "India-first clothing, costumes and custom statement wear.",
    image_url: "/placeholders/men-oversized-tee-front.svg",
    cta_label: "Shop New Arrivals",
    cta_href: "/shop",
    sort_order: 1,
    is_active: true,
  },
  {
    placement: "hero" as const,
    title: "THE AUTUMN EDIT",
    subtitle: "Heavyweight streetwear drops designed for everyday movement.",
    image_url: "/placeholders/men-streetwear-hoodie-front.svg",
    cta_label: "Explore Streetwear",
    cta_href: "/shop?category=men",
    sort_order: 2,
    is_active: true,
  },
  {
    placement: "festive" as const,
    title: "Festive Fits Now Live",
    subtitle: "Celebrate 20 Indian festivals with hand-detailed heritage styles.",
    image_url: "/placeholders/women-anarkali-suit-front.svg",
    cta_label: "Shop Festive Outfits",
    cta_href: "/shop?category=women",
    sort_order: 1,
    is_active: true,
  },
];

async function seed() {
  console.log("Starting idempotent seed script for ThreadLabz...");

  // 1. Fetch Categories and Festivals
  const [catRes, festRes] = await Promise.all([
    supabase.from("categories").select("id, slug"),
    supabase.from("festivals").select("id, slug"),
  ]);

  if (catRes.error) throw new Error(`Categories error: ${catRes.error.message}`);
  if (festRes.error) throw new Error(`Festivals error: ${festRes.error.message}`);

  const categoryMap = new Map(catRes.data.map((c) => [c.slug, c.id]));
  const festivalMap = new Map(festRes.data.map((f) => [f.slug, f.id]));

  // 2. Fetch all existing products, variants, images, festivals in batch
  const { data: existingProducts } = await supabase.from("products").select("id, slug");
  const prodSlugToId = new Map(existingProducts?.map((p) => [p.slug, p.id]) || []);

  let productsInserted = 0;
  let productsPreserved = 0;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const item = PRODUCTS[i];
    const categoryId = categoryMap.get(item.category_slug);
    if (!categoryId) {
      console.warn(`Category '${item.category_slug}' not found for '${item.slug}'`);
      continue;
    }

    let productId = prodSlugToId.get(item.slug);

    if (!productId) {
      const { data: newProd, error: insertError } = await supabase
        .from("products")
        .insert({
          title: item.title,
          slug: item.slug,
          description: item.description,
          category_id: categoryId,
          audience: item.audience,
          price_paise: item.price_paise,
          compare_at_paise: item.compare_at_paise,
          badge: item.badge,
          total_sold: item.total_sold,
          is_active: true,
          source: "seed",
        })
        .select("id")
        .single();

      if (insertError || !newProd) {
        console.error(`Error inserting product ${item.slug}:`, insertError?.message);
        continue;
      }
      productId = newProd.id;
      prodSlugToId.set(item.slug, productId);
      productsInserted++;
    } else {
      productsPreserved++;
    }

    // Variants for this product
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("size, color")
      .eq("product_id", productId);

    const existingVarSet = new Set(
      existingVariants?.map((v) => `${v.size}::${v.color}`) || []
    );

    const newVariants = item.variants
      .filter((v) => !existingVarSet.has(`${v.size}::${v.color}`))
      .map((v) => ({
        product_id: productId!,
        size: v.size,
        color: v.color,
        stock: v.stock,
        sku: v.sku,
      }));

    if (newVariants.length > 0) {
      await supabase.from("product_variants").insert(newVariants);
    }

    // Images for this product
    const { data: existingImgs } = await supabase
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId);

    const existingImgSorts = new Set(existingImgs?.map((img) => img.sort_order) || []);

    const newImages = item.images
      .filter((img) => !existingImgSorts.has(img.sort_order))
      .map((img) => ({
        product_id: productId!,
        url: img.url,
        alt: img.alt,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      }));

    if (newImages.length > 0) {
      await supabase.from("product_images").insert(newImages);
    }

    // Festivals
    if (item.festivals.length > 0) {
      const { data: existingPF } = await supabase
        .from("product_festivals")
        .select("festival_id")
        .eq("product_id", productId);

      const existingFestIds = new Set(existingPF?.map((pf) => pf.festival_id) || []);

      const newPFs = item.festivals
        .map((fSlug) => festivalMap.get(fSlug))
        .filter((fId): fId is string => Boolean(fId) && !existingFestIds.has(fId!))
        .map((fId) => ({
          product_id: productId!,
          festival_id: fId,
        }));

      if (newPFs.length > 0) {
        await supabase.from("product_festivals").insert(newPFs);
      }
    }

    console.log(`[${i + 1}/${PRODUCTS.length}] Processed: ${item.slug}`);
  }

  // 3. Banners
  const { data: existingBanners } = await supabase.from("banners").select("placement, sort_order");
  const existingBannerKeys = new Set(
    existingBanners?.map((b) => `${b.placement}::${b.sort_order}`) || []
  );

  const newBanners = BANNERS.filter(
    (b) => !existingBannerKeys.has(`${b.placement}::${b.sort_order}`)
  );

  if (newBanners.length > 0) {
    await supabase.from("banners").insert(newBanners);
  }

  console.log("Seed finished successfully.");
  console.log(`- Products: ${productsInserted} inserted, ${productsPreserved} preserved.`);
  console.log(`- Total products in seed catalogue: ${PRODUCTS.length}`);
  console.log(`- Banners: ${newBanners.length} inserted, ${existingBanners?.length || 0} existing.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed execution failed:", err);
    process.exit(1);
  });
