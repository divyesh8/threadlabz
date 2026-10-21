"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Expand, ZoomIn, ZoomOut } from "lucide-react";
import type { CatalogueImageData } from "../types/catalogue";
import { CatalogueImage, PhotoUnavailable } from "@/features/media/components/catalogue-image";
import { ProductDialog } from "./product-dialog";

function ZoomPhotograph({ image }: { image: CatalogueImageData }) {
  const [magnified, setMagnified] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const toggleZoom = () => {
    const next = !magnified;
    setMagnified(next);
    requestAnimationFrame(() => {
      const element = viewport.current;
      if (element) element.scrollTo({ left: next ? (element.scrollWidth - element.clientWidth) / 2 : 0, top: next ? (element.scrollHeight - element.clientHeight) / 2 : 0, behavior: "instant" });
    });
  };
  return <div className="photo-zoom">
    <div className="photo-zoom-tools"><p>Scroll to explore the enlarged photograph.</p>
      <button className="pdp-icon-button" type="button" aria-label={magnified ? "Zoom out" : "Zoom in"} aria-pressed={magnified} onClick={toggleZoom}>
        {magnified ? <ZoomOut size={20} aria-hidden="true" /> : <ZoomIn size={20} aria-hidden="true" />}
      </button>
    </div>
    <div ref={viewport} className="photo-zoom-scroll" tabIndex={0} role="region" aria-label="Enlarged photograph, use arrow keys to scroll">
      <div className={`photo-zoom-image${magnified ? " is-magnified" : ""}`}>
        <CatalogueImage id={image.id} alt={image.alt} priority sizes={magnified ? "180vw" : "90vw"} />
      </div>
    </div>
  </div>;
}

export function ProductGallery({ images, name }: { images: CatalogueImageData[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const active = images[selected];
  const ready = active && loadedImages.includes(active.id) && !failedImages.includes(active.id);
  const select = (index: number, focus = false) => {
    setSelected(index);
    if (focus) {
      thumbnails.current[index]?.focus({ preventScroll: true });
      thumbnails.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
  };
  const navigate = (event: KeyboardEvent, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % images.length
      : event.key === "ArrowLeft" ? (index - 1 + images.length) % images.length
      : event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : null;
    if (next !== null) { event.preventDefault(); select(next, true); }
  };
  return <section className="product-gallery" aria-label={`${name} photographs`}>
    <div className="gallery-main">
      {active ? <CatalogueImage key={active.id} id={active.id} alt={active.alt} priority
        sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1000px) calc(100vw - 96px), (max-width: 1440px) 52vw, 720px"
        onReady={() => setLoadedImages(ids => ids.includes(active.id) ? ids : [...ids, active.id])}
        onFailure={() => setFailedImages(ids => ids.includes(active.id) ? ids : [...ids, active.id])} /> : <PhotoUnavailable />}
      {active && <ProductDialog title="Product photograph" className="gallery-zoom-button" triggerLabel="Enlarge photograph" disabled={!ready} trigger={<Expand size={20} aria-hidden="true" />}>
        <ZoomPhotograph key={active.id} image={active} />
      </ProductDialog>}
      {images.length > 1 && <div className="gallery-arrows">
        <button type="button" className="pdp-icon-button" aria-label="Previous photograph" onClick={() => select((selected - 1 + images.length) % images.length)}><ArrowLeft size={18} aria-hidden="true" /></button>
        <button type="button" className="pdp-icon-button" aria-label="Next photograph" onClick={() => select((selected + 1) % images.length)}><ArrowRight size={18} aria-hidden="true" /></button>
      </div>}
    </div>
    <div className="gallery-meta"><p className="gallery-caption" aria-live="polite">
      {active ? `Photograph ${selected + 1} of ${images.length}${failedImages.includes(active.id) ? " · Image unavailable" : !loadedImages.includes(active.id) ? " · Loading" : ""}` : "Product photography has not been supplied."}
    </p>{images.length > 1 && <span className="gallery-keyboard-hint">Explore every detail</span>}</div>
    {images.length > 1 && <div className="gallery-thumbnails" role="group" aria-label="Choose photograph. Use left and right arrow keys.">
      {images.map((image, index) => <button key={image.id} ref={node => { thumbnails.current[index] = node; }}
        type="button" tabIndex={index === selected ? 0 : -1} aria-pressed={index === selected}
        aria-label={`View photograph ${index + 1}`} title={image.alt}
        onKeyDown={event => navigate(event, index)} onClick={() => select(index)}>
        <CatalogueImage id={image.id} alt="" sizes="72px" />
      </button>)}
    </div>}
  </section>;
}
