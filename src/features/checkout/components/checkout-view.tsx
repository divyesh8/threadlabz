"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  createCheckoutOrderAction,
  checkOrderStatusAction,
} from "../actions/checkout";
import type { CartSummary } from "@/features/cart/types/cart";
import type { GatewayConfigStatus, ShippingAddress, CheckoutOrder } from "../types/checkout";

type CheckoutState =
  | "ready"
  | "processing_checkout"
  | "payment_popup_loading"
  | "payment_pending_verification"
  | "payment_failed"
  | "order_confirmed";

export function CheckoutView({
  cart,
  gatewayStatus,
}: {
  cart: CartSummary;
  gatewayStatus: GatewayConfigStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CheckoutOrder | null>(null);

  // Delivery Address Form State
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "IN",
  });
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  function validateAddress(): boolean {
    const errors: Partial<Record<keyof ShippingAddress, string>> = {};

    if (!address.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    const cleanPhone = address.phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = "Enter a valid 10-digit Indian phone number";
    }
    if (!address.addressLine1.trim()) {
      errors.addressLine1 = "Street address is required";
    }
    if (!address.city.trim()) {
      errors.city = "City is required";
    }
    if (!address.state.trim()) {
      errors.state = "State is required";
    }
    const cleanPin = address.postalCode.replace(/\D/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      errors.postalCode = "Enter a valid 6-digit postal PIN code";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleAddressChange(field: keyof ShippingAddress, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmitOrder() {
    if (!validateAddress()) {
      setErrorMessage("Please complete all required delivery fields.");
      return;
    }

    setErrorMessage(null);
    setStockError(null);
    setCheckoutState("processing_checkout");

    startTransition(async () => {
      try {
        const res = await createCheckoutOrderAction({
          shippingAddress: address,
        });

        if (!res.success) {
          if (res.code === "OUT_OF_STOCK") {
            setStockError(res.error);
            setCheckoutState("ready");
          } else {
            setErrorMessage(res.error);
            setCheckoutState("payment_failed");
          }
          return;
        }

        if (!res.order) {
          setErrorMessage("Failed to initialize order details.");
          setCheckoutState("payment_failed");
          return;
        }

        // If payment gateway is not configured (store owner preview mode)
        if (!res.gatewayStatus.isConfigured) {
          setCheckoutState("ready");
          setErrorMessage(
            "Payment Gateway is in preview mode. The order record and stock reservation have been validated on the server, but no payment can be charged until the store owner adds gateway keys."
          );
          return;
        }

        // If Razorpay order created, simulate verification flow or open gateway
        setCheckoutState("payment_pending_verification");

        // Authoritative verification poll (checks server database status)
        const pollResult = await checkOrderStatusAction(res.order.id);
        if (pollResult.isPaid) {
          setConfirmedOrder(res.order);
          setCheckoutState("order_confirmed");
        } else {
          // In test mode without user completing payment: remains in pending state
          setConfirmedOrder(res.order);
          setCheckoutState("payment_pending_verification");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Checkout error: ${msg}`);
        setCheckoutState("payment_failed");
      }
    });
  }

  // 1. Empty Cart State
  if (cart.items.length === 0 && checkoutState !== "order_confirmed") {
    return (
      <div className="page-width checkout-page" style={{ paddingBlock: "48px 96px", textAlign: "center" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px", background: "var(--tan)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <ShoppingBag size={48} style={{ margin: "0 auto 16px", color: "var(--muted)" }} />
          <h1 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "8px" }}>Your bag is empty</h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: "1.6", marginBottom: "24px" }}>
            Add items from our collection before proceeding to checkout.
          </p>
          <Link href="/shop" className="btn-primary" style={{ display: "inline-block", padding: "12px 28px" }}>
            Explore Collection
          </Link>
        </div>
      </div>
    );
  }

  // 2. Authoritative Order Confirmed State
  if (checkoutState === "order_confirmed" && confirmedOrder) {
    return (
      <div className="page-width checkout-page" style={{ paddingBlock: "48px 96px" }}>
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            padding: "36px",
            background: "var(--tan)",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <CheckCircle2 size={56} style={{ color: "var(--rust)", margin: "0 auto 16px" }} />
          <p className="eyebrow" style={{ color: "var(--rust)" }}>Payment Confirmed</p>
          <h1 style={{ fontSize: "28px", fontWeight: 600, marginTop: "4px" }}>
            Thank you for your order!
          </h1>
          <p style={{ fontSize: "15px", color: "var(--muted)", marginTop: "8px" }}>
            Order <strong>{confirmedOrder.orderNumber}</strong> has been confirmed and is being prepared.
          </p>

          <div
            style={{
              textAlign: "left",
              background: "var(--background)",
              padding: "20px",
              borderRadius: "10px",
              margin: "24px 0",
              fontSize: "13px",
              lineHeight: "1.7",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--muted)" }}>Total Paid:</span>
              <strong>{formatPrice(confirmedOrder.grandTotalPaise)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--muted)" }}>Status:</span>
              <span style={{ color: "#15803d", fontWeight: 600 }}>PAID (Verified by Server)</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "8px" }}>
              <strong style={{ display: "block", marginBottom: "4px" }}>Shipping To:</strong>
              <div>{confirmedOrder.shippingAddress.fullName}</div>
              <div>{confirmedOrder.shippingAddress.addressLine1}</div>
              {confirmedOrder.shippingAddress.addressLine2 && <div>{confirmedOrder.shippingAddress.addressLine2}</div>}
              <div>
                {confirmedOrder.shippingAddress.city}, {confirmedOrder.shippingAddress.state} - {confirmedOrder.shippingAddress.postalCode}
              </div>
              <div>Phone: {confirmedOrder.shippingAddress.phone}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link href="/shop" className="btn-primary" style={{ padding: "12px 24px" }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          Delivery &amp; Payment
        </h1>
      </div>

      {/* Stock Error Notification */}
      {stockError && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#991b1b",
            padding: "16px 20px",
            borderRadius: "10px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Inventory availability changed:</strong> {stockError}{" "}
            <Link href="/cart" style={{ textDecoration: "underline", marginLeft: "8px" }}>
              Update Shopping Bag
            </Link>
          </div>
        </div>
      )}

      {/* General Error Notification */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            color: "#92400e",
            padding: "16px 20px",
            borderRadius: "10px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Payment Pending Verification State Banner */}
      {checkoutState === "payment_pending_verification" && confirmedOrder && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #dbeafe",
            color: "#1e40af",
            padding: "18px 24px",
            borderRadius: "12px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <RefreshCw size={22} className="animate-spin" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "15px", display: "block" }}>
              Order {confirmedOrder.orderNumber} Created &amp; Stock Reserved
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: "1.6" }}>
              Awaiting authoritative webhook payment confirmation from Razorpay. Inventory has been leased for 15 minutes.
            </p>
          </div>
        </div>
      )}

      <div
        className="checkout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "48px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Delivery Address & Payment Mode */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Owner configuration banner when gateway is unconfigured */}
          {!gatewayStatus.isConfigured && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: "12px",
                padding: "20px",
                color: "#92400e",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px", color: "#b45309" }} />
                <div>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "#78350f" }}>
                    Owner Preview Mode (Payments Disabled)
                  </h2>
                  <p style={{ fontSize: "12px", lineHeight: "1.6", margin: "4px 0 0" }}>
                    Payment gateway credentials are not yet configured on this environment.
                    Address validation, pricing calculations, and reservation logic can be tested safely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Address Section */}
          <section
            style={{
              background: "var(--tan)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Truck size={18} style={{ color: "var(--rust)" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
                1. Delivery Details
              </h2>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={address.fullName}
                  onChange={(e) => handleAddressChange("fullName", e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: validationErrors.fullName ? "1px solid #dc2626" : "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: "14px",
                  }}
                />
                {validationErrors.fullName && (
                  <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                    {validationErrors.fullName}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Phone Number (10 digits) *
                </label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => handleAddressChange("phone", e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: validationErrors.phone ? "1px solid #dc2626" : "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: "14px",
                  }}
                />
                {validationErrors.phone && (
                  <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                    {validationErrors.phone}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Street Address / Flat / Floor *
                </label>
                <input
                  type="text"
                  value={address.addressLine1}
                  onChange={(e) => handleAddressChange("addressLine1", e.target.value)}
                  placeholder="e.g. 402, Lotus Apartments, 5th Cross"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: validationErrors.addressLine1 ? "1px solid #dc2626" : "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: "14px",
                  }}
                />
                {validationErrors.addressLine1 && (
                  <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                    {validationErrors.addressLine1}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Locality / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={address.addressLine2 || ""}
                  onChange={(e) => handleAddressChange("addressLine2", e.target.value)}
                  placeholder="e.g. Near City Center Mall"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    placeholder="e.g. Mumbai"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: validationErrors.city ? "1px solid #dc2626" : "1px solid var(--border)",
                      background: "var(--background)",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                    State *
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                    placeholder="e.g. Maharashtra"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: validationErrors.state ? "1px solid #dc2626" : "1px solid var(--border)",
                      background: "var(--background)",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={address.postalCode}
                    onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                    placeholder="e.g. 400001"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: validationErrors.postalCode ? "1px solid #dc2626" : "1px solid var(--border)",
                      background: "var(--background)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Payment Method Section */}
          <section
            style={{
              background: "var(--tan)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Lock size={18} style={{ color: "var(--muted)" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
                2. Payment Method
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--background)",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>
                  Razorpay (UPI, Cards, NetBanking)
                </strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {gatewayStatus.isConfigured
                    ? `Mode: ${gatewayStatus.mode} · Server verification active`
                    : "Test Mode · Credentials pending owner configuration"}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: gatewayStatus.isConfigured ? "#dcfce7" : "#fef3c7",
                  color: gatewayStatus.isConfigured ? "#15803d" : "#b45309",
                  fontWeight: 600,
                }}
              >
                {gatewayStatus.isConfigured ? "Ready" : "Preview"}
              </span>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary Snapshot & Pay CTA */}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 600, margin: 0 }}>
              Bag Summary
            </h2>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              {cart.totalItemCount} {cart.totalItemCount === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Cart Item Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {cart.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Package size={22} style={{ color: "var(--muted)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", lineHeight: "1.4" }}>{item.productTitle}</strong>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Size: {item.size} {item.colour !== "default" ? `· ${item.colour}` : ""} · Qty: {item.quantity}
                  </span>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                    Unit: {formatPrice(item.unitPricePaise)}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>
                  {formatPrice(item.lineTotalPaise)}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Calculation Breakdown */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Subtotal</span>
              <strong>{formatPrice(cart.subtotalPaise)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Shipping</span>
              <span style={{ color: "#15803d", fontWeight: 500 }}>Free (Launch Preview)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Estimated 5% Inclusive GST</span>
              <span>{formatPrice(Math.round((cart.subtotalPaise * 500) / 10500))}</span>
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "12px",
                marginTop: "4px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "16px",
              }}
            >
              <strong>Grand Total</strong>
              <strong style={{ color: "var(--rust)" }}>{formatPrice(cart.subtotalPaise)}</strong>
            </div>
          </div>

          {/* Action Button */}
          <Button
            type="button"
            disabled={isPending || checkoutState === "processing_checkout"}
            onClick={handleSubmitOrder}
            style={{
              width: "100%",
              minHeight: "50px",
              fontSize: "14px",
              fontWeight: 600,
              background: "var(--charcoal)",
              color: "#fff",
              cursor: isPending ? "wait" : "pointer",
            }}
          >
            {isPending || checkoutState === "processing_checkout"
              ? "Reserving Inventory & Creating Order..."
              : gatewayStatus.isConfigured
              ? `Pay ${formatPrice(cart.subtotalPaise)}`
              : "Verify & Place Order (Preview Mode)"}
          </Button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: "var(--muted)",
              fontSize: "11px",
            }}
          >
            <ShieldCheck size={14} />
            <span>Server-Authoritative Pricing &amp; Stock Reservation</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "4px" }}>
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
