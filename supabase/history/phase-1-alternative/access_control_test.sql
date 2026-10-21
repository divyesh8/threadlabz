-- Run only against a local/dev database: supabase test db --local
-- Every fixture and write is rolled back. Synthetic prices are test values only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select is((select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('categories','festivals','products','product_variants',
  'product_images','product_festivals','profiles','addresses','wishlist') and c.relrowsecurity), 9, 'RLS on all nine exposed tables');
select is((select public from storage.buckets where id='product-images'), false, 'Product bucket is private');
select hasnt_column('public','profiles','role','Profiles cannot contain client-controlled roles');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname in ('is_admin','set_updated_at') and p.prosecdef),0,'No definer bypass in helpers');

insert into auth.users(id, email) values
('f0000000-0000-4000-8000-000000000001','phase1-alice@example.invalid'),
('f0000000-0000-4000-8000-000000000002','phase1-bob@example.invalid');
insert into public.profiles(id,display_name) values
('f0000000-0000-4000-8000-000000000001','Test Alice'),
('f0000000-0000-4000-8000-000000000002','Test Bob');
insert into public.categories(id,slug,name,is_active) values
('f1000000-0000-4000-8000-000000000001','rls-test-active','Test category',true),
('f1000000-0000-4000-8000-000000000002','rls-test-hidden','Hidden category',false);
insert into public.products(id,category_id,slug,name,status,is_active,is_demo,published_at) values
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','rls-test-public','TEST ONLY public','published',true,false,now()),
('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000001','rls-test-draft','TEST ONLY draft','draft',true,false,null),
('f2000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000001','rls-test-demo','TEST ONLY demo','draft',true,true,null),
('f2000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000001','rls-test-inactive','TEST ONLY inactive','published',false,false,now()),
('f2000000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000001','rls-test-future','TEST ONLY future','published',true,false,now()+interval '1 day'),
('f2000000-0000-4000-8000-000000000006','f1000000-0000-4000-8000-000000000002','rls-test-hidden-category','TEST ONLY hidden category','published',true,false,now());
insert into public.product_variants(product_id,sku,size,price_paise,stock_quantity,is_active) values
('f2000000-0000-4000-8000-000000000001','RLS-TEST-PUBLIC','M',12345,1,true),
('f2000000-0000-4000-8000-000000000001','RLS-TEST-INACTIVE','L',12345,0,false),
('f2000000-0000-4000-8000-000000000002','RLS-TEST-DRAFT','M',12345,1,true);
insert into public.product_images(product_id,storage_path,alt_text,is_published,sort_order) values
('f2000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001/public.png','Test public',true,0),
('f2000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001/private.png','Test private',false,1),
('f2000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002/draft.png','Test draft',true,0),
('f2000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002/registered.png','Test registered upload slot',false,1);
insert into storage.objects(bucket_id,name) values
('product-images','f2000000-0000-4000-8000-000000000001/public.png'),
('product-images','f2000000-0000-4000-8000-000000000001/private.png'),
('product-images','f2000000-0000-4000-8000-000000000002/draft.png');
insert into public.addresses(user_id,recipient,line1,city,state,postal_code) values
('f0000000-0000-4000-8000-000000000002','Test Bob','Test address','Test city','Test state','560001');
insert into public.wishlist(user_id,product_id) values
('f0000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000001');

