import test from "node:test";
import assert from "node:assert/strict";
import { parseSupabaseConfig, parseSiteUrl } from "../src/lib/supabase/config.ts";
import { safeNext, signInSchema, signUpSchema } from "../src/lib/auth/validation.ts";
import { catalogueFilters, literalSearch, imageIdSchema } from "../src/lib/catalogue/validation.ts";

test("configuration is optional and privileged/legacy keys are rejected", () => {
  for (const key of [undefined, "", "sb_secret_not-a-real-key", "eyJ.not-a-real-jwt.value"]) {
    assert.equal(parseSupabaseConfig("https://example.supabase.co", key), null);
  }
});
test("configuration accepts HTTPS and loopback-only HTTP", () => {
  const publicFixture = "sb_publishable_test_fixture_only";
  assert.equal(parseSupabaseConfig("https://example.supabase.co", publicFixture)?.url, "https://example.supabase.co");
  assert.ok(parseSupabaseConfig("http://127.0.0.1:54321", publicFixture));
  for (const url of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?key=bad", "javascript:alert(1)"]) assert.equal(parseSupabaseConfig(url, publicFixture), null);
});
test("canonical auth URL rejects injected paths and unsafe origins", () => {
  assert.equal(parseSiteUrl(undefined), null);
  assert.equal(parseSiteUrl("http://localhost:3000"), "http://localhost:3000");
  assert.equal(parseSiteUrl("https://threadlabz.example"), "https://threadlabz.example");
  for (const value of ["http://evil.example", "https://user:pass@example.com", "https://example.com/auth?next=bad"]) assert.equal(parseSiteUrl(value), null);
});
test("auth redirects are allowlisted against open redirects", () => {
  assert.equal(safeNext("/shop"), "/shop");
  for (const value of ["//evil.example", "https://evil.example", "/\\evil.example", "/%2f%2fevil.example", "/auth/callback", "/shop?next=//evil.example", undefined, ["/shop"]]) assert.equal(safeNext(value), "/account");
});
test("sign-in does not apply the new-signup password minimum", () => {
  assert.ok(signInSchema.safeParse({ email: "test@example.invalid", password: "existing" }).success);
  assert.equal(signInSchema.safeParse({ email: "bad", password: "" }).success, false);
});
test("registration enforces email and password bounds on the server", () => {
  assert.ok(signUpSchema.safeParse({ email: "test@example.invalid", password: "a long test passphrase" }).success);
  for (const password of ["short", "x".repeat(129)]) assert.equal(signUpSchema.safeParse({ email: "test@example.invalid", password }).success, false);
});
test("filters normalize empty selects and preserve literal search text", () => {
  assert.deepEqual(catalogueFilters.parse({ q: "  t-shirt  ", category: "", festival: "" }), { q: "t-shirt", category: undefined, festival: undefined, page: 1, sort: "newest" });
  assert.equal(literalSearch("100%_\\"), "100\\%\\_\\\\");
});
test("oversized, duplicate, malformed and unbounded filters are rejected", () => {
  for (const input of [{ q: "x".repeat(101) }, { q: ["a", "b"] }, { category: "men,or(is_demo.eq.true)" }, { page: -1 }, { page: "1001" }, { page: "NaN" }]) assert.equal(catalogueFilters.safeParse(input).success, false);
});
test("image route accepts only UUID identifiers, never paths or URLs", () => {
  assert.ok(imageIdSchema.safeParse("f2000000-0000-4000-8000-000000000001").success);
  for (const value of ["../private", "https://example.com", "draft.png", ""]) assert.equal(imageIdSchema.safeParse(value).success, false);
});
