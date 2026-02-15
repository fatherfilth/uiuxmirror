/**
 * Barrel export for all token extractors
 * Provides single-import access to all extraction functions
 */

// Token extractors - Plan 04
export { extractColors } from './color-extractor.js';
export { extractTypography } from './typography-extractor.js';
export { extractSpacing, detectBaseUnit } from './spacing-extractor.js';
export { extractCustomProperties } from './custom-properties-extractor.js';

// Token extractors - Plan 05
export { extractRadii, extractShadows, extractZIndexes } from './radius-shadow-zindex-extractor.js';
export { extractMotionTokens } from './motion-extractor.js';
export { extractIconTokens } from './icon-extractor.js';
export { extractImageryTokens } from './imagery-extractor.js';

// Shared utilities
export {
  getAllVisibleElements,
  parseColorToHex,
  parseSizeToPixels,
  filterBrowserDefaults,
  type ExtractedElement,
} from './shared/index.js';

// Convenience: extract all tokens from a page
export { extractAllTokens } from './extract-all.js';
