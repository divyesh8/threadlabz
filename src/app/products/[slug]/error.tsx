"use client";
import Link from "next/link";
import { useTransition } from "react";

export default function ProductError({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return <div className="status-page page-width"><h1>Let’s try that again.</h1><p role="alert">This product couldn’t be loaded.</p>
    <button type="button" className="retry-button" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => retry())}>{pending ? "Trying again…" : "Try again"}</button>
    <Link className="text-link" href="/shop">Back to the collection</Link></div>;
}
