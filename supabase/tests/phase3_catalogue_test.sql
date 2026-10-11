-- Run only in the isolated local Phase 3 workspace. All fixtures roll back.
begin;
select no_plan();
insert into public.categories(id,name,slug,is_active) values
('e1000000-0000-4000-8000-000000000001','QA Active','qa-active',true),
('e1000000-0000-4000-8000-000000000002','QA Inactive','qa-inactive',false);
insert into public.products(id,title,slug,price_paise,is_active,source,category_id) values
('e2000000-0000-4000-8000-000000000001','QA Real','qa-real',12345,true,'manual','e1000000-0000-4000-8000-000000000001'),
('e2000000-0000-4000-8000-000000000002','QA Seed','qa-seed',12345,true,'seed','e1000000-0000-4000-8000-000000000001'),
('e2000000-0000-4000-8000-000000000003','QA Draft','qa-draft',12345,false,'admin','e1000000-0000-4000-8000-000000000001'),
('e2000000-0000-4000-8000-000000000004','QA Hidden Category','qa-hidden-category',12345,true,'manual','e1000000-0000-4000-8000-000000000002');
insert into public.product_images(product_id,url) values
('e2000000-0000-4000-8000-000000000001','uploads/qa-public.png'),
('e2000000-0000-4000-8000-000000000002','uploads/qa-seed.png'),
('e2000000-0000-4000-8000-000000000003','uploads/qa-draft.png');
insert into public.product_variants(product_id,size,stock) values
('e2000000-0000-4000-8000-000000000001','M',2),
('e2000000-0000-4000-8000-000000000002','M',10),
('e2000000-0000-4000-8000-000000000003','M',10);
insert into storage.objects(bucket_id,name) values
('product-images','uploads/qa-public.png'),('product-images','uploads/qa-seed.png'),
('product-images','uploads/qa-draft.png'),('product-images','uploads/qa-unregistered.png');
select is((select public from storage.buckets where id='product-images'),false,'Product bucket is private');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select is((select count(*)::int from public.products where slug like 'qa-%'),1,'Only active non-demo products in active categories are public');
select is((select count(*)::int from public.product_images where url like 'uploads/qa-%'),1,'Images inherit publication');
select is((select count(*)::int from public.product_variants where product_id::text like 'e2000000-%'),1,'Variants inherit publication');
select set_config('storage.operation','object.get_authenticated',true);
select is((select count(*)::int from storage.objects where name like 'uploads/qa-%'),1,'Only registered public image is downloadable');
select set_config('storage.operation','object.list',true);
select is((select count(*)::int from storage.objects where name like 'uploads/qa-%'),0,'Anonymous cannot list bucket');
select set_config('storage.operation','object.sign',true);
select is((select count(*)::int from storage.objects where name like 'uploads/qa-%'),0,'Anonymous cannot mint signed URLs');
reset role;

insert into auth.users(id,aud,role,email) values
('e0000000-0000-4000-8000-000000000001','authenticated','authenticated','phase3-customer@example.invalid'),
('e0000000-0000-4000-8000-000000000002','authenticated','authenticated','phase3-admin@example.invalid');
update public.profiles set role='admin' where id='e0000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"e0000000-0000-4000-8000-000000000001","user_metadata":{"role":"admin"}}',true);
select is(public.is_admin(),false,'User metadata cannot grant administration');
update public.products set price_paise=1 where slug='qa-real';
update public.product_variants set stock=999 where product_id='e2000000-0000-4000-8000-000000000001';
select is((select price_paise from public.products where slug='qa-real'),12345,'Customer cannot change price');
select is((select stock from public.product_variants where product_id='e2000000-0000-4000-8000-000000000001'),2,'Customer cannot change inventory');
select set_config('request.jwt.claims','{"role":"authenticated","sub":"e0000000-0000-4000-8000-000000000002"}',true);
select is(public.is_admin(),true,'Database role authorizes admin');
select is((select count(*)::int from public.products where slug like 'qa-%'),4,'Admin still sees drafts and fixtures');
update public.products set is_active=false where slug='qa-real';
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('storage.operation','object.get_authenticated',true);
select is((select count(*)::int from storage.objects where name like 'uploads/qa-%'),0,'Unpublication removes object read access');
reset role;
select * from finish();
rollback;
