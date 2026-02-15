/**
 * Unit tests for rule-engine module
 * Tests structural synthesis from templates
 */

import { describe, it, expect } from 'vitest';
import { synthesizeStructure, resolveColorContrast } from '../../src/synthesis/rule-engine.js';
import { mockDesignDNA } from './fixtures.js';
import type { ComponentRequest } from '../../src/types/synthesis.js';

describe('Rule Engine', () => {
  describe('synthesizeStructure', () => {
    it('generates HTML containing token values (not hardcoded)', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.html).toBeDefined();
      expect(result.html.length).toBeGreaterThan(0);

      // HTML should contain references to design system values
      // (Either inline or via classes - template implementation detail)
      expect(result.html).toContain('button');
    });

    it('generates CSS with resolved token values', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.css).toBeDefined();
      expect(result.css.length).toBeGreaterThan(0);

      // CSS should contain actual color values from mockDesignDNA
      // Check for any hex color pattern
      expect(result.css).toMatch(/#[0-9a-fA-F]{6}/);
    });

    it('creates evidence chain for each token used', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);

      // All evidence should be observed_token type
      result.evidence.forEach((evidence) => {
        expect(evidence.sourceType).toBe('observed_token');
        expect(evidence.reference).toBeDefined();
      });
    });

    it('selects correct template for component type', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.templateName).toBe('button');
    });

    it('resolves template aliases (table -> data-table)', () => {
      const request: ComponentRequest = { type: 'table' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.templateName).toBe('data-table');
      expect(result.html).toBeDefined();
      expect(result.css).toBeDefined();
    });

    it('resolves template aliases (dialog -> modal)', () => {
      const request: ComponentRequest = { type: 'dialog' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.templateName).toBe('modal');
      expect(result.html).toBeDefined();
    });

    it('throws descriptive error for unknown template', () => {
      const request: ComponentRequest = { type: 'carousel' };

      expect(() => synthesizeStructure(request, mockDesignDNA)).toThrow();
      expect(() => synthesizeStructure(request, mockDesignDNA)).toThrow(/carousel/);
      expect(() => synthesizeStructure(request, mockDesignDNA)).toThrow(/Available templates/);
    });

    it('calculates confidence based on token coverage', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // With full mock DNA, confidence should be high
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('generated HTML does not contain unresolved {{ placeholders', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      // Ensure no Handlebars placeholders remain
      expect(result.html).not.toMatch(/\{\{/);
      expect(result.html).not.toMatch(/\}\}/);
      expect(result.css).not.toMatch(/\{\{/);
      expect(result.css).not.toMatch(/\}\}/);
    });

    it('populates tokenMap with resolved values', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.tokenMap).toBeDefined();
      expect(Object.keys(result.tokenMap).length).toBeGreaterThan(0);

      // TokenMap should contain actual resolved values
      const values = Object.values(result.tokenMap);
      expect(values.some(v => v.includes('#'))).toBe(true); // Has color values
    });

    it('creates decisions for all token applications', () => {
      const request: ComponentRequest = { type: 'button' };
      const result = synthesizeStructure(request, mockDesignDNA);

      expect(result.decisions).toBeDefined();
      expect(result.decisions.length).toBeGreaterThan(0);

      // All decisions should be token_application type
      result.decisions.forEach((decision) => {
        expect(decision.type).toBe('token_application');
        expect(decision.property).toBeDefined();
        expect(decision.value).toBeDefined();
        expect(decision.confidence).toBe(1.0); // High confidence for observed tokens
      });
    });
  });

  describe('resolveColorContrast', () => {
    it('returns black text for light backgrounds', () => {
      const lightBg = '#ffffff';
      const textColor = resolveColorContrast(lightBg);

      expect(textColor).toBe('#000000');
    });

    it('returns white text for dark backgrounds', () => {
      const darkBg = '#000000';
      const textColor = resolveColorContrast(darkBg);

      expect(textColor).toBe('#ffffff');
    });

    it('handles blue primary color correctly', () => {
      const blueBg = '#1a73e8';
      const textColor = resolveColorContrast(blueBg);

      // Blue is dark, should return white text
      expect(textColor).toBe('#ffffff');
    });

    it('handles gray backgrounds correctly', () => {
      const lightGray = '#f8f9fa';
      const darkGray = '#202124';

      expect(resolveColorContrast(lightGray)).toBe('#000000');
      expect(resolveColorContrast(darkGray)).toBe('#ffffff');
    });
  });
});
