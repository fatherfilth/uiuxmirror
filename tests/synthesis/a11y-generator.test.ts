/**
 * Unit tests for a11y-generator module
 * Tests WCAG-compliant accessibility baseline generation
 */

import { describe, it, expect } from 'vitest';
import { generateA11yBaseline } from '../../src/synthesis/a11y-generator.js';

describe('A11y Generator', () => {
  const mockTokenMap: Record<string, string> = {
    'color.primary': '#1a73e8',
    'color.text': '#202124',
    'spacing.md': '16px',
  };

  describe('generateA11yBaseline for button', () => {
    it('returns role="button"', () => {
      const baseline = generateA11yBaseline('button', mockTokenMap);

      expect(baseline.ariaPattern.role).toBe('button');
    });

    it('includes Enter and Space keyboard keys', () => {
      const baseline = generateA11yBaseline('button', mockTokenMap);

      const keyActions = baseline.keyboardNavigation.keys.map(k => k.key);
      expect(keyActions).toContain('Enter');
      expect(keyActions).toContain('Space');
    });

    it('has high confidence for known pattern', () => {
      const baseline = generateA11yBaseline('button', mockTokenMap);

      expect(baseline.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('has WCAG level A or AA', () => {
      const baseline = generateA11yBaseline('button', mockTokenMap);

      expect(['A', 'AA', 'AAA']).toContain(baseline.wcagLevel);
    });

    it('has non-empty focus indicator CSS', () => {
      const baseline = generateA11yBaseline('button', mockTokenMap);

      expect(baseline.focusManagement.focusIndicator).toBeDefined();
      expect(baseline.focusManagement.focusIndicator.length).toBeGreaterThan(0);
    });
  });

  describe('generateA11yBaseline for modal', () => {
    it('returns role="dialog"', () => {
      const baseline = generateA11yBaseline('modal', mockTokenMap);

      expect(baseline.ariaPattern.role).toBe('dialog');
    });

    it('includes Escape key for closing', () => {
      const baseline = generateA11yBaseline('modal', mockTokenMap);

      const keyActions = baseline.keyboardNavigation.keys.map(k => k.key);
      const hasEscape = keyActions.some(k => k.toLowerCase().includes('esc'));

      expect(hasEscape).toBe(true);
    });

    it('enables focus trap', () => {
      const baseline = generateA11yBaseline('modal', mockTokenMap);

      expect(baseline.focusManagement.focusTrap).toBe(true);
    });

    it('has high confidence for known pattern', () => {
      const baseline = generateA11yBaseline('modal', mockTokenMap);

      expect(baseline.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('generateA11yBaseline for input', () => {
    it('returns appropriate role for input', () => {
      const baseline = generateA11yBaseline('input', mockTokenMap);

      // Input role can be 'textbox' or implicit
      expect(baseline.ariaPattern.role).toBeDefined();
      expect(baseline.ariaPattern.role.length).toBeGreaterThan(0);
    });

    it('includes appropriate ARIA attributes', () => {
      const baseline = generateA11yBaseline('input', mockTokenMap);

      // Should have required or optional ARIA attributes guidance
      const hasAriaGuidance =
        Object.keys(baseline.ariaPattern.requiredAttributes).length > 0 ||
        Object.keys(baseline.ariaPattern.optionalAttributes).length > 0;

      expect(hasAriaGuidance).toBe(true);
    });

    it('has high confidence for known pattern', () => {
      const baseline = generateA11yBaseline('input', mockTokenMap);

      expect(baseline.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('generateA11yBaseline for data-table', () => {
    it('returns role="table"', () => {
      const baseline = generateA11yBaseline('data-table', mockTokenMap);

      expect(baseline.ariaPattern.role).toBe('table');
    });

    it('includes arrow key navigation', () => {
      const baseline = generateA11yBaseline('data-table', mockTokenMap);

      const keyActions = baseline.keyboardNavigation.keys.map(k => k.key);
      const hasArrowKeys = keyActions.some(k =>
        k.toLowerCase().includes('arrow')
      );

      expect(hasArrowKeys).toBe(true);
    });

    it('has high confidence for known pattern', () => {
      const baseline = generateA11yBaseline('data-table', mockTokenMap);

      expect(baseline.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('generateA11yBaseline for nav', () => {
    it('returns role="navigation"', () => {
      const baseline = generateA11yBaseline('nav', mockTokenMap);

      expect(baseline.ariaPattern.role).toBe('navigation');
    });

    it('has high confidence for known pattern', () => {
      const baseline = generateA11yBaseline('nav', mockTokenMap);

      expect(baseline.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('generateA11yBaseline for unknown type', () => {
    it('returns generic baseline without crashing', () => {
      const baseline = generateA11yBaseline('carousel', mockTokenMap);

      expect(baseline).toBeDefined();
      expect(baseline.ariaPattern.role).toBeDefined();
      expect(baseline.keyboardNavigation).toBeDefined();
      expect(baseline.focusManagement).toBeDefined();
    });

    it('has lower confidence for unknown type', () => {
      const baseline = generateA11yBaseline('carousel', mockTokenMap);

      expect(baseline.confidence).toBeLessThan(0.9);
    });
  });

  describe('WCAG compliance', () => {
    it('all baselines have wcagLevel of A, AA, or AAA', () => {
      const types = ['button', 'modal', 'input', 'data-table', 'nav', 'card'];

      types.forEach((type) => {
        const baseline = generateA11yBaseline(type, mockTokenMap);
        expect(['A', 'AA', 'AAA']).toContain(baseline.wcagLevel);
      });
    });

    it('all baselines have non-empty focus indicator', () => {
      const types = ['button', 'modal', 'input', 'data-table', 'nav', 'card'];

      types.forEach((type) => {
        const baseline = generateA11yBaseline(type, mockTokenMap);
        expect(baseline.focusManagement.focusIndicator.length).toBeGreaterThan(0);
      });
    });

    it('all baselines have keyboard navigation guidance', () => {
      const types = ['button', 'modal', 'input', 'data-table', 'nav'];

      types.forEach((type) => {
        const baseline = generateA11yBaseline(type, mockTokenMap);
        expect(baseline.keyboardNavigation.keys).toBeDefined();
        expect(baseline.keyboardNavigation.tabIndex).toBeDefined();
      });
    });
  });
});
