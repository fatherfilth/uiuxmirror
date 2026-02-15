/**
 * Tests for variant analyzer
 * Verifies percentile-based size detection, emphasis detection, and shape detection
 */

import { describe, it, expect } from 'vitest';
import { analyzeVariants } from '../../src/components/variant-analyzer.js';
import type { DetectedComponent } from '../../src/types/components.js';

describe('Variant Analyzer', () => {
  describe('Size detection (percentile-based)', () => {
    it('should detect small/medium/large from padding distribution', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '4px' },
          pageUrl: 'test'
        },
        {
          type: 'button',
          selector: 'button-2',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '8px' },
          pageUrl: 'test'
        },
        {
          type: 'button',
          selector: 'button-3',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '16px' },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);

      expect(analyzed[0].variant.size).toBe('small');
      expect(analyzed[1].variant.size).toBe('medium');
      expect(analyzed[2].variant.size).toBe('large');
    });

    it('should handle two distinct padding values with median split', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '8px' },
          pageUrl: 'test'
        },
        {
          type: 'button',
          selector: 'button-2',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '16px' },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);

      expect(analyzed[0].variant.size).toBe('small');
      expect(analyzed[1].variant.size).toBe('large');
    });

    it('should handle single component (no size distribution)', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '8px' },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);

      expect(analyzed[0].variant.size).toBe('medium');
    });

    it('should calculate distribution counts correctly', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '4px' },
          pageUrl: 'test'
        },
        {
          type: 'button',
          selector: 'button-2',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '4px' },
          pageUrl: 'test'
        },
        {
          type: 'button',
          selector: 'button-3',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '16px' },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      const sizeDimension = analyzed[0].variantDimensions.find(d => d.name === 'size');

      expect(sizeDimension?.distribution.small).toBe(2);
      expect(sizeDimension?.distribution.large).toBe(1);
      expect(sizeDimension?.distribution.medium).toBe(0);
    });
  });

  describe('Emphasis detection', () => {
    it('should detect primary emphasis from solid background', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            backgroundColor: 'rgb(59, 130, 246)',
            borderTopWidth: '0px'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.emphasis).toBe('primary');
    });

    it('should detect secondary emphasis from border-only styling', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            backgroundColor: 'transparent',
            borderTopWidth: '1px',
            color: 'rgb(0, 0, 0)'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.emphasis).toBe('secondary');
    });

    it('should detect ghost emphasis from text-only styling', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            backgroundColor: 'transparent',
            borderTopWidth: '0px',
            color: 'rgb(59, 130, 246)'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.emphasis).toBe('ghost');
    });
  });

  describe('Shape detection', () => {
    it('should detect pill shape from 50% border radius', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            borderRadius: '50%',
            height: '40px'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.shape).toBe('pill');
    });

    it('should detect pill shape from radius > height/2', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            borderRadius: '24px',
            height: '40px'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.shape).toBe('pill');
    });

    it('should detect rounded shape from non-zero border radius', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            borderRadius: '4px',
            height: '40px'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.shape).toBe('rounded');
    });

    it('should detect square shape from zero border radius', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: {
            paddingTop: '8px',
            borderRadius: '0px',
            height: '40px'
          },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);
      expect(analyzed[0].variant.shape).toBe('square');
    });
  });

  describe('Multi-type grouping', () => {
    it('should analyze different component types separately', () => {
      const components: DetectedComponent[] = [
        {
          type: 'button',
          selector: 'button-1',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '4px' },
          pageUrl: 'test'
        },
        {
          type: 'input',
          selector: 'input-1',
          element: {} as any,
          evidence: [],
          computedStyles: { paddingTop: '8px' },
          pageUrl: 'test'
        }
      ];

      const analyzed = analyzeVariants(components);

      // Each single-component group gets 'medium' as default
      expect(analyzed[0].variant.size).toBe('medium');
      expect(analyzed[1].variant.size).toBe('medium');
    });
  });

  describe('Empty input', () => {
    it('should return empty array for no components', () => {
      const analyzed = analyzeVariants([]);
      expect(analyzed).toEqual([]);
    });
  });
});
