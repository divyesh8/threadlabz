"use client";

import { useState } from "react";
import Image from "next/image";

export function CatalogueImage({ id, alt }: { id: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="catalogue-image-empty">Image unavailable</div> : <Image src={`/catalogue-image/${id}`} alt={alt} fill unoptimized sizes="(max-width: 640px) 45vw, 25vw" onError={() => setFailed(true)} />;
}
