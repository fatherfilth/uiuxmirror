/**
 * Tests for Phase 5 export generators
 * Verifies all export formats produce valid output structure
 * Uses minimal fixture data - no external dependencies (no network, no API keys)
 */

import { describe, it, expect } from 'vitest';
import type { TokenEvidence } from '../../src/types/evidence.js';

// Import generators to test
import {
  formatEvidenceCitation,
  formatEvidenceSummary,
  formatEvidenceForJSON,
} from '../../src/export/evidence-linker.js';
import {
  generateTokenVarName,
} from '../../src/export/semantic-namer.js';

// Create minimal test fixtures
const mockEvidence: TokenEvidence[] = [
  {
    pageUrl: 'https://example.com/page1',
    selector: '.btn-primary',
    timestamp: '2026-02-15T00:00:00Z',
    computedStyles: { color: '#ffffff', backgroundColor: '#3b82f6' },
  },
  {
    pageUrl: 'https://example.com/page2',
    selector: '.btn-secondary',
    timestamp: '2026-02-15T00:01:00Z',
    computedStyles: { color: '#000000', backgroundColor: '#e5e7eb' },
  },
  {
    pageUrl: 'https://example.com/page3',
    selector: '.heading',
    timestamp: '2026-02-15T00:02:00Z',
    computedStyles: { fontSize: '32px', fontWeight: '700' },
  },
];

// --- Evidence Linker Tests ---

describe('Evidence Linker', () => {
  it('should format single evidence citation with page info', () => {
    const citation = formatEvidenceCitation([mockEvidence[0]]);
    expect(citation).toContain('/page1');
    expect(typeof citation).toBe('string');
    expect(citation.length).toBeGreaterThan(0);
  });

  it('should show first 3 evidence items with +N more suffix for 5+ items', () => {
    const manyEvidence: TokenEvidence[] = [
      ...mockEvidence,
      {
        pageUrl: 'https://example.com/page4',
        selector: '.test4',
        timestamp: '2026-02-15T00:03:00Z',
        computedStyles: {},
      },
      {
        pageUrl: 'https://example.com/page5',
        selector: '.test5',
        timestamp: '2026-02-15T00:04:00Z',
        computedStyles: {},
      },
    ];
    const citation = formatEvidenceCitation(manyEvidence);
    expect(citation).toContain('+2 more');
  });

  it('should format evidence summary with correct counts', () => {
    const summary = formatEvidenceSummary(mockEvidence);
    expect(summary.pageCount).toBe(3);
    expect(summary.elementCount).toBe(3);
    expect(summary.pages.length).toBe(3);
  });

  it('should strip computedStyles from evidence for JSON export', () => {
    const formatted = formatEvidenceForJSON(mockEvidence);
    expect(formatted.length).toBe(3);
    expect(formatted[0]).not.toHaveProperty('computedStyles');
    expect(formatted[0]).toHaveProperty('pageUrl');
    expect(formatted[0]).toHaveProperty('selector');
  });
});

// --- Semantic Namer Tests ---

describe('Semantic Namer', () => {
  it('should prepend -- to token var names', () => {
    const varName = generateTokenVarName('color-primary');
    expect(varName).toBe('--color-primary');
  });

  it('should handle kebab-case names', () => {
    const varName = generateTokenVarName('spacing-md');
    expect(varName).toBe('--spacing-md');
  });

  it('should handle numeric names', () => {
    const varName = generateTokenVarName('color-1');
    expect(varName).toBe('--color-1');
  });
});
