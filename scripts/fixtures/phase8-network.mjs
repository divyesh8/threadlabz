// Test process preload only. The application has no configurable gateway URL.
// Even a failed interception must never fall back to a hosted payment provider.
const origin = new URL(process.env.QA_GATEWAY_ORIGIN);
if (origin.hostname !== '127.0.0.1' || process.env.APP_ENV !== 'local'
  || process.env.RAZORPAY_KEY_SECRET !== 'phase8-fixture-secret') throw Error('Unsafe fixture environment');
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.origin === 'https://api.razorpay.com') return fetchOriginal(`${origin.origin}/gateway${url.pathname}`, init);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('External network forbidden by Phase 8 fixture');
  return fetchOriginal(input, init);
};
