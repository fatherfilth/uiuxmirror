/**
 * Evidence citation and summary formatting utilities
 * Provides consistent evidence linking across all export consumers
 */

import type { TokenEvidence } from '../types/evidence.js';

/**
 * Format evidence array into parenthetical citation string
 * Shows first N (default 3) source page paths with "+N more" suffix if needed
 *
 * @param evidence - Array of token evidence
 * @param maxSources - Maximum number of sources to show inline (default 3)
 * @returns Formatted citation string, e.g., "/about, /contact, /pricing (+7 more)"
 */
export function formatEvidenceCitation(
  evidence: TokenEvidence[],
  maxSources: number = 3
): string {
  if (evidence.length === 0) {
    return 'No evidence';
  }

  // Extract unique page paths
  const uniquePages = new Set<string>();
  for (const e of evidence) {
    try {
      const url = new URL(e.pageUrl);
      // Use pathname for human-readable paths; if root, use hostname instead
      const path = url.pathname === '/' ? url.hostname : url.pathname;
      uniquePages.add(path);
    } catch {
      // If URL parsing fails, use the raw URL
      uniquePages.add(e.pageUrl);
    }
  }

  const paths = Array.from(uniquePages);
  const firstN = paths.slice(0, maxSources);
  const remaining = paths.length - maxSources;

  if (remaining > 0) {
    return `${firstN.join(', ')} (+${remaining} more)`;
  }

  return firstN.join(', ');
}

/**
 * Generate structured evidence summary for JSON rich layer
 * Returns page count, element count, and list of unique page paths
 *
 * @param evidence - Array of token evidence
 * @returns Structured summary object
 */
export function formatEvidenceSummary(evidence: TokenEvidence[]): {
  pageCount: number;
  elementCount: number;
  pages: string[];
} {
  const uniquePages = new Set<string>();

  for (const e of evidence) {
    uniquePages.add(e.pageUrl);
  }

  return {
    pageCount: uniquePages.size,
    elementCount: evidence.length,
    pages: Array.from(uniquePages),
  };
}

/**
 * Format evidence for JSON export (simplified structure)
 * Strips verbose fields like computedStyles and boundingBox
 *
 * @param evidence - Array of token evidence
 * @returns Array of simplified evidence objects
 */
export function formatEvidenceForJSON(evidence: TokenEvidence[]): Array<{
  pageUrl: string;
  selector: string;
  screenshotPath?: string;
}> {
  return evidence.map(e => ({
    pageUrl: e.pageUrl,
    selector: e.selector,
    screenshotPath: e.screenshotPath,
  }));
}
