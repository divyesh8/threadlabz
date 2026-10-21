"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Lock, Package, RefreshCw, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createCheckoutOrderAction, checkOrderStatusAction, verifyCheckoutPaymentAction, resumeCheckoutAction, resumeCheckoutAttemptAction } from "../actions/checkout";
import { shippingAddressSchema } from "../schemas/checkout";
import { openTestCheckout } from "./razorpay-browser";
import type { CartSummary } from "@/features/cart/types/cart";
import type { GatewayConfigStatus, ShippingAddress, CheckoutOrder, CheckoutSession } from "../types/checkout";

type CheckoutState = "ready" | "processing_checkout" | "payment_popup_loading" | "payment_pending_verification" | "payment_failed" | "order_confirmed";

export function CheckoutView({ cart, gatewayStatus, savedCheckout }: {
  cart: CartSummary; gatewayStatus: GatewayConfigStatus; savedCheckout: CheckoutSession | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [session, setSession] = useState<CheckoutSession | null>(savedCheckout);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(savedCheckout?.isPaid ? "order_confirmed" : savedCheckout ? "payment_pending_verification" : "ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CheckoutOrder | null>(savedCheckout?.order ?? null);
  const attemptKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const popup = useRef<{ close(): void } | null>(null);
  const [address, setAddress] = useState<ShippingAddress>(savedCheckout?.order.shippingAddress ?? {
    fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "IN",
  });
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  useEffect(() => () => popup.current?.close(), []);
  useEffect(() => {
    if (!session || checkoutState !== "payment_pending_verification") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      try {
        const status = await checkOrderStatusAction(session.order.id);
        if (cancelled) return;
        if (status.isPaid) { setCheckoutState("order_confirmed"); setErrorMessage(null); return; }
        if ("paymentStatus" in status && typeof status.paymentStatus === "string" && ["failed", "captured_review"].includes(status.paymentStatus)) {
          setCheckoutState("payment_failed");
          setSession(current => current ? { ...current, canPay: false } : current);
          setErrorMessage(status.paymentStatus === "captured_review" ? "Payment was received and needs review. Do not pay again; contact support with your order reference." : "The server confirmed that payment failed. This order cannot be paid again; return to your bag to start a new order.");
          return;
        }
      } catch { /* Keep the saved order and expose a manual status retry. */ }
      if (!cancelled && ++attempts < 8) timer = setTimeout(poll, 2500);
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [session, checkoutState]);

  function acceptSaved(saved: CheckoutSession) {
    setSession(saved); setConfirmedOrder(saved.order); setAddress(saved.order.shippingAddress);
    window.history.replaceState(null, "", `/checkout?order=${saved.order.id}`);
    setCheckoutState(saved.isPaid ? "order_confirmed" : "payment_pending_verification");
  }
  async function refreshSaved() {
    if (!session) return;
    const saved = await resumeCheckoutAction(session.order.id);
    if (saved) { acceptSaved(saved); setErrorMessage(saved.canPay || saved.isPaid ? null : "This saved order is not currently payable. Check its status or contact support before starting another payment."); }
    else setErrorMessage("The saved order could not be loaded. Sign in with the same account or retry in this browser.");
  }
  async function pay(saved: CheckoutSession) {
    if (!saved.canPay || saved.isPaid) return;
    setCheckoutState("payment_popup_loading");
    try {
      popup.current = await openTestCheckout(saved, {
        success: async result => {
          setCheckoutState("payment_pending_verification");
          setErrorMessage("Checking payment with the server. Do not pay again while verification is pending.");
          try {
            const status = await verifyCheckoutPaymentAction({ ...result, orderId: saved.order.id });
            if (status.isPaid) { setCheckoutState("order_confirmed"); setErrorMessage(null); }
          } catch { setErrorMessage("Verification was interrupted. Use Check payment status before retrying payment."); }
        },
        failed: () => { setCheckoutState("payment_pending_verification"); setErrorMessage("The payment attempt did not complete. Check the saved status before retrying."); },
        dismissed: () => { setCheckoutState("payment_pending_verification"); setErrorMessage("Payment window closed. Your order is saved; check its status before resuming."); },
      });
    } catch {
      setCheckoutState("payment_pending_verification");
      setErrorMessage("The payment window could not load. Your order is saved and can be resumed while its reservation is valid.");
    }
  }
  function handleAddressChange(field: keyof ShippingAddress, value: string) {
    setAddress(previous => ({ ...previous, [field]: value }));
    setValidationErrors(previous => ({ ...previous, [field]: undefined }));
    setErrorMessage(null);
  }
  function handleSubmitOrder() {
    if (submitting.current || !gatewayStatus.checkoutEnabled) return;
    if (!session) {
      const result = shippingAddressSchema.safeParse(address);
      if (!result.success) {
        setValidationErrors(Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]), issue.message])));
        setErrorMessage("Please complete all required delivery fields."); return;
      }
    }
    submitting.current = true; setErrorMessage(null); setStockError(null);
    startTransition(async () => {
      try {
        if (session) {
          const saved = await resumeCheckoutAction(session.order.id);
          if (!saved) { setErrorMessage("Could not load the saved order. Check its status before retrying."); return; }
          acceptSaved(saved); await pay(saved); return;
        }
        setCheckoutState("processing_checkout");
        const attempt = (attemptKey.current ??= crypto.randomUUID());
        window.history.replaceState(null, "", `/checkout?attempt=${attempt}`);
        const result = await createCheckoutOrderAction({ shippingAddress: address, idempotencyKey: attempt });
        if (!result.success) {
          const saved = await resumeCheckoutAttemptAction(attempt);
          if (saved) acceptSaved(saved); else setCheckoutState("ready");
          if (result.code === "OUT_OF_STOCK") setStockError(result.error); else setErrorMessage(result.error);
          return;
        }
        const saved = await resumeCheckoutAction(result.order.id);
        if (!saved) { setErrorMessage("Order saved, but payment details could not be loaded. Reload this page before retrying."); setCheckoutState("payment_pending_verification"); return; }
        acceptSaved(saved); await pay(saved);
      } catch {
        setCheckoutState("payment_pending_verification");
        setErrorMessage("Checkout was interrupted. Reload this page to recover the same attempt before retrying.");
      } finally { submitting.current = false; }
    });
  }

  // 1. Empty Cart State
  if (cart.items.length === 0 && !session && checkoutState !== "order_confirmed") {
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
            Order <strong>{confirmedOrder.orderNumber}</strong> has a verified payment and confirmed stock allocation.
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

      {Object.keys(validationErrors).some(key => validationErrors[key as keyof ShippingAddress]) && <ul id="checkout-form-errors" role="alert">{Object.entries(validationErrors).filter(([, value]) => value).map(([key, value]) => <li key={key}>{value}</li>)}</ul>}
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
      {session && checkoutState !== "order_confirmed" && confirmedOrder && (
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
          <RefreshCw size={22} aria-hidden="true" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "15px", display: "block" }}>
              Saved order {confirmedOrder.orderNumber}
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: "1.6" }}>
              Payment is confirmed only after a server check. {confirmedOrder.reservationExpiresAt && <>Reservation ends <time dateTime={confirmedOrder.reservationExpiresAt}>{new Date(confirmedOrder.reservationExpiresAt).toLocaleString("en-IN")}</time>.</>}
            </p>
          </div>
        </div>
      )}

      <div
        className="checkout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "48px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Delivery Address & Payment Mode */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Owner configuration banner when gateway is unconfigured */}
          {!gatewayStatus.checkoutEnabled && (
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
                    Checkout is disabled in this environment. Test checkout requires approved staging configuration; live payments remain unavailable.
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
                <label htmlFor="checkout-fullName" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  id="checkout-fullName" disabled={isPending || Boolean(session)} aria-invalid={Boolean(validationErrors.fullName)} aria-describedby={validationErrors.fullName ? "checkout-form-errors" : undefined}
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
                <label htmlFor="checkout-phone" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Phone Number (10 digits) *
                </label>
                <input
                  type="tel"
                  id="checkout-phone" disabled={isPending || Boolean(session)} aria-invalid={Boolean(validationErrors.phone)} aria-describedby={validationErrors.phone ? "checkout-form-errors" : undefined}
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
                <label htmlFor="checkout-addressLine1" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Street Address / Flat / Floor *
                </label>
                <input
                  type="text"
                  id="checkout-addressLine1" disabled={isPending || Boolean(session)} aria-invalid={Boolean(validationErrors.addressLine1)} aria-describedby={validationErrors.addressLine1 ? "checkout-form-errors" : undefined}
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
                <label htmlFor="checkout-addressLine2" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                  Locality / Landmark (Optional)
                </label>
                <input
                  type="text"
                  id="checkout-addressLine2" disabled={isPending || Boolean(session)} value={address.addressLine2 || ""}
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: "12px" }}>
                <div>
                  <label htmlFor="checkout-city" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                    City *
                  </label>
                  <input
                    type="text"
                    id="checkout-city" disabled={isPending || Boolean(session)} aria-invalid={Boolean(validationErrors.city)} aria-describedby={validationErrors.city ? "checkout-form-errors" : undefined}
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
                  <label htmlFor="checkout-state" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                    State *
                  </label>
                  <input
                    type="text"
                    id="checkout-state" disabled={isPending || Boolean(session)} aria-invalid={Boolean(validationErrors.state)} aria-describedby={validationErrors.state ? "checkout-form-errors" : undefined}
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
                  <label htmlFor="checkout-postalCode" style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    id="checkout-postalCode" disabled={isPending || Boolean(session)} aria-invalid={Boolean(validationErrors.postalCode)} aria-describedby={validationErrors.postalCode ? "checkout-form-errors" : undefined}
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
              {(session ? session.order.items.reduce((total, item) => total + item.quantity, 0) : cart.totalItemCount)} {(session ? session.order.items.reduce((total, item) => total + item.quantity, 0) : cart.totalItemCount) === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Cart Item Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {(session ? session.order.items.map(item => ({ ...item, id: item.variantId, productTitle: item.title })) : cart.items).map((item) => (
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
              <strong>{formatPrice((session?.order.grandTotalPaise ?? cart.subtotalPaise))}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Shipping</span>
              <span style={{ color: "var(--muted)", fontWeight: 500 }}>Not a delivery quote</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Test tax model (not an invoice)</span>
              <span>{formatPrice(session ? session.order.items.reduce((total, item) => total + item.taxPaise, 0) : cart.items.reduce((total, item) => total + Math.round(item.lineTotalPaise * 500 / 10500), 0))}</span>
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
              <strong style={{ color: "var(--new)" }}>{formatPrice((session?.order.grandTotalPaise ?? cart.subtotalPaise))}</strong>
            </div>
          </div>

          {session && <Button type="button" onClick={() => startTransition(refreshSaved)} disabled={isPending}>Check payment status</Button>}
          <p role="status" style={{ fontSize: "12px", lineHeight: 1.6 }}>Test mode only. No real payment or delivery commitment. Reloading this page resumes the same saved attempt.</p>
          {/* Action Button */}
          <Button
            type="button"
            disabled={isPending || checkoutState === "processing_checkout" || checkoutState === "payment_popup_loading" || !gatewayStatus.checkoutEnabled || Boolean(session && !session.canPay)}
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
              : gatewayStatus.checkoutEnabled
              ? session ? "Resume test payment" : `Test pay ${formatPrice(cart.subtotalPaise)}`
              : "Checkout unavailable"}
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
