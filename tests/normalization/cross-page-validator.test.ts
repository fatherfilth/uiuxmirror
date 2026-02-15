/**
 * Tests for cross-page validation
 * NORM-04: Only tokens appearing on 3+ pages are promoted to design standards
 */

import { describe, test, expect } from 'vitest';
import { validateCrossPage, type CrossPageResult } from '../../src/normalization/cross-page-validator.js';
import { detectSpacingScale, type SpacingScale } from '../../src/normalization/spacing-scale-detector.js';
import type { TokenEvidence } from '../../src/types/evidence.js';
import type { ColorToken } from '../../src/types/tokens.js';

// Helper to create mock tokens
function createMockToken(pageUrls: string[]): ColorToken {
  return {
    value: '#ff0000',
    originalValue: 'rgb(255, 0, 0)',
    category: 'unknown',
    context: 'background',
    evidence: pageUrls.map((pageUrl, idx) => ({
      pageUrl,
      selector: `div.element-${idx}`,
      timestamp: new Date().toISOString(),
      computedStyles: { color: '#ff0000' }
    }))
  };
}

describe('validateCrossPage', () => {
  test('token appearing on 5 pages (threshold 3) is validated as standard', () => {
    const tokens = [
      createMockToken(['/page1', '/page2', '/page3', '/page4', '/page5'])
    ];

    const results = validateCrossPage(tokens, 3, 10);

    expect(results).toHaveLength(1);
    expect(results[0].isStandard).toBe(true);
    expect(results[0].pageUrls.size).toBe(5);
  });

  test('token appearing on 2 pages (threshold 3) is filtered out', () => {
    const tokens = [
      createMockToken(['/page1', '/page2'])
    ];

    const results = validateCrossPage(tokens, 3, 10);

    expect(results).toHaveLength(1);
    expect(results[0].isStandard).toBe(false);
    expect(results[0].pageUrls.size).toBe(2);
  });

  test('token appearing on exactly 3 pages passes threshold', () => {
    const tokens = [
      createMockToken(['/page1', '/page2', '/page3'])
    ];

    const results = validateCrossPage(tokens, 3, 10);

    expect(results).toHaveLength(1);
    expect(results[0].isStandard).toBe(true);
    expect(results[0].pageUrls.size).toBe(3);
  });

  test('empty token list returns empty result', () => {
    const tokens: ColorToken[] = [];

    const results = validateCrossPage(tokens, 3, 10);

    expect(results).toHaveLength(0);
  });

  test('results sorted by confidence (most frequent first)', () => {
    const tokens = [
      createMockToken(['/page1', '/page2']),
      createMockToken(['/page1', '/page2', '/page3', '/page4', '/page5']),
      createMockToken(['/page1', '/page2', '/page3'])
    ];

    const results = validateCrossPage(tokens, 3, 10);

    expect(results).toHaveLength(3);
    expect(results[0].pageUrls.size).toBe(5); // Highest confidence first
    expect(results[1].pageUrls.size).toBe(3);
    expect(results[2].pageUrls.size).toBe(2); // Lowest confidence last
  });

  test('all tokens below threshold still returned with low confidence flag', () => {
    const tokens = [
      createMockToken(['/page1']),
      createMockToken(['/page1', '/page2'])
    ];

    const results = validateCrossPage(tokens, 3, 10);

    expect(results).toHaveLength(2);
    expect(results.every(r => !r.isStandard)).toBe(true);
  });

  test('occurrence count tracks total evidence entries', () => {
    const token = createMockToken(['/page1', '/page1', '/page2', '/page2', '/page3']);

    const results = validateCrossPage([token], 3, 10);

    expect(results[0].occurrenceCount).toBe(5); // 5 evidence entries
    expect(results[0].pageUrls.size).toBe(3); // 3 unique pages
  });
});

describe('detectSpacingScale', () => {
  test('values [4, 8, 12, 16, 24, 32] detect baseUnit 4 with full coverage', () => {
    const values = [4, 8, 12, 16, 24, 32];

    const scale = detectSpacingScale(values);

    expect(scale.baseUnit).toBe(4);
    expect(scale.scale).toEqual([4, 8, 12, 16, 24, 32]);
    expect(scale.coverage).toBe(1.0); // 100% coverage
  });

  test('values [8, 16, 24, 32, 48, 64] detect baseUnit 8', () => {
    const values = [8, 16, 24, 32, 48, 64];

    const scale = detectSpacingScale(values);

    expect(scale.baseUnit).toBe(8);
    expect(scale.scale).toEqual([8, 16, 24, 32, 48, 64]);
    expect(scale.coverage).toBe(1.0);
  });

  test('values [7, 13, 23, 41] detect baseUnit 1 (no clear scale)', () => {
    const values = [7, 13, 23, 41];

    const scale = detectSpacingScale(values);

    expect(scale.baseUnit).toBe(1);
    expect(scale.coverage).toBeLessThan(1.0); // Poor coverage
  });

  test('empty array returns baseUnit 1, empty scale', () => {
    const values: number[] = [];

    const scale = detectSpacingScale(values);

    expect(scale.baseUnit).toBe(1);
    expect(scale.scale).toEqual([]);
    expect(scale.coverage).toBe(0);
  });

  test('coverage calculation is correct for partial match', () => {
    // 4, 8, 12 are multiples of 4, but 10 is not
    const values = [4, 8, 10, 12];

    const scale = detectSpacingScale(values);

    expect(scale.baseUnit).toBe(2); // GCD of 4, 8, 10, 12
    expect(scale.coverage).toBeCloseTo(0.75, 1); // 3/4 = 75%
  });
});
