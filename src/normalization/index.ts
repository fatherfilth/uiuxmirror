/**
 * Normalization module barrel export
 * Provides color deduplication, unit normalization, fuzzy matching, cross-page validation,
 * spacing scale detection, and the full normalization pipeline
 */

export { deduplicateColors } from './color-normalizer.js';
export type { ColorCluster } from '../types/normalized-tokens.js';

export {
  normalizeUnit,
  normalizeSpacingValues,
  normalizeTypographyValues,
} from './unit-normalizer.js';

export { fuzzyMatchTokens } from './fuzzy-matcher.js';

export {
  validateCrossPage,
  type CrossPageResult,
} from './cross-page-validator.js';

export {
  detectSpacingScale,
  type SpacingScale,
} from './spacing-scale-detector.js';

export {
  normalizePipeline,
  type NormalizationResult,
  type NormalizationOptions,
} from './normalize-pipeline.js';
