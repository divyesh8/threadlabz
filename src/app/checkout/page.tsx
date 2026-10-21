import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCartAction } from "@/features/cart/actions/cart";
import { getRazorpayGatewayStatus } from "@/features/checkout/services/payment";
import { CheckoutView } from "@/features/checkout/components/checkout-view";
import { resumeCheckoutAction, resumeCheckoutAttemptAction } from "@/features/checkout/actions/checkout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | ThreadLabz",
  description: "Secure checkout preview for ThreadLabz.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ order?: string; attempt?: string }> }) {
  const params = await searchParams;
  const savedCheckout = params.order ? await resumeCheckoutAction(params.order)
    : params.attempt ? await resumeCheckoutAttemptAction(params.attempt) : null;
  if ((params.order || params.attempt) && !savedCheckout) {
    return <div className="page-width checkout-page" style={{ paddingBlock: "48px 96px", maxWidth: 640 }}>
      <h1>Saved checkout could not be loaded.</h1>
      <p style={{ marginBlock: 16 }}>Use the same browser or account and reload this page to retry. Keep this address so you can recover the same attempt. Check any pending payment before starting another order.</p>
      <Link className="btn-primary" href="/cart">Return to bag</Link>
    </div>;
  }
  const cart = await getCartAction();

  if ((!cart || cart.items.length === 0) && !savedCheckout) {
    redirect("/cart");
  }

  const gatewayStatus = getRazorpayGatewayStatus();

  return <CheckoutView cart={cart} gatewayStatus={gatewayStatus} savedCheckout={savedCheckout} />;
}
