# Archived alternative schema

The original migration, its access-control test and its matching seed are retained byte-for-byte. They describe an alternative Phase 1 design (`products.name/status/is_demo`, variant-level prices, metadata-based roles), not an increment on `001_schema.sql` (`products.title/price_paise/source`, profile roles).

The active application and Phases 3–7 use the 001 design. Keeping both in the executable migration directory caused every fresh replay to fail at `CREATE TABLE public.categories`. Phase 8 archives the alternative and its matching pgTAP test outside the executable directories; it does not delete history, renumber applied versions, or edit any migration tracking table.

If a database reports this archived version as applied, **stop**. Export its schema and migration records read-only, retain a backup, and prepare a separately reviewed data-preserving conversion. Do not repair metadata, replay 001 over it, or assume the two designs are interchangeable. See `docs/DEPLOYMENT-RUNBOOK.md`.
