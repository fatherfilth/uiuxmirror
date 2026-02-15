/**
 * Component confidence scorer
 * Calculates confidence scores for aggregated components based on:
 * - Page frequency (how many pages the component appears on)
 * - Variant consistency (how uniform the instances are)
 * - Instance density (how many instances per page)
 */

import type { AggregatedComponent } from '../components/component-aggregator.js';

/**
 * Component confidence score with reasoning
 */
export interface ComponentConfidenceScore {
  /** Combined confidence value (0-1) */
  value: number;
  /** Confidence level based on value and page threshold */
  level: 'low' | 'medium' | 'high';
  /** Number of pages the component appears on */
  pageCount: number;
  /** Total number of component instances */
  instanceCount: number;
  /** Variant consistency score (0-1, higher = more uniform) */
  variantConsistency: number;
  /** Human-readable reasoning for the score */
  reasoning: string;
}

/**
 * Calculate component confidence score
 *
 * Scoring formula:
 * - Page frequency: pageCount / totalPages (raw confidence)
 * - Instance density: min(instanceCount / (pageCount * 3), 0.15) -- density bonus capped at 0.15
 * - Variant consistency: 1 - (uniqueVariantCount / totalInstances). Higher when instances are uniform.
 *   If all instances have same variant = 1.0, all different = approaches 0.
 * - Combined: (0.5 * pageFrequency) + (0.3 * variantConsistency) + (0.2 * densityBonus), capped at 1.0
 *
 * Confidence levels:
 * - pageCount < minPageThreshold: 'low'
 * - value < 0.3: 'low'
 * - value < 0.6: 'medium'
 * - else: 'high'
 *
 * @param component - Aggregated component to score
 * @param totalPages - Total number of pages analyzed
 * @param minPageThreshold - Minimum pages for 'high' confidence (default: 3)
 * @returns Component confidence score with reasoning
 */
export function calculateComponentConfidence(
  component: AggregatedComponent,
  totalPages: number,
  minPageThreshold: number = 3
): ComponentConfidenceScore {
  const pageCount = component.pageUrls.size;
  const instanceCount = component.instances.length;

  // Calculate page frequency (0-1)
  const pageFrequency = totalPages > 0 ? pageCount / totalPages : 0;

  // Calculate instance density bonus (capped at 0.15)
  // Expected instances = pageCount * 3 (rough baseline)
  const expectedInstances = pageCount * 3;
  const densityBonus = expectedInstances > 0
    ? Math.min(instanceCount / expectedInstances, 0.15)
    : 0;

  // Calculate variant consistency (0-1)
  // Count unique variants by serializing variant dimensions
  const variantSignatures = new Set<string>();
  component.variants.forEach(v => {
    const signature = JSON.stringify({
      size: v.variant.size,
      emphasis: v.variant.emphasis,
      shape: v.variant.shape
    });
    variantSignatures.add(signature);
  });

  const uniqueVariantCount = variantSignatures.size;
  const variantConsistency = instanceCount > 0
    ? 1 - (uniqueVariantCount / instanceCount)
    : 0;

  // Combined score: 50% page frequency, 30% variant consistency, 20% density
  const rawValue = (0.5 * pageFrequency) + (0.3 * variantConsistency) + (0.2 * densityBonus);
  const value = Math.min(rawValue, 1.0);

  // Determine confidence level
  let level: 'low' | 'medium' | 'high';
  if (pageCount < minPageThreshold) {
    level = 'low';
  } else if (value < 0.3) {
    level = 'low';
  } else if (value < 0.6) {
    level = 'medium';
  } else {
    level = 'high';
  }

  // Build reasoning string
  const reasoning = `Found on ${pageCount}/${totalPages} pages with ${instanceCount} instances. ` +
    `${uniqueVariantCount} unique variant(s) (consistency: ${(variantConsistency * 100).toFixed(1)}%).`;

  return {
    value,
    level,
    pageCount,
    instanceCount,
    variantConsistency,
    reasoning
  };
}
