import fs from "node:fs";
import { spawn } from "node:child_process";
import { isolatedEnvironment } from "./fixtures/isolated-env.mjs";

const task = process.argv[2];
const tasks = {
  test: ["--experimental-strip-types", "--import", "./scripts/fixtures/resolve-ts.mjs", "--test", ...fs.readdirSync("scripts").filter(name => name.endsWith(".test.mjs")).sort().map(name => `scripts/${name}`)],
  build: ["node_modules/next/dist/bin/next", "build"],
  typecheck: ["node_modules/typescript/bin/tsc", "--noEmit"],
};
if (!tasks[task]) throw Error("Choose test, build or typecheck.");
const env = isolatedEnvironment(task === "test" ? {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_fixture",
  SUPABASE_SERVICE_ROLE_KEY: "local_unit_fixture", CHECKOUT_MODE: "test",
} : {});
const child = spawn(process.execPath, tasks[task], { env, stdio: "inherit", windowsHide: true });
child.on("error", () => { process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
