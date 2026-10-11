"use client";

import { useState } from "react";
import type { CatalogueCard } from "@/lib/catalogue/query";
import { Heart, Minus, Plus } from "lucide-react";

export function ProductActions() {
  return <><div className="product-actions"><button type="button" disabled aria-describedby="ordering-status">Ordering unavailable</button><button type="button" disabled aria-label="Wishlist unavailable"><Heart size={19} /></button></div><p className="product-note" id="ordering-status">Browse for now. Cart, wishlist and checkout are not open yet.</p></>;
}

export function ProductOptions({ variants }: { variants: CatalogueCard["variants"] }) {
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const variant = variants.find(v => v.id === selected);
  const available = variants.some(v => v.stock > 0);
  return <div className="product-options">
    {variants.length > 0 ? <fieldset className="variant-fieldset"><legend>Choose a size & colour</legend><div className="variant-grid">
      {variants.map(v => <label className={`variant-option ${v.stock === 0 ? "is-unavailable" : ""}`} key={v.id}>
        <input type="radio" name="variant" value={v.id} checked={selected === v.id} disabled={v.stock === 0} onChange={() => { setSelected(v.id); setQuantity(1); }} />
        <span><strong>{v.size}</strong><span>{v.colour === "default" ? "" : v.colour}</span><small>{v.stock === 0 ? "Unavailable" : v.stock <= 3 ? "Low stock" : "Available"}</small></span>
      </label>)}
    </div></fieldset> : <p className="product-note">Size and availability information is not yet available.</p>}
    <p className="selection-status" aria-live="polite">{variant ? `${variant.size}${variant.colour === "default" ? "" : ` · ${variant.colour}`} selected. ${variant.stock} available.` : available ? "Select an available option to see quantity." : "This product is currently unavailable."}</p>
    {variant && <div className="quantity-row"><span id="quantity-label">Quantity</span><div className="quantity-control" role="group" aria-labelledby="quantity-label">
      <button aria-label="Decrease quantity" type="button" disabled={quantity <= 1} onClick={() => setQuantity(n => Math.max(1, n - 1))}><Minus size={16} /></button>
      <output aria-live="polite">{quantity}</output>
      <button aria-label="Increase quantity" type="button" disabled={quantity >= variant.stock} onClick={() => setQuantity(n => Math.min(variant.stock, n + 1))}><Plus size={16} /></button>
    </div></div>}
  </div>;
}
