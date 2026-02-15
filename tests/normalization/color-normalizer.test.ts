/**
 * Tests for CIEDE2000 color deduplication
 * Uses culori for perceptual color distance in LAB space
 */

import { describe, it, expect } from 'vitest';
import type { ColorToken } from '../../src/types/tokens.js';
import type { ColorCluster } from '../../src/types/normalized-tokens.js';
import { deduplicateColors } from '../../src/normalization/color-normalizer.js';

describe('Color Normalizer - CIEDE2000 Clustering', () => {
  it('should cluster colors with deltaE < 2.3 together', () => {
    // #3b82f6 (blue-500) and slightly shifted variant
    // deltaE calculated in LAB space should be < 2.3 (just noticeable difference)
    const colors: ColorToken[] = [
      {
        value: '#3b82f6',
        originalValue: 'rgb(59, 130, 246)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn-primary',
            timestamp: '2026-02-15T00:00:00Z',
            computedStyles: { backgroundColor: 'rgb(59, 130, 246)' },
          },
        ],
      },
      {
        value: '#3c83f7', // Very similar to #3b82f6
        originalValue: 'rgb(60, 131, 247)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com/other',
            selector: '.btn-primary-alt',
            timestamp: '2026-02-15T00:01:00Z',
            computedStyles: { backgroundColor: 'rgb(60, 131, 247)' },
          },
        ],
      },
    ];

    const clusters = deduplicateColors(colors, 2.3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].canonical).toBe('#3b82f6');
    expect(clusters[0].variants).toContain('#3b82f6');
    expect(clusters[0].variants).toContain('#3c83f7');
    expect(clusters[0].occurrences).toBe(2);
    expect(clusters[0].evidence).toHaveLength(2);
  });

  it('should keep colors with deltaE > 2.3 in separate clusters', () => {
    const colors: ColorToken[] = [
      {
        value: '#3b82f6', // Blue
        originalValue: 'rgb(59, 130, 246)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn-primary',
            timestamp: '2026-02-15T00:00:00Z',
            computedStyles: { backgroundColor: 'rgb(59, 130, 246)' },
          },
        ],
      },
      {
        value: '#ef4444', // Red - clearly different
        originalValue: 'rgb(239, 68, 68)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn-danger',
            timestamp: '2026-02-15T00:01:00Z',
            computedStyles: { backgroundColor: 'rgb(239, 68, 68)' },
          },
        ],
      },
    ];

    const clusters = deduplicateColors(colors, 2.3);

    expect(clusters).toHaveLength(2);
    expect(clusters.map(c => c.canonical)).toContain('#3b82f6');
    expect(clusters.map(c => c.canonical)).toContain('#ef4444');
  });

  it('should create a single cluster for a single color', () => {
    const colors: ColorToken[] = [
      {
        value: '#3b82f6',
        originalValue: 'rgb(59, 130, 246)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn',
            timestamp: '2026-02-15T00:00:00Z',
            computedStyles: { backgroundColor: 'rgb(59, 130, 246)' },
          },
        ],
      },
    ];

    const clusters = deduplicateColors(colors, 2.3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].canonical).toBe('#3b82f6');
    expect(clusters[0].variants).toEqual(['#3b82f6']);
    expect(clusters[0].occurrences).toBe(1);
  });

  it('should return empty array for empty input', () => {
    const clusters = deduplicateColors([], 2.3);
    expect(clusters).toEqual([]);
  });

  it('should use first color as canonical (assumes sorted by frequency)', () => {
    const colors: ColorToken[] = [
      {
        value: '#3b82f6', // Most frequent (appears first)
        originalValue: 'rgb(59, 130, 246)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn-1',
            timestamp: '2026-02-15T00:00:00Z',
            computedStyles: { backgroundColor: 'rgb(59, 130, 246)' },
          },
        ],
      },
      {
        value: '#3c83f7', // Similar but less frequent
        originalValue: 'rgb(60, 131, 247)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn-2',
            timestamp: '2026-02-15T00:01:00Z',
            computedStyles: { backgroundColor: 'rgb(60, 131, 247)' },
          },
        ],
      },
    ];

    const clusters = deduplicateColors(colors, 2.3);

    expect(clusters[0].canonical).toBe('#3b82f6');
  });

  it('should merge evidence arrays across clustered colors', () => {
    const colors: ColorToken[] = [
      {
        value: '#3b82f6',
        originalValue: 'rgb(59, 130, 246)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com',
            selector: '.btn-1',
            timestamp: '2026-02-15T00:00:00Z',
            computedStyles: { backgroundColor: 'rgb(59, 130, 246)' },
          },
        ],
      },
      {
        value: '#3c83f7',
        originalValue: 'rgb(60, 131, 247)',
        category: 'primary',
        context: 'background',
        evidence: [
          {
            pageUrl: 'https://example.com/other',
            selector: '.btn-2',
            timestamp: '2026-02-15T00:01:00Z',
            computedStyles: { backgroundColor: 'rgb(60, 131, 247)' },
          },
          {
            pageUrl: 'https://example.com/third',
            selector: '.btn-3',
            timestamp: '2026-02-15T00:02:00Z',
            computedStyles: { backgroundColor: 'rgb(60, 131, 247)' },
          },
        ],
      },
    ];

    const clusters = deduplicateColors(colors, 2.3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].evidence).toHaveLength(3);
    expect(clusters[0].evidence.map(e => e.selector)).toContain('.btn-1');
    expect(clusters[0].evidence.map(e => e.selector)).toContain('.btn-2');
    expect(clusters[0].evidence.map(e => e.selector)).toContain('.btn-3');
  });
});
