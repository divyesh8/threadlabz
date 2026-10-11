-- Local demo fixtures only. No real prices, stock, commercial claims or PDF SKU mapping.
-- Safe to rerun: existing rows are never overwritten.
insert into public.categories (slug, name, is_active) values
  ('men', 'Men', true), ('women', 'Women', true), ('kids', 'Kids', true),
  ('fancy-dress', 'Fancy Dress', true), ('accessories', 'Accessories', true)
on conflict (slug) do nothing;

insert into public.festivals (slug, name, is_active) values
  ('diwali','Diwali',true), ('holi','Holi',true), ('navratri','Navratri',true),
  ('durga-puja','Durga Puja',true), ('dussehra','Dussehra',true),
  ('ganesh-chaturthi','Ganesh Chaturthi',true), ('janmashtami','Janmashtami',true),
  ('raksha-bandhan','Raksha Bandhan',true), ('independence-day','Independence Day',true),
  ('onam','Onam',true), ('pongal','Pongal',true), ('makar-sankranti','Makar Sankranti',true),
  ('lohri','Lohri',true), ('baisakhi','Baisakhi',true), ('maha-shivratri','Maha Shivratri',true),
  ('eid','Eid',true), ('christmas','Christmas',true), ('childrens-day','Children’s Day',true),
  ('teachers-day','Teachers’ Day',true), ('republic-day','Republic Day',true)
on conflict (slug) do nothing;

insert into public.products (category_id, slug, name, description, is_demo)
select id, 'demo-unpublished-tee', 'DEMO — Unpublished T-shirt fixture',
  'Local schema fixture only. Not a ThreadLabz SKU; no verified product facts.', true
from public.categories where slug = 'men'
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, size, price_paise, stock_quantity)
select id, 'DEMO-NOT-FOR-SALE-M', 'M', null, 0
from public.products where slug = 'demo-unpublished-tee' and is_demo
on conflict (sku) do nothing;

insert into public.product_images (product_id, storage_path, alt_text)
select id, id::text || '/demo-placeholder.png', 'Demo placeholder; no verified product photograph'
from public.products where slug = 'demo-unpublished-tee' and is_demo
on conflict (storage_path) do nothing;
-- The seed declares a private, unpublished image slot. No object upload occurs.
