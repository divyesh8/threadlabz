import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCartAction } from "@/features/cart/actions/cart";
import { getRazorpayGatewayStatus } from "@/features/checkout/services/payment";
import { CheckoutView } from "@/features/checkout/components/checkout-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | ThreadLabz",
  description: "Secure checkout preview for ThreadLabz.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const cart = await getCartAction();

  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  const gatewayStatus = getRazorpayGatewayStatus();

  return <CheckoutView cart={cart} gatewayStatus={gatewayStatus} />;
}
