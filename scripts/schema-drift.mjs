import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function normalizeContract(value) {
  if (Array.isArray(value)) return value.map(normalizeContract);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalizeContract(value[key])]));
  // Preserve whitespace inside SQL literals: collapsing it can hide a real
  // policy/function change. Formatter differences require explicit review.
  return typeof value === "string" ? value.replaceAll("\r\n", "\n") : value;
}
export function contractDifferences(expected, actual) {
  if (!actual || typeof actual !== "object") return ["Invalid schema contract"];
  const left = normalizeContract(expected), right = normalizeContract(actual);
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw Error("Usage: node scripts/schema-drift.mjs expected.json actual.json (read-only comparison)");
  const read = filename => { const data = JSON.parse(fs.readFileSync(filename, "utf8")); return data.schema_contract ?? data[0]?.schema_contract ?? data; };
  const differences = contractDifferences(read(process.argv[2]), read(process.argv[3]));
  console.log(JSON.stringify({ status: differences.length ? "DRIFT_OR_UNVERIFIED_DIFFERENCE" : "MATCH", sections: differences }, null, 2));
  if (differences.length) process.exitCode = 1;
}
