/**
 * Shared utilities for style extraction
 * Used by all token extractors to avoid code duplication
 */

import type { Page } from 'playwright';
import Color from 'color';

export interface ExtractedElement {
  selector: string;
  tagName: string;
  role: string | null;
  computedStyles: Record<string, string>;
}

/**
 * Get all visible elements from a page with their computed styles
 * Returns only elements with visible dimensions (width > 0 AND height > 0)
 * Limits to first 500 elements to avoid memory issues on complex pages
 */
export async function getAllVisibleElements(page: Page): Promise<ExtractedElement[]> {
  return await page.evaluate(() => {
    /**
     * Build a simple CSS selector path for an element
     * Prefers ID if available, otherwise builds tag:nth-child() path
     */
    function buildSelector(element: Element): string {
      // Prefer ID if available
      if (element.id) {
        return `#${element.id}`;
      }

      // Build path from tag + nth-child, limiting depth to 5 levels
      const path: string[] = [];
      let current: Element | null = element;
      let depth = 0;

      while (current && current !== document.documentElement && depth < 5) {
        let selector = current.tagName.toLowerCase();

        // Add nth-child if not the only child
        const parent: Element | null = current.parentElement;
        if (parent) {
          const currentTagName = current.tagName;
          const siblings = Array.from(parent.children).filter(
            (child: Element) => child.tagName === currentTagName
          );
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }

        path.unshift(selector);
        current = parent;
        depth++;
      }

      return path.join(' > ');
    }

    // Get all elements
    const allElements = Array.from(document.querySelectorAll('*'));

    // Filter to visible elements only
    const visibleElements = allElements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, 500); // Limit to first 500 to avoid memory issues

    // Extract computed styles for each element
    const results: ExtractedElement[] = [];

    for (const element of visibleElements) {
      const styles = window.getComputedStyle(element);

      // Extract only relevant properties (not ALL properties - too expensive)
      const computedStyles: Record<string, string> = {
        // Colors
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderTopColor, // Use borderTopColor as representative
        outlineColor: styles.outlineColor,

        // Typography
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        letterSpacing: styles.letterSpacing,

        // Spacing
        marginTop: styles.marginTop,
        marginRight: styles.marginRight,
        marginBottom: styles.marginBottom,
        marginLeft: styles.marginLeft,
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
        gap: styles.gap,
        rowGap: styles.rowGap,
        columnGap: styles.columnGap,

        // Layout
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        zIndex: styles.zIndex,
        width: styles.width,
        height: styles.height,

        // Motion
        transitionDuration: styles.transitionDuration,
        transitionTimingFunction: styles.transitionTimingFunction,
        animationDuration: styles.animationDuration,
        animationTimingFunction: styles.animationTimingFunction,
        animationName: styles.animationName,
      };

      results.push({
        selector: buildSelector(element),
        tagName: element.tagName.toLowerCase(),
        role: element.getAttribute('role'),
        computedStyles,
      });
    }

    return results;
  });
}

/**
 * Convert CSS color value to normalized hex format (#rrggbb)
 * Returns null for transparent or invalid colors
 */
export function parseColorToHex(cssColor: string): string | null {
  try {
    // Handle transparent
    if (cssColor === 'transparent' || cssColor === 'rgba(0, 0, 0, 0)') {
      return null;
    }

    // Parse and convert to hex
    const color = Color(cssColor);

    // Filter out fully transparent colors
    if (color.alpha() === 0) {
      return null;
    }

    // Return lowercase hex (ignore alpha for v1)
    return color.hex().toLowerCase();
  } catch (error) {
    // Invalid color value
    return null;
  }
}

/**
 * Parse CSS size value to pixels
 * Handles px, rem, em, and unitless 0
 * Returns null for auto, inherit, normal, calc(), or unparseable values
 */
export function parseSizeToPixels(cssValue: string, baseFontSize: number = 16): number | null {
  if (!cssValue || cssValue === 'auto' || cssValue === 'inherit' || cssValue === 'normal') {
    return null;
  }

  // Handle calc() - too complex for v1
  if (cssValue.includes('calc(')) {
    return null;
  }

  // Unitless 0
  if (cssValue === '0') {
    return 0;
  }

  // Parse value and unit
  const match = cssValue.match(/^([-\d.]+)(px|rem|em)?$/);
  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || '';

  switch (unit) {
    case 'px':
      return value;
    case 'rem':
      return value * baseFontSize;
    case 'em':
      return value * baseFontSize; // Simplified - assumes base font size
    default:
      return null;
  }
}

/**
 * Filter out browser default values
 * Returns false if value is a known browser default for that property
 * For v1, only filters out obvious defaults
 */
export function filterBrowserDefaults(value: string, property: string): boolean {
  // Filter out transparent backgrounds
  if (property === 'backgroundColor' && (value === 'rgba(0, 0, 0, 0)' || value === 'transparent')) {
    return false;
  }

  // Filter out 'normal' letter-spacing and line-height
  if ((property === 'letterSpacing' || property === 'lineHeight') && value === 'normal') {
    return false;
  }

  // Include everything else (err on the side of inclusion)
  return true;
}
