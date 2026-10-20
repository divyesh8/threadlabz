import { Ruler, Truck, RotateCcw, Plus } from "lucide-react";
import type { ProductDetails, SizeGuide } from "../schemas/product-details";
import type { ShoppingPolicies } from "../schemas/delivery";
import { ProductDialog } from "./product-dialog";

export function ProductSizeGuide({ guide, name }: { guide: SizeGuide | null; name: string }) {
  if (!guide) return <span className="size-guide-unavailable">Size guide not supplied</span>;
  return <ProductDialog title="Size guide" className="size-guide-link" trigger={<><Ruler size={16} aria-hidden="true" /> Size guide</>}>
    <div className="size-guide-content">
      <p className="eyebrow">{name}</p>
      <p className="size-guide-intro">{guide.kind === "garment" ? "Garment measurements" : "Body measurements"} · {guide.unit === "cm" ? "Centimetres (cm)" : "Inches (in)"}</p>
      <p className="pdp-copy">{guide.instructions}</p>
      <div className="size-table-scroll" tabIndex={0} role="region" aria-label="Size measurements, scroll horizontally if needed">
        <table className="size-table">
          <caption>{name} — {guide.kind} measurements in {guide.unit}</caption>
          <thead><tr><th scope="col">Size</th>{guide.columns.map(column => <th scope="col" key={column}>{column} ({guide.unit})</th>)}</tr></thead>
          <tbody>{guide.rows.map(row => <tr key={row.size}><th scope="row">{row.size}</th>{row.values.map((value, index) => <td key={guide.columns[index]}>{value}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="pdp-caption">Measurements apply to this product. Only supplied sizes are listed.</p>
    </div>
  </ProductDialog>;
}

export function ProductInformation({ description, details }: { description: string | null; details: ProductDetails }) {
  const fit = details.fit || details.model;
  return <div className="pdp-details">
    {description && <div className="pdp-about"><h2>About this piece</h2><p className="pdp-copy">{description}</p></div>}
    {details.materials && <details className="pdp-disclosure" open><summary>Material & fabric <Plus size={16} aria-hidden="true" /></summary><p className="pdp-copy">{details.materials}</p></details>}
    {fit && <details className="pdp-disclosure"><summary>Size & fit <Plus size={16} aria-hidden="true" /></summary>
      {details.fit && <p className="pdp-copy">{details.fit}</p>}
      {details.model && <p className="pdp-copy">Model is {details.model.height_cm} cm tall and wears size {details.model.wears_size}.</p>}
    </details>}
    {details.care && <details className="pdp-disclosure"><summary>Care instructions <Plus size={16} aria-hidden="true" /></summary><p className="pdp-copy">{details.care}</p></details>}
    {details.specifications.length > 0 && <details className="pdp-disclosure"><summary>Product details <Plus size={16} aria-hidden="true" /></summary>
      <dl className="pdp-specifications">{details.specifications.map(spec => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl>
    </details>}
    {!description && !details.materials && !details.care && !fit && !details.specifications.length && <p className="pdp-copy pdp-about">Further product details have not been supplied.</p>}
  </div>;
}

export function ProductPolicies({ policies }: { policies: ShoppingPolicies }) {
  return <section className="pdp-policies" aria-label="Delivery and returns">
    <div><Truck size={19} strokeWidth={1.5} aria-hidden="true" /><div><h2>Delivery</h2>
      <p>{policies.delivery?.summary || "Delivery charges and serviceable locations have not been confirmed."}</p>
      {policies.delivery?.url && <a className="text-link" href={policies.delivery.url}>Read delivery policy</a>}
    </div></div>
    <div><RotateCcw size={19} strokeWidth={1.5} aria-hidden="true" /><div><h2>Returns</h2>
      <p>{policies.returns?.summary || "Return and exchange terms have not been published."}</p>
      {policies.returns?.url && <a className="text-link" href={policies.returns.url}>Read returns policy</a>}
    </div></div>
    <p className="pdp-caption">PIN-code delivery checks are not available yet.</p>
  </section>;
}
