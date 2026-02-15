/**
 * Component state mapper
 * Captures interactive states (hover, focus, disabled) via Playwright interactions
 * Detects loading and error states opportunistically from DOM attributes
 */

import type { Page } from 'playwright';
import type { DetectedComponent } from '../types/components.js';

// State mapping with only changed properties
export interface StateMapping {
  default: Record<string, string>;
  hover?: Record<string, string>;
  focus?: Record<string, string>;
  active?: Record<string, string>;
  disabled?: Record<string, string>;
  loading?: Record<string, string>;
  error?: Record<string, string>;
}

// Property difference between default and state
export interface StateDiff {
  property: string;
  defaultValue: string;
  stateValue: string;
}

/**
 * Compare two style objects and return only changed properties
 */
function getStyleDiff(
  defaultStyles: Record<string, string>,
  stateStyles: Record<string, string>
): Record<string, string> | null {
  const diff: Record<string, string> = {};
  let hasChanges = false;

  for (const [key, value] of Object.entries(stateStyles)) {
    if (defaultStyles[key] !== value) {
      diff[key] = value;
      hasChanges = true;
    }
  }

  return hasChanges ? diff : null;
}

/**
 * Check if element is in loading state
 */
async function detectLoadingState(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      // Check aria-busy attribute
      if (element.getAttribute('aria-busy') === 'true') return true;

      // Check for loading/spinner classes on element or ancestors
      let current: Element | null = element;
      let depth = 0;
      while (current && depth < 3) {
        const classes = current.className.toLowerCase();
        if (classes.includes('loading') || classes.includes('spinner')) {
          return true;
        }
        current = current.parentElement;
        depth++;
      }

      return false;
    }, selector);
  } catch {
    return false;
  }
}

/**
 * Check if element is in error state
 */
async function detectErrorState(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      // Check aria-invalid attribute
      if (element.getAttribute('aria-invalid') === 'true') return true;

      // Check for error/invalid classes
      const classes = element.className.toLowerCase();
      if (classes.includes('error') || classes.includes('invalid')) {
        return true;
      }

      // Check for red-ish border color
      const styles = window.getComputedStyle(element);
      const borderColor = styles.borderColor;

      // Parse RGB values
      const match = borderColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // Red-ish: R > 180 && G < 80 && B < 80
        if (r > 180 && g < 80 && b < 80) {
          return true;
        }
      }

      return false;
    }, selector);
  } catch {
    return false;
  }
}

/**
 * Map component states for a single element
 * Returns state mapping with only changed properties
 */
