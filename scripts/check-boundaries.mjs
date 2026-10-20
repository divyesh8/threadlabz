// Small dependency-graph check using the existing TypeScript compiler.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const root = path.resolve("src");
const files = fs.readdirSync(root, { recursive: true })
  .filter(f => /\.(ts|tsx)$/.test(f)).map(f => path.join(root, f));
const graph = new Map();
const clients = new Set(), servers = new Set(), actions = new Set(), errors = [];
const relative = f => path.relative(root, f).replaceAll("\\", "/");
const privileged = new Set(["features/cart/services/cart.ts", "features/checkout/services/repository.ts"]);
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  if (/^["']use client["'];/m.test(source)) clients.add(file);
  if (/^["']use server["'];/m.test(source)) actions.add(file);
  if (/import ["']server-only["']/.test(source)) servers.add(file);
  const edges = [];
  const visit = node => {
    let spec;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (node.isTypeOnly || node.importClause?.isTypeOnly) return;
      if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
        && !node.importClause.name && node.importClause.namedBindings.elements.every(e => e.isTypeOnly)) return;
      spec = node.moduleSpecifier.text;
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (!ts.isStringLiteral(node.arguments[0])) errors.push(`${relative(file)}: nonliteral dynamic import needs review`);
      else spec = node.arguments[0].text;
    }
    if (spec?.startsWith("@/") || spec?.startsWith(".")) {
      const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
      const target = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (!target) errors.push(`${relative(file)}: unresolved ${spec}`);
      else {
        edges.push(target);
        const from = relative(file), to = relative(target);
        if (from.startsWith("features/") && to.startsWith("app/")) errors.push(`${from}: feature imports app`);
        if (from.startsWith("lib/") && /^(features|components|app)\//.test(to)) errors.push(`${from}: infrastructure imports UI/domain`);
        if (to === "lib/supabase/admin.ts" && !privileged.has(from)) errors.push(`${from}: privileged client outside approved operations`);
      }
    }
    if (spec?.startsWith("node:")) servers.add(file);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  graph.set(file, edges);
}
const done = new Set();
function cycle(file, stack = []) {
  if (stack.includes(file)) { errors.push(`Import cycle: ${[...stack, file].map(relative).join(" -> ")}`); return; }
  if (done.has(file)) return;
  for (const next of graph.get(file) ?? []) cycle(next, [...stack, file]);
  done.add(file);
}
for (const file of files) cycle(file);
for (const entry of clients) {
  const visited = new Set();
  function walk(file) {
    if (visited.has(file) || actions.has(file)) return;
    visited.add(file);
    if (servers.has(file)) errors.push(`${relative(entry)} reaches server-only ${relative(file)}`);
    for (const next of graph.get(file) ?? []) walk(next);
  }
  walk(entry);
}
if (errors.length) throw new Error(errors.join("\n"));
console.log(`Import boundaries passed (${files.length} modules, ${clients.size} client entries; no runtime cycles).`);
