/**
 * SAFE Development-Only Catalogue Fixtures.
 *
 * Invariant Rule:
 * All dev fixtures MUST use `source = 'test'`.
 * The public storefront strictly queries: `WHERE source IN ('admin', 'manual')`.
 * Therefore, these fixtures will NEVER appear in the public production catalogue.
 */

export interface DevProductFixture {
  id: string;
  title: string;
  slug: string;
  description: string;
  pricePaise: number;
  source: "test";
  isActive: boolean;
  categorySlug: string;
  variants: Array<{
    id: string;
    size: string;
    color: string;
    stock: number;
    sku: string;
  }>;
}

export const DEV_TEST_CATEGORY = {
  id: "d0000000-0000-0000-0000-000000000001",
  name: "[DEV TEST] Sample Category",
  slug: "dev-test-samples",
  isActive: true,
};

export const DEV_TEST_PRODUCTS: DevProductFixture[] = [
  // Product A: 2 sizes, multiple stock values
  {
    id: "d1000000-0000-0000-0000-000000000001",
    title: "[DEV TEST] Multi-Size Standard Tee",
    slug: "dev-test-multi-size-tee",
    description: "Development fixture for multi-size inventory testing. Not for sale.",
    pricePaise: 129900, // ₹1,299.00
    source: "test",
    isActive: true,
    categorySlug: "dev-test-samples",
    variants: [
      {
        id: "d1000000-0000-0000-0000-000000000011",
        size: "M",
        color: "Onyx Black",
        stock: 10,
        sku: "DEV-TEE-M-BLK",
      },
      {
        id: "d1000000-0000-0000-0000-000000000012",
        size: "L",
        color: "Onyx Black",
        stock: 5,
        sku: "DEV-TEE-L-BLK",
      },
    ],
  },

  // Product B: Out-of-stock variant
  {
    id: "d2000000-0000-0000-0000-000000000002",
    title: "[DEV TEST] Zero-Stock Winter Hoodie",
    slug: "dev-test-zero-stock-hoodie",
    description: "Development fixture for out-of-stock rejection testing. Not for sale.",
    pricePaise: 299900, // ₹2,999.00
    source: "test",
    isActive: true,
    categorySlug: "dev-test-samples",
    variants: [
      {
        id: "d2000000-0000-0000-0000-000000000021",
        size: "XL",
        color: "Rust Cream",
        stock: 0, // OUT OF STOCK
        sku: "DEV-HD-XL-RST",
      },
    ],
  },

  // Product C: Low-stock variant (1 unit remaining)
  {
    id: "d3000000-0000-0000-0000-000000000003",
    title: "[DEV TEST] Low-Stock Oversized Sweatshirt",
    slug: "dev-test-low-stock-sweatshirt",
    description: "Development fixture for concurrency & low-stock testing. Not for sale.",
    pricePaise: 249900, // ₹2,499.00
    source: "test",
    isActive: true,
    categorySlug: "dev-test-samples",
    variants: [
      {
        id: "d3000000-0000-0000-0000-000000000031",
        size: "S",
        color: "Washed Charcoal",
        stock: 1, // LOW STOCK
        sku: "DEV-SW-S-CHR",
      },
    ],
  },
];
