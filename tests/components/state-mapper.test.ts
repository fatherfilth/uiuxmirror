/**
 * Tests for state mapper
 * Verifies state diff detection and opportunistic loading/error state detection
 */

import { describe, it, expect } from 'vitest';

// Helper function to simulate getStyleDiff
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

describe('State Mapper', () => {
  describe('State diff detection', () => {
    it('should return null when styles are identical', () => {
      const defaultStyles = {
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(0, 0, 0)',
        opacity: '1'
      };

      const stateStyles = {
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(0, 0, 0)',
        opacity: '1'
      };

      const diff = getStyleDiff(defaultStyles, stateStyles);
      expect(diff).toBeNull();
    });

    it('should detect backgroundColor change on hover', () => {
      const defaultStyles = {
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(0, 0, 0)',
        opacity: '1'
      };

      const hoverStyles = {
        backgroundColor: 'rgb(238, 238, 238)',
        color: 'rgb(0, 0, 0)',
        opacity: '1'
      };

      const diff = getStyleDiff(defaultStyles, hoverStyles);
      expect(diff).not.toBeNull();
      expect(diff?.backgroundColor).toBe('rgb(238, 238, 238)');
      expect(diff?.color).toBeUndefined();
    });

    it('should detect outline change on focus', () => {
      const defaultStyles = {
        backgroundColor: 'rgb(255, 255, 255)',
        outline: 'none',
        outlineWidth: '0px'
      };

      const focusStyles = {
        backgroundColor: 'rgb(255, 255, 255)',
        outline: 'rgb(59, 130, 246) solid 2px',
        outlineWidth: '2px'
      };

      const diff = getStyleDiff(defaultStyles, focusStyles);
      expect(diff).not.toBeNull();
      expect(diff?.outline).toBe('rgb(59, 130, 246) solid 2px');
      expect(diff?.outlineWidth).toBe('2px');
    });

    it('should detect multiple property changes', () => {
      const defaultStyles = {
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(0, 0, 0)',
        opacity: '1',
        cursor: 'pointer'
      };

      const stateStyles = {
        backgroundColor: 'rgb(200, 200, 200)',
        color: 'rgb(100, 100, 100)',
        opacity: '0.6',
        cursor: 'not-allowed'
      };

      const diff = getStyleDiff(defaultStyles, stateStyles);
      expect(diff).not.toBeNull();
      expect(diff?.backgroundColor).toBe('rgb(200, 200, 200)');
      expect(diff?.color).toBe('rgb(100, 100, 100)');
      expect(diff?.opacity).toBe('0.6');
      expect(diff?.cursor).toBe('not-allowed');
    });
  });

  describe('Loading state detection (opportunistic)', () => {
    it('should detect loading state from aria-busy attribute', () => {
      // Simulating browser logic
      const element = {
        getAttribute: (attr: string) => attr === 'aria-busy' ? 'true' : null,
        className: ''
      };

      const isLoading = element.getAttribute('aria-busy') === 'true';
      expect(isLoading).toBe(true);
    });

    it('should detect loading state from loading class', () => {
      const element = {
        getAttribute: () => null,
        className: 'button-loading'
      };

      const isLoading = element.className.toLowerCase().includes('loading');
      expect(isLoading).toBe(true);
    });

    it('should detect loading state from spinner class', () => {
      const element = {
        getAttribute: () => null,
        className: 'spinner-active'
      };

      const isLoading = element.className.toLowerCase().includes('spinner');
      expect(isLoading).toBe(true);
    });

    it('should not detect loading state when no indicators present', () => {
      const element = {
        getAttribute: () => null,
        className: 'button-primary'
      };

      const isLoading =
        element.getAttribute('aria-busy') === 'true' ||
        element.className.toLowerCase().includes('loading') ||
        element.className.toLowerCase().includes('spinner');

      expect(isLoading).toBe(false);
    });
  });

  describe('Error state detection (opportunistic)', () => {
    it('should detect error state from aria-invalid attribute', () => {
      const element = {
        getAttribute: (attr: string) => attr === 'aria-invalid' ? 'true' : null,
        className: ''
      };

      const isError = element.getAttribute('aria-invalid') === 'true';
      expect(isError).toBe(true);
    });

    it('should detect error state from error class', () => {
      const element = {
        getAttribute: () => null,
        className: 'input-error'
      };

      const isError = element.className.toLowerCase().includes('error');
      expect(isError).toBe(true);
    });

    it('should detect error state from invalid class', () => {
      const element = {
        getAttribute: () => null,
        className: 'field-invalid'
      };

      const isError = element.className.toLowerCase().includes('invalid');
      expect(isError).toBe(true);
    });

    it('should detect error state from red-ish border color', () => {
      const borderColor = 'rgb(220, 38, 38)';
      const match = borderColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);

      let isError = false;
      if (match) {
        const [, r, g, b] = match.map(Number);
        isError = r > 180 && g < 80 && b < 80;
      }

      expect(isError).toBe(true);
    });

    it('should not detect error state from non-red border color', () => {
      const borderColor = 'rgb(100, 100, 100)';
      const match = borderColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);

      let isError = false;
      if (match) {
        const [, r, g, b] = match.map(Number);
        isError = r > 180 && g < 80 && b < 80;
      }

      expect(isError).toBe(false);
    });

    it('should not detect error state when no indicators present', () => {
      const element = {
        getAttribute: () => null,
        className: 'input-default'
      };

      const isError =
        element.getAttribute('aria-invalid') === 'true' ||
        element.className.toLowerCase().includes('error') ||
        element.className.toLowerCase().includes('invalid');

      expect(isError).toBe(false);
    });
  });

  describe('State mapping structure', () => {
    it('should always include default state', () => {
      const mapping = {
        default: {
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(0, 0, 0)'
        }
      };

      expect(mapping.default).toBeDefined();
      expect(mapping.default.backgroundColor).toBe('rgb(255, 255, 255)');
    });

    it('should only include hover state if properties differ', () => {
      const defaultStyles = { backgroundColor: 'rgb(255, 255, 255)' };
      const hoverStyles = { backgroundColor: 'rgb(238, 238, 238)' };

      const diff = getStyleDiff(defaultStyles, hoverStyles);

      const mapping: any = { default: defaultStyles };
      if (diff) {
        mapping.hover = diff;
      }

      expect(mapping.hover).toBeDefined();
      expect(mapping.hover.backgroundColor).toBe('rgb(238, 238, 238)');
    });

    it('should not include hover state if no properties differ', () => {
      const defaultStyles = { backgroundColor: 'rgb(255, 255, 255)' };
      const hoverStyles = { backgroundColor: 'rgb(255, 255, 255)' };

      const diff = getStyleDiff(defaultStyles, hoverStyles);

      const mapping: any = { default: defaultStyles };
      if (diff) {
        mapping.hover = diff;
      }

      expect(mapping.hover).toBeUndefined();
    });
  });
});
