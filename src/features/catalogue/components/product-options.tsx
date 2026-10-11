"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CatalogueCard } from "@/features/catalogue/types/catalogue";
import { Heart, Minus, Plus } from "lucide-react";
import { addToCartAction } from "@/features/cart/actions/cart";

export function ProductActions() {
  return (
    <>
      <div className="product-actions">
        <button type="button" disabled aria-describedby="ordering-status">
          Select options below
        </button>
        <button type="button" disabled aria-label="Wishlist unavailable">
          <Heart size={19} />
        </button>
      </div>
      <p className="product-note" id="ordering-status">
        Select an available size below to add to your shopping bag. Checkout is preview only.
      </p>
    </>
  );
}

export function ProductOptions({ variants }: { variants: CatalogueCard["variants"] }) {
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const variant = variants.find(v => v.id === selected);
  const available = variants.some(v => v.stock > 0);

  const handleAddToCart = () => {
    if (!variant || variant.stock <= 0) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await addToCartAction({ variantId: variant.id, quantity });
      if (res.success) {
        setFeedback({
          type: "success",
          message: `${quantity} × ${variant.size}${variant.colour === "default" ? "" : ` (${variant.colour})`} added to your shopping bag.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Could not add item to bag. Please try again.",
        });
      }
    });
  };

  return (
    <div className="product-options" id="product-options">
      {variants.length > 0 ? (
        <fieldset className="variant-fieldset">
          <legend>Choose a size & colour</legend>
          <div className="variant-grid">
            {variants.map(v => (
              <label className={`variant-option ${v.stock === 0 ? "is-unavailable" : ""}`} key={v.id}>
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={selected === v.id}
                  disabled={v.stock === 0}
                  onChange={() => {
                    setSelected(v.id);
                    setQuantity(1);
                    setFeedback(null);
                  }}
                />
                <span>
                  <strong>{v.size}</strong>
                  <span>{v.colour === "default" ? "" : v.colour}</span>
                  <small>{v.stock === 0 ? "Unavailable" : v.stock <= 3 ? "Low stock" : "Available"}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="product-note">Size and availability information is not yet available.</p>
      )}

      <p className="selection-status" aria-live="polite">
        {variant
          ? `${variant.size}${variant.colour === "default" ? "" : ` · ${variant.colour}`} selected. ${variant.stock} available.`
          : available
          ? "Select an available option to see quantity."
          : "This product is currently unavailable."}
      </p>

      {variant && (
        <div className="quantity-row">
          <span id="quantity-label">Quantity</span>
          <div className="quantity-control" role="group" aria-labelledby="quantity-label">
            <button
              aria-label="Decrease quantity"
              type="button"
              disabled={quantity <= 1 || isPending}
              onClick={() => setQuantity(n => Math.max(1, n - 1))}
            >
              <Minus size={16} />
            </button>
            <output aria-live="polite">{quantity}</output>
            <button
              aria-label="Increase quantity"
              type="button"
              disabled={quantity >= variant.stock || isPending}
              onClick={() => setQuantity(n => Math.min(variant.stock, n + 1))}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add to bag action */}
      <div className="product-actions" style={{ marginTop: "18px" }}>
        <button
          type="button"
          disabled={!variant || variant.stock <= 0 || isPending}
          onClick={handleAddToCart}
          aria-busy={isPending}
        >
          {isPending ? "Adding to bag…" : !variant ? "Select a size" : variant.stock <= 0 ? "Out of stock" : "Add to bag"}
        </button>
        <button type="button" disabled aria-label="Wishlist unavailable">
          <Heart size={19} />
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            lineHeight: "1.6",
            background: feedback.type === "success" ? "#eef6ee" : "#fdf2f2",
            color: feedback.type === "success" ? "#1b4d24" : "#991b1b",
            border: `1px solid ${feedback.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>{feedback.message}</span>
          {feedback.type === "success" && (
            <Link href="/cart" className="text-link" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              View bag →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
