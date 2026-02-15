/**
 * TOKEN-03: Spacing extractor
 * Extracts spacing tokens from margin, padding, and gap properties
 */

import type { Page } from 'playwright';
import type { SpacingToken } from '../types/tokens.js';
import { createLogger } from '../shared/logger.js';
import { getAllVisibleElements, parseSizeToPixels } from './shared/index.js';

const logger = createLogger('spacing-extractor');

/**
 * Extract spacing tokens from a page
 * Captures margin, padding, and gap values normalized to pixels
 */
export async function extractSpacing(page: Page, pageUrl: string): Promise<SpacingToken[]> {
  logger.info('Extracting spacing', { pageUrl });

  try {
    // Get all visible elements with computed styles
    const elements = await getAllVisibleElements(page);
    const timestamp = new Date().toISOString();

    // Map to store spacing by unique value+context for deduplication
    const spacingMap = new Map<string, SpacingToken>();

    for (const element of elements) {
      const { selector, computedStyles } = element;

      // Extract spacing properties with their contexts
      const spacingSources: Array<{
        property: string;
        value: string;
        context: SpacingToken['context'];
      }> = [
        // Margins
        { property: 'marginTop', value: computedStyles.marginTop, context: 'margin' },
        { property: 'marginRight', value: computedStyles.marginRight, context: 'margin' },
        { property: 'marginBottom', value: computedStyles.marginBottom, context: 'margin' },
        { property: 'marginLeft', value: computedStyles.marginLeft, context: 'margin' },
        // Paddings
        { property: 'paddingTop', value: computedStyles.paddingTop, context: 'padding' },
        { property: 'paddingRight', value: computedStyles.paddingRight, context: 'padding' },
        { property: 'paddingBottom', value: computedStyles.paddingBottom, context: 'padding' },
        { property: 'paddingLeft', value: computedStyles.paddingLeft, context: 'padding' },
        // Gaps
        { property: 'gap', value: computedStyles.gap, context: 'gap' },
        { property: 'rowGap', value: computedStyles.rowGap, context: 'gap' },
        { property: 'columnGap', value: computedStyles.columnGap, context: 'gap' },
      ];

      for (const source of spacingSources) {
        if (!source.value) continue;

        // Parse to pixels
        const valuePixels = parseSizeToPixels(source.value);
        if (valuePixels === null) continue; // Skip auto, inherit, etc.
        if (valuePixels === 0) continue; // Skip 0px values (not meaningful as tokens)

        // Filter out 'auto' margins explicitly
        if (source.value === 'auto') continue;

        // Create unique key for deduplication
        const key = `${valuePixels}-${source.context}`;
        const existing = spacingMap.get(key);

        if (existing) {
          // Merge evidence
          existing.evidence.push({
            pageUrl,
            selector,
            timestamp,
            computedStyles: {
              [source.property]: source.value,
            },
          });
        } else {
          // Create new spacing token
          spacingMap.set(key, {
            value: source.value,
            valuePixels,
            context: source.context,
            evidence: [
              {
                pageUrl,
                selector,
                timestamp,
                computedStyles: {
                  [source.property]: source.value,
                },
              },
            ],
          });
        }
      }
    }

    const spacing = Array.from(spacingMap.values());
    logger.info(`Extracted ${spacing.length} unique spacing tokens`, {
      pageUrl,
      count: spacing.length,
    });

    return spacing;
  } catch (error) {
    logger.error('Error extracting spacing', {
      pageUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Detect base unit from spacing tokens
 * Returns the most likely base unit (4, 8, 6, or 10) if 80%+ of values are multiples
 * Returns null if no clear base unit is found
 */
export function detectBaseUnit(tokens: SpacingToken[]): number | null {
  if (tokens.length === 0) return null;

  // Collect all unique pixel values
  const uniqueValues = new Set(tokens.map((t) => t.valuePixels));
  const values = Array.from(uniqueValues);

  // Try common base units
  const candidates = [4, 8, 6, 10];
  const threshold = 0.8; // 80% of values must be multiples

  for (const candidate of candidates) {
    const multiplesCount = values.filter((v) => v % candidate === 0).length;
    const ratio = multiplesCount / values.length;

    if (ratio >= threshold) {
      logger.info(`Detected base unit: ${candidate}px`, {
        ratio: ratio.toFixed(2),
        multiplesCount,
        totalValues: values.length,
      });
      return candidate;
    }
  }

  logger.info('No clear base unit detected');
  return null;
}
