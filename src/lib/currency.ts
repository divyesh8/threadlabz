/**
 * Utility functions for precise Indian Rupee (INR) monetary calculations and formatting.
 * All internal money is stored as integer paise (1 Rupee = 100 paise) to prevent floating-point drift.
 */

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format paise into Indian Rupee currency format (e.g. ₹1,499, ₹799, ₹24,999)
 * Uses Indian number grouping (lakhs and crores).
 */
export function formatINR(paise: number, includeDecimalsIfNonZero: boolean = true): string {
  const rupees = paise / 100;

  // For whole rupee amounts, do not show .00
  const hasDecimals = rupees % 1 !== 0;

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals && includeDecimalsIfNonZero ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(rupees);
}

/**
 * Format raw integer rupee amount directly
 */
export function formatRupees(rupees: number): string {
  return formatINR(rupeesToPaise(rupees));
}
