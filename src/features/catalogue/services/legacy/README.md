# Retained legacy catalogue queries

These modules were previously in `src/lib/queries`. The 12 October 2026 import audit found no application consumers outside this directory's barrel. They are retained to preserve existing code during the structural refactor.

Use `../catalogue.ts` for current storefront reads. It contains the Phase 3 filtering, child pagination and product-detail contract. The legacy product types and query behavior are different; do not substitute this barrel for the active service or expose it through a shared client/server entry point.

See [the repository structure guide](../../../../../docs/STRUCTURE.md) for the audit and move map.
