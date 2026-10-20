-- Optional facts on the existing RLS-protected product. No backfill or new grants.
-- Apply only after reconciling the known historical Phase 1 migration conflict.
begin;
alter table public.products add column product_details jsonb;
alter table public.products add constraint products_details_shape check (
  product_details is null or (
    jsonb_typeof(product_details) = 'object'
    and product_details ? 'version'
    and product_details -> 'version' = '1'::jsonb
    and octet_length(product_details::text) <= 32768
  )
);
comment on column public.products.product_details is
  'Versioned, owner-verified materials, care, fit, model, specifications and product-specific measurements. Validated by productDetailsSchema. NULL means not supplied.';
commit;
