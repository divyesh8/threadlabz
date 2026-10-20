"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ArrowUpRight } from "lucide-react";
import type { CatalogueCard } from "../types/catalogue";
import { colourLabel, quantityLimit } from "../services/product-presentation";
import { addToCartAction } from "@/features/cart/actions/cart";

export function ProductOptions({ variants, pricePaise, sizeGuide }: { variants: CatalogueCard["variants"]; pricePaise: number; sizeGuide?: ReactNode }) {
  const colours = [...new Set(variants.map(variant => variant.colour))];
  const [colour, setColour] = useState(colours.find(value => variants.some(v => v.colour === value && v.stock > 0)) ?? colours[0] ?? "");
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const variant = variants.find(v => v.id === selected && v.colour === colour);
  const available = variants.some(v => v.stock > 0);
  const limit = quantityLimit(variant?.stock ?? 0);
  const priced = Number.isSafeInteger(pricePaise) && pricePaise > 0;
  const changeColour = (value: string) => {
    setColour(value);
    // Preserve the shopper's size only when that exact combination is available.
    const match = variants.find(v => v.colour === value && v.size === variant?.size && v.stock > 0);
    setSelected(match?.id ?? "");
    setQuantity(1);
    setFeedback(null);
  };
  const add = () => {
    if (!variant || !priced || !limit || quantity > limit || inFlight.current) return;
    inFlight.current = true;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await addToCartAction({ variantId: variant.id, quantity });
        const saved = result.cart?.items.find(item => item.variantId === variant.id);
        setFeedback(result.success && saved
          ? { type: "success", message: `Size ${saved.size} · ${colourLabel(saved.colour)} is in your bag. Quantity in bag: ${saved.quantity}.` }
          : { type: "error", message: result.error || "Could not add this item. Please try again." });
      } catch {
        setFeedback({ type: "error", message: "We couldn’t confirm this update. Check your bag before trying again." });
      } finally { inFlight.current = false; }
    });
  };
  return <div className="product-options" id="product-options">
    {colours.length > 0 && <fieldset className="colour-fieldset" disabled={pending}>
      <legend>Colour <span>{colourLabel(colour)}</span></legend>
      {colours.length > 1 && <div className="colour-options">{colours.map(value => <label key={value} className="colour-option">
        <input type="radio" name="colour" value={value} checked={colour === value} onChange={() => changeColour(value)} />
        <span>{colourLabel(value)}{!variants.some(v => v.colour === value && v.stock > 0) && <small>Unavailable</small>}</span>
      </label>)}</div>}
    </fieldset>}
    <div className="size-choice-heading"><span id="size-choice-label">Select size</span>{sizeGuide}</div>
    {variants.length > 0 ? <fieldset className="variant-fieldset" disabled={pending}>
      <legend className="sr-only">Size — {colourLabel(colour)}</legend>
      <div className="variant-grid">{variants.filter(v => v.colour === colour).map(v => <label className={`variant-option${v.stock <= 0 ? " is-unavailable" : ""}`} key={v.id}>
        <input type="radio" name="variant" value={v.id} checked={selected === v.id} disabled={v.stock <= 0}
          aria-label={`${v.size}${v.stock <= 0 ? " — Unavailable" : ""}`}
          onChange={() => { setSelected(v.id); setQuantity(1); setFeedback(null); }} />
        <span><strong>{v.size}</strong>{v.stock <= 0 && <small>Unavailable</small>}</span>
      </label>)}</div>
    </fieldset> : <p className="product-note">Size and availability information has not been supplied.</p>}
    <p className="selection-status" aria-live="polite" id="selection-status">
      {variant && limit ? <><Check size={14} aria-hidden="true" /> Size {variant.size} selected · {colourLabel(colour)}</>
        : available ? "Choose an available size to add this piece to your bag." : "This product is currently unavailable."}
    </p>
    {variant && limit > 0 && <div className="quantity-row">
      <span id="quantity-label">Quantity</span>
      <div className="quantity-control" role="group" aria-labelledby="quantity-label">
        <button aria-label="Decrease quantity" type="button" disabled={quantity <= 1 || pending} onClick={() => setQuantity(n => Math.max(1, n - 1))}><Minus size={16} aria-hidden="true" /></button>
        <output aria-live="polite">{quantity}</output>
        <button aria-label="Increase quantity" type="button" disabled={quantity >= limit || pending} onClick={() => setQuantity(n => Math.min(limit, n + 1))}><Plus size={16} aria-hidden="true" /></button>
      </div>
    </div>}
    <div className="product-actions">
      <button type="button" disabled={!priced || !variant || !limit || pending || quantity > limit} onClick={add} aria-busy={pending} aria-describedby="selection-status">
        <span>{pending ? "Adding to bag…" : !priced ? "Price unavailable" : !available ? "Currently unavailable" : !variant ? "Select a size" : !limit ? "Size unavailable" : "Add to bag"}</span>
        <ArrowUpRight size={19} aria-hidden="true" />
      </button>
    </div>
    <p className="pdp-caption purchase-note">Availability is checked again when you add to your bag.</p>
    {feedback && <div className={`bag-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
      <p>{feedback.message}</p>
      {(feedback.type === "success" || feedback.message.includes("Check your bag")) && <Link href="/cart" className="text-link">View bag →</Link>}
    </div>}
  </div>;
}
