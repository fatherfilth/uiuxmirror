/**
 * TOKEN-01: Color extractor
 * Extracts color tokens from background, text, border, and accent contexts
 */

import type { Page } from 'playwright';
import type { ColorToken } from '../types/tokens.js';
import { createLogger } from '../shared/logger.js';
import { getAllVisibleElements, parseColorToHex } from './shared/index.js';

const logger = createLogger('color-extractor');

/**
 * Extract color tokens from a page
 * Captures background, text, border, and accent colors with evidence
 */
export async function extractColors(page: Page, pageUrl: string): Promise<ColorToken[]> {
  logger.info('Extracting colors', { pageUrl });

  try {
    // Get all visible elements with computed styles
    const elements = await getAllVisibleElements(page);
    const timestamp = new Date().toISOString();

    // Map to store colors by hex value for deduplication
    const colorMap = new Map<string, ColorToken>();

    for (const element of elements) {
      const { selector, tagName, role, computedStyles } = element;

      // Extract colors from different properties with their contexts
      const colorSources: Array<{
        property: string;
        value: string;
        context: ColorToken['context'];
      }> = [
        {
          property: 'backgroundColor',
          value: computedStyles.backgroundColor,
          context: 'background',
        },
        {
          property: 'color',
          value: computedStyles.color,
          context: 'text',
        },
        {
          property: 'borderColor',
          value: computedStyles.borderColor,
          context: 'border',
        },
        {
          property: 'outlineColor',
          value: computedStyles.outlineColor,
          context: 'border',
        },
      ];

      // For buttons/links, also check for accent colors
      const isInteractive =
        tagName === 'button' ||
        tagName === 'a' ||
        role === 'button' ||
        role === 'link';

      for (const source of colorSources) {
        if (!source.value) continue;

        // Convert to hex
        const hexValue = parseColorToHex(source.value);
        if (!hexValue) continue; // Skip transparent/invalid colors

        // Determine context (use accent for interactive element backgrounds)
        let context = source.context;
        if (isInteractive && source.property === 'backgroundColor') {
          context = 'accent';
        }

        // Create or merge with existing color token
        const key = `${hexValue}-${context}`;
        const existing = colorMap.get(key);

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
          // Create new color token
          colorMap.set(key, {
            value: hexValue,
            originalValue: source.value,
            category: 'unknown', // Semantic grouping done in Phase 2
            context,
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

    const colors = Array.from(colorMap.values());
    logger.info(`Extracted ${colors.length} unique colors`, {
      pageUrl,
      count: colors.length,
    });

    return colors;
  } catch (error) {
    logger.error('Error extracting colors', {
      pageUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