select throws_ok($$update public.products set status='published',published_at=now() where slug='rls-test-demo'$$,'23514',null,'Demo cannot be published');
select throws_ok($$update public.product_variants set price_paise=-1 where sku='RLS-TEST-PUBLIC'$$,'23514',null,'Negative price denied');
select throws_ok($$update public.product_variants set stock_quantity=-1 where sku='RLS-TEST-PUBLIC'$$,'23514',null,'Negative stock denied');
select throws_ok($$update public.product_variants set price_paise=null where sku='RLS-TEST-PUBLIC'$$,'23514',null,'Active variant needs a price');
select throws_ok($$update public.product_images set storage_path='../escape.png' where alt_text='Test draft'$$,'23514',null,'Image path cannot escape product folder');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('storage.operation','object.get_authenticated',true);
select is((select count(*)::int from public.products where slug like 'rls-test-%'),1,'Anonymous sees only published active real product');
select is((select count(*)::int from public.product_variants where sku like 'RLS-TEST-%'),1,'Anonymous cannot see draft or inactive variants');
select is((select count(*)::int from public.product_images where alt_text like 'Test %'),1,'Anonymous cannot see private or draft image records');
select is((select count(*)::int from storage.objects where name like 'f2000000-%'),1,'Anonymous sees only published image object');
select set_config('storage.operation','object.list',true);
select is((select count(*)::int from storage.objects where name like 'f2000000-%'),0,'Anonymous cannot list the bucket');
select set_config('storage.operation','object.sign',true);
select is((select count(*)::int from storage.objects where name like 'f2000000-%'),0,'Anonymous cannot mint signed URLs');
select set_config('storage.operation','object.get_authenticated',true);
select throws_ok($$select * from public.profiles$$,'42501',null,'Anonymous cannot read profiles');
select throws_ok($$insert into public.products(category_id,slug,name) values ('f1000000-0000-4000-8000-000000000001','malicious','No')$$,'42501',null,'Anonymous cannot create products');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{},"user_metadata":{"threadlabz_role":"admin","role":"admin"}}',true);
select is(private.is_admin(),false,'User-editable metadata cannot grant admin');
select is((select count(*)::int from public.products where slug like 'rls-test-%'),1,'Forged metadata does not expose drafts');
select is((select count(*)::int from public.profiles),1,'Alice sees only her own profile');
select is((select count(*)::int from public.addresses),0,'Alice cannot read Bob address');
select is((select count(*)::int from public.wishlist),0,'Alice cannot read Bob wishlist');
select lives_ok($$update public.profiles set display_name='Test Alice edited' where id='f0000000-0000-4000-8000-000000000001'$$,'Own profile can be edited');
select lives_ok($$insert into public.profiles(id) values ('f0000000-0000-4000-8000-000000000001') on conflict(id) do nothing$$,'Own profile initialization is idempotent');
select throws_ok($$update public.profiles set id='f0000000-0000-4000-8000-000000000002'$$,'42501',null,'Profile ownership is immutable to users');
select throws_ok($$insert into public.profiles(id) values ('f0000000-0000-4000-8000-000000000002')$$,'42501',null,'Cannot create another profile');
select lives_ok($$insert into public.addresses(user_id,recipient,line1,city,state,postal_code) values ('f0000000-0000-4000-8000-000000000001','Alice','Test address','Test city','Test state','560001')$$,'Own address insert allowed');
select is((select count(*)::int from public.addresses),1,'Only own address visible');
select throws_ok($$insert into public.addresses(user_id,recipient,line1,city,state,postal_code) values ('f0000000-0000-4000-8000-000000000002','No','Test','Test','Test','560001')$$,'42501',null,'Cannot add address for another user');
select throws_ok($$update public.addresses set user_id='f0000000-0000-4000-8000-000000000002'$$,'42501',null,'Cannot reassign address ownership');
select is_empty($$update public.addresses set city='Stolen' where user_id='f0000000-0000-4000-8000-000000000002' returning id$$,'Cross-user address update affects no rows');
select lives_ok($$insert into public.wishlist(user_id,product_id) values ('f0000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001')$$,'Own published wishlist insert allowed');
select throws_ok($$insert into public.wishlist(user_id,product_id) values ('f0000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000002')$$,'42501',null,'Cannot wishlist draft product');
select throws_ok($$insert into public.wishlist(user_id,product_id) values ('f0000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002')$$,'42501',null,'Cannot add to another wishlist');
select is_empty($$delete from public.wishlist where user_id='f0000000-0000-4000-8000-000000000002' returning product_id$$,'Cannot delete another wishlist');
select throws_ok($$update public.product_variants set price_paise=1 where sku='RLS-TEST-PUBLIC'$$,'42501',null,'Browser cannot modify prices');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('product-images','unauthorized.png')$$,'42501',null,'Customer cannot upload product imagery');

-- A trusted admin can inspect draft assets, but cannot access customer PII or
-- mutate catalogue records through an authenticated key in this phase.
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"threadlabz_role":"admin"}}',true);
select is(private.is_admin(),true,'Trusted app metadata grants admin');
select is((select count(*)::int from public.products where slug like 'rls-test-%'),6,'Admin can inspect drafts');
select is((select count(*)::int from storage.objects where name like 'f2000000-%'),3,'Admin can inspect unpublished assets');
select lives_ok($$insert into storage.objects(bucket_id,name) values ('product-images','f2000000-0000-4000-8000-000000000002/registered.png')$$,'Admin may upload only to a registered product image slot');
select is((select count(*)::int from public.profiles),1,'Admin claim does not grant customer PII access');
select throws_ok($$update public.products set name='Changed' where slug='rls-test-public'$$,'42501',null,'Admin catalogue mutation is not enabled in this phase');
select lives_ok($$update storage.objects set metadata='{"test":true}' where bucket_id='product-images' and name='f2000000-0000-4000-8000-000000000002/draft.png'$$,'Admin may replace metadata on registered imagery');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('product-images','unregistered.png')$$,'42501',null,'Admin cannot upload an unregistered arbitrary path');
select throws_ok($$update storage.objects set bucket_id='other-bucket' where name='f2000000-0000-4000-8000-000000000002/draft.png'$$,'42501',null,'Admin cannot move product imagery into another bucket');
reset role;
select * from finish();
rollback;
