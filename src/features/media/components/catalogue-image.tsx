"use client";

import { useState } from "react";
import Image from "next/image";
import { CameraOff } from "lucide-react";
import { catalogueImageLoader } from "../services/image-widths";

export function PhotoUnavailable() {
  return <div className="catalogue-image-empty"><CameraOff size={26} strokeWidth={1} aria-hidden="true" /><span>Photography<br />unavailable</span></div>;
}

export function CatalogueImage({ id, alt, sizes = "(max-width: 760px) 45vw, 25vw", priority = false, onReady, onFailure }: {
  id: string; alt: string; sizes?: string; priority?: boolean; onReady?: () => void; onFailure?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return failed ? <PhotoUnavailable /> : <>
    {!loaded && <span className="catalogue-image-loading" aria-hidden="true" />}
    <Image src={`/catalogue-image/${id}`} alt={alt} fill loader={catalogueImageLoader} sizes={sizes}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined}
      onLoad={() => { setLoaded(true); onReady?.(); }}
      onError={() => { setFailed(true); onFailure?.(); }} />
  </>;
}
