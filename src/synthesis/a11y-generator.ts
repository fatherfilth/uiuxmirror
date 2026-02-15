/**
 * Accessibility baseline generator
 * Generates W3C ARIA APG-compliant keyboard/focus/ARIA guidance
 * for synthesized components
 */

import type { A11yBaseline, KeyboardGuidance, FocusGuidance, AriaGuidance } from '../types/synthesis.js';

/**
 * ARIA pattern definition
 */
interface AriaPattern {
  role: string;
  tabIndex: number;
  keys: Array<{ key: string; action: string }>;
  required: Record<string, string>;
  optional: Record<string, string>;
  focusManagement: {
    indicator: string;
    order: string;
    trap: boolean;
  };
}

/**
 * W3C ARIA APG pattern database
 * Based on: https://www.w3.org/WAI/ARIA/apg/patterns/
 */
const ARIA_APG_PATTERNS: Record<string, AriaPattern> = {
  button: {
    role: 'button',
    tabIndex: 0,
    keys: [
      { key: 'Enter', action: 'Activates the button' },
      { key: 'Space', action: 'Activates the button' },
    ],
    required: {},
    optional: {
      'aria-pressed': 'For toggle buttons (true/false/mixed)',
      'aria-expanded': 'For buttons that control expandable regions',
      'aria-label': 'When button text is not descriptive enough',
    },
    focusManagement: {
      indicator: 'Visible focus indicator required',
      order: 'Button is in logical tab order',
      trap: false,
    },
  },

  input: {
    role: 'textbox', // implicit for <input type="text">
    tabIndex: 0,
    keys: [
      { key: 'Tab', action: 'Move focus to next field' },
      { key: 'Shift+Tab', action: 'Move focus to previous field' },
    ],
    required: {},
    optional: {
      'aria-label': 'When no visible label present',
      'aria-labelledby': 'Reference to visible label element',
      'aria-describedby': 'Reference to help text or error message',
      'aria-required': 'Indicates required field',
    },
    focusManagement: {
      indicator: 'Visible focus indicator required',
      order: 'Input is in logical tab order',
      trap: false,
    },
  },

  card: {
    role: 'article',
    tabIndex: -1, // Not typically focusable unless interactive
    keys: [],
    required: {},
    optional: {
      'aria-labelledby': 'Reference to card title/heading',
      'aria-describedby': 'Reference to card description',
    },
    focusManagement: {
      indicator: 'Focus indicator only if interactive',
      order: 'Not in tab order unless card is clickable',
      trap: false,
    },
  },

  nav: {
    role: 'navigation',
    tabIndex: -1,
    keys: [
      { key: 'Tab', action: 'Navigate through navigation items' },
      { key: 'Arrow keys', action: 'Alternative navigation for menu bars' },
    ],
    required: {},
    optional: {
      'aria-label': 'Descriptive label for navigation region (e.g., "Main navigation")',
      'aria-labelledby': 'Reference to navigation heading',
    },
    focusManagement: {
      indicator: 'Focus indicator on navigation items',
      order: 'Navigation items in logical tab order',
      trap: false,
    },
  },

  modal: {
    role: 'dialog',
    tabIndex: -1,
    keys: [
      { key: 'Escape', action: 'Closes the modal' },
      { key: 'Tab', action: 'Cycles focus within modal (focus trap)' },
    ],
    required: {
      'aria-modal': 'true',
      'aria-labelledby': 'Reference to modal title',
    },
    optional: {
      'aria-describedby': 'Reference to modal description',
    },
    focusManagement: {
      indicator: 'Focus indicator on all focusable elements',
      order: 'Focus moves to first focusable element when opened',
      trap: true,
    },
  },

  'data-table': {
    role: 'table', // implicit for <table>
    tabIndex: 0,
    keys: [
      { key: 'Arrow keys', action: 'Navigate between cells' },
      { key: 'Home', action: 'Move to first cell in row' },
      { key: 'End', action: 'Move to last cell in row' },
      { key: 'Ctrl+Home', action: 'Move to first cell in table' },
      { key: 'Ctrl+End', action: 'Move to last cell in table' },
    ],
    required: {},
    optional: {
      'aria-label': 'Descriptive label for table',
      'aria-describedby': 'Reference to table caption or description',
      'aria-colcount': 'Total number of columns',
      'aria-rowcount': 'Total number of rows',
    },
    focusManagement: {
      indicator: 'Focus indicator on active cell',
      order: 'Table or first cell is in tab order',
      trap: false,
    },
  },
};

