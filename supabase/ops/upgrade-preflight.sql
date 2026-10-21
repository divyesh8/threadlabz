-- READ ONLY. Run with a reviewed role against an approved target before applying
-- any pending migrations. This never repairs migration metadata or customer data.
begin read only;
do $$
declare n bigint; applied text[]; i integer;
  expected text[] := array['001','20261011123446','20261012000000','20261012010000','20261020180305','20261020182652','20261021082348'];
begin
  if to_regclass('public.products') is null then raise exception 'Empty database: use the complete fresh-install path'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='title')
    or exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='is_demo') then
    raise exception 'Alternative or unknown schema: data-preserving conversion needs separate review';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Migration ledger unavailable: inspect original deployment history; do not fabricate applied versions';
  end if;
  execute 'select count(*) from supabase_migrations.schema_migrations where version = ''20261011061713''' into n;
  if n>0 then raise exception 'Archived alternative is recorded as applied: stop and reconcile schema and history'; end if;
  execute 'select array_agg(version order by version) from supabase_migrations.schema_migrations' into applied;
  if coalesce(array_length(applied,1),0)=0 then raise exception 'No applied baseline recorded; investigate history'; end if;
  for i in 1..array_length(applied,1) loop
    if applied[i] is distinct from expected[i] then
      raise exception 'Unknown or out-of-order migration history: review before applying anything';
    end if;
  end loop;
  if to_regclass('public.carts') is not null then
    execute 'select count(*) from (select user_id from public.carts where user_id is not null group by user_id having count(*)>1) d' into n;
    if n>0 then raise exception 'Duplicate customer carts require a reviewed merge before Phase 6'; end if;
    execute 'select count(*) from public.carts where user_id is not null and session_token is not null' into n;
    if n>0 then raise exception 'Legacy customer cart tokens require owner review'; end if;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='stock_reserved') then
    execute 'select count(*) from public.product_variants where stock<stock_reserved or stock<0 or stock_reserved<0' into n;
    if n>0 then raise exception 'Inventory counters require reconciliation before upgrade'; end if;
  end if;
  raise notice 'Structural/data preflight passed. This is not migration-history approval or a production-readiness result.';
end $$;
select version, name from supabase_migrations.schema_migrations order by version;
rollback;
