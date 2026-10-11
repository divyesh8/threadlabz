import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return <span className={cn("brand-wordmark", className)} aria-label="ThreadLabz — Make Your Mark">
    <Image src="/brand/wordmark.png" width={1600} height={534} alt="ThreadLabz — Make Your Mark" priority />
  </span>;
}

export function Monogram({ className, loading = false }: { className?: string; loading?: boolean }) {
  return <span className={cn("monogram", loading && "monogram-loading", className)}>
    <Image src="/brand/monogram.png" width={1254} height={1254} alt={loading ? "Loading ThreadLabz" : "ThreadLabz monogram"} />
  </span>;
}
