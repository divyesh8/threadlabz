-- ============================================================================
-- THREADLAB PRODUCTION POSTGRESQL DATABASE SCHEMA
-- Version: 1.0.0
-- Architecture: Multi-tenant, RLS-ready, E-Commerce & Customization Engine
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- 1. USERS & PROFILES
-- ============================================================================

CREATE TYPE user_role_enum AS ENUM ('customer', 'staff', 'admin', 'superadmin');

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- References auth.users if Supabase Auth is enabled
    email CITEXT NOT NULL UNIQUE,
    full_name VARCHAR(120),
    phone VARCHAR(20),
    avatar_url TEXT,
    role user_role_enum DEFAULT 'customer' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    landmark VARCHAR(120),
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    country VARCHAR(60) DEFAULT 'India' NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. CATALOGUE: CATEGORIES, COLLECTIONS & PRODUCTS
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    icon_name VARCHAR(60),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    headline VARCHAR(255),
    banner_image TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TYPE product_status_enum AS ENUM ('draft', 'active', 'archived');
CREATE TYPE garment_gender_enum AS ENUM ('unisex', 'men', 'women');

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(180) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    gender garment_gender_enum DEFAULT 'unisex' NOT NULL,
    base_price_paise BIGINT NOT NULL CHECK (base_price_paise >= 0),
    compare_price_paise BIGINT CHECK (compare_price_paise >= base_price_paise),
    fit VARCHAR(60) NOT NULL,
    fabric TEXT NOT NULL,
    gsm INT,
    care_instructions TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_customizable BOOLEAN DEFAULT TRUE NOT NULL,
    customization_fee_paise BIGINT DEFAULT 20000 NOT NULL,
    status product_status_enum DEFAULT 'active' NOT NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    size VARCHAR(20) NOT NULL,
    color_name VARCHAR(60) NOT NULL,
    color_hex VARCHAR(20) NOT NULL,
    price_adjustment_paise BIGINT DEFAULT 0 NOT NULL,
    stock INT DEFAULT 0 NOT NULL CHECK (stock >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_product_size_color UNIQUE (product_id, size, color_name)
);

CREATE TABLE product_print_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    area_key VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    view VARCHAR(20) NOT NULL CHECK (view IN ('front', 'back')),
    bounds_x_percent NUMERIC(5,2) NOT NULL,
    bounds_y_percent NUMERIC(5,2) NOT NULL,
    bounds_width_percent NUMERIC(5,2) NOT NULL,
    bounds_height_percent NUMERIC(5,2) NOT NULL,
    max_print_width_mm INT NOT NULL,
    max_print_height_mm INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. CUSTOMIZATION & DESIGN ENGINE
-- ============================================================================

CREATE TABLE design_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description TEXT,
    thumbnail TEXT NOT NULL,
    front_elements JSONB NOT NULL,
    back_elements JSONB,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE saved_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(150) DEFAULT 'My Custom Design' NOT NULL,
    schema_version VARCHAR(20) DEFAULT '1.0.0' NOT NULL,
    garment_color VARCHAR(60) NOT NULL,
    garment_color_hex VARCHAR(20) NOT NULL,
    front_elements JSONB NOT NULL,
    back_elements JSONB NOT NULL,
    front_preview_url TEXT,
    back_preview_url TEXT,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 4. CARTS & WISHLISTS
-- ============================================================================

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1 NOT NULL CHECK (quantity > 0),
    is_customized BOOLEAN DEFAULT FALSE NOT NULL,
    customization_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_wishlist UNIQUE (user_id, product_id)
);

-- ============================================================================
-- 5. ORDERS, PAYMENTS & SHIPMENTS
-- ============================================================================

CREATE TYPE order_status_enum AS ENUM (
    'pending_payment',
    'confirmed',
    'processing',
    'design_verification',
    'in_production',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refund_pending',
    'refunded'
);

CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'authorized',
    'captured',
    'failed',
    'refunded'
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(60) UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_email CITEXT NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    shipping_address_snapshot JSONB NOT NULL,
    billing_address_snapshot JSONB,
    subtotal_paise BIGINT NOT NULL,
    customization_total_paise BIGINT DEFAULT 0 NOT NULL,
    discount_paise BIGINT DEFAULT 0 NOT NULL,
    promo_code VARCHAR(40),
    shipping_paise BIGINT DEFAULT 0 NOT NULL,
    tax_paise BIGINT DEFAULT 0 NOT NULL,
    total_payable_paise BIGINT NOT NULL,
    status order_status_enum DEFAULT 'pending_payment' NOT NULL,
    tracking_number VARCHAR(100),
    courier_name VARCHAR(100),
    estimated_delivery TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(180) NOT NULL,
    product_slug VARCHAR(120) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    size VARCHAR(20) NOT NULL,
    color_name VARCHAR(60) NOT NULL,
    color_hex VARCHAR(20) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_paise BIGINT NOT NULL,
    customization_fee_paise BIGINT DEFAULT 0 NOT NULL,
    total_paise BIGINT NOT NULL,
    is_customized BOOLEAN DEFAULT FALSE NOT NULL,
    customization_snapshot JSONB, -- Immutable print document snapshot
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway VARCHAR(40) DEFAULT 'razorpay' NOT NULL,
    gateway_order_id VARCHAR(120),
    gateway_payment_id VARCHAR(120),
    gateway_signature VARCHAR(255),
    amount_paise BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status payment_status_enum DEFAULT 'pending' NOT NULL,
    is_sandbox_demo BOOLEAN DEFAULT FALSE NOT NULL,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status order_status_enum NOT NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 6. DISCOUNTS, SETTINGS & NEWSLETTER
-- ============================================================================

CREATE TABLE discount_codes (
    code VARCHAR(40) PRIMARY KEY,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value INT NOT NULL,
    min_order_paise BIGINT DEFAULT 0 NOT NULL,
    max_discount_paise BIGINT,
    usage_limit INT,
    times_used INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE store_settings (
    key VARCHAR(80) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_customer ON orders(customer_email);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_saved_designs_user ON saved_designs(user_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view & edit their own profile; admins can view all
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth_user_id = auth.uid() OR role IN ('admin', 'staff'));

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Saved Designs: Users can view own designs or public templates
CREATE POLICY "Users can view own designs" ON saved_designs
    FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_public = TRUE);

CREATE POLICY "Users can insert own designs" ON saved_designs
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Orders: Customers can only view their own orders
CREATE POLICY "Customers view own orders" ON orders
    FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR customer_email = auth.jwt()->>'email');
