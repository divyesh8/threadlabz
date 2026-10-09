import { Product, GarmentColor, PrintArea, GarmentSize, GarmentFit } from '../../types/product';

const STANDARD_COLORS: GarmentColor[] = [
  { name: 'Jet Black', hex: '#111215', code: 'BLK', mockupFront: '/mockups/tee-black-front.svg', mockupBack: '/mockups/tee-black-back.svg' },
  { name: 'Chalk White', hex: '#F4F4F2', code: 'WHT', mockupFront: '/mockups/tee-white-front.svg', mockupBack: '/mockups/tee-white-back.svg' },
  { name: 'Washed Charcoal', hex: '#2A2D34', code: 'CHR', mockupFront: '/mockups/tee-charcoal-front.svg', mockupBack: '/mockups/tee-charcoal-back.svg' },
  { name: 'Forest Moss', hex: '#243329', code: 'MOSS', mockupFront: '/mockups/tee-moss-front.svg', mockupBack: '/mockups/tee-moss-back.svg' },
  { name: 'Vintage Navy', hex: '#1A2333', code: 'NVY', mockupFront: '/mockups/tee-navy-front.svg', mockupBack: '/mockups/tee-navy-back.svg' },
  { name: 'Electric Lime', hex: '#CCFF00', code: 'LIME', mockupFront: '/mockups/tee-lime-front.svg', mockupBack: '/mockups/tee-lime-back.svg' },
  { name: 'Sand Dune', hex: '#C6B59D', code: 'SND', mockupFront: '/mockups/tee-sand-front.svg', mockupBack: '/mockups/tee-sand-back.svg' },
];

const STANDARD_SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL'];

const STANDARD_PRINT_AREAS: PrintArea[] = [
  {
    id: 'front_chest',
    name: 'Front Center Chest',
    view: 'front',
    bounds: { x: 28, y: 22, width: 44, height: 46 },
    maxPrintWidthMm: 300,
    maxPrintHeightMm: 360,
  },
  {
    id: 'front_pocket',
    name: 'Left Chest / Pocket',
    view: 'front',
    bounds: { x: 55, y: 24, width: 18, height: 18 },
    maxPrintWidthMm: 100,
    maxPrintHeightMm: 100,
  },
  {
    id: 'back_full',
    name: 'Full Back',
    view: 'back',
    bounds: { x: 26, y: 18, width: 48, height: 56 },
    maxPrintWidthMm: 350,
    maxPrintHeightMm: 450,
  },
  {
    id: 'back_upper',
    name: 'Upper Back Neckline',
    view: 'back',
    bounds: { x: 32, y: 16, width: 36, height: 20 },
    maxPrintWidthMm: 280,
    maxPrintHeightMm: 150,
  },
];

