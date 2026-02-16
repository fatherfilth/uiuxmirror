/**
 * Tests for SKILL.md generator
 * Verifies frontmatter, domain slug extraction, section generation,
 * empty data handling, and conditional sections
 */

import { describe, it, expect } from 'vitest';
import { generateSkillMD, extractDomainSlug, type SkillMDInput } from '../../src/export/formatters/skill-md.js';
import type { NormalizationResult } from '../../src/normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../src/components/component-aggregator.js';
import type { ContentStyleResult } from '../../src/types/content-style.js';

/**
 * Build minimal mock NormalizationResult for testing
 */
function buildMockTokens(overrides?: Partial<NormalizationResult>): NormalizationResult {
  return {
    colors: {
      clusters: [],
      standards: [
        {
          token: {
            canonical: '#3b82f6',
            variants: ['#3b82f6', '#3a80f4'],
            occurrences: 42,
            evidence: [{ pageUrl: 'https://example.com', selector: '.btn', timestamp: '', computedStyles: {} }],
          },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 42,
          confidence: 0.9,
          isStandard: true,
        },
        {
          token: {
            canonical: '#e5e7eb',
            variants: ['#e5e7eb'],
            occurrences: 30,
            evidence: [{ pageUrl: 'https://example.com', selector: '.bg', timestamp: '', computedStyles: {} }],
          },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 30,
          confidence: 0.8,
          isStandard: true,
        },
      ],
      all: [],
    },
    typography: {
      normalized: [],
      standards: [
        {
          token: {
            family: 'Inter',
            size: '32px',
            sizePixels: 32,
            weight: 700,
            lineHeight: '1.2',
            letterSpacing: 'normal',
            evidence: [],
            normalizedSize: { pixels: 32, original: '32px', unit: 'px' },
          },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 20,
          confidence: 0.85,
          isStandard: true,
        },
        {
          token: {
            family: 'Inter',
            size: '16px',
            sizePixels: 16,
            weight: 400,
            lineHeight: '1.5',
            letterSpacing: 'normal',
            evidence: [],
            normalizedSize: { pixels: 16, original: '16px', unit: 'px' },
          },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 50,
          confidence: 0.95,
          isStandard: true,
        },
      ],
      all: [],
    },
    spacing: {
      normalized: [],
      scale: { baseUnit: 8, values: [4, 8, 16, 24, 32], confidence: 0.9, tolerance: 0 },
      standards: [
        {
          token: {
            value: '8px',
            valuePixels: 8,
            context: 'padding',
            evidence: [],
            normalizedValue: { pixels: 8, original: '8px', unit: 'px' },
          },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 60,
          confidence: 0.9,
          isStandard: true,
        },
        {
          token: {
            value: '16px',
            valuePixels: 16,
            context: 'margin',
            evidence: [],
            normalizedValue: { pixels: 16, original: '16px', unit: 'px' },
          },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 40,
          confidence: 0.85,
          isStandard: true,
        },
      ],
      all: [],
    },
    radii: {
      standards: [
        {
          token: { value: '4px', valuePixels: 4, evidence: [] },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 25,
          confidence: 0.8,
          isStandard: true,
        },
        {
          token: { value: '8px', valuePixels: 8, evidence: [] },
          pageUrls: new Set(['p1', 'p2', 'p3']),
          occurrenceCount: 15,
          confidence: 0.7,
          isStandard: true,
        },
      ],
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
    dtcg: {} as any,
    metadata: {
      totalPages: 10,
      minPageThreshold: 3,
      baseFontSize: 16,
      timestamp: '2026-02-15T00:00:00Z',
    },
    ...overrides,
  } as NormalizationResult;
}

function buildMockInput(overrides?: Partial<SkillMDInput>): SkillMDInput {
  return {
    tokens: buildMockTokens(overrides?.tokens as any),
    components: overrides?.components ?? [],
    contentStyle: overrides?.contentStyle ?? {
      voicePatterns: [],
      capitalizationPatterns: [],
      ctaHierarchy: [],
      errorPatterns: [],
      totalSamples: 0,
      confidence: 0,
    },
    metadata: overrides?.metadata ?? {
      sourceUrl: 'https://www.cooked.com/recipes',
      crawlDate: '2026-02-15T00:00:00Z',
      totalPages: 20,
    },
  };
}

// --- Domain Slug Tests ---

describe('extractDomainSlug', () => {
  it('should extract domain and convert dots to hyphens', () => {
    expect(extractDomainSlug('https://www.cooked.com')).toBe('cooked-com');
  });

  it('should strip www prefix', () => {
    expect(extractDomainSlug('https://www.example.org/page')).toBe('example-org');
  });

  it('should handle URLs without www', () => {
    expect(extractDomainSlug('https://app.stripe.com/dashboard')).toBe('app-stripe-com');
  });

  it('should handle subdomains', () => {
    expect(extractDomainSlug('https://docs.github.com')).toBe('docs-github-com');
  });

  it('should return fallback for invalid URLs', () => {
    expect(extractDomainSlug('not-a-url')).toBe('unknown-site');
  });

  it('should return fallback for empty string', () => {
    expect(extractDomainSlug('')).toBe('unknown-site');
  });
});

// --- YAML Frontmatter Tests ---

describe('generateSkillMD - frontmatter', () => {
  it('should start with YAML frontmatter delimiters', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result.startsWith('---\n')).toBe(true);
    expect(result).toContain('\n---\n');
  });

  it('should include name field with domain slug', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('name: cooked-com-style');
  });

  it('should include description field', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('description: Replicate the design system of cooked.com');
  });
});

