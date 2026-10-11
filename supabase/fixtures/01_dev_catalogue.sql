-- SAFE Development-Only Catalogue Fixtures
-- Source is explicitly 'test', which guarantees exclusion from public storefront queries:
-- (WHERE is_active = true AND source IN ('admin', 'manual') AND categories.is_active = true)

begin;

-- Insert dev fixture category
insert into public.categories (id, name, slug, is_active)
values ('d0000000-0000-0000-0000-000000000001', '[DEV TEST] Sample Category', 'dev-test-samples', true)
on conflict (id) do nothing;

-- Product A: 2 sizes, multiple stock values (stock 10 and 5)
insert into public.products (id, title, slug, description, price_paise, source, is_active, category_id)
values (
  'd1000000-0000-0000-0000-000000000001',
  '[DEV TEST] Multi-Size Standard Tee',
  'dev-test-multi-size-tee',
  'Development fixture for multi-size inventory testing. Not for sale.',
  129900,
  'test',
  true,
  'd0000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.product_variants (id, product_id, size, color, stock, stock_reserved, sku)
values
  ('d1000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000001', 'M', 'Onyx Black', 10, 0, 'DEV-TEE-M-BLK'),
  ('d1000000-0000-0000-0000-000000000012', 'd1000000-0000-0000-0000-000000000001', 'L', 'Onyx Black', 5, 0, 'DEV-TEE-L-BLK')
on conflict (id) do nothing;

-- Product B: Out-of-stock variant (stock 0)
insert into public.products (id, title, slug, description, price_paise, source, is_active, category_id)
values (
  'd2000000-0000-0000-0000-000000000002',
  '[DEV TEST] Zero-Stock Winter Hoodie',
  'dev-test-zero-stock-hoodie',
  'Development fixture for out-of-stock rejection testing. Not for sale.',
  299900,
  'test',
  true,
  'd0000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.product_variants (id, product_id, size, color, stock, stock_reserved, sku)
values
  ('d2000000-0000-0000-0000-000000000021', 'd2000000-0000-0000-0000-000000000002', 'XL', 'Rust Cream', 0, 0, 'DEV-HD-XL-RST')
on conflict (id) do nothing;

-- Product C: Low-stock variant (stock 1)
insert into public.products (id, title, slug, description, price_paise, source, is_active, category_id)
values (
  'd3000000-0000-0000-0000-000000000003',
  '[DEV TEST] Low-Stock Oversized Sweatshirt',
  'dev-test-low-stock-sweatshirt',
  'Development fixture for concurrency & low-stock testing. Not for sale.',
  249900,
  'test',
  true,
  'd0000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.product_variants (id, product_id, size, color, stock, stock_reserved, sku)
values
  ('d3000000-0000-0000-0000-000000000031', 'd3000000-0000-0000-0000-000000000003', 'S', 'Washed Charcoal', 1, 0, 'DEV-SW-S-CHR')
on conflict (id) do nothing;

commit;
