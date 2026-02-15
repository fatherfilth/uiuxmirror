/**
 * Unit normalization for converting rem/em/pt/% to px
 * Preserves original values alongside normalized px values
 */

import type {
  NormalizedValue,
  NormalizedSpacingToken,
  NormalizedTypographyToken,
} from '../types/normalized-tokens.js';
import type { SpacingToken, TypographyToken } from '../types/tokens.js';

/**
 * Normalize a CSS unit value to pixels
 *
 * @param value - CSS value with unit (e.g., "1.5rem", "12pt", "16px")
 * @param baseFontSize - Base font size in px (default 16)
 * @param parentFontSize - Parent element font size for em calculations
 * @returns Normalized value with px conversion and metadata
 */
export function normalizeUnit(
  value: string,
  baseFontSize: number = 16,
  parentFontSize?: number
): NormalizedValue {
  // Parse value with regex: number + unit
  const match = value.match(/^([\d.]+)(px|rem|em|pt|%)$/);

  if (!match) {
    throw new Error(`Invalid value format: ${value}`);
  }

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);

  let pixels: number;

  switch (unit) {
    case 'px':
      pixels = num;
      break;

    case 'rem':
      pixels = num * baseFontSize;
      break;

    case 'em':
      // Use parent font size if provided, otherwise fall back to base
      pixels = num * (parentFontSize ?? baseFontSize);
      break;

    case 'pt':
      // Convert points to pixels: 1pt = 1/72 inch, 1px = 1/96 inch
      // Therefore: pt * (96/72) = px
      pixels = num * (96 / 72);
      break;

    case '%':
      // Percentage is context-dependent, for now treat as-is
      // This will need context-aware handling in future
      pixels = num;
      break;

    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }

  // Round to 2 decimal places
  pixels = Math.round(pixels * 100) / 100;

  const result: NormalizedValue = {
    pixels,
    original: value,
    unit: unit as 'px' | 'rem' | 'em' | 'pt' | '%',
  };

  // Include base font size for relative units
  if (unit === 'rem' || unit === 'em') {
    result.baseFontSize = baseFontSize;
  }

  return result;
}

/**
 * Normalize spacing token values to px
 */
export function normalizeSpacingValues(
  values: SpacingToken[],
  baseFontSize: number = 16
): NormalizedSpacingToken[] {
  return values.map((token) => ({
    ...token,
    normalizedValue: normalizeUnit(token.value, baseFontSize),
  }));
}

/**
 * Normalize typography token sizes to px
 */
export function normalizeTypographyValues(
  values: TypographyToken[],
  baseFontSize: number = 16
): NormalizedTypographyToken[] {
  return values.map((token) => ({
    ...token,
    normalizedSize: normalizeUnit(token.size, baseFontSize),
  }));
}
