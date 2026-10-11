"use client";

import Link from "next/link";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CartSummary } from "@/features/cart/types/cart";
import type { GatewayConfigStatus } from "../types/checkout";

export function CheckoutView({
  cart,
  gatewayStatus,
}: {
  cart: CartSummary;
  gatewayStatus: GatewayConfigStatus;
}) {
  return (
    <div className="page-width checkout-page" style={{ paddingBlock: "36px 72px" }}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Collection</Link>
        <span aria-hidden="true">/</span>
        <Link href="/cart">Shopping bag</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Checkout</span>
      </nav>

      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
        <p className="eyebrow">ThreadLabz / Secure Checkout</p>
        <h1 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 500, letterSpacing: "-0.03em", marginTop: "4px" }}>
          Checkout Preview
        </h1>
      </div>

      <div
        className="checkout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "48px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Owner Blocker Notice & Delivery Address preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Truthful store owner blocker notification */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fef3c7",
              borderRadius: "12px",
              padding: "24px",
              color: "#92400e",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
              <AlertCircle size={22} style={{ flexShrink: 0, marginTop: "2px", color: "#b45309" }} />
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#78350f" }}>
                  Payments & Checkout are Disabled
                </h2>
                <p style={{ fontSize: "13px", lineHeight: "1.7", margin: "6px 0 0" }}>
                  To protect customers and comply with Indian commerce regulations, ThreadLabz will not accept
                  real payments until the store owner configures the following requirements:
                </p>
              </div>
            </div>

            <ul style={{ margin: "12px 0 0", paddingLeft: "24px", fontSize: "12px", lineHeight: "1.8" }}>
              <li>
                <strong>Payment Gateway Credentials:</strong>{" "}
                {gatewayStatus.isConfigured ? (
                  <span style={{ color: "#15803d" }}>✓ Configured ({gatewayStatus.mode} mode)</span>
                ) : (
                  <span style={{ color: "#b91c1c" }}>
                    Pending store owner configuration (RAZORPAY_KEY_ID &amp; RAZORPAY_KEY_SECRET)
                  </span>
                )}
              </li>
              <li>
                <strong>GST &amp; Business Invoicing:</strong> Registered GSTIN and state tax rates.
              </li>
              <li>
                <strong>Courier &amp; Delivery Logistics:</strong> Confirmed delivery partners and serviceable pin codes.
              </li>
              <li>
                <strong>Real Inventory Verification:</strong> Final stock counts and approved studio photographs.
              </li>
            </ul>
          </div>

          {/* Shipping Address Placeholder */}
          <div
            style={{
              background: "var(--tan)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>
              1. Delivery Address (Preview)
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.6" }}>
              Shipping address collection will be active as soon as serviceable delivery pin codes and shipping rates are published.
            </p>
          </div>

          {/* Payment Method Section */}
          <div
            style={{
              background: "var(--tan)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>
              2. Payment Method
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--background)",
              }}
            >
              <Lock size={18} style={{ color: "var(--muted)" }} />
              <div>
                <strong style={{ fontSize: "13px", display: "block" }}>
                  Razorpay (UPI, Cards, NetBanking)
                </strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Test Mode · Gateway integration ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Action */}
        <div
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
            Summary ({cart.totalItemCount} {cart.totalItemCount === 1 ? "item" : "items"})
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {cart.items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <div>
                  <strong style={{ display: "block" }}>{item.productTitle}</strong>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {item.quantity} × {item.size} {item.colour !== "default" ? `· ${item.colour}` : ""}
                  </span>
                </div>
                <span>{formatPrice(item.lineTotalPaise)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Subtotal</span>
              <strong>{formatPrice(cart.subtotalPaise)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Shipping</span>
              <span>Free (Preview)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>GST (Estimated inclusive)</span>
              <span>{formatPrice(Math.round((cart.subtotalPaise * 500) / 10500))}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
              <strong>Total</strong>
              <strong style={{ color: "var(--rust)" }}>{formatPrice(cart.subtotalPaise)}</strong>
            </div>
          </div>

          <Button
            type="button"
            disabled
            style={{
              width: "100%",
              minHeight: "50px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "not-allowed",
              opacity: 0.6,
            }}
          >
            Pay Now (Disabled in Store Preview)
          </Button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--muted)", fontSize: "11px" }}>
            <ShieldCheck size={14} />
            <span>End-to-end server verification ready</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "8px" }}>
            <Link href="/cart" style={{ color: "var(--muted)", textDecoration: "underline" }}>
              ← Return to bag
            </Link>
            <Link href="/shop" style={{ color: "var(--muted)", textDecoration: "underline" }}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
