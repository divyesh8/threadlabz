import "server-only";
import { validateEnvironment } from "./environment";

export function getRuntimeConfiguration() {
  return validateEnvironment(process.env);
}

export function assertRuntimeConfiguration() {
  const result = getRuntimeConfiguration();
  if (!result.valid) throw new Error(`Invalid environment configuration: ${result.errors.join(" ")}`);
  return result;
}
