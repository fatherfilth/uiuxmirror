/**
 * Confidence scoring for design tokens
 * NORM-05: Confidence scores range 0-1 based on page frequency and occurrence density
 */

import type { TokenEvidence } from '../types/evidence.js';

export interface ConfidenceScore {
  value: number; // 0-1
  level: 'low' | 'medium' | 'high';
  reasoning: string;
}

/**
 * Calculates confidence score for a token based on page frequency and occurrence density.
 *
 * Score formula:
 * - Raw confidence = pageCount / totalPagesCrawled
 * - Density bonus = min(avgOccurrencesPerPage / 5, 0.2) -- capped at +0.2
 * - Final value = min(rawConfidence + densityBonus, 1.0)
 *
 * Levels:
 * - 'low': pageCount < minPageThreshold OR value < 0.3
 * - 'medium': 0.3 <= value < 0.6
 * - 'high': value >= 0.6
 *
 * @param token - Token with evidence array
 * @param totalPagesCrawled - Total pages crawled
 * @param minPageThreshold - Minimum pages for standard (default: 3)
 * @returns ConfidenceScore with value, level, and reasoning
 */
export function calculateTokenConfidence(
  token: { evidence: TokenEvidence[] },
  totalPagesCrawled: number,
  minPageThreshold: number = 3
): ConfidenceScore {
  // Extract unique pages from evidence
  const uniquePages = new Set<string>();
  for (const evidence of token.evidence) {
    uniquePages.add(evidence.pageUrl);
  }

  const pageCount = uniquePages.size;
  const occurrenceCount = token.evidence.length;

  // Calculate raw confidence
  const rawConfidence = totalPagesCrawled > 0 ? pageCount / totalPagesCrawled : 0;

  // Calculate density bonus
  // Only apply bonus if average occurrences per page > 1 (multiple occurrences indicate stronger pattern)
  const avgOccurrencesPerPage = pageCount > 0 ? occurrenceCount / pageCount : 0;
  const densityBonus = avgOccurrencesPerPage > 1
    ? Math.min((avgOccurrencesPerPage - 1) / 5, 0.2)
    : 0;

  // Final confidence value (capped at 1.0)
  const value = Math.min(rawConfidence + densityBonus, 1.0);

  // Determine level
  let level: 'low' | 'medium' | 'high';
  if (pageCount < minPageThreshold || value < 0.3) {
    level = 'low';
  } else if (value < 0.6) {
    level = 'medium';
  } else {
    level = 'high';
  }

  // Generate reasoning
  const percentage = Math.round(rawConfidence * 100);
  const reasoning = `Appears on ${pageCount}/${totalPagesCrawled} pages (${percentage}%) with ${occurrenceCount} total occurrences`;

  return {
    value,
    level,
    reasoning
  };
}
