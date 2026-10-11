export default function LoadingProduct() {
  return <div className="page-width product-page" role="status" aria-label="Loading product"><div className="skeleton skeleton-line" /><div className="product-layout"><div className="product-heading skeleton skeleton-title" /><div className="gallery-main skeleton" /><div className="skeleton skeleton-details" /></div><span className="sr-only">Loading product…</span></div>;
}
