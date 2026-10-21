// Override inherited values AND prevent Next dotenv from loading real credentials.
export function isolatedEnvironment(overrides = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(NEXT_PUBLIC_|SUPABASE_|RAZORPAY_|VERCEL|APP_ENV|CHECKOUT_MODE|SITE_URL|PRODUCTION_|SHOPPING_POLICIES)/.test(key)) env[key] = "";
  }
  return {
    ...env, APP_ENV: "local", NEXT_PUBLIC_APP_ENV: "local", CHECKOUT_MODE: "disabled",
    NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "", SUPABASE_PROJECT_REF: "", PRODUCTION_SUPABASE_PROJECT_REF: "", PRODUCTION_SITE_URL: "",
    RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", RAZORPAY_WEBHOOK_SECRET: "",
    VERCEL: "", VERCEL_ENV: "", VERCEL_TARGET_ENV: "", SITE_URL: "http://127.0.0.1:3000", SHOPPING_POLICIES_JSON: "{}",
    ...overrides,
  };
}
