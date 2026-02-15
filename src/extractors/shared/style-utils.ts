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
 * Browser-side script for getAllVisibleElements.
 * Defined as a string to prevent esbuild/tsx from injecting __name decorators
 * that don't exist in the browser context.
 */
const GET_VISIBLE_ELEMENTS_SCRIPT = `(() => {
  var buildSelector = function(element) {
    if (element.id) {
      return '#' + element.id;
    }
    var path = [];
    var current = element;
    var depth = 0;
    while (current && current !== document.documentElement && depth < 5) {
      var selector = current.tagName.toLowerCase();
      var parent = current.parentElement;
      if (parent) {
        var currentTagName = current.tagName;
        var siblings = Array.from(parent.children).filter(
          function(child) { return child.tagName === currentTagName; }
        );
        if (siblings.length > 1) {
          var index = siblings.indexOf(current) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }
      path.unshift(selector);
      current = parent;
      depth++;
    }
    return path.join(' > ');
  };

  var allElements = Array.from(document.querySelectorAll('*'));
  var visibleElements = allElements
    .filter(function(element) {
      var rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .slice(0, 500);

  var results = [];
  for (var i = 0; i < visibleElements.length; i++) {
    var element = visibleElements[i];
    var styles = window.getComputedStyle(element);
    var computedStyles = {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderColor: styles.borderTopColor,
      outlineColor: styles.outlineColor,
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing,
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
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow,
      zIndex: styles.zIndex,
      width: styles.width,
      height: styles.height,
      transitionDuration: styles.transitionDuration,
      transitionTimingFunction: styles.transitionTimingFunction,
      animationDuration: styles.animationDuration,
      animationTimingFunction: styles.animationTimingFunction,
      animationName: styles.animationName
    };
    results.push({
      selector: buildSelector(element),
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute('role'),
      computedStyles: computedStyles
    });
  }
  return results;
})()`;

/**
 * Get all visible elements from a page with their computed styles
 * Returns only elements with visible dimensions (width > 0 AND height > 0)
 * Limits to first 500 elements to avoid memory issues on complex pages
 */
export async function getAllVisibleElements(page: Page): Promise<ExtractedElement[]> {
  return await page.evaluate(GET_VISIBLE_ELEMENTS_SCRIPT) as ExtractedElement[];
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
