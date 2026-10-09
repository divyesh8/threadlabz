/**
 * High-fidelity SVG Garment Mockup templates for THREADLAB.
 * Clean, modern vector silhouettes with realistic fabric folds, seams, collar depth,
 * and dynamic color fills. Ensures 100% offline reliability and crisp rendering at any resolution.
 */

export interface GarmentMockupProps {
  colorHex: string;
  view: 'front' | 'back';
  category?: string;
  className?: string;
}

export function getGarmentSvg(category: string, view: 'front' | 'back', colorHex: string): string {
  // Normalize color
  const color = colorHex || '#111215';

  if (category === 'hoodies') {
    if (view === 'front') {
      return `
      <svg viewBox="0 0 500 560" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Hoodie Body -->
        <path d="M160 90 L80 180 L115 220 L155 175 L155 480 L345 480 L345 175 L385 220 L420 180 L340 90 Z" fill="${color}" stroke="#1e2025" stroke-width="2"/>
        <!-- Hood Silhouette -->
        <path d="M160 90 C160 30, 200 20, 250 20 C300 20, 340 30, 340 90 C340 135, 300 150, 250 150 C200 150, 160 135, 160 90 Z" fill="${color}" stroke="#1e2025" stroke-width="2"/>
        <!-- Hood Inner / Neckline -->
        <path d="M210 95 C220 120, 280 120, 290 95 C305 130, 195 130, 210 95 Z" fill="#000000" opacity="0.25"/>
        <!-- Drawstrings -->
        <path d="M225 125 Q225 180 220 205" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
        <path d="M275 125 Q275 180 280 205" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
        <!-- Kangaroo Pocket -->
        <path d="M185 360 L315 360 L335 440 L165 440 Z" fill="${color}" stroke="#18191c" stroke-width="2"/>
        <path d="M185 360 Q170 400 165 440" stroke="#000000" stroke-width="1.5" opacity="0.3"/>
        <path d="M315 360 Q330 400 335 440" stroke="#000000" stroke-width="1.5" opacity="0.3"/>
        <!-- Ribbed Bottom Hem -->
        <rect x="155" y="470" width="190" height="20" rx="2" fill="${color}" stroke="#1e2025" stroke-width="1.5"/>
        <!-- Ribbed Cuffs -->
        <path d="M80 180 L115 220 L105 232 L70 192 Z" fill="${color}" opacity="0.9"/>
        <path d="M420 180 L385 220 L395 232 L430 192 Z" fill="${color}" opacity="0.9"/>
        <!-- Fabric Shadows & Highlights -->
        <path d="M155 175 C180 220, 180 340, 175 460" stroke="#000000" stroke-width="2" opacity="0.15"/>
        <path d="M345 175 C320 220, 320 340, 325 460" stroke="#000000" stroke-width="2" opacity="0.15"/>
      </svg>
      `;
    } else {
      // Back Hoodie
      return `
      <svg viewBox="0 0 500 560" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Body Back -->
        <path d="M160 90 L80 180 L115 220 L155 175 L155 480 L345 480 L345 175 L385 220 L420 180 L340 90 Z" fill="${color}" stroke="#1e2025" stroke-width="2"/>
        <!-- Fallen Hood (Back View) -->
        <path d="M175 90 C175 40, 325 40, 325 90 C325 155, 175 155, 175 90 Z" fill="${color}" stroke="#1e2025" stroke-width="2"/>
        <path d="M200 130 C220 150, 280 150, 300 130" stroke="#000000" stroke-width="2" opacity="0.2"/>
        <!-- Ribbed Bottom Hem -->
        <rect x="155" y="470" width="190" height="20" rx="2" fill="${color}" stroke="#1e2025" stroke-width="1.5"/>
        <!-- Ribbed Cuffs -->
        <path d="M80 180 L115 220 L105 232 L70 192 Z" fill="${color}" opacity="0.9"/>
        <path d="M420 180 L385 220 L395 232 L430 192 Z" fill="${color}" opacity="0.9"/>
        <!-- Back center seam subtle indicator -->
        <line x1="250" y1="160" x2="250" y2="470" stroke="#000000" stroke-width="1" stroke-dasharray="4 4" opacity="0.15"/>
      </svg>
      `;
    }
  }

  // Default: T-Shirt / Oversized Tee / Sweatshirt
  if (view === 'front') {
    return `
    <svg viewBox="0 0 500 540" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
      <!-- T-Shirt Body & Sleeves -->
      <path d="M170 70 L95 140 L130 180 L165 145 L165 470 L335 470 L335 145 L370 180 L405 140 L330 70 C310 95, 190 95, 170 70 Z" fill="${color}" stroke="#1f2228" stroke-width="2"/>
      <!-- Ribbed Crewneck Collar -->
      <path d="M170 70 C190 105, 310 105, 330 70 C312 88, 188 88, 170 70 Z" fill="${color}" stroke="#1b1c20" stroke-width="2"/>
      <path d="M190 73 C210 95, 290 95, 310 73" stroke="#000000" stroke-width="1.5" opacity="0.25"/>
      <!-- Sleeve Seams -->
      <path d="M165 145 C150 115, 140 100, 125 90" stroke="#000000" stroke-width="1.5" opacity="0.2"/>
      <path d="M335 145 C350 115, 360 100, 375 90" stroke="#000000" stroke-width="1.5" opacity="0.2"/>
      <!-- Side Contours & Fabric Folds -->
      <path d="M165 160 C175 240, 175 380, 168 460" stroke="#000000" stroke-width="2" opacity="0.12"/>
      <path d="M335 160 C325 240, 325 380, 332 460" stroke="#000000" stroke-width="2" opacity="0.12"/>
      <!-- Bottom Hem Stitch -->
      <line x1="168" y1="462" x2="332" y2="462" stroke="#000000" stroke-width="1" stroke-dasharray="3 3" opacity="0.2"/>
    </svg>
    `;
  } else {
    // T-Shirt Back View
    return `
    <svg viewBox="0 0 500 540" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
      <!-- T-Shirt Body & Sleeves (Back) -->
      <path d="M170 70 L95 140 L130 180 L165 145 L165 470 L335 470 L335 145 L370 180 L405 140 L330 70 C300 78, 200 78, 170 70 Z" fill="${color}" stroke="#1f2228" stroke-width="2"/>
      <!-- High Back Collar -->
      <path d="M170 70 C200 80, 300 80, 330 70 C310 75, 190 75, 170 70 Z" fill="${color}" stroke="#1b1c20" stroke-width="2"/>
      <!-- Subtle Back Yoke Stitch -->
      <path d="M166 125 C210 135, 290 135, 334 125" stroke="#000000" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.2"/>
      <!-- Sleeve Seams -->
      <path d="M165 145 C150 115, 140 100, 125 90" stroke="#000000" stroke-width="1.5" opacity="0.2"/>
      <path d="M335 145 C350 115, 360 100, 375 90" stroke="#000000" stroke-width="1.5" opacity="0.2"/>
      <!-- Bottom Hem Stitch -->
      <line x1="168" y1="462" x2="332" y2="462" stroke="#000000" stroke-width="1" stroke-dasharray="3 3" opacity="0.2"/>
    </svg>
    `;
  }
}
