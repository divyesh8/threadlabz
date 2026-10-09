import assert from 'assert';

console.log('🧪 Starting THREADLAB Automated Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ============================================================================
// 1. STORE REPOSITORY & CATALOGUE
// ============================================================================
import { SEED_PRODUCTS } from '../src/lib/db/seed-data.ts';
import { StoreRepository } from '../src/lib/db/store.ts';

test('1. Catalogue loading & category coverage', () => {
  const products = StoreRepository.getAllProducts();
  assert(products.length >= 9, 'Should have at least 9 seed products');

  const categories = new Set(products.map((p) => p.category));
  assert(categories.has('t-shirts'), 'Must include t-shirts');
  assert(categories.has('hoodies'), 'Must include hoodies');
  assert(categories.has('oversized'), 'Must include oversized');
  assert(categories.has('polo'), 'Must include polo');
  assert(categories.has('shirts'), 'Must include shirts');
  assert(categories.has('sweatshirts'), 'Must include sweatshirts');
  assert(categories.has('jeans'), 'Must include jeans');
});

test('2. Product schema & pricing precision (in paise)', () => {
  for (const product of SEED_PRODUCTS) {
    assert(product.id, 'Product must have ID');
    assert(product.slug, 'Product must have slug');
    assert(Number.isInteger(product.basePricePaise), 'basePricePaise must be an integer');
    assert(product.basePricePaise > 0, 'basePricePaise must be positive');
    assert(product.colors.length > 0, 'Product must have colors');
    assert(product.sizes.length > 0, 'Product must have sizes');
    assert(product.variants.length > 0, 'Product must have variants');
  }
});

test('3. Search and filtering engine', () => {
  // Test category filter
  const hoodies = StoreRepository.filterProducts({
    category: 'hoodies',
    colors: [],
    sizes: [],
    fits: [],
    sort: 'newest',
  });
  assert(hoodies.every((p) => p.category === 'hoodies'), 'Category filtering failed');

  // Test keyword search
  const cyberSearch = StoreRepository.filterProducts({
    searchQuery: 'acid wash',
    colors: [],
    sizes: [],
    fits: [],
    sort: 'newest',
  });
  assert(cyberSearch.length > 0, 'Search query failed');
  assert(cyberSearch[0].slug.includes('acid-wash'), 'Search returned incorrect product');

  // Test price filter
  const under1000 = StoreRepository.filterProducts({
    maxPrice: 1000,
    colors: [],
    sizes: [],
    fits: [],
    sort: 'price-desc',
  });
  assert(under1000.every((p) => p.basePricePaise <= 100000), 'Max price filter failed');
});

// ============================================================================
// 2. SERVER-SIDE PRICING ENGINE & PROMO CODES
// ============================================================================
import { calculateCartPricing, VALID_PROMO_CODES } from '../src/lib/pricing.ts';

test('4. Server-side price calculation with customization charges', () => {
  const dummyItems = [
    {
      id: 'cart_1',
      productId: 'prod_tee_heavy',
      productSlug: 'heavyweight-crewneck-tee',
      productName: 'Heavyweight Studio Crewneck',
      variantId: 'v1',
      size: 'L',
      colorName: 'Jet Black',
      colorHex: '#111215',
      garmentImage: '',
      quantity: 2,
      unitPricePaise: 89900, // ₹899 each
      customizationFeePaise: 20000, // ₹200 custom print each
      isCustomized: true,
    },
  ];

  const pricing = calculateCartPricing(dummyItems);

  // 2 * 899 = 1798
  assert.strictEqual(pricing.itemsSubtotalPaise, 179800, 'Subtotal should be 179800 paise');
  // 2 * 200 = 400
  assert.strictEqual(pricing.customizationTotalPaise, 40000, 'Customization total should be 40000 paise');
  // Gross = 219800 (>= 99900 threshold, so free shipping)
  assert.strictEqual(pricing.isFreeShipping, true, 'Order over ₹999 must qualify for free shipping');
  assert.strictEqual(pricing.shippingPaise, 0, 'Shipping fee must be ₹0');
  // Tax = 5% of 219800 = 10990
  assert.strictEqual(pricing.taxPaise, 10990, 'Tax should be 5% GST');
  // Total = 219800 + 10990 = 230790 paise (₹2,307.90)
  assert.strictEqual(pricing.totalPayablePaise, 230790, 'Total payable is calculated accurately');
});

test('5. Promo code discount calculation & minimum requirement', () => {
  const lowItem = [
    {
      id: 'cart_low',
      productId: 'prod_tee_heavy',
      productSlug: 'tee',
      productName: 'Tee',
      variantId: 'v1',
      size: 'S',
      colorName: 'White',
      colorHex: '#fff',
      garmentImage: '',
      quantity: 1,
      unitPricePaise: 50000, // ₹500
      customizationFeePaise: 0,
      isCustomized: false,
    },
  ];

  // LAB15 requires ₹999 minimum order
  const failPromo = calculateCartPricing(lowItem, 'LAB15');
  assert.strictEqual(failPromo.discountPaise, 0, 'Promo below minimum order must not apply');

  // THREAD50 requires ₹499 minimum order, gives ₹50 off
  const passPromo = calculateCartPricing(lowItem, 'THREAD50');
  assert.strictEqual(passPromo.discountPaise, 5000, 'THREAD50 must give 5000 paise discount');
});

// ============================================================================
// 3. DESIGN STUDIO DATA SCHEMA & TEMPLATES
// ============================================================================
import { SEED_TEMPLATES } from '../src/lib/db/templates.ts';
import { GRAPHIC_PRESETS } from '../src/lib/db/graphics.ts';

test('6. Design studio templates & vector presets', () => {
  assert(SEED_TEMPLATES.length >= 4, 'Should have at least 4 preset templates');
  assert(GRAPHIC_PRESETS.length >= 8, 'Should have at least 8 vector graphic presets');

  for (const tmpl of SEED_TEMPLATES) {
    assert(tmpl.name, 'Template must have name');
    assert(tmpl.frontElements.length > 0, 'Template must have front elements');
    for (const el of tmpl.frontElements) {
      assert(el.id, 'Element must have ID');
      assert(el.type, 'Element must have type');
      assert(typeof el.x === 'number', 'Element x must be numeric');
      assert(typeof el.y === 'number', 'Element y must be numeric');
    }
  }
});

// ============================================================================
// 4. ORDERS & STATUS MACHINE
// ============================================================================
test('7. Order creation, status progression, and immutability', () => {
  const sampleOrder = {
    id: 'ord_test_001',
    orderNumber: 'TL-TEST-99',
    customerEmail: 'test@example.com',
    customerPhone: '+91 99999 88888',
    shippingAddress: {
      fullName: 'Test User',
      phone: '+91 99999 88888',
      email: 'test@example.com',
      addressLine: '123 Test Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
      country: 'India',
    },
    items: [],
    subtotalPaise: 89900,
    customizationTotalPaise: 20000,
    discountPaise: 0,
    shippingPaise: 0,
    taxPaise: 5495,
    totalPayablePaise: 115395,
    payment: {
      method: 'razorpay',
      status: 'captured',
      isDemoSandbox: true,
    },
    status: 'confirmed',
    timeline: [
      { status: 'confirmed', title: 'Order Confirmed', description: 'Test', timestamp: new Date().toISOString(), completed: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = StoreRepository.createOrder(sampleOrder);
  assert.strictEqual(created.orderNumber, 'TL-TEST-99', 'Order number preserved');

  const retrieved = StoreRepository.getOrderByNumber('TL-TEST-99');
  assert(retrieved, 'Should retrieve order by number');
  assert.strictEqual(retrieved.status, 'confirmed', 'Initial status should be confirmed');

  // Advance status to in_production
  const updated = StoreRepository.updateOrderStatus(
    'ord_test_001',
    'in_production',
    'Micro-factory printing',
    'Direct-to-Garment test print',
    'AWB-TEST-123'
  );

  assert(updated, 'Order must update');
  assert.strictEqual(updated.status, 'in_production', 'Status must transition to in_production');
  assert.strictEqual(updated.trackingNumber, 'AWB-TEST-123', 'Tracking number assigned');
  assert(updated.timeline.length === 2, 'Timeline event added');
});

// ============================================================================
// 5. CURRENCY FORMATTING (INDIAN SYSTEM)
// ============================================================================
import { formatINR, paiseToRupees, rupeesToPaise } from '../src/lib/currency.ts';

test('8. Indian Rupee currency formatting & paise conversion', () => {
  assert.strictEqual(paiseToRupees(149900), 1499, '149900 paise = 1499 rupees');
  assert.strictEqual(rupeesToPaise(1499), 149900, '1499 rupees = 149900 paise');

  const formatted799 = formatINR(79900);
  assert(formatted799.includes('799'), 'Must contain 799');

  const formattedLakh = formatINR(15000000); // ₹1,50,000
  assert(formattedLakh.includes('1,50,000'), 'Must format with Indian comma grouping');
});

console.log(`\n========================================`);
console.log(`Test Results: ${passedTests} / ${totalTests} passed.`);
if (passedTests === totalTests) {
  console.log(`🎉 ALL THREADLAB AUTOMATED CHECKS PASSED!\n`);
} else {
  console.error(`❌ Some tests failed.`);
  process.exit(1);
}
