export type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
};

export type OrderSnapshotItem = {
  variantId: string;
  productId: string;
  title: string;
  sku: string | null;
  size: string;
  colour: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  taxPaise: number;
};

export type OrderPricingSummary = {
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  currency: "INR";
};

export type CheckoutOrder = {
  id: string;
  orderNumber: string;
  status: "pending" | "paid" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentStatus: "unpaid" | "processing" | "paid" | "failed";
  grandTotalPaise: number;
  currency: "INR";
  items: OrderSnapshotItem[];
  shippingAddress: ShippingAddress;
  reservationExpiresAt: string | null;
  createdAt: string;
};

export type GatewayConfigStatus = {
  isConfigured: boolean;
  mode: "test" | "live" | "unconfigured";
  keyIdAvailable: boolean;
  keySecretAvailable: boolean;
  webhookSecretAvailable: boolean;
  blockerMessage: string;
};

export type CreateOrderResult =
  | {
      success: true;
      order: CheckoutOrder;
      gatewayStatus: GatewayConfigStatus;
      razorpayOrderId?: string;
    }
  | {
      success: false;
      error: string;
      code?: "OUT_OF_STOCK" | "INVALID_CART" | "GATEWAY_UNAVAILABLE" | "VALIDATION_FAILED";
    };
