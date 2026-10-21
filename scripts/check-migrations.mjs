import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createPhase7Database } from "./fixtures/phase7-db.mjs";
import { contractDifferences } from "./schema-drift.mjs";

const manifest = JSON.parse(fs.readFileSync("supabase/migration-manifest.json", "utf8"));
const actual = fs.readdirSync("supabase/migrations").filter(file => file.endsWith(".sql")).sort();
assert.deepEqual(actual, manifest.canonical.map(item => item.file), "Every active migration must be reviewed in the manifest");
assert.equal(new Set(actual.map(file => file.split("_")[0])).size, actual.length, "Migration versions must be unique");
for (const item of [...manifest.canonical, ...manifest.archived]) {
  const location = item.path || `supabase/migrations/${item.file}`;
  const sql = fs.readFileSync(location, "utf8").replaceAll("\r\n", "\n");
  assert.equal(createHash("sha256").update(sql).digest("hex"), item.sha256, `${location} differs from reviewed history`);
}
const db = await createPhase7Database();
try {
  const contract = (await db.query(fs.readFileSync("supabase/ops/schema-contract.sql", "utf8"))).rows[0].schema_contract;
  const differences = contractDifferences(JSON.parse(fs.readFileSync("supabase/schema-contract.json", "utf8")), contract);
  assert.deepEqual(differences, [], "Fresh canonical replay must match the reviewed schema contract");
  const seed = fs.readFileSync("supabase/fixtures/01_dev_catalogue.sql", "utf8");
  await db.exec(seed);
  await db.exec("set role anon");
  assert.equal((await db.query("select count(*)::int n from products")).rows[0].n, 0, "Synthetic fixtures must remain hidden");
  console.log(`LOCAL DATABASE: ${actual.length} canonical migrations replayed; history hashes, schema drift contract and fixture exclusion passed. No hosted service used.`);
} finally { await db.close(); }
