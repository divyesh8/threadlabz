import test from "node:test";
import assert from "node:assert/strict";
import { catalogueFilters, catalogueHref } from "../src/lib/catalogue/validation.ts";
import { productStoragePath, isRaster } from "../src/lib/catalogue/media.ts";

test("price, size, sort and availability filters reject duplicates and unsafe bounds", () => {
  for (const input of [{ min: "-1" }, { min: "NaN" }, { min: "1e4" }, { max: "1000001" }, { min: "2", max: "1" }, { min: "1.999" }, { size: ["S", "M"] }, { sort: "popular" }, { availability: "yes" }, { page: [1] }, { page: "1e2" }, { page: null }, { size: "M,stock.gt.0" }]) assert.equal(catalogueFilters.safeParse(input).success, false, JSON.stringify(input));
  assert.equal(catalogueFilters.parse({ min: "0", max: "12.34", size: "2-3Y", availability: "in-stock" }).max, 12.34);
});
test("pagination and chip removal retain every other normalized filter", () => {
  const f = catalogueFilters.parse({ q: " tee ", category: "men", festival: "diwali", size: "Free Size", sort: "price-desc", min: "0", max: "999.99", availability: "in-stock" });
  const url = new URL(catalogueHref(f, { page: 2 }), "https://example.invalid");
  assert.equal(url.searchParams.get("q"), "tee");
  for (const key of ["category", "festival", "size", "sort", "min", "max", "availability"]) assert.equal(url.searchParams.get(key), String(f[key]));
  assert.equal(url.searchParams.get("page"), "2");
  const removed = new URL(catalogueHref(f, { size: undefined, page: 1 }), url.origin);
  assert.equal(removed.searchParams.has("size"), false);
  assert.equal(removed.searchParams.get("festival"), "diwali");
});
test("media accepts durable paths and reauthorizes same-project legacy/expired URLs", () => {
  const origin = "https://example.supabase.co";
  const path = "uploads/owned-photo.jpg";
  for (const source of [path, `${origin}/storage/v1/object/public/product-images/${path}`, `${origin}/storage/v1/object/sign/product-images/${path}?token=expired-fixture`, `${origin}/storage/v1/object/authenticated/product-images/uploads/owned%2Dphoto.jpg`]) assert.equal(productStoragePath(source, origin), path);
  for (const source of ["/placeholders/image.svg", "/images/previews/men-1.jpg", "//evil.example/image.jpg", "uploads/../private.jpg", "uploads/a.svg", "uploads/a.jpg?token=x", `${origin}/storage/v1/object/public/other/${path}`, `https://evil.example/storage/v1/object/public/product-images/${path}`, `${origin}/storage/v1/object/public/product-images/uploads/a%2fsecret.jpg`, "data:image/png,test", "uploads\\image.png"]) assert.equal(productStoragePath(source, origin), null, source);
});
test("raster signatures reject SVG/HTML disguised as photos", () => {
  const bytes = new TextEncoder().encode("<svg>not a photo</svg>");
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]) assert.equal(isRaster(bytes, type), false);
  assert.equal(isRaster(new Uint8Array([137,80,78,71,13,10,26,10]), "image/png"), true);
  assert.equal(isRaster(new Uint8Array([255,216,255]), "image/jpeg"), true);
});
