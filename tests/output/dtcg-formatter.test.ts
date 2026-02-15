/**
 * Tests for W3C DTCG format output
 */

import { describe, it, expect } from 'vitest';
import {
  formatColorToken,
  formatTypographyToken,
  formatSpacingToken,
  formatRadiusToken,
  formatShadowToken,
  formatMotionToken,
  formatAllTokens,
} from '../../src/output/dtcg-formatter.js';
import { validateDTCGOutputSync } from '../../src/output/schema-validator.js';
import type { ColorCluster, NormalizedTypographyToken, NormalizedSpacingToken } from '../../src/types/normalized-tokens.js';
import type { RadiusToken, ShadowToken, MotionToken } from '../../src/types/tokens.js';
import type { ConfidenceScore } from '../../src/scoring/token-scorer.js';
import type { NormalizationResult } from '../../src/output/dtcg-formatter.js';

describe('DTCG Formatter', () => {
  describe('formatColorToken', () => {
    it('should format color cluster into DTCG color token', () => {
      const cluster: ColorCluster = {
        canonical: '#ff0000',
        variants: ['#ff0000', '#fe0101'],
        evidence: [
          { pageUrl: 'http://example.com/page1', selector: '.red', screenshot: 'screenshot1.png', extractedAt: '2024-01-01' },
          { pageUrl: 'http://example.com/page2', selector: '.red', screenshot: 'screenshot2.png', extractedAt: '2024-01-01' },
        ],
        occurrences: 2,
      };

      const confidence: ConfidenceScore = {
        value: 0.5,
        level: 'medium',
        reasoning: 'Appears on 2/4 pages',
      };

      const result = formatColorToken('primary-red', cluster, confidence);

      expect(result.$type).toBe('color');
      expect(result.$value).toBe('#ff0000');
      expect(result.$description).toContain('2 elements');
      expect(result.$description).toContain('2 pages');
      expect(result.$extensions?.['com.uiux-mirror']).toEqual({
        confidence: 0.5,
        level: 'medium',
        occurrences: 2,
        variants: ['#ff0000', '#fe0101'],
        evidenceCount: 2,
      });
    });

    it('should include correct hex value in $value', () => {
      const cluster: ColorCluster = {
        canonical: '#3b82f6',
        variants: ['#3b82f6'],
        evidence: [
          { pageUrl: 'http://example.com', selector: '.blue', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
        ],
        occurrences: 1,
      };

      const confidence: ConfidenceScore = {
        value: 0.8,
        level: 'high',
        reasoning: 'High confidence',
      };

      const result = formatColorToken('blue', cluster, confidence);

      expect(result.$value).toBe('#3b82f6');
    });
  });

  describe('formatTypographyToken', () => {
    it('should format typography token with $type "typography"', () => {
      const token: NormalizedTypographyToken = {
        family: 'Inter, sans-serif',
        size: '16px',
        sizePixels: 16,
        weight: 400,
        lineHeight: '1.5',
        letterSpacing: '0',
        normalizedSize: {
          pixels: 16,
          original: '1rem',
          unit: 'rem',
          baseFontSize: 16,
        },
        evidence: [
          { pageUrl: 'http://example.com', selector: 'p', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
        ],
      };

      const confidence: ConfidenceScore = {
        value: 0.7,
        level: 'high',
        reasoning: 'High confidence',
      };

      const result = formatTypographyToken('body-text', token, confidence);

      expect(result.$type).toBe('typography');
      expect(result.$value).toEqual({
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        fontWeight: 400,
        lineHeight: '1.5',
        letterSpacing: '0',
      });
      expect(result.$extensions?.['com.uiux-mirror']).toMatchObject({
        confidence: 0.7,
        level: 'high',
        normalizedSizePixels: 16,
        evidenceCount: 1,
      });
    });

    it('should preserve font properties in $value', () => {
      const token: NormalizedTypographyToken = {
        family: 'Roboto',
        size: '24px',
        sizePixels: 24,
        weight: 700,
        lineHeight: '1.2',
        letterSpacing: '-0.5px',
        normalizedSize: {
          pixels: 24,
          original: '24px',
          unit: 'px',
        },
        evidence: [],
      };

      const confidence: ConfidenceScore = {
        value: 0.6,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatTypographyToken('heading', token, confidence);

      expect(result.$value.fontFamily).toBe('Roboto');
      expect(result.$value.fontSize).toBe('24px');
      expect(result.$value.fontWeight).toBe(700);
      expect(result.$value.lineHeight).toBe('1.2');
      expect(result.$value.letterSpacing).toBe('-0.5px');
    });
  });

  describe('formatSpacingToken', () => {
    it('should format spacing token with $type "dimension"', () => {
      const token: NormalizedSpacingToken = {
        value: '16px',
        valuePixels: 16,
        context: 'padding',
        normalizedValue: {
          pixels: 16,
          original: '1rem',
          unit: 'rem',
          baseFontSize: 16,
        },
        evidence: [
          { pageUrl: 'http://example.com', selector: '.container', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
        ],
      };

      const confidence: ConfidenceScore = {
        value: 0.5,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatSpacingToken('spacing-md', token, confidence);

      expect(result.$type).toBe('dimension');
      expect(result.$value).toBe('16px');
      expect(result.$extensions?.['com.uiux-mirror']).toMatchObject({
        confidence: 0.5,
        level: 'medium',
        normalizedValuePixels: 16,
        context: 'padding',
        evidenceCount: 1,
      });
    });

    it('should preserve original value', () => {
      const token: NormalizedSpacingToken = {
        value: '2rem',
        valuePixels: 32,
        context: 'margin',
        normalizedValue: {
          pixels: 32,
          original: '2rem',
          unit: 'rem',
        },
        evidence: [],
      };

      const confidence: ConfidenceScore = {
        value: 0.4,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatSpacingToken('spacing-lg', token, confidence);

      expect(result.$value).toBe('2rem');
    });
  });

  describe('formatRadiusToken', () => {
    it('should format radius token with $type "dimension"', () => {
      const token: RadiusToken = {
        value: '8px',
        valuePixels: 8,
        evidence: [
          { pageUrl: 'http://example.com', selector: '.card', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
        ],
      };

      const confidence: ConfidenceScore = {
        value: 0.6,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatRadiusToken('radius-sm', token, confidence);

      expect(result.$type).toBe('dimension');
      expect(result.$value).toBe('8px');
      expect(result.$extensions?.['com.uiux-mirror'].normalizedValuePixels).toBe(8);
    });
  });

  describe('formatShadowToken', () => {
    it('should format shadow token with $type "shadow"', () => {
      const token: ShadowToken = {
        value: '0 4px 8px rgba(0,0,0,0.1)',
        layers: [
          {
            offsetX: '0',
            offsetY: '4px',
            blur: '8px',
            spread: '0',
            color: 'rgba(0,0,0,0.1)',
            inset: false,
          },
        ],
        evidence: [
          { pageUrl: 'http://example.com', selector: '.shadow', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
        ],
      };

      const confidence: ConfidenceScore = {
        value: 0.5,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatShadowToken('shadow-md', token, confidence);

      expect(result.$type).toBe('shadow');
      expect(result.$value).toEqual({
        offsetX: '0',
        offsetY: '4px',
        blur: '8px',
        spread: '0',
        color: 'rgba(0,0,0,0.1)',
      });
      expect(result.$extensions?.['com.uiux-mirror'].layers).toBe(1);
    });

    it('should handle multi-layer shadows', () => {
      const token: ShadowToken = {
        value: '0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)',
        layers: [
          {
            offsetX: '0',
            offsetY: '2px',
            blur: '4px',
            spread: '0',
            color: 'rgba(0,0,0,0.1)',
            inset: false,
          },
          {
            offsetX: '0',
            offsetY: '4px',
            blur: '8px',
            spread: '0',
            color: 'rgba(0,0,0,0.2)',
            inset: false,
          },
        ],
        evidence: [],
      };

      const confidence: ConfidenceScore = {
        value: 0.7,
        level: 'high',
        reasoning: 'High confidence',
      };

      const result = formatShadowToken('shadow-layered', token, confidence);

      expect(Array.isArray(result.$value)).toBe(true);
      expect(result.$value).toHaveLength(2);
      expect(result.$extensions?.['com.uiux-mirror'].layers).toBe(2);
    });
  });

  describe('formatMotionToken', () => {
    it('should format duration token with $type "duration"', () => {
      const token: MotionToken = {
        property: 'duration',
        value: '200ms',
        durationMs: 200,
        evidence: [
          { pageUrl: 'http://example.com', selector: '.transition', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
        ],
      };

      const confidence: ConfidenceScore = {
        value: 0.6,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatMotionToken('duration-fast', token, confidence);

      expect(result.$type).toBe('duration');
      expect(result.$value).toBe('200ms');
      expect(result.$extensions?.['com.uiux-mirror'].durationMs).toBe(200);
    });

    it('should format easing token with $type "cubicBezier"', () => {
      const token: MotionToken = {
        property: 'easing',
        value: 'ease-in-out',
        evidence: [],
      };

      const confidence: ConfidenceScore = {
        value: 0.5,
        level: 'medium',
        reasoning: 'Medium confidence',
      };

      const result = formatMotionToken('easing-smooth', token, confidence);

      expect(result.$type).toBe('cubicBezier');
      expect(result.$value).toBe('ease-in-out');
    });
  });

  describe('formatAllTokens', () => {
    it('should organize tokens into hierarchical groups', () => {
      const mockResult: NormalizationResult = {
        colors: {
          clusters: [],
          standards: [
            {
              token: {
                canonical: '#3b82f6',
                variants: ['#3b82f6'],
                evidence: [
                  { pageUrl: 'http://example.com/1', selector: '.blue', screenshot: 'ss1.png', extractedAt: '2024-01-01' },
                  { pageUrl: 'http://example.com/2', selector: '.blue', screenshot: 'ss2.png', extractedAt: '2024-01-01' },
                ],
                occurrences: 2,
              },
              pageUrls: new Set(['http://example.com/1', 'http://example.com/2']),
              occurrenceCount: 2,
              confidence: 0.5,
              isStandard: true,
            },
          ],
          all: [],
        },
        typography: {
          normalized: [],
          standards: [],
          all: [],
        },
        spacing: {
          normalized: [],
          scale: { baseUnit: 8, scale: [8, 16, 24, 32], coverage: 1.0 },
          standards: [],
          all: [],
        },
        radii: {
          standards: [],
          all: [],
        },
        shadows: {
          standards: [],
          all: [],
        },
        motion: {
          standards: [],
          all: [],
        },
        dtcg: {},
        metadata: {
          totalPages: 4,
          minPageThreshold: 3,
          baseFontSize: 16,
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatAllTokens(mockResult);

      expect(result.colors).toBeDefined();
      expect(result.colors).toHaveProperty('color-1');
      expect((result.colors as any)['color-1'].$type).toBe('color');
      expect((result.colors as any)['color-1'].$value).toBe('#3b82f6');
    });

    it('should validate output with validateDTCGOutput', () => {
      const mockResult: NormalizationResult = {
        colors: {
          clusters: [],
          standards: [
            {
              token: {
                canonical: '#000000',
                variants: ['#000000'],
                evidence: [
                  { pageUrl: 'http://example.com', selector: '.black', screenshot: 'screenshot.png', extractedAt: '2024-01-01' },
                ],
                occurrences: 1,
              },
              pageUrls: new Set(['http://example.com']),
              occurrenceCount: 1,
              confidence: 0.25,
              isStandard: true,
            },
          ],
          all: [],
        },
        typography: {
          normalized: [],
          standards: [],
          all: [],
        },
        spacing: {
          normalized: [],
          scale: { baseUnit: 8, scale: [], coverage: 0 },
          standards: [],
          all: [],
        },
        radii: { standards: [], all: [] },
        shadows: { standards: [], all: [] },
        motion: { standards: [], all: [] },
        dtcg: {},
        metadata: {
          totalPages: 4,
          minPageThreshold: 3,
          baseFontSize: 16,
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const dtcg = formatAllTokens(mockResult);
      const validation = validateDTCGOutputSync(dtcg);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should include confidence metadata in extensions', () => {
      const mockResult: NormalizationResult = {
        colors: {
          clusters: [],
          standards: [
            {
              token: {
                canonical: '#ffffff',
                variants: ['#ffffff'],
                evidence: [
                  { pageUrl: 'http://example.com/1', selector: '.white', screenshot: 'ss1.png', extractedAt: '2024-01-01' },
                  { pageUrl: 'http://example.com/2', selector: '.white', screenshot: 'ss2.png', extractedAt: '2024-01-01' },
                  { pageUrl: 'http://example.com/3', selector: '.white', screenshot: 'ss3.png', extractedAt: '2024-01-01' },
                ],
                occurrences: 3,
              },
              pageUrls: new Set(['http://example.com/1', 'http://example.com/2', 'http://example.com/3']),
              occurrenceCount: 3,
              confidence: 0.75,
              isStandard: true,
            },
          ],
          all: [],
        },
        typography: { normalized: [], standards: [], all: [] },
        spacing: {
          normalized: [],
          scale: { baseUnit: 1, scale: [], coverage: 0 },
          standards: [],
          all: [],
        },
        radii: { standards: [], all: [] },
        shadows: { standards: [], all: [] },
        motion: { standards: [], all: [] },
        dtcg: {},
        metadata: {
          totalPages: 4,
          minPageThreshold: 3,
          baseFontSize: 16,
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatAllTokens(mockResult);

      const colorToken = (result.colors as any)['color-1'];
      expect(colorToken.$extensions['com.uiux-mirror']).toMatchObject({
        confidence: 0.75,
        level: 'high',
        occurrences: 3,
      });
    });
  });
});
