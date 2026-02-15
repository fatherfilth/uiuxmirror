/**
 * Unit tests for evidence-tracker module
 * Tests evidence chain building and confidence calculation
 */

import { describe, it, expect } from 'vitest';
import {
  buildEvidenceChain,
  calculateOverallConfidence,
  mergeEvidenceChains,
  createTokenDecision,
  createStructuralDecision,
  createLLMDecision,
} from '../../src/synthesis/evidence-tracker.js';
import type { SynthesisDecision, EvidenceLink } from '../../src/types/synthesis.js';

describe('Evidence Tracker', () => {
  describe('buildEvidenceChain', () => {
    it('deduplicates evidence links by reference', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'token_application',
          property: 'backgroundColor',
          value: '#1a73e8',
          confidence: 1.0,
          evidence: [
            { sourceType: 'observed_token', reference: 'color-1' },
            { sourceType: 'observed_token', reference: 'color-1' }, // Duplicate
          ],
          reasoning: 'test',
        },
      ];

      const chain = buildEvidenceChain(decisions);

      // Should deduplicate
      expect(chain.length).toBe(1);
      expect(chain[0].reference).toBe('color-1');
    });

    it('sorts by sourceType priority (observed_token first)', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'llm_refinement',
          property: 'motion',
          value: '150ms',
          confidence: 0.8,
          evidence: [{ sourceType: 'llm_decision', reference: 'motion-timing' }],
          reasoning: 'test',
        },
        {
          type: 'token_application',
          property: 'color',
          value: '#1a73e8',
          confidence: 1.0,
          evidence: [{ sourceType: 'observed_token', reference: 'color-1' }],
          reasoning: 'test',
        },
        {
          type: 'structural_choice',
          property: 'layout',
          value: 'flex',
          confidence: 0.9,
          evidence: [{ sourceType: 'inferred_pattern', reference: 'flex-layout' }],
          reasoning: 'test',
        },
      ];

      const chain = buildEvidenceChain(decisions);

      // Should be sorted: observed_token > observed_component > inferred_pattern > llm_decision
      expect(chain[0].sourceType).toBe('observed_token');
      expect(chain[chain.length - 1].sourceType).toBe('llm_decision');
    });

    it('flattens all evidence from all decisions', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'token_application',
          property: 'color',
          value: '#1a73e8',
          confidence: 1.0,
          evidence: [
            { sourceType: 'observed_token', reference: 'color-1' },
            { sourceType: 'observed_token', reference: 'color-2' },
          ],
          reasoning: 'test',
        },
        {
          type: 'token_application',
          property: 'spacing',
          value: '16px',
          confidence: 1.0,
          evidence: [{ sourceType: 'observed_token', reference: 'spacing-md' }],
          reasoning: 'test',
        },
      ];

      const chain = buildEvidenceChain(decisions);

      expect(chain.length).toBe(3);
    });

    it('handles empty decisions array', () => {
      const chain = buildEvidenceChain([]);

      expect(chain).toEqual([]);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('weights token_application highest (1.0)', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'token_application',
          property: 'color',
          value: '#1a73e8',
          confidence: 1.0,
          evidence: [],
          reasoning: 'test',
        },
      ];

      const result = calculateOverallConfidence(decisions);

      expect(result.value).toBe(1.0);
      expect(result.level).toBe('high');
    });

    it('weights structural_choice at 0.8', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'structural_choice',
          property: 'layout',
          value: 'flex',
          confidence: 1.0,
          evidence: [],
          reasoning: 'test',
        },
      ];

      const result = calculateOverallConfidence(decisions);

      // Weighted: 1.0 * 0.8 / 0.8 = 1.0
      expect(result.value).toBe(1.0);
    });

    it('weights llm_refinement lowest (0.6)', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'llm_refinement',
          property: 'motion',
          value: '150ms',
          confidence: 1.0,
          evidence: [],
          reasoning: 'test',
        },
      ];

      const result = calculateOverallConfidence(decisions);

      // Weighted: 1.0 * 0.6 / 0.6 = 1.0
      expect(result.value).toBe(1.0);
    });

    it('calculates weighted average correctly', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'token_application',
          property: 'color',
          value: '#1a73e8',
          confidence: 1.0,
          evidence: [],
          reasoning: 'test',
        },
        {
          type: 'llm_refinement',
          property: 'motion',
          value: '150ms',
          confidence: 0.6,
          evidence: [],
          reasoning: 'test',
        },
      ];

      const result = calculateOverallConfidence(decisions);

      // Weighted: (1.0 * 1.0 + 0.6 * 0.6) / (1.0 + 0.6) = 1.36 / 1.6 = 0.85
      expect(result.value).toBeCloseTo(0.85, 1);
      expect(result.level).toBe('high');
    });

    it('returns correct confidence levels', () => {
      const lowDecisions: SynthesisDecision[] = [
        {
          type: 'llm_refinement',
          property: 'motion',
          value: '150ms',
          confidence: 0.2,
          evidence: [],
          reasoning: 'test',
        },
      ];

      const mediumDecisions: SynthesisDecision[] = [
        {
          type: 'structural_choice',
          property: 'layout',
          value: 'flex',
          confidence: 0.5,
          evidence: [],
          reasoning: 'test',
        },
      ];

      const highDecisions: SynthesisDecision[] = [
        {
          type: 'token_application',
          property: 'color',
          value: '#1a73e8',
          confidence: 0.9,
          evidence: [],
          reasoning: 'test',
        },
      ];

      expect(calculateOverallConfidence(lowDecisions).level).toBe('low');
      expect(calculateOverallConfidence(mediumDecisions).level).toBe('medium');
      expect(calculateOverallConfidence(highDecisions).level).toBe('high');
    });

    it('handles empty decisions array', () => {
      const result = calculateOverallConfidence([]);

      expect(result.value).toBe(0);
      expect(result.level).toBe('low');
    });

    it('clamps confidence to [0, 1] range', () => {
      const decisions: SynthesisDecision[] = [
        {
          type: 'token_application',
          property: 'color',
          value: '#1a73e8',
          confidence: 1.5, // Invalid, but should be clamped
          evidence: [],
          reasoning: 'test',
        },
      ];

      const result = calculateOverallConfidence(decisions);

      expect(result.value).toBeLessThanOrEqual(1.0);
      expect(result.value).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('mergeEvidenceChains', () => {
    it('combines multiple chains without duplicates', () => {
      const chain1: EvidenceLink[] = [
        { sourceType: 'observed_token', reference: 'color-1' },
        { sourceType: 'observed_token', reference: 'spacing-md' },
      ];

      const chain2: EvidenceLink[] = [
        { sourceType: 'observed_token', reference: 'color-1' }, // Duplicate
        { sourceType: 'inferred_pattern', reference: 'flex-layout' },
      ];

      const merged = mergeEvidenceChains(chain1, chain2);

      expect(merged.length).toBe(3); // color-1, spacing-md, flex-layout
    });

    it('maintains source priority sorting', () => {
      const chain1: EvidenceLink[] = [
        { sourceType: 'llm_decision', reference: 'motion' },
      ];

      const chain2: EvidenceLink[] = [
        { sourceType: 'observed_token', reference: 'color-1' },
      ];

      const merged = mergeEvidenceChains(chain1, chain2);

      expect(merged[0].sourceType).toBe('observed_token');
      expect(merged[1].sourceType).toBe('llm_decision');
    });
  });

  describe('Factory helpers', () => {
    it('createTokenDecision creates correct decision type', () => {
      const decision = createTokenDecision(
        'backgroundColor',
        '#1a73e8',
        'color-1',
        ['https://example.com/page1', 'https://example.com/page2']
      );

      expect(decision.type).toBe('token_application');
      expect(decision.property).toBe('backgroundColor');
      expect(decision.value).toBe('#1a73e8');
      expect(decision.confidence).toBe(0.95);
      expect(decision.evidence.length).toBe(1);
      expect(decision.evidence[0].sourceType).toBe('observed_token');
      expect(decision.evidence[0].reference).toBe('color-1');
    });

    it('createStructuralDecision creates correct decision type', () => {
      const decision = createStructuralDecision(
        'display',
        'flex',
        'Use flexbox for layout'
      );

      expect(decision.type).toBe('structural_choice');
      expect(decision.property).toBe('display');
      expect(decision.value).toBe('flex');
      expect(decision.confidence).toBe(0.85);
      expect(decision.reasoning).toBe('Use flexbox for layout');
    });

    it('createLLMDecision creates correct decision type', () => {
      const decision = createLLMDecision(
        'transition',
        '150ms ease-in-out',
        'LLM selected easing',
        0.75
      );

      expect(decision.type).toBe('llm_refinement');
      expect(decision.property).toBe('transition');
      expect(decision.value).toBe('150ms ease-in-out');
      expect(decision.confidence).toBe(0.75);
      expect(decision.reasoning).toBe('LLM selected easing');
    });
  });
});
