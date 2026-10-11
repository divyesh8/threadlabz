export type CartItem = {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  categoryName: string;
  categorySlug: string;
  size: string;
  colour: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  stockAvailable: number;
  imageId: string | null;
  imageAlt: string | null;
};

export type CartSummary = {
  id: string;
  isGuest: boolean;
  items: CartItem[];
  totalItemCount: number;
  subtotalPaise: number;
  currency: "INR";
  checkoutDisabledReason: string;
};

export type CartState = "loading" | "ready" | "empty" | "error";
