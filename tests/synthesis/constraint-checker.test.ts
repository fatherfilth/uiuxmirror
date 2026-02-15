/**
 * Unit tests for constraint-checker module
 * Tests token constraint validation and resolution
 */

import { describe, it, expect } from 'vitest';
import {
  buildTokenMap,
  resolveTokenValue,
  validateTokenConstraints,
  type TokenCategory,
} from '../../src/synthesis/constraint-checker.js';
import { mockDesignDNA } from './fixtures.js';

describe('Constraint Checker', () => {
  describe('buildTokenMap', () => {
    it('creates flat lookup from DesignDNA', () => {
      const tokenMap = buildTokenMap(mockDesignDNA);

      expect(tokenMap.colors).toBeDefined();
      expect(tokenMap.spacing).toBeDefined();
      expect(tokenMap.typography).toBeDefined();
      expect(tokenMap.radii).toBeDefined();
      expect(tokenMap.shadows).toBeDefined();
      expect(tokenMap.motion).toBeDefined();
    });

    it('maps colors with correct keys', () => {
      const tokenMap = buildTokenMap(mockDesignDNA);

      const color1 = tokenMap.colors.get('color-1');
      expect(color1).toBeDefined();
      expect(color1?.value).toBe('#1a73e8');
      expect(color1?.evidence.sourceType).toBe('observed_token');
      expect(color1?.evidence.reference).toBe('color-1');
      expect(color1?.evidence.occurrenceCount).toBe(45);
    });

    it('maps spacing with semantic names', () => {
      const tokenMap = buildTokenMap(mockDesignDNA);

      const spacingXs = tokenMap.spacing.get('spacing-xs');
      expect(spacingXs).toBeDefined();
      expect(spacingXs?.value).toBe('4px');

      const spacingMd = tokenMap.spacing.get('spacing-md');
      expect(spacingMd).toBeDefined();
      expect(spacingMd?.value).toBe('16px');
    });

    it('maps typography with individual properties', () => {
      const tokenMap = buildTokenMap(mockDesignDNA);

      const heading1Size = tokenMap.typography.get('heading-1-size');
      expect(heading1Size).toBeDefined();
      expect(heading1Size?.value).toBe('24px');

      const heading1Weight = tokenMap.typography.get('heading-1-weight');
      expect(heading1Weight).toBeDefined();
      expect(heading1Weight?.value).toBe('700');
    });
  });

  describe('resolveTokenValue', () => {
    it('resolves existing color tokens correctly', () => {
      const result = resolveTokenValue('color', mockDesignDNA, 0);

      expect(result).not.toBeNull();
      expect(result?.value).toBe('#1a73e8');
      expect(result?.evidence.sourceType).toBe('observed_token');
      expect(result?.evidence.reference).toBe('color-1');
    });

    it('resolves existing spacing tokens correctly', () => {
      const result = resolveTokenValue('spacing', mockDesignDNA, 2);

      expect(result).not.toBeNull();
      expect(result?.value).toBe('16px');
      expect(result?.evidence.sourceType).toBe('observed_token');
      expect(result?.evidence.reference).toBe('spacing-3');
    });

    it('returns null for missing tokens', () => {
      const emptyDNA = {
        ...mockDesignDNA,
        tokens: {
          ...mockDesignDNA.tokens,
          colors: { standards: [] },
        },
      };

      const result = resolveTokenValue('color', emptyDNA, 0);
      expect(result).toBeNull();
    });

    it('returns default first token when no index provided', () => {
      const result = resolveTokenValue('color', mockDesignDNA);

      expect(result).not.toBeNull();
      expect(result?.value).toBe('#1a73e8');
      expect(result?.evidence.reference).toBe('color-1');
    });

    it('handles typography tokens with full shorthand', () => {
      const result = resolveTokenValue('typography', mockDesignDNA, 0);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('700');
      expect(result?.value).toContain('24px');
      expect(result?.value).toContain('Arial');
    });

    it('handles radius tokens', () => {
      const result = resolveTokenValue('radius', mockDesignDNA, 0);

      expect(result).not.toBeNull();
      expect(result?.value).toBe('4px');
      expect(result?.evidence.reference).toBe('radius-1');
    });

    it('handles shadow tokens', () => {
      const result = resolveTokenValue('shadow', mockDesignDNA, 0);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('rgba');
      expect(result?.evidence.reference).toBe('shadow-1');
    });

    it('handles motion tokens', () => {
      const result = resolveTokenValue('motion', mockDesignDNA, 0);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('ease-in-out');
      expect(result?.evidence.reference).toBe('motion-1');
    });
  });

  describe('validateTokenConstraints', () => {
    it('resolves all tokens when all exist in DNA', () => {
      const constraints: Record<string, TokenCategory> = {
        backgroundColor: 'color',
        padding: 'spacing',
        borderRadius: 'radius',
      };

      const result = validateTokenConstraints(constraints, mockDesignDNA);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.resolved).toHaveProperty('backgroundColor');
      expect(result.resolved).toHaveProperty('padding');
      expect(result.resolved).toHaveProperty('borderRadius');
      expect(result.confidence).toBe(1.0);
    });

    it('reports missing tokens in missing[] list', () => {
      const emptyDNA = {
        ...mockDesignDNA,
        tokens: {
          ...mockDesignDNA.tokens,
          colors: { standards: [] },
          spacing: { standards: [], scale: { baseUnit: 0, values: [], coverage: 0 } },
        },
      };

      const constraints: Record<string, TokenCategory> = {
        backgroundColor: 'color',
        padding: 'spacing',
      };

      const result = validateTokenConstraints(constraints, emptyDNA);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('backgroundColor');
      expect(result.missing).toContain('padding');
      expect(Object.keys(result.resolved)).toHaveLength(0);
    });

    it('calculates confidence based on resolution coverage', () => {
      const partialDNA = {
        ...mockDesignDNA,
        tokens: {
          ...mockDesignDNA.tokens,
          spacing: { standards: [], scale: { baseUnit: 0, values: [], coverage: 0 } },
        },
      };

      const constraints: Record<string, TokenCategory> = {
        backgroundColor: 'color',
        padding: 'spacing',
      };

      const result = validateTokenConstraints(constraints, partialDNA);

      expect(result.confidence).toBe(0.5); // 1 of 2 resolved
      expect(result.missing).toContain('padding');
      expect(result.resolved).toHaveProperty('backgroundColor');
    });

    it('returns valid:true when all tokens found', () => {
      const constraints: Record<string, TokenCategory> = {
        color: 'color',
      };

      const result = validateTokenConstraints(constraints, mockDesignDNA);

      expect(result.valid).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('returns valid:false when >50% tokens missing', () => {
      const partialDNA = {
        ...mockDesignDNA,
        tokens: {
          ...mockDesignDNA.tokens,
          spacing: { standards: [], scale: { baseUnit: 0, values: [], coverage: 0 } },
          radii: { standards: [] },
          shadows: { standards: [] },
        },
      };

      const constraints: Record<string, TokenCategory> = {
        backgroundColor: 'color',
        padding: 'spacing',
        borderRadius: 'radius',
        boxShadow: 'shadow',
      };

      const result = validateTokenConstraints(constraints, partialDNA);

      expect(result.valid).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.missing.length).toBeGreaterThan(2);
    });
  });
});