/**
 * Component type aliases
 */
function getComponentTypeAliases(): Record<string, string> {
  return {
    table: 'data-table',
    dialog: 'modal',
    textbox: 'input',
    'text-input': 'input',
    navbar: 'nav',
    'nav-bar': 'nav',
    navigation: 'nav',
    'article-card': 'card',
    'product-card': 'card',
  };
}

/**
 * Generate WCAG-compliant focus ring CSS
 */
function generateWCAGFocusRing(tokenMap: Record<string, string>): string {
  const backgroundColor = tokenMap.backgroundColor || '#ffffff';

  // Try to use primary color from token map
  let focusColor = tokenMap.primaryColor || tokenMap.color || '#005FCC';

  // Validate 3:1 contrast ratio
  const contrast = calculateContrastRatio(focusColor, backgroundColor);
  if (contrast < 3.0) {
    focusColor = '#005FCC'; // Safe default
  }

  return `outline: 2px solid ${focusColor}; outline-offset: 2px;`;
}

/**
 * Calculate WCAG contrast ratio
 */
function calculateContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const cleanHex = hex.replace(/^#/, '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    const rLinear = toLinear(r);
    const gLinear = toLinear(g);
    const bLinear = toLinear(b);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generate accessibility baseline for a component
 *
 * @param componentType - Component type (e.g., 'button', 'modal', 'data-table')
 * @param tokenMap - Token map for focus ring color extraction
 * @returns A11yBaseline with W3C ARIA APG guidance
 */
export function generateA11yBaseline(
  componentType: string,
  tokenMap: Record<string, string>
): A11yBaseline {
  // Normalize component type
  const aliases = getComponentTypeAliases();
  const normalizedType = aliases[componentType.toLowerCase()] || componentType.toLowerCase();

  // Look up ARIA pattern
  const pattern = ARIA_APG_PATTERNS[normalizedType];

  if (pattern) {
    // Build guidance from W3C APG pattern
    const keyboardNavigation: KeyboardGuidance = {
      keys: pattern.keys,
      tabIndex: pattern.tabIndex,
      example: `${pattern.keys.map(k => `${k.key}: ${k.action}`).join('; ')}`,
    };

    const focusManagement: FocusGuidance = {
      focusIndicator: generateWCAGFocusRing(tokenMap),
      focusOrder: pattern.focusManagement.order,
      focusTrap: pattern.focusManagement.trap,
    };

    const ariaPattern: AriaGuidance = {
      role: pattern.role,
      requiredAttributes: pattern.required,
      optionalAttributes: pattern.optional,
    };

    return {
      keyboardNavigation,
      focusManagement,
      ariaPattern,
      confidence: 0.95, // W3C standard
      wcagLevel: 'AA',
    };
  }

  // Fallback: Generic baseline for unknown component types
  const keyboardNavigation: KeyboardGuidance = {
    keys: [{ key: 'Tab', action: 'Navigate to component' }],
    tabIndex: 0,
    example: 'Tab: Navigate to component',
  };

  const focusManagement: FocusGuidance = {
    focusIndicator: generateWCAGFocusRing(tokenMap),
    focusOrder: 'Component is in logical tab order',
    focusTrap: false,
  };

  const ariaPattern: AriaGuidance = {
    role: 'region',
    requiredAttributes: {},
    optionalAttributes: {
      'aria-label': 'Descriptive label for the component',
    },
  };

  return {
    keyboardNavigation,
    focusManagement,
    ariaPattern,
    confidence: 0.6, // Generic, may not be optimal
    wcagLevel: 'A',
  };
}
