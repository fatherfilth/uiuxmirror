/**
 * Shared test fixtures for synthesis tests
 * Mock DesignDNA object that mimics real Phase 2 output
 */

import type { DesignDNA } from '../../src/types/synthesis.js';
import type { NormalizationResult } from '../../src/normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../src/components/component-aggregator.js';

/**
 * Mock DesignDNA with realistic Phase 2 output structure
 * Includes colors, typography, spacing, radius, shadow, motion, and components
 */
export const mockDesignDNA: DesignDNA = {
  tokens: {
    colors: {
      standards: [
        {
          token: {
            canonical: '#1a73e8',
            variants: ['#1a73e8', '#1a74e8'],
            occurrences: 45,
            contexts: ['background', 'border'],
            pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
            evidence: [],
          },
          occurrenceCount: 45,
          confidence: 0.95,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
        },
        {
          token: {
            canonical: '#ffffff',
            variants: ['#ffffff', '#fff'],
            occurrences: 38,
            contexts: ['text', 'background'],
            pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
            evidence: [],
          },
          occurrenceCount: 38,
          confidence: 0.92,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
        {
          token: {
            canonical: '#202124',
            variants: ['#202124', '#212121'],
            occurrences: 32,
            contexts: ['text'],
            pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
            evidence: [],
          },
          occurrenceCount: 32,
          confidence: 0.88,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
        },
        {
          token: {
            canonical: '#dadce0',
            variants: ['#dadce0', '#e0e0e0'],
            occurrences: 28,
            contexts: ['border'],
            pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
            evidence: [],
          },
          occurrenceCount: 28,
          confidence: 0.85,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
        {
          token: {
            canonical: '#f8f9fa',
            variants: ['#f8f9fa', '#fafafa'],
            occurrences: 25,
            contexts: ['background'],
            pageUrls: ['https://example.com/page1', 'https://example.com/page3'],
            evidence: [],
          },
          occurrenceCount: 25,
          confidence: 0.82,
          pageUrls: ['https://example.com/page1', 'https://example.com/page3'],
        },
      ],
    },
    typography: {
      standards: [
        {
          token: {
            family: 'Arial, sans-serif',
            weight: 700,
            normalizedSize: { pixels: 24, original: '24px' },
            lineHeight: '1.2',
            letterSpacing: '0',
          },
          occurrenceCount: 15,
          confidence: 0.90,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
        {
          token: {
            family: 'Arial, sans-serif',
            weight: 400,
            normalizedSize: { pixels: 16, original: '16px' },
            lineHeight: '1.5',
            letterSpacing: '0',
          },
          occurrenceCount: 42,
          confidence: 0.95,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
        },
        {
          token: {
            family: 'Arial, sans-serif',
            weight: 400,
            normalizedSize: { pixels: 14, original: '14px' },
            lineHeight: '1.4',
            letterSpacing: '0',
          },
          occurrenceCount: 22,
          confidence: 0.85,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
      ],
    },
    spacing: {
      standards: [
        {
          token: {
            normalizedValue: { pixels: 4, original: '4px' },
            contexts: ['padding', 'margin'],
          },
          occurrenceCount: 18,
          confidence: 0.80,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
        {
          token: {
            normalizedValue: { pixels: 8, original: '8px' },
            contexts: ['padding', 'margin'],
          },
          occurrenceCount: 35,
          confidence: 0.92,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
        },
        {
          token: {
            normalizedValue: { pixels: 16, original: '16px' },
            contexts: ['padding', 'margin'],
          },
          occurrenceCount: 40,
          confidence: 0.95,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
        },
        {
          token: {
            normalizedValue: { pixels: 24, original: '24px' },
            contexts: ['padding', 'margin'],
          },
          occurrenceCount: 22,
          confidence: 0.88,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
        {
          token: {
            normalizedValue: { pixels: 32, original: '32px' },
            contexts: ['padding', 'margin'],
          },
          occurrenceCount: 15,
          confidence: 0.82,
          pageUrls: ['https://example.com/page1'],
        },
      ],
      scale: {
        baseUnit: 4,
        values: [4, 8, 16, 24, 32],
        coverage: 0.92,
      },
    },
    radii: {
      standards: [
        {
          token: {
            value: '4px',
            contexts: ['button', 'input'],
          },
          occurrenceCount: 28,
          confidence: 0.90,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
        },
        {
          token: {
            value: '8px',
            contexts: ['card'],
          },
          occurrenceCount: 18,
          confidence: 0.85,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
      ],
    },
    shadows: {
      standards: [
        {
          token: {
            value: '0 1px 3px rgba(0, 0, 0, 0.12)',
            contexts: ['card', 'button'],
          },
          occurrenceCount: 22,
          confidence: 0.88,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
        {
          token: {
            value: '0 4px 6px rgba(0, 0, 0, 0.1)',
            contexts: ['card'],
          },
          occurrenceCount: 15,
          confidence: 0.82,
          pageUrls: ['https://example.com/page1'],
        },
      ],
    },
    motion: {
      standards: [
        {
          token: {
            value: '150ms ease-in-out',
            contexts: ['button', 'link'],
          },
          occurrenceCount: 20,
          confidence: 0.85,
          pageUrls: ['https://example.com/page1', 'https://example.com/page2'],
        },
      ],
    },
  } as NormalizationResult,
  components: [
    {
      type: 'button',
      canonicalStyles: {
        backgroundColor: '#1a73e8',
        color: '#ffffff',
        padding: '8px 16px',
        borderRadius: '4px',
        border: 'none',
        fontSize: '16px',
        fontWeight: '400',
      },
      variants: {
        size: [
          { name: 'small', styles: { padding: '4px 8px', fontSize: '14px' } },
          { name: 'medium', styles: { padding: '8px 16px', fontSize: '16px' } },
          { name: 'large', styles: { padding: '12px 24px', fontSize: '18px' } },
        ],
        emphasis: [
          { name: 'primary', styles: { backgroundColor: '#1a73e8', color: '#ffffff' } },
          { name: 'secondary', styles: { backgroundColor: '#f8f9fa', color: '#202124', border: '1px solid #dadce0' } },
        ],
      },
      states: {
        hover: { backgroundColor: '#1557b0' },
        active: { backgroundColor: '#0d47a1' },
        focus: { outline: '2px solid #1a73e8', outlineOffset: '2px' },
        disabled: { backgroundColor: '#dadce0', color: '#5f6368', cursor: 'not-allowed' },
      },
      frequency: {
        totalInstances: 45,
        pageCount: 3,
        pagesWithComponent: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
      },
      confidence: 0.92,
      confidenceLevel: 'high',
    },
    {
      type: 'card',
      canonicalStyles: {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        border: '1px solid #dadce0',
      },
      variants: {
        size: [],
        emphasis: [],
      },
      states: null,
      frequency: {
        totalInstances: 28,
        pageCount: 3,
        pagesWithComponent: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3'],
      },
      confidence: 0.88,
      confidenceLevel: 'high',
    },
  ] as AggregatedComponent[],
  metadata: {
    sourceUrl: 'https://example.com',
    crawlDate: new Date().toISOString(),
    totalPages: 3,
  },
};
