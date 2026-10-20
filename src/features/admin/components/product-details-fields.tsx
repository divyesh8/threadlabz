"use client";

import type { ProductDetails, SizeGuide } from "@/features/catalogue/schemas/product-details";

const inputClass = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white";
const labelClass = "block text-sm font-medium mb-2";
const buttonClass = "min-h-11 border border-stone-300 rounded-lg px-3 text-sm";

export function ProductDetailsFields({ value, onChange, sizes, disabled }: {
  value: ProductDetails; onChange: (value: ProductDetails) => void; sizes: string[]; disabled: boolean;
}) {
  const guide = value.size_guide;
  const updateGuide = (next: SizeGuide) => onChange({ ...value, size_guide: next });
  const uniqueSizes = [...new Set(sizes.filter(Boolean))];
  return <fieldset disabled={disabled} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 min-w-0">
    <legend className="text-lg font-semibold px-2">Verified product information</legend>
    <p className="text-sm text-stone-600">Optional. Enter only facts checked against this garment, its label or approved supplier measurements. Empty fields are hidden on the product page. Never estimate measurements from a photograph.</p>
    <div className="grid gap-6 md:grid-cols-2">
      <label className={labelClass}>Material & fabric composition
        <textarea className={`${inputClass} mt-2`} rows={4} maxLength={1600} value={value.materials} onChange={e => onChange({ ...value, materials: e.target.value })} />
      </label>
      <label className={labelClass}>Garment-care instructions
        <textarea className={`${inputClass} mt-2`} rows={4} maxLength={1600} value={value.care} onChange={e => onChange({ ...value, care: e.target.value })} />
      </label>
    </div>
    <label className={labelClass}>Fit description (requires the measured size guide below)
      <textarea className={`${inputClass} mt-2`} rows={2} maxLength={800} value={value.fit} onChange={e => onChange({ ...value, fit: e.target.value })} />
    </label>
    <div className="border-t border-stone-200 pt-5 space-y-4">
      <label className="flex items-center gap-3 min-h-11 text-sm font-medium">
        <input type="checkbox" checked={!!value.model} onChange={e => onChange({ ...value, model: e.target.checked ? { height_cm: 0, wears_size: "" } : null })} />
        Include verified model information
      </label>
      {value.model && <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Model height (cm)
          <input className={inputClass} required type="number" step="0.1" min="1" max="300" value={value.model.height_cm || ""} onChange={e => onChange({ ...value, model: { ...value.model!, height_cm: Number(e.target.value) } })} />
        </label>
        <label className={labelClass}>Size worn in this product&apos;s photographs
          <select className={inputClass} required value={value.model.wears_size} onChange={e => onChange({ ...value, model: { ...value.model!, wears_size: e.target.value } })}>
            <option value="">Select verified size</option>{uniqueSizes.map(size => <option key={size}>{size}</option>)}
          </select>
        </label>
      </div>}
    </div>
    <div className="border-t border-stone-200 pt-5 space-y-4">
      <h3 className="font-medium text-sm">Product specifications</h3>
      {value.specifications.map((spec, index) => <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]" key={index}>
        <label className={labelClass}>Label {index + 1}<input className={inputClass} required maxLength={60} value={spec.label} onChange={e => onChange({ ...value, specifications: value.specifications.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} /></label>
        <label className={labelClass}>Value {index + 1}<input className={inputClass} required maxLength={400} value={spec.value} onChange={e => onChange({ ...value, specifications: value.specifications.map((item, i) => i === index ? { ...item, value: e.target.value } : item) })} /></label>
        <button type="button" className={buttonClass} aria-label={`Remove specification ${index + 1}`} onClick={() => onChange({ ...value, specifications: value.specifications.filter((_, i) => i !== index) })}>Remove</button>
      </div>)}
      <button type="button" className={buttonClass} disabled={value.specifications.length >= 12} onClick={() => onChange({ ...value, specifications: [...value.specifications, { label: "", value: "" }] })}>Add specification</button>
    </div>
    <div className="border-t border-stone-200 pt-5 space-y-4">
      <label className="flex items-center gap-3 min-h-11 text-sm font-medium">
        <input type="checkbox" checked={!!guide} onChange={e => onChange({ ...value, size_guide: e.target.checked ? { unit: "cm", kind: "garment", instructions: "", columns: [""], rows: [] } : null })} />
        Include a product-specific size guide
      </label>
      {guide && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Measurement unit<select className={inputClass} value={guide.unit} onChange={e => updateGuide({ ...guide, unit: e.target.value as SizeGuide["unit"] })}><option value="cm">Centimetres (cm)</option><option value="in">Inches (in)</option></select></label>
          <label className={labelClass}>Measurement type<select className={inputClass} value={guide.kind} onChange={e => updateGuide({ ...guide, kind: e.target.value as SizeGuide["kind"] })}><option value="garment">Garment measurements</option><option value="body">Body measurements</option></select></label>
        </div>
        <p className="text-xs text-stone-600">Changing the unit does not convert values. Enter verified measurements in the selected unit. For a different cut or colour, use a separate product if its measurements differ.</p>
        <label className={labelClass}>How these measurements were taken
          <textarea className={inputClass} required rows={3} maxLength={1200} value={guide.instructions} onChange={e => updateGuide({ ...guide, instructions: e.target.value })} />
        </label>
        <div className="space-y-3">{guide.columns.map((column, index) => <div className="flex items-end gap-3" key={index}>
          <label className={`${labelClass} flex-1`}>Measurement label {index + 1}<input className={inputClass} required maxLength={60} value={column} onChange={e => updateGuide({ ...guide, columns: guide.columns.map((item, i) => i === index ? e.target.value : item) })} /></label>
          <button type="button" className={buttonClass} disabled={guide.columns.length <= 1} aria-label={`Remove measurement ${index + 1}`} onClick={() => updateGuide({ ...guide, columns: guide.columns.filter((_, i) => i !== index), rows: guide.rows.map(row => ({ ...row, values: row.values.filter((_, i) => i !== index) })) })}>Remove</button>
        </div>)}</div>
        <button type="button" className={buttonClass} disabled={guide.columns.length >= 6} onClick={() => updateGuide({ ...guide, columns: [...guide.columns, ""], rows: guide.rows.map(row => ({ ...row, values: [...row.values, 0] })) })}>Add measurement column</button>
        {guide.rows.map((row, rowIndex) => <div className="border border-stone-200 rounded-lg p-4 space-y-3" key={rowIndex}>
          <div className="flex gap-3 items-end">
            <label className={`${labelClass} flex-1`}>Measured size {rowIndex + 1}
              <select className={inputClass} required value={row.size} onChange={e => updateGuide({ ...guide, rows: guide.rows.map((item, i) => i === rowIndex ? { ...item, size: e.target.value } : item) })}>
                <option value="">Select size</option>{uniqueSizes.map(size => <option key={size}>{size}</option>)}
              </select>
            </label>
            <button type="button" className={buttonClass} aria-label={`Remove measured size ${rowIndex + 1}`} onClick={() => updateGuide({ ...guide, rows: guide.rows.filter((_, i) => i !== rowIndex) })}>Remove</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">{guide.columns.map((column, columnIndex) => <label className={labelClass} key={columnIndex}>
            {column || `Measurement ${columnIndex + 1}`} for {row.size || `row ${rowIndex + 1}`} ({guide.unit})
            <input className={inputClass} type="number" required min="0.01" max="500" step="0.01" value={row.values[columnIndex] || ""}
              onChange={e => updateGuide({ ...guide, rows: guide.rows.map((item, i) => i === rowIndex ? { ...item, values: item.values.map((value, j) => j === columnIndex ? Number(e.target.value) : value) } : item) })} />
          </label>)}</div>
        </div>)}
        <button type="button" className={buttonClass} disabled={guide.rows.length >= 30} onClick={() => updateGuide({ ...guide, rows: [...guide.rows, { size: "", values: guide.columns.map(() => 0) }] })}>Add measured size</button>
      </>}
    </div>
  </fieldset>;
}
