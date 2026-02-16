/**
 * Semantic token naming algorithms
 * Generates meaningful kebab-case names based on token characteristics
 * Uses culori for color hue/saturation analysis
 */

import { parse, oklch } from 'culori';

/**
 * Color cluster input for naming (simplified from ColorCluster)
 */
interface ColorClusterInput {
  canonical: string;
  variants: string[];
  occurrences: number;
}

/**
 * Typography token input for naming
 */
interface TypographyTokenInput {
  normalizedSize: { pixels: number };
  weight: number;
}

/**
 * Spacing token input for naming
 */
interface SpacingTokenInput {
  normalizedValue: { pixels: number };
}

/**
 * Motion token input for naming
 */
interface MotionTokenInput {
  property: string;
}

/**
 * Generate semantic color name using hue analysis
 * Classifies colors as neutral (low saturation) or by frequency/saturation
 *
 * @param cluster - Color cluster with canonical value and metadata
 * @param index - Position in sorted array
 * @param total - Total number of color clusters
 * @returns Semantic kebab-case name (e.g., "primary", "neutral-1", "accent")
 */
export function generateSemanticColorName(
  cluster: ColorClusterInput,
  index: number,
  _total: number
): string {
  const color = parse(cluster.canonical);

  if (!color) {
    // Fallback if color parsing fails
    return `color-${index + 1}`;
  }

  const oklchColor = oklch(color);

  if (!oklchColor) {
    return `color-${index + 1}`;
  }

  // Extract saturation (chroma in OKLch)
  const saturation = (oklchColor.c || 0) * 100; // Convert to percentage

  // Grays: saturation < 10%
  if (saturation < 10) {
    // Count how many grays we've seen so far
    const grayIndex = index; // Simplified: use position as gray number
    return `neutral-${grayIndex + 1}`;
  }

  // Saturated colors: classify by frequency
  // Most frequent = primary, second = secondary, third = accent, rest = color-N
  if (index === 0) {
    return 'primary';
  }
  if (index === 1) {
    return 'secondary';
  }
  if (index === 2) {
    return 'accent';
  }

  // Remaining colors get numeric names
  return `color-${index + 1}`;
}

/**
 * Generate semantic typography name based on size
 * First 20% = heading-N, next 30% = subheading-N, rest = body-N
 *
 * @param token - Typography token with normalized size
 * @param index - Position in size-sorted array (descending)
 * @param total - Total number of typography tokens
 * @returns Semantic kebab-case name (e.g., "heading-1", "body-2")
 */
export function generateSemanticTypographyName(
  _token: TypographyTokenInput,
  index: number,
  total: number
): string {
  const headingThreshold = Math.floor(total * 0.2);
  const subheadingThreshold = Math.floor(total * 0.5);

  if (index < headingThreshold) {
    return `heading-${index + 1}`;
  }

  if (index < subheadingThreshold) {
    const subheadingIndex = index - headingThreshold;
    return `subheading-${subheadingIndex + 1}`;
  }

  const bodyIndex = index - subheadingThreshold;
  return `body-${bodyIndex + 1}`;
}

/**
 * Generate semantic spacing name using t-shirt sizes
 * Maps to xs, sm, md, lg, xl, 2xl, 3xl; if more than 7, use numeric suffix
 *
 * @param token - Spacing token with normalized value
 * @param index - Position in size-sorted array (ascending)
 * @param total - Total number of spacing tokens
 * @returns Semantic kebab-case name (e.g., "spacing-sm", "spacing-xl")
 */
export function generateSemanticSpacingName(
  _token: SpacingTokenInput,
  index: number,
  _total: number
): string {
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

  if (index < sizes.length) {
    return `spacing-${sizes[index]}`;
  }

  // More than 7 sizes: use numeric suffix for extras
  return `spacing-${index + 1}`;
}

/**
 * Generate semantic radius name
 * sm/md/lg for <=3, else numeric
 *
 * @param index - Position in sorted array
 * @param total - Total number of radius tokens
 * @returns Semantic kebab-case name (e.g., "radius-sm", "radius-2")
 */
export function generateRadiusName(index: number, _total: number): string {
  if (_total <= 3) {
    const sizes = ['sm', 'md', 'lg'];
    return `radius-${sizes[index]}`;
  }

  return `radius-${index + 1}`;
}

/**
 * Generate semantic shadow name
 * sm/md/lg for <=3, else numeric
 *
 * @param index - Position in sorted array
 * @param total - Total number of shadow tokens
 * @returns Semantic kebab-case name (e.g., "shadow-md", "shadow-3")
 */
export function generateShadowName(index: number, _total: number): string {
  if (_total <= 3) {
    const sizes = ['sm', 'md', 'lg'];
    return `shadow-${sizes[index]}`;
  }

  return `shadow-${index + 1}`;
}

/**
 * Generate semantic motion name based on property type
 * duration-N or easing-N
 *
 * @param token - Motion token with property type
 * @param index - Position in sorted array
 * @returns Semantic kebab-case name (e.g., "duration-1", "easing-2")
 */
export function generateMotionName(token: MotionTokenInput, index: number): string {
  if (token.property === 'duration') {
    return `duration-${index + 1}`;
  }
  if (token.property === 'easing') {
    return `easing-${index + 1}`;
  }

  // Fallback for other motion properties
  return `motion-${index + 1}`;
}

/**
 * Convert semantic token name to CSS variable name
 * Simple helper: prepends "--" to create valid CSS custom property
 *
 * @param name - Semantic token name (e.g., "color-primary")
 * @returns CSS variable name (e.g., "--color-primary")
 */
export function generateTokenVarName(name: string): string {
  return `--${name}`;
}
