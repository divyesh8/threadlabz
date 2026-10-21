-- Read-only application schema fingerprint. Excludes provider-owned auth/storage
-- implementation, customer rows, extension functions and database owner names.
select jsonb_build_object(
  'tables', (select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity) order by c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'columns', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',not a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by c.relname,a.attnum)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
    left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped),
  'constraints', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated) order by c.relname,k.conname)
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and k.contype<>'n'),
  'indexes', (select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) order by tablename,indexname) from pg_indexes where schemaname='public'),
  'policies', (select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'roles',roles,'command',cmd,'permissive',permissive,'using',qual,'check',with_check) order by schemaname,tablename,policyname)
    from pg_policies where schemaname='public' or (schemaname='storage' and tablename='objects')),
  'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),
      'anonExecute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticatedExecute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'serviceExecute',has_function_privilege('service_role',p.oid,'EXECUTE')) order by p.proname,p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and
      (p.proname like 'commerce_%' or p.proname in ('is_admin','touch_updated_at','handle_new_user','reserve_stock','release_stock_reservation','release_expired_stock_reservations','finalize_stock_reservation','finalize_order_stock','release_order_reservations'))),
  'triggers', (select jsonb_agg(pg_get_triggerdef(t.oid) order by c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and (n.nspname='public' or (n.nspname='auth' and t.tgname='on_auth_user_created'))),
  'tableGrants', (select jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,'privilege',privilege_type) order by table_name,grantee,privilege_type)
    from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role','PUBLIC')),
  'columnGrants', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'role',grantee,'privilege',privilege_type) order by table_name,column_name,grantee,privilege_type)
    from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated','service_role','PUBLIC')),
  'productBucket', (select jsonb_build_object('public',public,'limit',file_size_limit,'mimeTypes',allowed_mime_types) from storage.buckets where id='product-images')
) as schema_contract;
