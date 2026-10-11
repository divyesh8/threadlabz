"use client";

import { useState } from "react";
import type { CatalogueImageData } from "@/features/catalogue/types/catalogue";
import { CatalogueImage, PhotoUnavailable } from "@/features/media/components/catalogue-image";

export function ProductGallery({ images, name }: { images: CatalogueImageData[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const active = images[selected];
  return <section className="product-gallery" aria-label={`${name} photographs`}>
    <div className="gallery-main">{active ? <CatalogueImage key={active.id} id={active.id} alt={active.alt} priority sizes="(max-width: 760px) 100vw, 55vw" /> : <PhotoUnavailable />}</div>
    {images.length > 1 && <div className="gallery-thumbnails" aria-label="Choose photograph">
      {images.map((image, i) => <button key={image.id} type="button" aria-pressed={i === selected} aria-label={`View photograph ${i + 1}`} onClick={() => setSelected(i)}><CatalogueImage id={image.id} alt="" sizes="72px" /></button>)}
    </div>}
    {images.length > 0 && <p className="gallery-caption" aria-live="polite">Photograph {selected + 1} of {images.length}</p>}
  </section>;
}
