import type { Metadata } from "next";
import { getCartAction } from "@/features/cart/actions/cart";
import { CartView } from "@/features/cart/components/cart-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shopping Bag | ThreadLabz",
  description: "View and manage items in your ThreadLabz shopping bag.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage() {
  const cart = await getCartAction();

  return <CartView initialCart={cart} />;
}
