import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
registerHooks({ resolve(specifier, context, next) {
  const local = specifier.startsWith("@/") ? path.resolve("src", specifier.slice(2))
    : specifier.startsWith(".") && context.parentURL?.startsWith("file:") ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null;
  if (local && !path.extname(local)) {
    const target = [`${local}.ts`, path.join(local, "index.ts")].find(fs.existsSync);
    if (target) return next(pathToFileURL(target).href, context);
  }
  return next(specifier, context);
} });
