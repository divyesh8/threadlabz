import { Product, FilterState } from '../../types/product';
import { SEED_PRODUCTS } from './seed-data';
import { Order, OrderStatus, OrderTimelineEvent } from '../../types/order';
import { DesignDocument } from '../../types/studio';
import { SEED_TEMPLATES } from './templates';

// Initial sample orders for development and first-run experience
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_sample_101',
    orderNumber: 'TL-894210',
    customerId: 'usr_demo_1',
    customerEmail: 'arjun.sharma@example.com',
    customerPhone: '+91 98765 43210',
    shippingAddress: {
      fullName: 'Arjun Sharma',
      phone: '+91 98765 43210',
      email: 'arjun.sharma@example.com',
      addressLine: 'Flat 402, Skyline Residency, 12th Main Road, Indiranagar',
      landmark: 'Near Metro Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560038',
      country: 'India',
    },
    items: [
      {
        id: 'item_sample_1',
        productId: 'prod_tee_heavy',
        productName: 'Heavyweight Studio Crewneck',
        productSlug: 'heavyweight-crewneck-tee',
        variantId: 'prod_tee_heavy-blk-l',
        size: 'L',
        colorName: 'Jet Black',
        colorHex: '#111215',
        garmentImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        quantity: 1,
        unitPricePaise: 89900,
        customizationFeePaise: 20000,
        totalPaise: 109900,
        isCustomized: true,
        customization: {
          designTitle: 'Cyber Horizon 2099',
          elementCount: 3,
          designDocument: {
            id: 'des_sample_1',
            schemaVersion: '1.0.0',
            title: 'Cyber Horizon 2099',
            productId: 'prod_tee_heavy',
            productName: 'Heavyweight Studio Crewneck',
            garmentColor: 'Jet Black',
            garmentColorHex: '#111215',
            activeView: 'front',
            frontElements: SEED_TEMPLATES[0].frontElements,
            backElements: SEED_TEMPLATES[0].backElements || [],
            createdAt: '2026-04-01T10:00:00Z',
            updatedAt: '2026-04-01T10:00:00Z',
          },
        },
      },
    ],
    subtotalPaise: 89900,
    customizationTotalPaise: 20000,
    discountPaise: 0,
    shippingPaise: 0,
    taxPaise: 5495, // 5% GST
    totalPayablePaise: 115395,
    payment: {
      method: 'razorpay',
      status: 'captured',
      transactionId: 'pay_rzp_mock_892014',
      paidAt: '2026-04-01T10:15:00Z',
      isDemoSandbox: true,
    },
    status: 'in_production',
    timeline: [
      { status: 'confirmed', title: 'Order Confirmed', description: 'Payment verified and order accepted into system', timestamp: '2026-04-01T10:15:00Z', completed: true },
      { status: 'design_verification', title: 'Design Verification', description: 'Studio artwork validated for 300 DPI Direct-to-Garment print quality', timestamp: '2026-04-01T14:30:00Z', completed: true },
      { status: 'in_production', title: 'Printing & Curing', description: 'Garment queued at Bengaluru micro-factory for print & heat press curing', timestamp: '2026-04-02T09:00:00Z', completed: true },
      { status: 'shipped', title: 'Dispatched with Courier', description: 'Package picked up by courier partner', timestamp: '2026-04-03T16:00:00Z', completed: false },
      { status: 'delivered', title: 'Delivered', description: 'Delivered to recipient address', timestamp: '2026-04-05T18:00:00Z', completed: false },
    ],
    trackingNumber: 'TL-BLR-982144',
    courierName: 'BlueDart Express',
    estimatedDeliveryDate: '2026-04-05',
    createdAt: '2026-04-01T10:15:00Z',
    updatedAt: '2026-04-02T09:00:00Z',
  },
];

// In-memory singletons for server runtime & client sync
let memoryProducts: Product[] = [...SEED_PRODUCTS];
let memoryOrders: Order[] = [...INITIAL_ORDERS];
let memorySavedDesigns: DesignDocument[] = [];

// Helper to access LocalStorage safely in browser
function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage quota or access error:', e);
  }
}

