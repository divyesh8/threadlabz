"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="status-page"><p className="eyebrow">A little snag</p><h1>Let’s try that again.</h1><p>We couldn’t load this page. Give it another go.</p><Button onClick={reset}>Try again</Button></div>;
}
