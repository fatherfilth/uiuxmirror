/**
 * Normalization module barrel export
 * Provides color deduplication, unit normalization, and fuzzy matching utilities
 */

export { deduplicateColors } from './color-normalizer.js';
export type { ColorCluster } from '../types/normalized-tokens.js';

export {
  normalizeUnit,
  normalizeSpacingValues,
  normalizeTypographyValues,
} from './unit-normalizer.js';

export { fuzzyMatchTokens } from './fuzzy-matcher.js';
