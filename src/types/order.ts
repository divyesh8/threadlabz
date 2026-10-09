import { CartCustomizationSnapshot } from './cart';
import { GarmentSize } from './product';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'design_verification'
  | 'in_production'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  size: GarmentSize;
  colorName: string;
  colorHex: string;
  garmentImage: string;
  quantity: number;
  unitPricePaise: number;
  customizationFeePaise: number;
  totalPaise: number;
  isCustomized: boolean;
  customization?: CartCustomizationSnapshot;
}

export interface OrderPaymentDetails {
  method: 'razorpay' | 'upi' | 'card' | 'netbanking' | 'cod';
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  isDemoSandbox?: boolean;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. TL-264819
  customerId?: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotalPaise: number;
  customizationTotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPayablePaise: number;
  payment: OrderPaymentDetails;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  trackingNumber?: string;
  courierName?: string;
  estimatedDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
}
