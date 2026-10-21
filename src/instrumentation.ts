export async function register() {
  const { assertRuntimeConfiguration } = await import("./lib/config/runtime");
  assertRuntimeConfiguration();
}
