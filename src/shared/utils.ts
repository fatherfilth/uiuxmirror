/**
 * Common utility functions for UIUX-Mirror
 */

import { createHash } from 'node:crypto';

/**
 * Generate a unique evidence ID from pageUrl, selector, and timestamp
 * Uses SHA-256 hash for deterministic IDs
 */
export function generateEvidenceId(
  pageUrl: string,
  selector: string,
  timestamp: string
): string {
  const content = `${pageUrl}|${selector}|${timestamp}`;
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Normalize URL by stripping trailing slash and ensuring consistent protocol
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    // Sort search params for consistency
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Convert URL to a safe filename (for evidence storage)
 */
export function sanitizeFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const base = `${parsed.hostname}${parsed.pathname}`;
    // Replace special characters with underscores
    return base.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 200);
  } catch {
    // Fallback: just sanitize the string directly
    return url.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 200);
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random jitter between min and max milliseconds
 */
export function randomJitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a deterministic hash of token data for diff detection
 */
export function hashTokens(tokens: unknown): string {
  const content = JSON.stringify(tokens, Object.keys(tokens as object).sort());
  return createHash('sha256').update(content).digest('hex');
}
