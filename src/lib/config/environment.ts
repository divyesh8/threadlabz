// Pure validation: usable by deployment checks without loading Next or secrets.
export type EnvironmentInput = Record<string, string | undefined>;
export type AppEnvironment = "local" | "staging" | "production";
export const isLoopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

function origin(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.protocol === "https:" || (url.protocol === "http:" && isLoopback(url.hostname)) ? url : null;
  } catch { return null; }
}

export function validateEnvironment(env: EnvironmentInput) {
  const errors: string[] = [];
  const environment = env.APP_ENV || "local";
  if (!["local", "staging", "production"].includes(environment)) errors.push("APP_ENV must be local, staging or production.");
  if (env.VERCEL === "1" && !env.APP_ENV) errors.push("APP_ENV is required on Vercel.");
  if (env.VERCEL_ENV === "production" && environment !== "production") errors.push("Vercel Production requires APP_ENV=production.");
  if (env.VERCEL_ENV === "preview" && environment !== "staging") errors.push("Vercel Preview requires APP_ENV=staging.");
  const site = origin(env.SITE_URL);
  const database = origin(env.THREADLABZ_SUPABASE_URL);
  const configured = Boolean(env.THREADLABZ_SUPABASE_URL || env.THREADLABZ_SUPABASE_PUBLISHABLE_KEY || env.THREADLABZ_SUPABASE_SECRET_KEY);
  if (env.SITE_URL && !site) errors.push("SITE_URL must be an origin without credentials, path or query.");
  if (configured && (!database || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.THREADLABZ_SUPABASE_PUBLISHABLE_KEY || ""))) errors.push("ThreadLabz Supabase URL and publishable key must be configured together.");
  if (environment === "local") {
    if (database && !isLoopback(database.hostname)) errors.push("Local development and CI may only connect to loopback Supabase.");
    if (site && !isLoopback(site.hostname)) errors.push("Local SITE_URL must use loopback.");
  } else {
    if (!site || site.protocol !== "https:" || isLoopback(site.hostname)) errors.push("Hosted environments require an HTTPS SITE_URL.");
    if (!/^[a-z]{20}$/.test(env.SUPABASE_PROJECT_REF || "") || database?.hostname !== `${env.SUPABASE_PROJECT_REF}.supabase.co`) errors.push("Supabase URL must match the explicitly approved SUPABASE_PROJECT_REF.");
    if (!configured) errors.push("Hosted environments require Supabase configuration.");
    if (!env.THREADLABZ_SUPABASE_SECRET_KEY) errors.push("Hosted commerce requires the ThreadLabz server-only Supabase key.");
    if (!/^[a-z]{20}$/.test(env.PRODUCTION_SUPABASE_PROJECT_REF || "") || !origin(env.PRODUCTION_SITE_URL)) errors.push("Declare the production project reference and site origin to enforce isolation.");
    if (environment === "staging" && (env.SUPABASE_PROJECT_REF === env.PRODUCTION_SUPABASE_PROJECT_REF || site?.origin === origin(env.PRODUCTION_SITE_URL)?.origin)) errors.push("Staging must use a different database and site origin from production.");
    if (environment === "production" && (env.SUPABASE_PROJECT_REF !== env.PRODUCTION_SUPABASE_PROJECT_REF || site?.origin !== origin(env.PRODUCTION_SITE_URL)?.origin)) errors.push("Production identity must match the approved project and site origin.");
    if (env.THREADLABZ_SUPABASE_SECRET_KEY && !/^sb_secret_[A-Za-z0-9_-]+$/.test(env.THREADLABZ_SUPABASE_SECRET_KEY)) errors.push("Hosted commerce requires a modern ThreadLabz Supabase secret key; legacy keys are not accepted.");
  }
  const checkoutMode = env.CHECKOUT_MODE || "disabled";
  if (!["disabled", "test"].includes(checkoutMode)) errors.push("CHECKOUT_MODE must be disabled or test. Live checkout is not enabled by this release.");
  if (env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")) errors.push("Live Razorpay credentials are not permitted in this release.");
  if (checkoutMode === "test") {
    if (environment === "production") errors.push("Test checkout cannot run in production.");
    if (!/^rzp_test_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID || "") || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) errors.push("Test checkout requires a test key, API secret and webhook secret.");
    if (!configured || !env.THREADLABZ_SUPABASE_SECRET_KEY) errors.push("Test checkout requires the isolated commerce database.");
  }
  for (const key of Object.keys(env)) {
    if (key.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE|PASSWORD|PRIVATE_KEY/.test(key) && env[key]) errors.push(`Server-only credential must not be public: ${key}.`);
  }
  return { valid: errors.length === 0, errors, environment: environment as AppEnvironment, checkoutEnabled: errors.length === 0 && checkoutMode === "test" };
}
