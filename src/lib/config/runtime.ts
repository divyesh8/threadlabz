import "server-only";
import { validateEnvironment } from "./environment";

export function getRuntimeConfiguration() {
  return validateEnvironment({ ...process.env,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function assertRuntimeConfiguration() {
  const result = getRuntimeConfiguration();
  if (!result.valid) throw new Error(`Invalid environment configuration: ${result.errors.join(" ")}`);
  return result;
}
