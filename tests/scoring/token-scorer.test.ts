/**
 * Tests for confidence scoring
 * NORM-05: Confidence scores range 0-1 based on page frequency and occurrence density
 */

import { describe, test, expect } from 'vitest';
import { calculateTokenConfidence, type ConfidenceScore } from '../../src/scoring/token-scorer.js';
import type { ColorToken } from '../../src/types/tokens.js';
import type { TokenEvidence } from '../../src/types/evidence.js';

// Helper to create mock token with specific page/occurrence counts
function createMockTokenWithEvidence(pageUrls: string[], occurrencesPerPage: number = 1): ColorToken {
  const evidence: TokenEvidence[] = [];

  pageUrls.forEach((pageUrl, pageIdx) => {
    for (let i = 0; i < occurrencesPerPage; i++) {
      evidence.push({
        pageUrl,
        selector: `div.element-${pageIdx}-${i}`,
        timestamp: new Date().toISOString(),
        computedStyles: { color: '#ff0000' }
      });
    }
  });

  return {
    value: '#ff0000',
    originalValue: 'rgb(255, 0, 0)',
    category: 'unknown',
    context: 'background',
    evidence
  };
}

describe('calculateTokenConfidence', () => {
  test('token on 10/20 pages = confidence ~0.5 (plus density bonus)', () => {
    const token = createMockTokenWithEvidence(
      Array.from({ length: 10 }, (_, i) => `/page${i + 1}`),
      1
    );

    const score = calculateTokenConfidence(token, 20, 3);

    expect(score.value).toBeGreaterThanOrEqual(0.5);
    expect(score.value).toBeLessThanOrEqual(0.6); // With minimal density bonus
  });

  test('token on 1/20 pages = low confidence', () => {
    const token = createMockTokenWithEvidence(['/page1'], 1);

    const score = calculateTokenConfidence(token, 20, 3);

    expect(score.value).toBeLessThan(0.3);
    expect(score.level).toBe('low');
  });

  test('token on 20/20 pages = high confidence (capped at 1.0)', () => {
    const token = createMockTokenWithEvidence(
      Array.from({ length: 20 }, (_, i) => `/page${i + 1}`),
      1
    );

    const score = calculateTokenConfidence(token, 20, 3);

    expect(score.value).toBeLessThanOrEqual(1.0);
    expect(score.level).toBe('high');
  });

  test('confidence level: < 3 pages = low', () => {
    const token = createMockTokenWithEvidence(['/page1', '/page2'], 1);

    const score = calculateTokenConfidence(token, 20, 3);

    expect(score.level).toBe('low');
  });

  test('confidence level: 0.3-0.6 = medium', () => {
    const token = createMockTokenWithEvidence(
      Array.from({ length: 7 }, (_, i) => `/page${i + 1}`),
      1
    );

    const score = calculateTokenConfidence(token, 20, 3);

    // 7/20 = 0.35, should be medium
    expect(score.level).toBe('medium');
  });

  test('confidence level: > 0.6 = high', () => {
    const token = createMockTokenWithEvidence(
      Array.from({ length: 15 }, (_, i) => `/page${i + 1}`),
      1
    );

    const score = calculateTokenConfidence(token, 20, 3);

    // 15/20 = 0.75, should be high
    expect(score.level).toBe('high');
  });

  test('density bonus: token appearing 50 times on 5 pages gets density boost', () => {
    const token = createMockTokenWithEvidence(
      Array.from({ length: 5 }, (_, i) => `/page${i + 1}`),
      10 // 10 occurrences per page = 50 total
    );

    const scoreWithDensity = calculateTokenConfidence(token, 20, 3);

    // Create baseline without density for comparison
    const baselineToken = createMockTokenWithEvidence(
      Array.from({ length: 5 }, (_, i) => `/page${i + 1}`),
      1
    );
    const scoreWithoutDensity = calculateTokenConfidence(baselineToken, 20, 3);

    expect(scoreWithDensity.value).toBeGreaterThan(scoreWithoutDensity.value);
  });

  test('reasoning string includes page count and occurrence count', () => {
    const token = createMockTokenWithEvidence(
      Array.from({ length: 5 }, (_, i) => `/page${i + 1}`),
      3
    );

    const score = calculateTokenConfidence(token, 20, 3);

    expect(score.reasoning).toContain('5'); // page count
    expect(score.reasoning).toContain('20'); // total pages
    expect(score.reasoning).toContain('15'); // total occurrences (5 pages × 3)
  });

  test('density bonus is capped at +0.2', () => {
    // Create token with extremely high density
    const token = createMockTokenWithEvidence(
      Array.from({ length: 2 }, (_, i) => `/page${i + 1}`),
      100 // 100 occurrences per page
    );

    const score = calculateTokenConfidence(token, 20, 3);

    // Raw confidence = 2/20 = 0.1
    // Density bonus capped at 0.2
    // Max possible = 0.1 + 0.2 = 0.3
    expect(score.value).toBeLessThanOrEqual(0.3);
  });
});