export const StoreRepository = {
  // PRODUCTS
  getAllProducts(): Product[] {
    if (typeof window !== 'undefined') {
      const stored = getLocalItem<Product[]>('threadlab_products', []);
      if (stored && stored.length > 0) return stored;
    }
    return memoryProducts;
  },

  getProductBySlug(slug: string): Product | undefined {
    return this.getAllProducts().find((p) => p.slug === slug);
  },

  getProductById(id: string): Product | undefined {
    return this.getAllProducts().find((p) => p.id === id);
  },

  filterProducts(filters: FilterState): Product[] {
    let result = this.getAllProducts();

    if (filters.category && filters.category !== 'all') {
      result = result.filter((p) => p.category === filters.category);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.minPrice !== undefined) {
      result = result.filter((p) => p.basePricePaise >= (filters.minPrice! * 100));
    }

    if (filters.maxPrice !== undefined) {
      result = result.filter((p) => p.basePricePaise <= (filters.maxPrice! * 100));
    }

    if (filters.colors.length > 0) {
      result = result.filter((p) =>
        p.colors.some((c) => filters.colors.includes(c.name))
      );
    }

    if (filters.sizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.some((s) => filters.sizes.includes(s))
      );
    }

    if (filters.fits.length > 0) {
      result = result.filter((p) => filters.fits.includes(p.fit));
    }

    if (filters.customizableOnly) {
      result = result.filter((p) => p.isCustomizable);
    }

    // Sorting
    switch (filters.sort) {
      case 'price-asc':
        result.sort((a, b) => a.basePricePaise - b.basePricePaise);
        break;
      case 'price-desc':
        result.sort((a, b) => b.basePricePaise - a.basePricePaise);
        break;
      case 'popular':
        result.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  },

  // ORDERS
  getAllOrders(): Order[] {
    if (typeof window !== 'undefined') {
      const stored = getLocalItem<Order[]>('threadlab_orders', memoryOrders);
      return stored;
    }
    return memoryOrders;
  },

  getOrderById(orderId: string): Order | undefined {
    return this.getAllOrders().find((o) => o.id === orderId);
  },

  getOrderByNumber(orderNumber: string): Order | undefined {
    const clean = orderNumber.trim().toUpperCase();
    return this.getAllOrders().find((o) => o.orderNumber.toUpperCase() === clean);
  },

  createOrder(order: Order): Order {
    const all = this.getAllOrders();
    const updated = [order, ...all];
    memoryOrders = updated;
    setLocalItem('threadlab_orders', updated);
    return order;
  },

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    title: string,
    description: string,
    trackingNumber?: string
  ): Order | undefined {
    const all = this.getAllOrders();
    const index = all.findIndex((o) => o.id === orderId);
    if (index === -1) return undefined;

    const current = all[index];
    const newEvent: OrderTimelineEvent = {
      status: newStatus,
      title,
      description,
      timestamp: new Date().toISOString(),
      completed: true,
    };

    const updatedOrder: Order = {
      ...current,
      status: newStatus,
      timeline: [...current.timeline, newEvent],
      trackingNumber: trackingNumber || current.trackingNumber,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updatedOrder;
    memoryOrders = all;
    setLocalItem('threadlab_orders', all);
    return updatedOrder;
  },

  // SAVED DESIGNS
  getSavedDesigns(): DesignDocument[] {
    if (typeof window !== 'undefined') {
      return getLocalItem<DesignDocument[]>('threadlab_saved_designs', memorySavedDesigns);
    }
    return memorySavedDesigns;
  },

  saveDesign(design: DesignDocument): DesignDocument {
    const all = this.getSavedDesigns();
    const existingIndex = all.findIndex((d) => d.id === design.id);
    let updated: DesignDocument[];

    if (existingIndex >= 0) {
      all[existingIndex] = { ...design, updatedAt: new Date().toISOString() };
      updated = [...all];
    } else {
      updated = [design, ...all];
    }

    memorySavedDesigns = updated;
    setLocalItem('threadlab_saved_designs', updated);
    return design;
  },

  getDesignById(designId: string): DesignDocument | undefined {
    return this.getSavedDesigns().find((d) => d.id === designId);
  },

  deleteDesign(designId: string): boolean {
    const all = this.getSavedDesigns();
    const filtered = all.filter((d) => d.id !== designId);
    memorySavedDesigns = filtered;
    setLocalItem('threadlab_saved_designs', filtered);
    return true;
  },

  // ADMIN ANALYTICS
  getAnalytics() {
    const orders = this.getAllOrders();
    const totalRevenuePaise = orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + o.totalPayablePaise, 0);

    const paidOrders = orders.filter((o) => o.payment.status === 'captured');
    const aovPaise = paidOrders.length > 0 ? Math.round(totalRevenuePaise / paidOrders.length) : 0;

    const statusCounts: Record<string, number> = {};
    for (const ord of orders) {
      statusCounts[ord.status] = (statusCounts[ord.status] || 0) + 1;
    }

    const allProducts = this.getAllProducts();
    const lowStockVariants: { productName: string; size: string; color: string; stock: number }[] = [];

    for (const prod of allProducts) {
      for (const v of prod.variants) {
        if (v.stock < 12) {
          lowStockVariants.push({
            productName: prod.name,
            size: v.size,
            color: v.colorName,
            stock: v.stock,
          });
        }
      }
    }

    return {
      totalOrders: orders.length,
      totalRevenuePaise,
      aovPaise,
      statusCounts,
      lowStockCount: lowStockVariants.length,
      lowStockVariants: lowStockVariants.slice(0, 8),
      recentOrders: orders.slice(0, 6),
    };
  },
};
