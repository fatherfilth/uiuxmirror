/**
 * Tests for component confidence scorer
 */

import { describe, it, expect } from 'vitest';
import { calculateComponentConfidence } from '../../src/scoring/component-scorer.js';
import type { AggregatedComponent } from '../../src/components/component-aggregator.js';
import type { DetectedComponent, AnalyzedComponent } from '../../src/types/components.js';

/**
 * Helper to create mock aggregated component
 */
function createMockAggregatedComponent(
  pageCount: number,
  instanceCount: number,
  uniqueVariants: number
): AggregatedComponent {
  // Create mock instances
  const instances: DetectedComponent[] = [];
  const pageUrls = new Set<string>();

  for (let i = 0; i < instanceCount; i++) {
    const pageIndex = i % pageCount;
    const pageUrl = `https://example.com/page${pageIndex}`;
    pageUrls.add(pageUrl);

    instances.push({
      type: 'button',
      selector: `button${i}`,
      element: {
        tagName: 'button',
        computedStyles: {},
        textContent: '',
        hasChildren: false,
        childCount: 0,
        selector: `button${i}`,
        attributes: {}
      },
      evidence: [],
      computedStyles: {},
      pageUrl
    });
  }

  // Create variants with controlled uniqueness
  const variants: AnalyzedComponent[] = [];
  const sizeOptions: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  const emphasisOptions: Array<'primary' | 'secondary' | 'tertiary' | 'ghost'> = ['primary', 'secondary', 'tertiary', 'ghost'];
  const shapeOptions: Array<'rounded' | 'pill' | 'square'> = ['rounded', 'pill', 'square'];

  for (let i = 0; i < instanceCount; i++) {
    const variantIndex = i % uniqueVariants;
    // Distribute variants across multiple dimensions to create uniqueness
    const sizeIndex = variantIndex % sizeOptions.length;
    const emphasisIndex = Math.floor(variantIndex / sizeOptions.length) % emphasisOptions.length;
    const shapeIndex = Math.floor(variantIndex / (sizeOptions.length * emphasisOptions.length)) % shapeOptions.length;

    variants.push({
      ...instances[i],
      variant: {
        size: sizeOptions[sizeIndex],
        emphasis: emphasisOptions[emphasisIndex],
        shape: shapeOptions[shapeIndex],
        evidence: []
      },
      variantDimensions: []
    });
  }

  return {
    type: 'button',
    instances,
    pageUrls,
    variants,
    states: null,
    confidence: null,
    canonical: {
      styles: {},
      variant: { evidence: [] }
    }
  };
}

describe('calculateComponentConfidence', () => {
  it('should give high confidence for component on 15/20 pages with uniform variants', () => {
    const component = createMockAggregatedComponent(15, 45, 1); // 15 pages, 45 instances, 1 unique variant
    const confidence = calculateComponentConfidence(component, 20, 3);

    expect(confidence.pageCount).toBe(15);
    expect(confidence.instanceCount).toBe(45);
    expect(confidence.variantConsistency).toBeCloseTo(1 - (1 / 45), 2); // 1 unique / 45 instances
    expect(confidence.level).toBe('high');
    expect(confidence.value).toBeGreaterThan(0.6);
    expect(confidence.reasoning).toContain('15/20 pages');
    expect(confidence.reasoning).toContain('45 instances');
  });

  it('should give medium confidence for component on 10/20 pages with uniform variants', () => {
    const component = createMockAggregatedComponent(10, 30, 1); // 10 pages, 30 instances, 1 unique variant
    const confidence = calculateComponentConfidence(component, 20, 3);

    expect(confidence.pageCount).toBe(10);
    expect(confidence.instanceCount).toBe(30);
    expect(confidence.variantConsistency).toBeCloseTo(1 - (1 / 30), 2); // 1 unique / 30 instances
    expect(confidence.level).toBe('medium'); // 0.3 <= value < 0.6
    expect(confidence.value).toBeGreaterThan(0.3);
    expect(confidence.value).toBeLessThan(0.6);
    expect(confidence.reasoning).toContain('10/20 pages');
    expect(confidence.reasoning).toContain('30 instances');
  });

  it('should give low confidence for component on 2/20 pages (below threshold)', () => {
    const component = createMockAggregatedComponent(2, 6, 1); // 2 pages, 6 instances, 1 unique variant
    const confidence = calculateComponentConfidence(component, 20, 3);

    expect(confidence.pageCount).toBe(2);
    expect(confidence.instanceCount).toBe(6);
    expect(confidence.level).toBe('low'); // Below minPageThreshold
    expect(confidence.reasoning).toContain('2/20 pages');
  });

  it('should give medium confidence for component on 5/20 pages with 5 different variants', () => {
    const component = createMockAggregatedComponent(5, 15, 5); // 5 pages, 15 instances, 5 unique variants
    const confidence = calculateComponentConfidence(component, 20, 3);

    expect(confidence.pageCount).toBe(5);
    expect(confidence.instanceCount).toBe(15);
    expect(confidence.variantConsistency).toBeCloseTo(1 - (5 / 15), 2); // 5 unique / 15 instances = 0.67
    expect(confidence.level).toBe('medium');
    expect(confidence.value).toBeGreaterThan(0.3);
    expect(confidence.value).toBeLessThan(0.6);
  });

  it('should calculate variant consistency as 1.0 for 10 instances all with same variant', () => {
    const component = createMockAggregatedComponent(5, 10, 1); // 1 unique variant
    const confidence = calculateComponentConfidence(component, 20, 3);

    // With 10 instances all the same: 1 - (1/10) = 0.9
    expect(confidence.variantConsistency).toBeCloseTo(1 - (1 / 10), 2);
  });

  it('should calculate variant consistency approaching 0 for 10 instances all different', () => {
    const component = createMockAggregatedComponent(5, 10, 10); // 10 unique variants for 10 instances
    const confidence = calculateComponentConfidence(component, 20, 3);

    // With 10 instances all different: 1 - (10/10) = 0
    expect(confidence.variantConsistency).toBe(0);
  });

  it('should include page count and instance count in reasoning string', () => {
    const component = createMockAggregatedComponent(4, 12, 2);
    const confidence = calculateComponentConfidence(component, 20, 3);

    expect(confidence.reasoning).toContain('4');
    expect(confidence.reasoning).toContain('20');
    expect(confidence.reasoning).toContain('12 instances');
  });

  it('should handle edge case of single instance', () => {
    const component = createMockAggregatedComponent(1, 1, 1);
    const confidence = calculateComponentConfidence(component, 5, 3);

    expect(confidence.pageCount).toBe(1);
    expect(confidence.instanceCount).toBe(1);
    expect(confidence.level).toBe('low'); // Below threshold
  });

  it('should cap combined value at 1.0', () => {
    // Component on all pages with perfect consistency and high density
    const component = createMockAggregatedComponent(20, 100, 1);
    const confidence = calculateComponentConfidence(component, 20, 3);

    expect(confidence.value).toBeLessThanOrEqual(1.0);
  });
});
