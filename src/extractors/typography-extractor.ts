/**
 * TOKEN-02: Typography extractor
 * Extracts typography tokens: font families, sizes, weights, line-heights
 */

import type { Page } from 'playwright';
import type { TypographyToken } from '../types/tokens.js';
import { createLogger } from '../shared/logger.js';
import { getAllVisibleElements, parseSizeToPixels } from './shared/index.js';

const logger = createLogger('typography-extractor');

/**
 * Extract typography tokens from a page
 * Captures font families, sizes (px-normalized), weights, line-heights with evidence
 */
export async function extractTypography(page: Page, pageUrl: string): Promise<TypographyToken[]> {
  logger.info('Extracting typography', { pageUrl });

  try {
    // Get all visible elements with computed styles
    const elements = await getAllVisibleElements(page);
    const timestamp = new Date().toISOString();

    // Check which elements have text content
    const elementsWithText = await page.evaluate((selectors) => {
      const results: Record<string, boolean> = {};
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.trim().length > 0) {
            results[selector] = true;
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
      return results;
    }, elements.map((el) => el.selector));

    // Map to store typography by unique combination for deduplication
    const typographyMap = new Map<string, TypographyToken>();

    for (const element of elements) {
      const { selector, computedStyles } = element;

      // Skip elements without text content
      if (!elementsWithText[selector]) continue;

      const fontFamily = computedStyles.fontFamily;
      const fontSize = computedStyles.fontSize;
      const fontWeight = computedStyles.fontWeight;
      const lineHeight = computedStyles.lineHeight;
      const letterSpacing = computedStyles.letterSpacing;

      if (!fontFamily || !fontSize || !fontWeight) continue;

      // Parse size to pixels
      const sizePixels = parseSizeToPixels(fontSize);
      if (sizePixels === null) continue;

      // Parse weight to number
      let weightNum: number;
      if (fontWeight === 'normal') {
        weightNum = 400;
      } else if (fontWeight === 'bold') {
        weightNum = 700;
      } else {
        weightNum = parseInt(fontWeight, 10);
        if (isNaN(weightNum)) continue;
      }

      // Strip quotes from font family
      const family = fontFamily.replace(/['"]/g, '');

      // Create unique key for deduplication
      const key = `${family}-${sizePixels}-${weightNum}`;
      const existing = typographyMap.get(key);

      if (existing) {
        // Merge evidence
        existing.evidence.push({
          pageUrl,
          selector,
          timestamp,
          computedStyles: {
            fontFamily,
            fontSize,
            fontWeight,
            lineHeight,
            letterSpacing,
          },
        });
      } else {
        // Create new typography token
        typographyMap.set(key, {
          family,
          size: fontSize,
          sizePixels,
          weight: weightNum,
          lineHeight,
          letterSpacing,
          evidence: [
            {
              pageUrl,
              selector,
              timestamp,
              computedStyles: {
                fontFamily,
                fontSize,
                fontWeight,
                lineHeight,
                letterSpacing,
              },
            },
          ],
        });
      }
    }

    const typography = Array.from(typographyMap.values());
    logger.info(`Extracted ${typography.length} unique typography tokens`, {
      pageUrl,
      count: typography.length,
    });

    return typography;
  } catch (error) {
    logger.error('Error extracting typography', {
      pageUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
