"use client";

import { useState } from "react";
import Image from "next/image";
import { CameraOff } from "lucide-react";

export function PhotoUnavailable() {
  return <div className="catalogue-image-empty"><CameraOff size={26} strokeWidth={1} aria-hidden="true" /><span>Photography<br />unavailable</span></div>;
}

export function CatalogueImage({ id, alt, sizes = "(max-width: 760px) 45vw, 25vw", priority = false }: { id: string; alt: string; sizes?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <PhotoUnavailable /> : <Image src={`/catalogue-image/${id}`} alt={alt} fill unoptimized sizes={sizes} loading={priority ? "eager" : "lazy"} onError={() => setFailed(true)} />;
}
