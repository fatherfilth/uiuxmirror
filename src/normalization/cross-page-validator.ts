/**
 * Cross-page validation for design tokens
 * NORM-04: Only tokens appearing on 3+ pages are promoted to design standards
 */

import type { TokenEvidence } from '../types/evidence.js';

export interface CrossPageResult<T> {
  token: T;
  pageUrls: Set<string>;
  occurrenceCount: number;
  confidence: number;
  isStandard: boolean;
}

/**
 * Validates tokens across pages and calculates confidence scores.
 * Tokens appearing on minPageCount or more pages are marked as standards.
 * All tokens are returned with their isStandard flag.
 *
 * @param tokens - Tokens with evidence arrays
 * @param minPageCount - Minimum pages required to be considered a standard (default: 3)
 * @param totalPages - Total pages crawled (used for confidence calculation)
 * @returns Array of results sorted by confidence (descending)
 */
export function validateCrossPage<T extends { evidence: TokenEvidence[] }>(
  tokens: T[],
  minPageCount: number = 3,
  totalPages: number
): CrossPageResult<T>[] {
  const results: CrossPageResult<T>[] = [];

  for (const token of tokens) {
    // Extract unique page URLs from evidence
    const pageUrls = new Set<string>();
    for (const evidence of token.evidence) {
      pageUrls.add(evidence.pageUrl);
    }

    // Count total occurrences (all evidence entries)
    const occurrenceCount = token.evidence.length;

    // Calculate raw confidence as page frequency
    const confidence = totalPages > 0 ? pageUrls.size / totalPages : 0;

    // Determine if token meets standard threshold
    const isStandard = pageUrls.size >= minPageCount;

    results.push({
      token,
      pageUrls,
      occurrenceCount,
      confidence,
      isStandard
    });
  }

  // Sort by confidence descending (most frequent first)
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}