// --- Color Section Tests ---

describe('generateSkillMD - colors', () => {
  it('should include Color Palette section', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('## Color Palette');
  });

  it('should include hex values from token data', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('#3b82f6');
    expect(result).toContain('#e5e7eb');
  });

  it('should include CSS variable references', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('var(--');
  });
});

// --- Typography Section Tests ---

describe('generateSkillMD - typography', () => {
  it('should include Typography section', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('## Typography');
  });

  it('should list font families', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('Inter');
  });

  it('should include font sizes', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('32px');
    expect(result).toContain('16px');
  });
});

// --- Spacing Section Tests ---

describe('generateSkillMD - spacing', () => {
  it('should include Spacing Scale section', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('## Spacing Scale');
  });

  it('should show base unit', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('Base unit');
    expect(result).toContain('8px');
  });
});

// --- Border Radius Section Tests ---

describe('generateSkillMD - radius', () => {
  it('should include Border Radius section', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('## Border Radius');
  });

  it('should include radius values', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('4px');
  });
});

// --- Conditional Sections ---

describe('generateSkillMD - conditional sections', () => {
  it('should omit Shadows section when no shadow tokens', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).not.toContain('## Shadows');
  });

  it('should include Shadows section when shadow tokens exist', () => {
    const input = buildMockInput();
    (input.tokens as any).shadows.standards = [
      {
        token: {
          value: '0 2px 4px rgba(0,0,0,0.1)',
          layers: [{ offsetX: '0', offsetY: '2px', blur: '4px', spread: '0px', color: 'rgba(0,0,0,0.1)', inset: false }],
          evidence: [],
        },
        pageUrls: new Set(['p1', 'p2', 'p3']),
        occurrenceCount: 10,
        confidence: 0.7,
        isStandard: true,
      },
    ];
    const result = generateSkillMD(input);
    expect(result).toContain('## Shadows');
  });

  it('should omit Motion section when no motion tokens', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).not.toContain('## Motion');
  });

  it('should include Motion section when motion tokens exist', () => {
    const input = buildMockInput();
    (input.tokens as any).motion.standards = [
      {
        token: { property: 'duration', value: '200ms', evidence: [] },
        pageUrls: new Set(['p1', 'p2', 'p3']),
        occurrenceCount: 15,
        confidence: 0.75,
        isStandard: true,
      },
    ];
    const result = generateSkillMD(input);
    expect(result).toContain('## Motion & Animation');
  });

  it('should omit Components section when no components', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).not.toContain('## Components');
  });

  it('should include Components section when components exist', () => {
    const input = buildMockInput({
      components: [
        {
          type: 'button',
          instances: [],
          pageUrls: new Set(['p1', 'p2']),
          variants: [],
          states: null,
          confidence: null,
          canonical: {
            styles: { 'background-color': '#3b82f6', 'border-radius': '4px' },
            variant: {} as any,
          },
        },
      ] as any[],
    });
    const result = generateSkillMD(input);
    expect(result).toContain('## Components');
    expect(result).toContain('### button');
  });

  it('should omit Content Style section when no content data', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).not.toContain('## Content Style');
  });

  it('should include Content Style section when voice patterns exist', () => {
    const input = buildMockInput({
      contentStyle: {
        voicePatterns: [
          { tone: 'friendly', tense: 'imperative', perspective: 'second-person', examples: ['Click here'], confidence: 0.8 },
        ],
        capitalizationPatterns: [
          { style: 'sentence-case', examples: ['Get started'], frequency: 10, contexts: ['button'], confidence: 0.9 },
        ],
        ctaHierarchy: [],
        errorPatterns: [],
        totalSamples: 50,
        confidence: 0.8,
      },
    });
    const result = generateSkillMD(input);
    expect(result).toContain('## Content Style');
    expect(result).toContain('friendly');
  });
});

// --- Quick Reference ---

describe('generateSkillMD - quick reference', () => {
  it('should include Quick Reference section', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain('## Quick Reference');
  });

  it('should include :root CSS block', () => {
    const result = generateSkillMD(buildMockInput());
    expect(result).toContain(':root {');
    expect(result).toContain('}');
  });

  it('should include CSS variables in quick reference', () => {
    const result = generateSkillMD(buildMockInput());
    // The quick reference block should have -- prefixed variables
    const quickRefMatch = result.split('## Quick Reference')[1];
    expect(quickRefMatch).toContain('--');
  });
});

// --- Empty Data ---

describe('generateSkillMD - empty data', () => {
  it('should not crash with completely empty tokens', () => {
    const input = buildMockInput();
    (input.tokens as any).colors.standards = [];
    (input.tokens as any).typography.standards = [];
    (input.tokens as any).spacing.standards = [];
    (input.tokens as any).radii.standards = [];
    const result = generateSkillMD(input);
    expect(result).toBeTruthy();
    expect(result).toContain('---');
    expect(result).toContain('## Color Palette');
  });

  it('should show fallback text for empty color section', () => {
    const input = buildMockInput();
    (input.tokens as any).colors.standards = [];
    const result = generateSkillMD(input);
    expect(result).toContain('No color tokens extracted');
  });
});
