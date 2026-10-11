export default function LoadingShop() {
  return <div className="page-width shop-page" role="status" aria-label="Loading collection"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-line" /><div className="product-grid">{Array.from({ length: 8 }, (_, i) => <div key={i}><div className="product-image skeleton" /><div className="skeleton skeleton-line" /></div>)}</div><span className="sr-only">Loading collection…</span></div>;
}
