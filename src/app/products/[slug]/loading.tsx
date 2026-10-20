import "@/features/catalogue/components/product-detail.css";

export default function LoadingProduct() {
  return <div className="pdp-view"><div className="page-width product-page" role="status" aria-label="Loading product">
    <div className="skeleton skeleton-line" aria-hidden="true" />
    <div className="product-layout" aria-hidden="true">
      <div className="product-heading skeleton skeleton-title" />
      <div className="product-gallery"><div className="gallery-main skeleton" /></div>
      <div className="product-information skeleton skeleton-details" />
    </div><span className="sr-only">Loading product…</span>
  </div></div>;
}
