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
 * Uses GCD to find base unit, then validates with common bases if GCD is 1.
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
  let baseUnit = values[0];
  for (let i = 1; i < values.length; i++) {
    baseUnit = gcd(baseUnit, values[i]);
  }

  // If GCD is 1 and we have multiple values, try common bases
  if (baseUnit === 1 && values.length > 3) {
    const commonBases = [4, 8, 6, 10];
    let bestBase = 1;
    let bestCoverage = 0;

    for (const base of commonBases) {
      const coverage = calculateCoverage(values, base);
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestBase = base;
      }
    }

    // Only use common base if coverage is good enough (>50%)
    if (bestCoverage >= 0.5) {
      baseUnit = bestBase;
    }
  }

  // Generate scale (unique multiples of baseUnit, sorted)
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
  const scale = uniqueValues.filter(v => v % baseUnit === 0);

  // Calculate final coverage
  const coverage = calculateCoverage(values, baseUnit);

  return {
    baseUnit,
    scale,
    coverage
  };
}
