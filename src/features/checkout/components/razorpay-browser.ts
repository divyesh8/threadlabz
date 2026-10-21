"use client";

import type { CheckoutSession } from "../types/checkout";
export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; close(): void; on(name: "payment.failed", callback: () => void): void };
type RazorpayOptions = {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  handler(result: RazorpayResult): void; modal: { ondismiss(): void }; retry: { enabled: false }; theme: { color: string };
};
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance } }
let loading: Promise<void> | null = null;

async function loadCheckout() {
  if (window.Razorpay) return;
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => { script.remove(); loading = null; reject(new Error("Payment window could not load. Your saved order can be resumed.")); };
    const timer = window.setTimeout(fail, 15000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { window.clearTimeout(timer); if (window.Razorpay) resolve(); else fail(); };
    script.onerror = () => { window.clearTimeout(timer); fail(); };
    document.head.appendChild(script);
  });
  await loading;
}

export async function openTestCheckout(session: CheckoutSession, callbacks: {
  success(result: RazorpayResult): void; failed(): void; dismissed(): void;
}) {
  if (!session.canPay || !session.keyId?.startsWith("rzp_test_") || !session.razorpayOrderId) throw new Error("This saved order is not payable.");
  await loadCheckout();
  let settled = false;
  const popup = new window.Razorpay!({
    key: session.keyId, order_id: session.razorpayOrderId, amount: session.order.grandTotalPaise,
    currency: session.order.currency, name: "ThreadLabz", description: "Test checkout — no real payment",
    theme: { color: "#a74224" }, retry: { enabled: false },
    handler: result => { if (!settled) { settled = true; callbacks.success(result); } },
    modal: { ondismiss: () => { if (!settled) { settled = true; callbacks.dismissed(); } } },
  });
  popup.on("payment.failed", () => { if (!settled) { settled = true; popup.close(); callbacks.failed(); } });
  popup.open();
  return popup;
}
