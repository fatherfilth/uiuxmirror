/**
 * Evidence tracker for synthesis provenance
 * Builds complete evidence chains and calculates confidence scores
 * Every synthesized decision traces back to source observations
 */

import type { SynthesisDecision, EvidenceLink } from '../types/synthesis.js';

/**
 * Build complete evidence chain from all synthesis decisions
 * Flattens, deduplicates, and sorts evidence by source type priority
 *
 * @param decisions - All synthesis decisions from all stages
 * @returns Deduplicated, sorted evidence chain
 */
export function buildEvidenceChain(decisions: SynthesisDecision[]): EvidenceLink[] {
  // Flatten all evidence links from all decisions
  const allEvidence: EvidenceLink[] = [];
  for (const decision of decisions) {
    allEvidence.push(...decision.evidence);
  }

  // Deduplicate by reference
  // Same sourceType + reference = one entry
  const seen = new Set<string>();
  const deduplicated: EvidenceLink[] = [];

  for (const evidence of allEvidence) {
    const key = `${evidence.sourceType}:${evidence.reference}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(evidence);
    }
  }

  // Sort by sourceType priority
  // observed_token > observed_component > inferred_pattern > llm_decision
  const priority: Record<string, number> = {
    observed_token: 1,
    observed_component: 2,
    inferred_pattern: 3,
    llm_decision: 4,
  };

  deduplicated.sort((a, b) => {
    const aPriority = priority[a.sourceType] || 999;
    const bPriority = priority[b.sourceType] || 999;
    return aPriority - bPriority;
  });

  return deduplicated;
}

/**
 * Calculate overall confidence score from all decisions
 * Weights decisions by type: token_application (1.0) > structural_choice (0.8) > llm_refinement (0.6)
 *
 * @param decisions - All synthesis decisions
 * @returns Confidence value (0-1) and level (low/medium/high)
 */
export function calculateOverallConfidence(
  decisions: SynthesisDecision[]
): { value: number; level: 'low' | 'medium' | 'high' } {
  if (decisions.length === 0) {
    return { value: 0, level: 'low' };
  }

  // Weight decisions by type
  const typeWeights: Record<SynthesisDecision['type'], number> = {
    token_application: 1.0, // Highest - directly observed
    structural_choice: 0.8, // Rule-based, reliable
    llm_refinement: 0.6, // Probabilistic, less certain
  };

  // Calculate weighted average
  let weightedSum = 0;
  let totalWeight = 0;

  for (const decision of decisions) {
    const weight = typeWeights[decision.type];
    weightedSum += decision.confidence * weight;
    totalWeight += weight;
  }

  // Calculate overall confidence
  const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Clamp to [0, 1]
  const clampedConfidence = Math.max(0, Math.min(1, confidence));

  // Determine confidence level
  // Consistent with Phase 2 confidence levels
  let level: 'low' | 'medium' | 'high';
  if (clampedConfidence < 0.3) {
    level = 'low';
  } else if (clampedConfidence < 0.6) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return { value: clampedConfidence, level };
}

/**
 * Merge multiple evidence chains from different synthesis stages
 * Deduplicates and maintains sort order
 *
 * @param chains - Evidence chains from different stages
 * @returns Merged, deduplicated evidence chain
 */
export function mergeEvidenceChains(...chains: EvidenceLink[][]): EvidenceLink[] {
  // Flatten all chains
  const allEvidence: EvidenceLink[] = [];
  for (const chain of chains) {
    allEvidence.push(...chain);
  }

  // Deduplicate by reference
  const seen = new Set<string>();
  const deduplicated: EvidenceLink[] = [];

  for (const evidence of allEvidence) {
    const key = `${evidence.sourceType}:${evidence.reference}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(evidence);
    }
  }

  // Sort by priority
  const priority: Record<string, number> = {
    observed_token: 1,
    observed_component: 2,
    inferred_pattern: 3,
    llm_decision: 4,
  };

  deduplicated.sort((a, b) => {
    const aPriority = priority[a.sourceType] || 999;
    const bPriority = priority[b.sourceType] || 999;
    return aPriority - bPriority;
  });

  return deduplicated;
}

/**
 * Convenience factory for token_application decisions
 * Automatically sets high confidence (0.95) for directly observed tokens
 *
 * @param property - CSS property or token name
 * @param value - Token value
 * @param tokenRef - Reference to token ID
 * @param pageUrls - Pages where token was observed
 * @returns SynthesisDecision for token application
 */
export function createTokenDecision(
  property: string,
  value: string,
  tokenRef: string,
  pageUrls: string[]
): SynthesisDecision {
  return {
    type: 'token_application',
    property,
    value,
    confidence: 0.95, // High confidence - directly observed
    evidence: [
      {
        sourceType: 'observed_token',
        reference: tokenRef,
        pageUrl: pageUrls.length > 0 ? pageUrls[0] : undefined,
        occurrenceCount: pageUrls.length,
      },
    ],
    reasoning: `Token ${property} = ${value} observed across ${pageUrls.length} page(s)`,
  };
}

/**
 * Convenience factory for structural_choice decisions
 * Sets confidence to 0.85 (rule-based)
 *
 * @param property - Structural element or property
 * @param value - Chosen value
 * @param reasoning - Rule-based reasoning
 * @returns SynthesisDecision for structural choice
 */
export function createStructuralDecision(
  property: string,
  value: string,
  reasoning: string
): SynthesisDecision {
  return {
    type: 'structural_choice',
    property,
    value,
    confidence: 0.85, // Rule-based confidence
    evidence: [
      {
        sourceType: 'inferred_pattern',
        reference: property,
      },
    ],
    reasoning,
  };
}

/**
 * Convenience factory for llm_refinement decisions
 * Uses the LLM's own confidence rating
 *
 * @param property - CSS property or element
 * @param value - LLM-chosen value
 * @param reasoning - LLM's reasoning
 * @param llmConfidence - LLM's confidence rating (0-1)
 * @returns SynthesisDecision for LLM refinement
 */
export function createLLMDecision(
  property: string,
  value: string,
  reasoning: string,
  llmConfidence: number
): SynthesisDecision {
  return {
    type: 'llm_refinement',
    property,
    value,
    confidence: llmConfidence,
    evidence: [
      {
        sourceType: 'llm_decision',
        reference: property,
        llmReasoning: reasoning,
      },
    ],
    reasoning,
  };
}
