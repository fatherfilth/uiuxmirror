/**
 * Normalized token type definitions for UIUX-Mirror Phase 2
 * Implements normalization types for deduplication and unit conversion
 */

import type { ColorToken, TypographyToken, SpacingToken } from './tokens.js';
import type { TokenEvidence } from './evidence.js';

/**
 * Normalized value with px conversion alongside original value
 */
export interface NormalizedValue {
  pixels: number;              // Converted to px
  original: string;            // Original value (e.g., "1.5rem", "12pt")
  unit: 'px' | 'rem' | 'em' | 'pt' | '%';
  baseFontSize?: number;       // Used for relative units (rem/em)
}

/**
 * Color cluster from CIEDE2000 deduplication
 * Groups perceptually similar colors (deltaE < threshold)
 */
export interface ColorCluster {
  canonical: string;           // Representative color (usually most frequent)
  variants: string[];          // All color values in this cluster
  evidence: TokenEvidence[];   // Merged evidence from all variants
  occurrences: number;         // Total usage count across all variants
}

/**
 * Normalized color token with cluster information
 */
export interface NormalizedColorToken extends ColorToken {
  cluster: ColorCluster;
  confidence?: number;         // 0-1, based on occurrences
}

/**
 * Normalized typography token with px-converted size
 */
export interface NormalizedTypographyToken extends TypographyToken {
  normalizedSize: NormalizedValue;
}

/**
 * Normalized spacing token with px-converted value
 */
export interface NormalizedSpacingToken extends SpacingToken {
  normalizedValue: NormalizedValue;
}

/**
 * Token with frequency tracking across pages
 */
export interface TokenWithFrequency<T> {
  token: T;
  pageUrls: Set<string>;       // Pages where this token appears
  occurrenceCount: number;     // Total times token appears
  confidence: number;          // 0-1, calculated from frequency
}
