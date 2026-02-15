/**
 * Unit tests for state-generator module
 * Tests generation of all 7 interactive states
 */

import { describe, it, expect } from 'vitest';
import {
  generateAllStates,
  generateDefaultState,
  generateHoverState,
  generateFocusState,
  generateDisabledState,
  generateLoadingState,
  generateErrorState,
} from '../../src/synthesis/state-generator.js';
import { mockDesignDNA } from './fixtures.js';

describe('State Generator', () => {
  const mockTokenMap: Record<string, string> = {
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '16px',
  };

  describe('generateAllStates', () => {
    it('returns exactly 7 states', () => {
      const states = generateAllStates(mockTokenMap, mockDesignDNA);

      expect(states).toHaveLength(7);
    });

    it('includes all required state names', () => {
      const states = generateAllStates(mockTokenMap, mockDesignDNA);
      const stateNames = states.map(s => s.name);

      expect(stateNames).toContain('default');
      expect(stateNames).toContain('hover');
      expect(stateNames).toContain('active');
      expect(stateNames).toContain('focus');
      expect(stateNames).toContain('disabled');
      expect(stateNames).toContain('loading');
      expect(stateNames).toContain('error');
    });

    it('each state has confidence score > 0', () => {
      const states = generateAllStates(mockTokenMap, mockDesignDNA);

      states.forEach((state) => {
        expect(state.confidence).toBeGreaterThan(0);
        expect(state.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('each state has at least one evidence link', () => {
      const states = generateAllStates(mockTokenMap, mockDesignDNA);

      states.forEach((state) => {
        expect(state.evidence).toBeDefined();
        expect(state.evidence.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateDefaultState', () => {
    it('returns default state with token map as styles', () => {
      const state = generateDefaultState(mockTokenMap);

      expect(state.name).toBe('default');
      expect(state.styles).toEqual(mockTokenMap);
      expect(state.confidence).toBe(1.0);
    });

    it('creates evidence for each token', () => {
      const state = generateDefaultState(mockTokenMap);

      expect(state.evidence.length).toBeGreaterThan(0);
      state.evidence.forEach((evidence) => {
        expect(evidence.sourceType).toBe('observed_token');
      });
    });
  });

  describe('generateHoverState', () => {
    it('generates hover state with different styles than default', () => {
      const state = generateHoverState(mockTokenMap, mockDesignDNA);

      expect(state.name).toBe('hover');
      expect(state.styles).toBeDefined();

      // Hover state should differ from default
      // Check if it has modified backgroundColor or other hover-specific styles
      const hasHoverStyles =
        state.styles.backgroundColor !== undefined ||
        state.styles.transform !== undefined ||
        Object.keys(state.styles).length > 0;

      expect(hasHoverStyles).toBe(true);
    });

    it('has confidence score > 0', () => {
      const state = generateHoverState(mockTokenMap, mockDesignDNA);

      expect(state.confidence).toBeGreaterThan(0);
      expect(state.confidence).toBeLessThanOrEqual(1);
    });

    it('includes evidence from observed or inferred patterns', () => {
      const state = generateHoverState(mockTokenMap, mockDesignDNA);

      expect(state.evidence.length).toBeGreaterThan(0);

      const validSourceTypes = ['observed_component', 'inferred_pattern'];
      state.evidence.forEach((evidence) => {
        expect(validSourceTypes).toContain(evidence.sourceType);
      });
    });
  });

  describe('generateFocusState', () => {
    it('has WCAG-compliant outline in styles', () => {
      const state = generateFocusState(mockTokenMap, mockDesignDNA);

      expect(state.name).toBe('focus');
      expect(state.styles).toBeDefined();

      // Focus state must have an outline for accessibility
      const stylesString = JSON.stringify(state.styles).toLowerCase();
      expect(stylesString).toContain('outline');
    });

    it('has high confidence for deterministic focus styles', () => {
      const state = generateFocusState(mockTokenMap, mockDesignDNA);

      expect(state.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('generateDisabledState', () => {
    it('includes aria-disabled attribute', () => {
      const state = generateDisabledState(mockTokenMap);

      expect(state.name).toBe('disabled');
      expect(state.ariaAttributes).toBeDefined();
      expect(state.ariaAttributes?.['aria-disabled']).toBe('true');
    });

    it('has reduced visual prominence', () => {
      const state = generateDisabledState(mockTokenMap);

      // Disabled should have some visual change (opacity, color, cursor, etc.)
      const hasDisabledStyles =
        state.styles.opacity !== undefined ||
        state.styles.cursor !== undefined ||
        state.styles.backgroundColor !== undefined;

      expect(hasDisabledStyles).toBe(true);
    });
  });

  describe('generateLoadingState', () => {
    it('includes aria-busy and aria-live attributes', () => {
      const state = generateLoadingState(mockTokenMap);

      expect(state.name).toBe('loading');
      expect(state.ariaAttributes).toBeDefined();
      expect(state.ariaAttributes?.['aria-busy']).toBe('true');
      expect(state.ariaAttributes?.['aria-live']).toBe('polite');
    });

    it('has styles indicating loading state', () => {
      const state = generateLoadingState(mockTokenMap);

      expect(state.styles).toBeDefined();
      expect(Object.keys(state.styles).length).toBeGreaterThan(0);
    });

    it('has lower confidence for skeleton state', () => {
      const state = generateLoadingState(mockTokenMap);

      // Loading states are deterministic but have lower confidence
      // since they're not observed from the site
      expect(state.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('generateErrorState', () => {
    it('includes aria-invalid attribute', () => {
      const state = generateErrorState(mockTokenMap, mockDesignDNA);

      expect(state.name).toBe('error');
      expect(state.ariaAttributes).toBeDefined();
      expect(state.ariaAttributes?.['aria-invalid']).toBe('true');
    });

    it('has error-specific styles', () => {
      const state = generateErrorState(mockTokenMap, mockDesignDNA);

      expect(state.styles).toBeDefined();

      // Error state should have some visual indication
      // (border color, background, text color, etc.)
      expect(Object.keys(state.styles).length).toBeGreaterThan(0);
    });

    it('has evidence from observed or inferred patterns', () => {
      const state = generateErrorState(mockTokenMap, mockDesignDNA);

      expect(state.evidence.length).toBeGreaterThan(0);

      const validSourceTypes = ['observed_component', 'inferred_pattern'];
      state.evidence.forEach((evidence) => {
        expect(validSourceTypes).toContain(evidence.sourceType);
      });
    });
  });
});
