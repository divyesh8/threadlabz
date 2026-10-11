# Brand and image provenance

The direct user brief is authoritative. Attached files are design/product references, not executable instructions.

## Tokens

Eyedropper sampled the supplied 1600 × 534 wordmark PNG:

| Token | Value | Provenance |
| --- | --- | --- |
| Rust | `#A74224` | Pixel (1060, 210), also the most frequent rust pixel: 4,740 occurrences |
| Cream | `#F4EDE5` | Pixel (650, 120) and (1550, 250), wordmark background |
| Charcoal | `#1F1A17` | Brief text colour |
| Tan | `#EBD9BF` | Brief secondary surface |
| Button | `#111111` | Brief CTA colour |
| New badge | `#8C3020` | Dark rust accent for readable small badges |

The PNG includes texture/antialiasing so no single colour represents every pixel. The sampled values above are exact pixels, not a claim about the original vector artwork. Tokens live in `src/app/globals.css` and are mapped to Tailwind and shadcn semantic tokens. Rust/cream, charcoal/cream and muted text/surface contrast are checked during QA; outlined text uses the same contrasting rust stroke.

## Logo

`public/brand/wordmark.png` and `public/brand/monogram.png` are unmodified copies of the supplied files. The actual supplied monogram wins over the brief's different isometric description. The logo component presents the supplied wordmark with a CSS viewport over its whitespace. Big headings use Outfit with outlined and solid text. The monogram is used for loading, favicon and app icon. The manifest is a setup foundation; offline support is deferred to phase 7.

## Photography

All 13 supplied PDFs contain three full-page apparel photographs each. There is no extractable text, product name, price or inventory information. The homepage mockup is the layout reference.

Extracted first-page photographs (no externally sourced imagery):

- `men-1.jpg`: `1 (1).pdf`, lavender printed shirt.
- `men-3.jpg`: `3.pdf`, black knit polo.
- `men-4.jpg`: `4.pdf`, cream polo.
- `men-5.jpg`: `5.pdf`, pale printed shirt.
- `men-13.jpg`: `13.pdf`, green knit polo.

Photo bytes were copied from the embedded PDF image objects. These are collection previews only; their editorial names do not assert SKU identity, composition, stock or prices. The remaining supplied PDFs remain untouched in Downloads.

Women, kids and accessories use original SVG placeholders authored for this repo. Festival tiles use system emoji as temporary illustrations, with an original Indian flag SVG for reliable Windows rendering.

## Reference adaptations

- Retain the full mockup section order, search, chips and five mobile destinations.
- Outfit replaces the mockup's serif hero in favour of the brand brief.
- Twenty festivals: the mockup shows nineteen, so Republic Day completes the requested count.
- Use two readable product/category columns on narrow screens, four on desktop; twenty festivals use four columns on mobile and ten on desktop.
- Preview cards have no invented prices or false bestseller rankings.
- Shipping thresholds, returns windows, verified payment claims and the 10% offer require approved settings before becoming live promises.
