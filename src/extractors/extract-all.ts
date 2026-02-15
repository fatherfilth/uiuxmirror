/**
 * Convenience function to extract all token types from a page in parallel
 */

import type { Page } from 'playwright';
import type { PageTokens } from '../types/index.js';
import { extractColors } from './color-extractor.js';
import { extractTypography } from './typography-extractor.js';
import { extractSpacing } from './spacing-extractor.js';
import { extractCustomProperties } from './custom-properties-extractor.js';
import { extractRadii, extractShadows, extractZIndexes } from './radius-shadow-zindex-extractor.js';
import { extractMotionTokens } from './motion-extractor.js';
import { extractIconTokens } from './icon-extractor.js';
import { extractImageryTokens } from './imagery-extractor.js';

/**
 * Extract all token types from a page
 * Runs all extractors concurrently via Promise.all for better performance
 */
export async function extractAllTokens(page: Page, pageUrl: string): Promise<PageTokens> {
  const [
    colors,
    typography,
    spacing,
    customProperties,
    radii,
    shadows,
    zIndexes,
    motion,
    icons,
    imagery,
  ] = await Promise.all([
    extractColors(page, pageUrl),
    extractTypography(page, pageUrl),
    extractSpacing(page, pageUrl),
    extractCustomProperties(page, pageUrl),
    extractRadii(page, pageUrl),
    extractShadows(page, pageUrl),
    extractZIndexes(page, pageUrl),
    extractMotionTokens(page, pageUrl),
    extractIconTokens(page, pageUrl),
    extractImageryTokens(page, pageUrl),
  ]);

  return {
    colors,
    typography,
    spacing,
    customProperties,
    radii,
    shadows,
    zIndexes,
    motion,
    icons,
    imagery,
  };
}