function generateVariants(productId: string, sizes: GarmentSize[], colors: GarmentColor[]) {
  const variants = [];
  for (const color of colors) {
    for (const size of sizes) {
      variants.push({
        id: `${productId}-${color.code.toLowerCase()}-${size.toLowerCase()}`,
        sku: `TL-${productId.substring(0, 3).toUpperCase()}-${color.code}-${size}`,
        size,
        colorName: color.name,
        priceAdjustmentPaise: size === '2XL' ? 10000 : 0, // +₹100 for 2XL
        stock: Math.floor(Math.random() * 25) + 8,
      });
    }
  }
  return variants;
}

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod_tee_heavy',
    slug: 'heavyweight-crewneck-tee',
    name: 'Heavyweight Studio Crewneck',
    subtitle: '240 GSM Combed Cotton • Tailored Boxy Drop',
    description: 'An architectural everyday essential crafted from 240 GSM double-combed ring-spun cotton. Features a reinforced ribbed collar that never sags, dropped shoulders, and a clean structured drape suited for premium DTG (Direct-to-Garment) printing and embroidery.',
    category: 't-shirts',
    gender: 'unisex',
    basePricePaise: 89900, // ₹899
    comparePricePaise: 129900, // ₹1,299
    fit: 'Boxy',
    fabric: '100% Combed Compact Cotton (240 GSM)',
    gsm: 240,
    careInstructions: ['Machine wash cold inside out', 'Do not tumble dry', 'Iron on reverse side of prints', 'Do not bleach'],
    colors: STANDARD_COLORS.slice(0, 5),
    sizes: STANDARD_SIZES,
    variants: generateVariants('prod_tee_heavy', STANDARD_SIZES, STANDARD_COLORS.slice(0, 5)),
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: true,
    customizationFeePaise: 20000, // ₹200
    printAreas: STANDARD_PRINT_AREAS,
    tags: ['bestseller', 'customizable', 'essential', 'heavyweight'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    status: 'active',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'prod_tee_oversized',
    slug: 'acid-wash-oversized-tee',
    name: 'Acid Wash Cyber Oversized Tee',
    subtitle: '260 GSM French Terry • Exaggerated Drop Shoulder',
    description: 'Cut with generous proportions and an authentic mineral wash finish. Each piece has subtle unique highs and lows in coloration. Designed as the ultimate canvas for streetwear graphic prints, bold back typographies, and distressed chest motifs.',
    category: 'oversized',
    gender: 'unisex',
    basePricePaise: 119900, // ₹1,199
    comparePricePaise: 169900, // ₹1,699
    fit: 'Oversized',
    fabric: '100% Super-Combed Cotton Terry (260 GSM)',
    gsm: 260,
    careInstructions: ['Hand wash cold or gentle cycle', 'Dry flat in shade', 'Warm iron inside out', 'Wash darks separately'],
    colors: [
      STANDARD_COLORS[0], // Black
      STANDARD_COLORS[2], // Charcoal
      STANDARD_COLORS[3], // Moss
      STANDARD_COLORS[5], // Lime
    ],
    sizes: STANDARD_SIZES,
    variants: generateVariants('prod_tee_oversized', STANDARD_SIZES, [STANDARD_COLORS[0], STANDARD_COLORS[2], STANDARD_COLORS[3], STANDARD_COLORS[5]]),
    images: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: true,
    customizationFeePaise: 20000,
    printAreas: STANDARD_PRINT_AREAS,
    tags: ['oversized', 'streetwear', 'customizable', 'acid-wash'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    status: 'active',
    createdAt: '2026-03-15T12:00:00Z',
  },
  {
    id: 'prod_hoodie_heavy',
    slug: 'essential-400gsm-heavy-hoodie',
    name: 'Archival 400 GSM Heavyweight Hoodie',
    subtitle: 'Double-Layered Hood • Brushed Fleece Interior',
    description: 'Constructed from premium 400 GSM organic cotton fleece with ribbed side gussets for fluid mobility. Features a double-layered structured hood with no drawstrings for a razor-clean look, blind-stitched kangaroo pocket, and heavy 2x2 ribbing at the hem and cuffs.',
    category: 'hoodies',
    gender: 'unisex',
    basePricePaise: 249900, // ₹2,499
    comparePricePaise: 349900, // ₹3,499
    fit: 'Relaxed',
    fabric: '85% Organic Cotton, 15% Recycled Poly Fleece (400 GSM)',
    gsm: 400,
    careInstructions: ['Dry clean or delicate cycle cold', 'Reshape while damp', 'Do not tumble dry', 'Iron on low'],
    colors: [
      STANDARD_COLORS[0], // Black
      STANDARD_COLORS[1], // White
      STANDARD_COLORS[2], // Charcoal
      STANDARD_COLORS[4], // Navy
      STANDARD_COLORS[6], // Sand
    ],
    sizes: STANDARD_SIZES,
    variants: generateVariants('prod_hoodie_heavy', STANDARD_SIZES, [STANDARD_COLORS[0], STANDARD_COLORS[1], STANDARD_COLORS[2], STANDARD_COLORS[4], STANDARD_COLORS[6]]),
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: true,
    customizationFeePaise: 25000, // ₹250
    printAreas: [
      {
        id: 'front_chest',
        name: 'Front Center Chest',
        view: 'front',
        bounds: { x: 30, y: 24, width: 40, height: 32 },
        maxPrintWidthMm: 280,
        maxPrintHeightMm: 240,
      },
      {
        id: 'back_full',
        name: 'Full Back Statement Print',
        view: 'back',
        bounds: { x: 26, y: 18, width: 48, height: 54 },
        maxPrintWidthMm: 350,
        maxPrintHeightMm: 450,
      },
    ],
    tags: ['hoodie', 'premium', 'heavyweight', 'winter', 'customizable'],
    isFeatured: true,
    isTrending: false,
    isNewArrival: true,
    status: 'active',
    createdAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'prod_sweatshirt_crew',
    slug: 'core-fleece-crewneck-sweatshirt',
    name: 'Core Studio Crewneck Sweatshirt',
    subtitle: '340 GSM Brushed Cotton • V-Notch Neck Detail',
    description: 'A collegiate-inspired crewneck sweatshirt cut in a boxy silhouette. Pre-shrunk French terry interior with a soft peached exterior feel. Ideal for subtle tonal chest embroidery or expansive back artwork.',
    category: 'sweatshirts',
    gender: 'unisex',
    basePricePaise: 179900, // ₹1,799
    comparePricePaise: 229900, // ₹2,299
    fit: 'Relaxed',
    fabric: '100% Cotton Fleece (340 GSM)',
    gsm: 340,
    careInstructions: ['Machine wash 30°C', 'Do not tumble dry', 'Iron medium'],
    colors: [STANDARD_COLORS[0], STANDARD_COLORS[1], STANDARD_COLORS[2], STANDARD_COLORS[3]],
    sizes: STANDARD_SIZES,
    variants: generateVariants('prod_sweatshirt_crew', STANDARD_SIZES, [STANDARD_COLORS[0], STANDARD_COLORS[1], STANDARD_COLORS[2], STANDARD_COLORS[3]]),
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: true,
    customizationFeePaise: 20000,
    printAreas: STANDARD_PRINT_AREAS,
    tags: ['sweatshirt', 'fleece', 'customizable', 'minimalist'],
    isFeatured: false,
    isTrending: true,
    isNewArrival: false,
    status: 'active',
    createdAt: '2026-02-18T10:00:00Z',
  },
  {
    id: 'prod_polo_signature',
    slug: 'pique-cotton-signature-polo',
    name: 'Mercerized Pique Signature Polo',
    subtitle: '100% Supima Cotton • Mother of Pearl Buttons',
    description: 'Refined modern luxury. Crafted from double-twisted Supima cotton pique with a mercerized luster. Flat-knit collar engineered to resist curling, genuine mother-of-pearl buttons, and tennis tail vented hem.',
    category: 'polo',
    gender: 'men',
    basePricePaise: 149900, // ₹1,499
    comparePricePaise: 199900, // ₹1,999
    fit: 'Slim',
    fabric: '100% Long-Staple Pique Cotton',
    gsm: 210,
    careInstructions: ['Cold gentle wash', 'Dry flat', 'Iron medium heat'],
    colors: [STANDARD_COLORS[0], STANDARD_COLORS[1], STANDARD_COLORS[4]],
    sizes: STANDARD_SIZES,
    variants: generateVariants('prod_polo_signature', STANDARD_SIZES, [STANDARD_COLORS[0], STANDARD_COLORS[1], STANDARD_COLORS[4]]),
    images: [
      'https://images.unsplash.com/photo-1625910513413-5b8214227f4f?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: true,
    customizationFeePaise: 20000,
    printAreas: [
      {
        id: 'left_chest',
        name: 'Monogram / Crest Area',
        view: 'front',
        bounds: { x: 55, y: 26, width: 16, height: 16 },
        maxPrintWidthMm: 90,
        maxPrintHeightMm: 90,
      },
    ],
    tags: ['polo', 'luxury', 'smart-casual'],
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    status: 'active',
    createdAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'prod_shirt_cuban',
    slug: 'resort-cuban-collar-shirt',
    name: 'Relaxed Resort Cuban Collar Shirt',
    subtitle: 'Linen-Tencel Blend • Breathable Fluid Drape',
    description: 'Designed for effortless warm-weather tailoring. Features an open camp collar, straight vented hem, and a fluid silhouette that drapes gracefully over the torso. Natural mother-of-pearl buttons.',
    category: 'shirts',
    gender: 'men',
    basePricePaise: 189900, // ₹1,899
    comparePricePaise: 249900, // ₹2,499
    fit: 'Relaxed',
    fabric: '55% French Linen, 45% Tencel Lyocell',
    careInstructions: ['Machine wash cold gentle', 'Hang dry in shade', 'Warm steam iron'],
    colors: [STANDARD_COLORS[1], STANDARD_COLORS[3], STANDARD_COLORS[6]],
    sizes: STANDARD_SIZES,
    variants: generateVariants('prod_shirt_cuban', STANDARD_SIZES, [STANDARD_COLORS[1], STANDARD_COLORS[3], STANDARD_COLORS[6]]),
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: false,
    customizationFeePaise: 0,
    printAreas: [],
    tags: ['resort', 'linen', 'summer', 'ready-to-wear'],
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    status: 'active',
    createdAt: '2026-03-22T11:00:00Z',
  },
  {
    id: 'prod_jeans_vintage',
    slug: 'washed-vintage-wide-leg-denim',
    name: '13.5 Oz Washed Vintage Denim',
    subtitle: '100% Rigid Ring-Spun Cotton • Antique Copper Rivets',
    description: 'Classic 90s skater fit denim featuring a relaxed rise and generous straight leg opening. Finished with authentic stone washing and whiskering highlights. Custom engraved brass shanks.',
    category: 'jeans',
    gender: 'unisex',
    basePricePaise: 279900, // ₹2,799
    comparePricePaise: 379900, // ₹3,799
    fit: 'Straight',
    fabric: '13.5 oz Raw Ring-Spun Denim (100% Cotton)',
    careInstructions: ['Wash inside out with cold water', 'Line dry only', 'Wash sparingly to preserve patina'],
    colors: [
      { name: 'Vintage Stone Blue', hex: '#4A6984', code: 'VBLU', mockupFront: '', mockupBack: '' },
      { name: 'Faded Obsidian Black', hex: '#23252A', code: 'FBLK', mockupFront: '', mockupBack: '' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: generateVariants('prod_jeans_vintage', ['S', 'M', 'L', 'XL'], [
      { name: 'Vintage Stone Blue', hex: '#4A6984', code: 'VBLU', mockupFront: '', mockupBack: '' },
      { name: 'Faded Obsidian Black', hex: '#23252A', code: 'FBLK', mockupFront: '', mockupBack: '' },
    ]),
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: false,
    customizationFeePaise: 0,
    printAreas: [],
    tags: ['denim', 'vintage', 'bottoms'],
    isFeatured: false,
    isTrending: true,
    isNewArrival: false,
    status: 'active',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'prod_trousers_pleated',
    slug: 'pleated-wide-leg-chinos',
    name: 'Double-Pleated Studio Chinos',
    subtitle: 'Japanese Heavy Twill • Relaxed Wide Cut',
    description: 'Tailored drape meets modern streetwear silhouette. Features double reverse front pleats, slanted slash side pockets, horn button waist adjusters, and a clean break at the ankle.',
    category: 'trousers',
    gender: 'unisex',
    basePricePaise: 219900, // ₹2,199
    comparePricePaise: 299900, // ₹2,999
    fit: 'Relaxed',
    fabric: '100% High-Density Cotton Twill',
    careInstructions: ['Dry clean or machine wash cold', 'Warm iron with press cloth'],
    colors: [STANDARD_COLORS[0], STANDARD_COLORS[2], STANDARD_COLORS[6]],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: generateVariants('prod_trousers_pleated', ['S', 'M', 'L', 'XL'], [STANDARD_COLORS[0], STANDARD_COLORS[2], STANDARD_COLORS[6]]),
    images: [
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: false,
    customizationFeePaise: 0,
    printAreas: [],
    tags: ['tailored', 'trousers', 'minimalist'],
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    status: 'active',
    createdAt: '2026-03-12T08:00:00Z',
  },
  {
    id: 'prod_shorts_frenchterry',
    slug: 'heavy-french-terry-sweat-shorts',
    name: '320 GSM French Terry Sweat Shorts',
    subtitle: 'Raw Edge Hem • Heavy Knitted Drawcords',
    description: 'Lounge comfort built with architectural weight. Features an encased elastic waistband with chunky cotton drawstrings, deep welt pockets, and a rear patch pocket with reinforced bar tacks.',
    category: 'shorts',
    gender: 'unisex',
    basePricePaise: 119900, // ₹1,199
    comparePricePaise: 159900, // ₹1,599
    fit: 'Relaxed',
    fabric: '100% Combed Terry Cotton (320 GSM)',
    careInstructions: ['Machine wash 30°C', 'Hang dry'],
    colors: [STANDARD_COLORS[0], STANDARD_COLORS[2], STANDARD_COLORS[3]],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: generateVariants('prod_shorts_frenchterry', ['S', 'M', 'L', 'XL'], [STANDARD_COLORS[0], STANDARD_COLORS[2], STANDARD_COLORS[3]]),
    images: [
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=80',
    ],
    isCustomizable: false,
    customizationFeePaise: 0,
    printAreas: [],
    tags: ['shorts', 'summer', 'loungewear'],
    isFeatured: false,
    isTrending: false,
    isNewArrival: false,
    status: 'active',
    createdAt: '2026-02-25T11:00:00Z',
  },
];
