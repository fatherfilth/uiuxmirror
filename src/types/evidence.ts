/**
 * Evidence and observation type definitions for UIUX-Mirror
 * Implements NORM-03 requirements (observable evidence tracing)
 */

// NORM-03: Token evidence - every token must trace back to observable evidence
export interface TokenEvidence {
  pageUrl: string;
  selector: string;
  timestamp: string;          // ISO 8601
  screenshotPath?: string;    // Relative path to screenshot crop
  computedStyles: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Evidence entry for storage in evidence index
export interface EvidenceEntry {
  id: string;                 // SHA-256 hash of pageUrl + selector + timestamp
  pageUrl: string;
  selector: string;
  timestamp: string;
  screenshotPath?: string;
  computedStyles: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Evidence index for efficient lookups
export interface EvidenceIndex {
  entries: Record<string, EvidenceEntry>;
  byPage: Record<string, string[]>;      // pageUrl -> evidenceId[]
  bySelector: Record<string, string[]>;   // selector -> evidenceId[]
}
