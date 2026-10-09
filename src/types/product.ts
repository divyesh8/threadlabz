export type GarmentCategory =
  | 't-shirts'
  | 'oversized'
  | 'hoodies'
  | 'polo'
  | 'shirts'
  | 'sweatshirts'
  | 'jeans'
  | 'trousers'
  | 'shorts';

export type GarmentFit =
  | 'Regular'
  | 'Oversized'
  | 'Relaxed'
  | 'Slim'
  | 'Boxy'
  | 'Straight'
  | 'Tailored';

export type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export interface GarmentColor {
  name: string;
  hex: string;
  code: string;
  mockupFront: string;
  mockupBack: string;
}

export interface PrintAreaBounds {
  /** Normalized percentages (0 - 100) relative to the garment preview container */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintArea {
  id: string;
  name: string;
  view: 'front' | 'back';
  bounds: PrintAreaBounds;
  maxPrintWidthMm: number;
  maxPrintHeightMm: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: GarmentSize;
  colorName: string;
  priceAdjustmentPaise: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: GarmentCategory;
  gender: 'unisex' | 'men' | 'women';
  basePricePaise: number;
  comparePricePaise?: number;
  fit: GarmentFit;
  fabric: string;
  gsm?: number;
  careInstructions: string[];
  colors: GarmentColor[];
  sizes: GarmentSize[];
  variants: ProductVariant[];
  images: string[];
  isCustomizable: boolean;
  customizationFeePaise: number;
  printAreas: PrintArea[];
  tags: string[];
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
}

export interface FilterState {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  colors: string[];
  sizes: GarmentSize[];
  fits: GarmentFit[];
  customizableOnly?: boolean;
  sort: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  searchQuery?: string;
}