export async function mapComponentStates(
  page: Page,
  selector: string
): Promise<StateMapping> {
  try {
    // Get default state
    const defaultStyles = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      const styles = window.getComputedStyle(element);
      const result: Record<string, string> = {};

      const properties = [
        'backgroundColor',
        'color',
        'borderColor',
        'opacity',
        'cursor',
        'outline',
        'outlineColor',
        'outlineWidth',
        'boxShadow',
        'transform',
        'textDecoration'
      ];

      for (const prop of properties) {
        result[prop] = styles[prop as keyof CSSStyleDeclaration] as string || '';
      }

      return result;
    }, selector);

    if (!defaultStyles) {
      return { default: {} };
    }

    const mapping: StateMapping = { default: defaultStyles };

    // Try to capture hover state
    try {
      await page.locator(selector).hover();
      await page.waitForTimeout(150); // Wait for transitions

      const hoverStyles = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        const result: Record<string, string> = {};

        const properties = [
          'backgroundColor',
          'color',
          'borderColor',
          'opacity',
          'cursor',
          'outline',
          'outlineColor',
          'outlineWidth',
          'boxShadow',
          'transform',
          'textDecoration'
        ];

        for (const prop of properties) {
          result[prop] = styles[prop as keyof CSSStyleDeclaration] as string || '';
        }

        return result;
      }, selector);

      if (hoverStyles) {
        const diff = getStyleDiff(defaultStyles, hoverStyles);
        if (diff) {
          mapping.hover = diff;
        }
      }

      // Move mouse away to reset
      await page.mouse.move(0, 0);
      await page.waitForTimeout(50);
    } catch {
      // Hover failed, skip
    }

    // Try to capture focus state
    try {
      await page.locator(selector).focus();
      await page.waitForTimeout(100); // Wait for focus styles

      const focusStyles = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        const result: Record<string, string> = {};

        const properties = [
          'backgroundColor',
          'color',
          'borderColor',
          'opacity',
          'cursor',
          'outline',
          'outlineColor',
          'outlineWidth',
          'boxShadow',
          'transform',
          'textDecoration'
        ];

        for (const prop of properties) {
          result[prop] = styles[prop as keyof CSSStyleDeclaration] as string || '';
        }

        return result;
      }, selector);

      if (focusStyles) {
        const diff = getStyleDiff(defaultStyles, focusStyles);
        if (diff) {
          mapping.focus = diff;
        }
      }

      // Blur to reset
      await page.evaluate(() => {
        const active = document.activeElement as HTMLElement;
        active?.blur();
      });
      await page.waitForTimeout(50);
    } catch {
      // Focus failed, skip
    }

    // Try to capture disabled state (for button, input, select only)
    try {
      const isInteractive = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;
        const tag = element.tagName.toLowerCase();
        return tag === 'button' || tag === 'input' || tag === 'select';
      }, selector);

      if (isInteractive) {
        const disabledStyles = await page.evaluate((sel) => {
          const element = document.querySelector(sel) as HTMLButtonElement | HTMLInputElement | HTMLSelectElement;
          if (!element) return null;

          // Temporarily set disabled
          const wasDisabled = element.disabled;
          element.disabled = true;

          const styles = window.getComputedStyle(element);
          const result: Record<string, string> = {};

          const properties = [
            'backgroundColor',
            'color',
            'borderColor',
            'opacity',
            'cursor',
            'outline',
            'outlineColor',
            'outlineWidth',
            'boxShadow',
            'transform',
            'textDecoration'
          ];

          for (const prop of properties) {
            result[prop] = styles[prop as keyof CSSStyleDeclaration] as string || '';
          }

          // Restore original state
          element.disabled = wasDisabled;

          return result;
        }, selector);

        if (disabledStyles) {
          const diff = getStyleDiff(defaultStyles, disabledStyles);
          if (diff) {
            mapping.disabled = diff;
          }
        }
      }
    } catch {
      // Disabled state capture failed, skip
    }

    // Opportunistic: detect loading state
    const isLoading = await detectLoadingState(page, selector);
    if (isLoading) {
      const loadingStyles = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        const result: Record<string, string> = {};

        const properties = [
          'backgroundColor',
          'color',
          'borderColor',
          'opacity',
          'cursor',
          'outline',
          'outlineColor',
          'outlineWidth',
          'boxShadow',
          'transform',
          'textDecoration'
        ];

        for (const prop of properties) {
          result[prop] = styles[prop as keyof CSSStyleDeclaration] as string || '';
        }

        return result;
      }, selector);

      if (loadingStyles) {
        const diff = getStyleDiff(defaultStyles, loadingStyles);
        if (diff) {
          mapping.loading = diff;
        }
      }
    }

    // Opportunistic: detect error state
    const isError = await detectErrorState(page, selector);
    if (isError) {
      const errorStyles = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        const result: Record<string, string> = {};

        const properties = [
          'backgroundColor',
          'color',
          'borderColor',
          'opacity',
          'cursor',
          'outline',
          'outlineColor',
          'outlineWidth',
          'boxShadow',
          'transform',
          'textDecoration'
        ];

        for (const prop of properties) {
          result[prop] = styles[prop as keyof CSSStyleDeclaration] as string || '';
        }

        return result;
      }, selector);

      if (errorStyles) {
        const diff = getStyleDiff(defaultStyles, errorStyles);
        if (diff) {
          mapping.error = diff;
        }
      }
    }

    return mapping;
  } catch (error) {
    // On any error, return default-only mapping
    console.error(`[State Mapper] Error mapping states for ${selector}:`, error);
    return { default: {} };
  }
}

/**
 * Map states for all components (limited to 20 per type)
 * Returns Map of selector -> StateMapping
 */
export async function mapAllComponentStates(
  page: Page,
  components: DetectedComponent[]
): Promise<Map<string, StateMapping>> {
  const result = new Map<string, StateMapping>();

  // Group by type
  const byType = new Map<string, DetectedComponent[]>();
  components.forEach(c => {
    const existing = byType.get(c.type) || [];
    existing.push(c);
    byType.set(c.type, existing);
  });

  // Process up to 20 per type
  for (const [type, group] of byType.entries()) {
    const limited = group.slice(0, 20);
    console.log(`[State Mapper] Processing ${limited.length} ${type} components`);

    for (const component of limited) {
      const mapping = await mapComponentStates(page, component.selector);
      result.set(component.selector, mapping);
    }
  }

  return result;
}
