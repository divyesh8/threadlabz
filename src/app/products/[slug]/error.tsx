"use client";
import Link from "next/link";
export default function ProductError({ reset }: { reset: () => void }) {
  return <div className="status-page page-width"><h1>Let’s try that again.</h1><p role="alert">This product couldn’t be loaded.</p><button type="button" className="retry-button" onClick={reset}>Try again</button><Link className="text-link" href="/shop">Back to the collection</Link></div>;
}
