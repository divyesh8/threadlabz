export const STORE_CONFIG = {
  name: 'THREADLAB',
  legalName: 'ThreadLab Studios India Pvt. Ltd.',
  tagline: 'Your Style. Your Canvas.',
  description: 'Premium custom clothing e-commerce and interactive garment design studio.',
  currency: {
    code: 'INR',
    symbol: '₹',
    fractionDigits: 2,
  },
  support: {
    email: 'support@threadlab.in',
    phone: '+91 (080) 4123-8890',
    hours: 'Mon - Sat: 9:00 AM - 8:00 PM IST',
    address: 'ThreadLab Studios, Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
  },
  socials: {
    instagram: 'https://instagram.com/threadlab.in',
    twitter: 'https://x.com/threadlab_in',
    discord: 'https://discord.gg/threadlab',
    youtube: 'https://youtube.com/@threadlab',
  },
  policies: {
    freeShippingThresholdPaise: 99900, // ₹999
    standardShippingFeePaise: 9900, // ₹99
    expressShippingFeePaise: 19900, // ₹199
    baseCustomizationFeePaise: 20000, // ₹200 per customized area
    gstRatePercentage: 5, // 5% GST on apparel below ₹1000, simplified standard 5%
    returnWindowDays: 14,
    customizedReturnPolicy: 'Customized items are non-refundable unless defective or misprinted.',
  },
  upload: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    minRecommendedDpi: 150,
  },
  categories: [
    { slug: 't-shirts', name: 'Classic T-Shirts', icon: 'Shirt' },
    { slug: 'oversized', name: 'Oversized Fits', icon: 'Sparkles' },
    { slug: 'hoodies', name: 'Hoodies', icon: 'Flame' },
    { slug: 'sweatshirts', name: 'Sweatshirts', icon: 'Smile' },
    { slug: 'polo', name: 'Polo Shirts', icon: 'Compass' },
    { slug: 'shirts', name: 'Button-down Shirts', icon: 'Folder' },
    { slug: 'jeans', name: 'Denim & Jeans', icon: 'Scissors' },
    { slug: 'trousers', name: 'Trousers & Chinos', icon: 'Layers' },
    { slug: 'shorts', name: 'Shorts', icon: 'Sun' },
  ],
  announcements: [
    '✨ Summer Streetwear Drop 04 is Live — Enjoy Free Shipping above ₹999!',
    '⚡ New Interactive Custom Studio: Design your front & back prints in real-time',
    '🎨 First Custom Order? Use code LAB15 for 15% off your design',
  ],
};
