"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, AlertCircle, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateQuantityAction, removeItemAction } from "../actions/cart";
import type { CartSummary } from "../types/cart";

export function CartView({ initialCart }: { initialCart: CartSummary }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    startTransition(async () => {
      await updateQuantityAction({ itemId, quantity: newQty });
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      await removeItemAction({ itemId });
    });
  };

  if (!initialCart || initialCart.items.length === 0) {
    return (
      <div className="status-page page-width" style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center" }}>
        <span className="status-icon" aria-hidden="true">
          <ShoppingBag size={36} />
        </span>
        <p className="eyebrow">ThreadLabz / Shopping bag</p>
        <h1 style={{ fontSize: "32px", fontWeight: 500, margin: "16px 0 8px" }}>Your bag is empty</h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.7", marginBottom: "28px" }}>
          You haven&apos;t added any pieces yet. Explore our handcrafted festive edits, everyday tees, and custom outfits.
        </p>
        <Button asChild>
          <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <ArrowLeft size={16} /> Explore collection
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="page-width cart-page" style={{ paddingBlock: "36px 72px" }}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Collection</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Shopping bag</span>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "32px", borderBottom: "1px solid var(--border)", paddingBottom: "18px" }}>
        <div>
          <p className="eyebrow">ThreadLabz / Order preview</p>
          <h1 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 500, letterSpacing: "-0.03em", marginTop: "4px" }}>
            Shopping Bag
          </h1>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>
          {initialCart.totalItemCount} {initialCart.totalItemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <div
        className="cart-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "48px",
          alignItems: "start",
        }}
      >
        {/* Cart items list */}
        <div className="cart-items" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {initialCart.items.map((item) => (
            <div
              key={item.id}
              className="cart-item-row"
              style={{
                display: "grid",
                gridTemplateColumns: "96px 1fr auto",
                gap: "18px",
                padding: "18px",
                background: "var(--tan)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                alignItems: "center",
              }}
            >
              {/* Product thumbnail */}
              <div
                style={{
                  width: "96px",
                  height: "112px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#eee4d8",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.imageId ? (
                  <Image
                    src={`/catalogue-image/${item.imageId}`}
                    alt={item.imageAlt || item.productTitle}
                    fill
                    sizes="96px"
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <ShoppingBag size={24} style={{ color: "var(--muted)", opacity: 0.5 }} />
                )}
              </div>

              {/* Product Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                  {item.categoryName}
                </p>
                <Link
                  href={`/products/${item.productSlug}`}
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--foreground)",
                    textDecoration: "none",
                    lineHeight: "1.3",
                  }}
                >
                  {item.productTitle}
                </Link>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Size: <strong>{item.size}</strong>
                  {item.colour && item.colour !== "default" && (
                    <> · Colour: <strong>{item.colour}</strong></>
                  )}
                </p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--rust)", margin: "4px 0 0" }}>
                  {formatPrice(item.unitPricePaise)}
                </p>

                {item.stockAvailable <= 3 && item.stockAvailable > 0 && (
                  <p style={{ fontSize: "11px", color: "#b45309", margin: "2px 0 0" }}>
                    Only {item.stockAvailable} left in stock
                  </p>
                )}
              </div>

              {/* Quantity Controls & Remove */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                <div
                  className="quantity-control"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--input)",
                    borderRadius: "20px",
                    background: "var(--background)",
                    height: "36px",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={item.quantity <= 1 || isPending}
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    style={{ width: "32px", height: "32px", display: "grid", placeItems: "center", background: "none", border: "none", cursor: item.quantity <= 1 ? "not-allowed" : "pointer", opacity: item.quantity <= 1 ? 0.3 : 1 }}
                  >
                    <Minus size={14} />
                  </button>
                  <output style={{ minWidth: "28px", textAlign: "center", fontSize: "13px", fontWeight: 600 }}>
                    {item.quantity}
                  </output>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={item.quantity >= Math.min(item.stockAvailable, 10) || isPending}
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    style={{ width: "32px", height: "32px", display: "grid", placeItems: "center", background: "none", border: "none", cursor: item.quantity >= Math.min(item.stockAvailable, 10) ? "not-allowed" : "pointer", opacity: item.quantity >= Math.min(item.stockAvailable, 10) ? 0.3 : 1 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>
                  {formatPrice(item.lineTotalPaise)}
                </p>

                <button
                  type="button"
                  aria-label={`Remove ${item.productTitle} from bag`}
                  disabled={isPending}
                  onClick={() => handleRemoveItem(item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                  }}
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Store Owner Blocker Note */}
        <div
          className="order-summary"
          style={{
            background: "var(--tan)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h2 style={{ fontSize: "17px", fontWeight: 600, margin: 0, borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
            Order Summary
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Subtotal ({initialCart.totalItemCount} items)</span>
              <strong>{formatPrice(initialCart.subtotalPaise)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Estimated delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Taxes (GST)</span>
              <span>Included</span>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "14px",
                marginTop: "6px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "16px",
              }}
            >
              <strong>Total</strong>
              <strong style={{ color: "var(--rust)" }}>{formatPrice(initialCart.subtotalPaise)}</strong>
            </div>
          </div>

          {/* Checkout disabled banner */}
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "12px",
              lineHeight: "1.6",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ display: "block", marginBottom: "4px" }}>Checkout Preview Only</strong>
              {initialCart.checkoutDisabledReason}
            </div>
          </div>

          <Button
            type="button"
            disabled
            style={{
              width: "100%",
              minHeight: "48px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "not-allowed",
              opacity: 0.6,
            }}
          >
            Proceed to Checkout (Disabled in Preview)
          </Button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--muted)", fontSize: "11px" }}>
            <ShieldCheck size={14} />
            <span>Server-authoritative pricing in integer paise</span>
          </div>

          <Link
            href="/shop"
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "var(--muted)",
              textDecoration: "underline",
              marginTop: "4px",
            }}
          >
            ← Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
