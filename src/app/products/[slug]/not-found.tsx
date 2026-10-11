import Link from "next/link";
export default function ProductNotFound() {
  return <div className="status-page page-width"><p className="eyebrow">The collection</p><h1>This piece isn’t available.</h1><p>The product may no longer be published, or the link may be incorrect.</p><Link className="text-link" href="/shop">Explore the collection →</Link></div>;
}
