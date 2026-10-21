-- Disposable local/staging test database only. No production execution.
begin;
select no_plan();
select ok(has_column_privilege('authenticated','public.profiles','id','INSERT'),'Customer can initialize own profile under RLS');
select ok(not has_column_privilege('authenticated','public.profiles','role','INSERT'),'Client cannot choose inserted role');
select ok(not has_column_privilege('authenticated','public.profiles','role','UPDATE'),'Client cannot promote profile role');
select ok(has_column_privilege('authenticated','public.profiles','full_name','UPDATE'),'Profile name remains editable under RLS');
select ok(not has_table_privilege('anon','public.profiles','SELECT'),'Anonymous cannot read profiles');
select ok(has_table_privilege('authenticated','public.banners','UPDATE'),'Banner editor has grant protected by admin RLS');
select ok(not has_function_privilege('anon','public.commerce_order_view(uuid)','EXECUTE'),'Anonymous cannot bypass order ownership');
select ok(not has_function_privilege('authenticated','public.commerce_order_view(uuid)','EXECUTE'),'Customer cannot call privileged order snapshot RPC');
select ok(has_function_privilege('service_role','public.commerce_order_view(uuid)','EXECUTE'),'Verified server can obtain order snapshot');
select ok(not has_function_privilege('authenticated','public.release_expired_stock_reservations()','EXECUTE'),'Expiry cleanup is privileged');
select is((select public from storage.buckets where id='product-images'),false,'Product bucket remains private');
select has_column('public','products','product_details','Product details extension present');
select * from finish();
rollback;
