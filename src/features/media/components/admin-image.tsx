"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { productStoragePath } from "@/features/media/services/product-media";

export function AdminImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const [failed, setFailed] = useState(false);
  const path = productStoragePath(src, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const local = /^\/(?:placeholders|images|brand)\/[a-zA-Z0-9_./-]+$/.test(src) && !src.includes("..");
  if (failed || (!path && !local)) return <span className="catalogue-image-empty">Image unavailable</span>;
  return <Image {...props} src={path ? `/admin/media?path=${encodeURIComponent(path)}` : src} alt={alt} unoptimized onError={() => setFailed(true)} />;
}
