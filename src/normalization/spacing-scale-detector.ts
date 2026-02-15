/**
 * Spacing scale detection using GCD-based analysis
 * Identifies base unit and coverage for spacing values
 */

export interface SpacingScale {
  baseUnit: number;
  scale: number[];
  coverage: number; // 0-1, percentage of values that are exact multiples
}

/**
 * Calculates GCD of two numbers using Euclidean algorithm
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

/**
 * Calculates coverage for a given base unit
 */
function calculateCoverage(values: number[], baseUnit: number): number {
  if (values.length === 0) return 0;

  const exactMultiples = values.filter(v => v % baseUnit === 0).length;
  return exactMultiples / values.length;
}

/**
 * Detects spacing scale from an array of spacing values.
 * Uses GCD to find base unit, then tries common bases for better coverage.
 *
 * @param spacingValues - Array of spacing values (in pixels)
 * @returns SpacingScale with baseUnit, scale array, and coverage
 */
export function detectSpacingScale(spacingValues: number[]): SpacingScale {
  // Handle empty array
  if (spacingValues.length === 0) {
    return {
      baseUnit: 1,
      scale: [],
      coverage: 0
    };
  }

  // Round to integers and filter positive values
  const values = spacingValues
    .map(v => Math.round(v))
    .filter(v => v > 0);

  if (values.length === 0) {
    return {
      baseUnit: 1,
      scale: [],
      coverage: 0
    };
  }

  // Calculate GCD of all values
  let gcdValue = values[0];
  for (let i = 1; i < values.length; i++) {
    gcdValue = gcd(gcdValue, values[i]);
  }

  // Try to find meaningful base unit from common design scales
  // Prefer common bases (4, 8, 6, 10) over mathematical GCD if they have good coverage
  const commonBases = [4, 8, 6, 10];
  const candidateBases = [...commonBases, gcdValue];

  let bestBase = 1;
  let bestCoverage = 0;

  for (const base of candidateBases) {
    if (base < 1) continue;

    const coverage = calculateCoverage(values, base);

    // Prefer bases with better coverage, ties go to larger base (more meaningful scale)
    if (coverage > bestCoverage || (coverage === bestCoverage && base > bestBase)) {
      bestCoverage = coverage;
      bestBase = base;
    }
  }

  // If no base has reasonable coverage and GCD is useful, use it
  if (bestCoverage < 0.5 && gcdValue > 1) {
    bestBase = gcdValue;
    bestCoverage = calculateCoverage(values, gcdValue);
  }

  // If still no good base found, default to 1
  if (bestBase < 1) {
    bestBase = 1;
  }

  const baseUnit = bestBase;

  // Generate scale (unique multiples of baseUnit, sorted)
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
  const scale = uniqueValues.filter(v => v % baseUnit === 0);

  // Calculate final coverage
  // Special case: if baseUnit is 1, it means no meaningful scale was found
  // Report coverage as 0 to indicate poor scale detection
  let coverage = calculateCoverage(values, baseUnit);
  if (baseUnit === 1) {
    coverage = 0;
  }

  return {
    baseUnit,
    scale,
    coverage
  };
}
