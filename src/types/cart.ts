import { DesignDocument } from './studio';
import { GarmentSize } from './product';

export interface CartCustomizationSnapshot {
  designId?: string;
  designTitle: string;
  frontPreviewUrl?: string;
  backPreviewUrl?: string;
  designDocument: DesignDocument;
  elementCount: number;
}

export interface CartItem {
  id: string; // unique cart line ID (allows two same garments with different designs)
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  size: GarmentSize;
  colorName: string;
  colorHex: string;
  garmentImage: string;
  quantity: number;
  unitPricePaise: number;
  customizationFeePaise: number;
  isCustomized: boolean;
  customization?: CartCustomizationSnapshot;
}

export interface PromoCode {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // percentage (e.g. 15 for 15%) or paise
  minOrderPaise: number;
  maxDiscountPaise?: number;
}

export interface CartPricingSummary {
  itemsSubtotalPaise: number;
  customizationTotalPaise: number;
  discountPaise: number;
  appliedPromo?: PromoCode;
  shippingPaise: number;
  taxPaise: number; // GST (e.g. 5% or 12% on garments)
  totalPayablePaise: number;
  freeShippingThresholdPaise: number;
  isFreeShipping: boolean;
}
