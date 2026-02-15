/**
 * Integration tests for complete Phase 2 pipeline
 * Tests normalization and component aggregation with mock data
 */

import { describe, it, expect } from 'vitest';
import { normalizePipeline } from '../../src/normalization/normalize-pipeline.js';
import { aggregateComponents } from '../../src/components/component-aggregator.js';
import type { PageTokens, ColorToken, TypographyToken, SpacingToken } from '../../src/types/tokens.js';
import type { DetectedComponent } from '../../src/types/components.js';
import type { TokenEvidence } from '../../src/types/evidence.js';

/**
 * Create mock evidence
 */
function createMockEvidence(pageUrl: string, selector: string): TokenEvidence[] {
  return [{
    pageUrl,
    selector,
    timestamp: new Date().toISOString(),
    computedStyles: {}
  }];
}

describe('Phase 2 Normalization Pipeline', () => {
  it('should normalize colors, typography, and spacing from multiple pages', () => {
    // Create mock PageTokens for 5 pages with overlapping tokens
    const page1: PageTokens = {
      colors: [
        { value: '#1a73e8', originalValue: 'rgb(26, 115, 232)', category: 'unknown', context: 'background', evidence: createMockEvidence('https://example.com/page1', 'button') },
        { value: '#1a74e8', originalValue: 'rgb(26, 116, 232)', category: 'unknown', context: 'background', evidence: createMockEvidence('https://example.com/page1', 'a') }
      ],
      typography: [
        { family: 'Arial', size: '16px', sizePixels: 16, weight: 400, lineHeight: '1.5', letterSpacing: '0', evidence: createMockEvidence('https://example.com/page1', 'body') }
      ],
      spacing: [
        { value: '8px', valuePixels: 8, context: 'padding', evidence: createMockEvidence('https://example.com/page1', 'button') },
        { value: '16px', valuePixels: 16, context: 'margin', evidence: createMockEvidence('https://example.com/page1', 'div') }
      ],
      radii: [],
      shadows: [],
      motion: []
    };

    const page2: PageTokens = {
      colors: [
        { value: '#1a73e8', originalValue: '#1a73e8', category: 'unknown', context: 'background', evidence: createMockEvidence('https://example.com/page2', 'button') },
        { value: '#ffffff', originalValue: '#fff', category: 'unknown', context: 'text', evidence: createMockEvidence('https://example.com/page2', 'button') }
      ],
      typography: [
        { family: 'Arial', size: '16px', sizePixels: 16, weight: 400, lineHeight: '1.5', letterSpacing: '0', evidence: createMockEvidence('https://example.com/page2', 'body') },
        { family: 'Arial', size: '24px', sizePixels: 24, weight: 700, lineHeight: '1.2', letterSpacing: '0', evidence: createMockEvidence('https://example.com/page2', 'h1') }
      ],
      spacing: [
        { value: '8px', valuePixels: 8, context: 'padding', evidence: createMockEvidence('https://example.com/page2', 'button') }
      ],
      radii: [],
      shadows: [],
      motion: []
    };

    const page3: PageTokens = {
      colors: [
        { value: '#1a73e8', originalValue: 'rgb(26, 115, 232)', category: 'unknown', context: 'background', evidence: createMockEvidence('https://example.com/page3', 'button') }
      ],
      typography: [
        { family: 'Arial', size: '16px', sizePixels: 16, weight: 400, lineHeight: '1.5', letterSpacing: '0', evidence: createMockEvidence('https://example.com/page3', 'body') }
      ],
      spacing: [
        { value: '16px', valuePixels: 16, context: 'margin', evidence: createMockEvidence('https://example.com/page3', 'div') }
      ],
      radii: [],
      shadows: [],
      motion: []
    };

    const page4: PageTokens = {
      colors: [
        { value: '#1a73e8', originalValue: '#1a73e8', category: 'unknown', context: 'background', evidence: createMockEvidence('https://example.com/page4', 'button') }
      ],
      typography: [
        { family: 'Arial', size: '24px', sizePixels: 24, weight: 700, lineHeight: '1.2', letterSpacing: '0', evidence: createMockEvidence('https://example.com/page4', 'h1') }
      ],
      spacing: [
        { value: '8px', valuePixels: 8, context: 'padding', evidence: createMockEvidence('https://example.com/page4', 'button') }
      ],
      radii: [],
      shadows: [],
      motion: []
    };

    const page5: PageTokens = {
      colors: [
        { value: '#1a73e8', originalValue: '#1a73e8', category: 'unknown', context: 'background', evidence: createMockEvidence('https://example.com/page5', 'button') }
      ],
      typography: [
        { family: 'Arial', size: '16px', sizePixels: 16, weight: 400, lineHeight: '1.5', letterSpacing: '0', evidence: createMockEvidence('https://example.com/page5', 'body') }
      ],
      spacing: [
        { value: '8px', valuePixels: 8, context: 'padding', evidence: createMockEvidence('https://example.com/page5', 'button') }
      ],
      radii: [],
      shadows: [],
      motion: []
    };

    const allPageTokens = {
      'https://example.com/page1': page1,
      'https://example.com/page2': page2,
      'https://example.com/page3': page3,
      'https://example.com/page4': page4,
      'https://example.com/page5': page5
    };

    // Run normalization pipeline
    const result = normalizePipeline(allPageTokens, { minPageThreshold: 3 });

    // Verify colors are deduplicated
    // #1a73e8 and #1a74e8 should be merged (very close in CIEDE2000)
    expect(result.colors.clusters.length).toBeGreaterThan(0);
    expect(result.colors.clusters.length).toBeLessThan(3); // Should merge similar blues

    // Verify cross-page validation filters tokens below threshold
    // #1a73e8 appears on 5 pages -> should be standard
    const blueStandard = result.colors.standards.find(s =>
      s.token.canonical.toLowerCase().includes('1a73')
    );
    expect(blueStandard).toBeDefined();
    expect(blueStandard?.isStandard).toBe(true);

    // Verify confidence scores assigned to all tokens
    expect(result.colors.standards.every(s => s.confidence !== null)).toBe(true);

    // Verify DTCG output has correct $type and $value structure
    expect(result.dtcg).toBeDefined();
    if (result.colors.standards.length > 0) {
      expect(result.dtcg.colors).toBeDefined();

      // Check DTCG structure for colors
      const colorKeys = Object.keys(result.dtcg.colors || {});
      if (colorKeys.length > 0) {
        const firstColor = result.dtcg.colors![colorKeys[0]] as any;
        expect(firstColor.$type).toBe('color');
        expect(firstColor.$value).toBeDefined();
      }
    }

    // Verify metadata includes totalPages and timestamp
    expect(result.metadata.totalPages).toBe(5);
    expect(result.metadata.timestamp).toBeDefined();
    expect(new Date(result.metadata.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('should validate typography normalization and cross-page filtering', () => {
    // NOTE: The normalization pipeline expects tokens to already be deduplicated/merged
    // before cross-page validation. In real usage, tokens from the same element across
    // pages would have accumulated evidence. For this integration test, we're testing
    // the pipeline mechanics, so we create pre-merged tokens.

    const sharedBodyToken: TypographyToken = {
      family: 'Arial',
      size: '16px',
      sizePixels: 16,
      weight: 400,
      lineHeight: '1.5',
      letterSpacing: '0',
      evidence: [
        ...createMockEvidence('https://example.com/page1', 'body'),
        ...createMockEvidence('https://example.com/page2', 'body'),
        ...createMockEvidence('https://example.com/page3', 'body')
      ]
    };

    const headingToken: TypographyToken = {
      family: 'Arial',
      size: '24px',
      sizePixels: 24,
      weight: 700,
      lineHeight: '1.2',
      letterSpacing: '0',
      evidence: createMockEvidence('https://example.com/page3', 'h1')
    };

    const mockTokens: Record<string, PageTokens> = {
      'https://example.com/page1': {
        colors: [],
        typography: [sharedBodyToken, headingToken],
        spacing: [],
        radii: [],
        shadows: [],
        motion: []
      }
    };

    const result = normalizePipeline(mockTokens, { minPageThreshold: 3 });

    // Check that typography was normalized
    expect(result.typography.normalized.length).toBe(2);
    expect(result.typography.all.length).toBe(2);

    // 16px body appears on 3 pages -> should be a standard
    expect(result.typography.standards.length).toBe(1);
    const bodyStandard = result.typography.standards[0];
    expect(bodyStandard.token.normalizedSize.pixels).toBe(16);
    expect(bodyStandard.isStandard).toBe(true);
    expect(bodyStandard.pageUrls.size).toBe(3);

    // 24px heading appears on 1 page -> not a standard
    const headingInAll = result.typography.all.find(s =>
      s.token.normalizedSize.pixels === 24
    );
    expect(headingInAll).toBeDefined();
    expect(headingInAll?.isStandard).toBe(false);
    expect(headingInAll?.pageUrls.size).toBe(1);
  });
});

describe('Phase 2 Component Aggregation', () => {
  it('should aggregate components across pages and calculate confidence', () => {
    // Create mock DetectedComponent arrays for 4 pages
    const page1Components: DetectedComponent[] = [
      {
        type: 'button',
        selector: 'button.primary',
        element: {
          tagName: 'button',
          computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '8px', borderRadius: '4px' },
          textContent: 'Click me',
          hasChildren: false,
          childCount: 0,
          selector: 'button.primary',
          attributes: {}
        },
        evidence: createMockEvidence('https://example.com/page1', 'button.primary'),
        computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '8px', borderRadius: '4px' },
        pageUrl: 'https://example.com/page1'
      },
      {
        type: 'input',
        selector: 'input[type="text"]',
        element: {
          tagName: 'input',
          computedStyles: {},
          textContent: '',
          hasChildren: false,
          childCount: 0,
          selector: 'input[type="text"]',
          attributes: { type: 'text' }
        },
        evidence: createMockEvidence('https://example.com/page1', 'input[type="text"]'),
        computedStyles: {},
        pageUrl: 'https://example.com/page1'
      }
    ];

    const page2Components: DetectedComponent[] = [
      {
        type: 'button',
        selector: 'button.secondary',
        element: {
          tagName: 'button',
          computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '8px', borderRadius: '4px' },
          textContent: 'Submit',
          hasChildren: false,
          childCount: 0,
          selector: 'button.secondary',
          attributes: {}
        },
        evidence: createMockEvidence('https://example.com/page2', 'button.secondary'),
        computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '8px', borderRadius: '4px' },
        pageUrl: 'https://example.com/page2'
      }
    ];

    const page3Components: DetectedComponent[] = [
      {
        type: 'button',
        selector: 'button.cta',
        element: {
          tagName: 'button',
          computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '12px', borderRadius: '4px' },
          textContent: 'Get started',
          hasChildren: false,
          childCount: 0,
          selector: 'button.cta',
          attributes: {}
        },
        evidence: createMockEvidence('https://example.com/page3', 'button.cta'),
        computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '12px', borderRadius: '4px' },
        pageUrl: 'https://example.com/page3'
      }
    ];

    const page4Components: DetectedComponent[] = [
      {
        type: 'button',
        selector: 'button.action',
        element: {
          tagName: 'button',
          computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '8px', borderRadius: '4px' },
          textContent: 'Learn more',
          hasChildren: false,
          childCount: 0,
          selector: 'button.action',
          attributes: {}
        },
        evidence: createMockEvidence('https://example.com/page4', 'button.action'),
        computedStyles: { backgroundColor: 'rgb(26, 115, 232)', paddingTop: '8px', borderRadius: '4px' },
        pageUrl: 'https://example.com/page4'
      }
    ];

    const perPageComponents = new Map<string, DetectedComponent[]>([
      ['https://example.com/page1', page1Components],
      ['https://example.com/page2', page2Components],
      ['https://example.com/page3', page3Components],
      ['https://example.com/page4', page4Components]
    ]);

    // Run component aggregation
    const aggregated = aggregateComponents(perPageComponents, 4);

    // Verify components grouped by type
    const buttonAggregate = aggregated.find(a => a.type === 'button');
    const inputAggregate = aggregated.find(a => a.type === 'input');

    expect(buttonAggregate).toBeDefined();
    expect(inputAggregate).toBeDefined();

    // Verify page URLs collected correctly
    expect(buttonAggregate?.pageUrls.size).toBe(4); // Buttons on all 4 pages
    expect(inputAggregate?.pageUrls.size).toBe(1); // Input on 1 page

    // Verify confidence scores assigned
    expect(buttonAggregate?.confidence).toBeDefined();
    expect(buttonAggregate?.confidence?.value).toBeGreaterThan(0);
    expect(buttonAggregate?.confidence?.pageCount).toBe(4);
    expect(buttonAggregate?.confidence?.instanceCount).toBe(4);

    expect(inputAggregate?.confidence).toBeDefined();
    expect(inputAggregate?.confidence?.level).toBe('low'); // Only 1 page

    // Verify canonical styles (most common values)
    expect(buttonAggregate?.canonical.styles.backgroundColor).toBe('rgb(26, 115, 232)');
    expect(buttonAggregate?.canonical.styles.borderRadius).toBe('4px');
    expect(buttonAggregate?.canonical.styles.paddingTop).toBe('8px'); // Mode of [8, 8, 12, 8] = 8
  });

  it('should handle empty component data', () => {
    const emptyComponents = new Map<string, DetectedComponent[]>();
    const aggregated = aggregateComponents(emptyComponents, 5);

    expect(aggregated).toEqual([]);
  });

  it('should sort aggregated components by confidence descending', () => {
    // Create components with different page distributions
    const perPageComponents = new Map<string, DetectedComponent[]>();

    // Button on 3 pages (high confidence)
    for (let i = 1; i <= 3; i++) {
      perPageComponents.set(`https://example.com/page${i}`, [
        {
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
          evidence: createMockEvidence(`https://example.com/page${i}`, `button${i}`),
          computedStyles: {},
          pageUrl: `https://example.com/page${i}`
        }
      ]);
    }

    // Input on 1 page (low confidence)
    perPageComponents.set('https://example.com/page1', [
      ...perPageComponents.get('https://example.com/page1')!,
      {
        type: 'input',
        selector: 'input1',
        element: {
          tagName: 'input',
          computedStyles: {},
          textContent: '',
          hasChildren: false,
          childCount: 0,
          selector: 'input1',
          attributes: {}
        },
        evidence: createMockEvidence('https://example.com/page1', 'input1'),
        computedStyles: {},
        pageUrl: 'https://example.com/page1'
      }
    ]);

    const aggregated = aggregateComponents(perPageComponents, 5);

    // Should be sorted by confidence descending
    expect(aggregated.length).toBe(2);
    expect(aggregated[0].type).toBe('button'); // Higher confidence
    expect(aggregated[1].type).toBe('input'); // Lower confidence
    expect(aggregated[0].confidence!.value).toBeGreaterThan(aggregated[1].confidence!.value);
  });
});
