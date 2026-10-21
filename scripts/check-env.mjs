import { validateEnvironment } from "../src/lib/config/environment.ts";
// Caller must load the intended environment explicitly; never reads .env.local.
const result = validateEnvironment(process.env);
console.log(JSON.stringify({ environment: result.environment, valid: result.valid, checkoutEnabled: result.checkoutEnabled, errors: result.errors }, null, 2));
if (!result.valid) process.exitCode = 1;
