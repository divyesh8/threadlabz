"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function AdminImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const [failed, setFailed] = useState(false);
  const local = /^\/(?:placeholders|images|brand)\/[a-zA-Z0-9_./-]+$/.test(src) && !src.includes("..");
  const remote = !local && src.length > 0 && src.length <= 1000 && !/[\u0000-\u001f]/.test(src);
  if (failed || (!local && !remote)) return <span className="catalogue-image-empty">Image unavailable</span>;
  return <Image {...props} src={local ? src : `/admin/media?source=${encodeURIComponent(src)}`} alt={alt} unoptimized onError={() => setFailed(true)} />;
}
