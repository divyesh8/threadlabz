import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="status-page"><p className="eyebrow">404 / Out of the loop</p><h1>This thread’s gone missing.</h1><p>There’s plenty more to explore back home.</p><Button asChild><Link href="/">Back to the good stuff</Link></Button></div>;
}
