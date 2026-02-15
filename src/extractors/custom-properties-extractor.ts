/**
 * TOKEN-04: CSS Custom Properties extractor
 * Extracts CSS custom properties from :root with categorization
 */

import type { Page } from 'playwright';
import type { CustomPropertyToken } from '../types/tokens.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('custom-properties-extractor');

/**
 * Extract CSS custom properties from a page
 * Reads :root variables, resolves values, and categorizes by naming convention
 */
export async function extractCustomProperties(
  page: Page,
  pageUrl: string
): Promise<CustomPropertyToken[]> {
  logger.info('Extracting CSS custom properties', { pageUrl });

  try {
    // Extract custom properties from :root
    const customProps = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      const customProps: Record<string, { raw: string; resolved: string }> = {};

      // Get all custom properties from stylesheets
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules)) {
              if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
                for (let i = 0; i < rule.style.length; i++) {
                  const name = rule.style[i];
                  if (name.startsWith('--')) {
                    const rawValue = rule.style.getPropertyValue(name).trim();
                    const resolvedValue = rootStyles.getPropertyValue(name).trim();
                    customProps[name] = {
                      raw: rawValue,
                      resolved: resolvedValue || rawValue,
                    };
                  }
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheet, skip
          }
        }
      } catch (e) {
        // Error accessing stylesheets
      }

      return customProps;
    });

    const timestamp = new Date().toISOString();
    const tokens: CustomPropertyToken[] = [];

    // Convert to tokens with categorization
    for (const [name, values] of Object.entries(customProps)) {
      const category = categorizeCustomProperty(name);

      tokens.push({
        name,
        value: values.resolved,
        rawValue: values.raw,
        category,
        evidence: [
          {
            pageUrl,
            selector: ':root',
            timestamp,
            computedStyles: {
              [name]: values.resolved,
            },
          },
        ],
      });
    }

    logger.info(`Extracted ${tokens.length} custom properties`, {
      pageUrl,
      count: tokens.length,
    });

    return tokens;
  } catch (error) {
    logger.error('Error extracting custom properties', {
      pageUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Categorize custom property by naming convention heuristics
 */
function categorizeCustomProperty(
  name: string
): CustomPropertyToken['category'] {
  const lowerName = name.toLowerCase();

  // Color-related
  if (
    lowerName.includes('color') ||
    lowerName.includes('bg') ||
    lowerName.includes('text') ||
    lowerName.includes('border')
  ) {
    return 'color';
  }

  // Typography-related
  if (
    lowerName.includes('font') ||
    lowerName.includes('text-size') ||
    lowerName.includes('type')
  ) {
    return 'typography';
  }

  // Spacing-related
  if (
    lowerName.includes('space') ||
    lowerName.includes('gap') ||
    lowerName.includes('margin') ||
    lowerName.includes('padding')
  ) {
    return 'spacing';
  }

  // Radius-related
  if (lowerName.includes('radius') || lowerName.includes('round')) {
    return 'radius';
  }

  // Shadow-related
  if (lowerName.includes('shadow') || lowerName.includes('elevation')) {
    return 'shadow';
  }

  // Motion-related
  if (
    lowerName.includes('duration') ||
    lowerName.includes('ease') ||
    lowerName.includes('transition') ||
    lowerName.includes('animation')
  ) {
    return 'motion';
  }

  // Default to 'other'
  return 'other';
}
