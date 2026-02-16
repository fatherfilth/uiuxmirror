/**
 * Content analysis orchestrator
 * Runs all content analyzers and aggregates results
 * Phase 4: Pattern detection and content analysis
 */

import type { PageData } from '../types/crawl-config.js';
import type { DetectedComponent } from '../types/components.js';
import type { ContentStyleResult, TextSample } from '../types/content-style.js';
import {
  extractTextSamples,
  analyzeVoiceTone,
  analyzeCapitalization,
  analyzeErrorMessages,
  analyzeCTAHierarchy,
} from '../content/index.js';

/**
 * Orchestrates all content analyzers into a single ContentStyleResult
 *
 * @param pages - Crawled page data
 * @param htmlContents - Map of page URLs to HTML content
 * @param components - Detected components (used for CTA hierarchy)
 * @returns Complete content style analysis
 */
export function analyzeContentStyle(
  pages: PageData[],
  htmlContents: Map<string, string>,
  components: DetectedComponent[]
): ContentStyleResult {
  // Step 1: Extract text samples from all pages
  const allSamples: TextSample[] = [];
  for (const page of pages) {
    const htmlContent = htmlContents.get(page.url);
    if (htmlContent) {
      const samples = extractTextSamples(htmlContent, page.url);
      allSamples.push(...samples);
    }
  }

  // Step 2: Analyze voice/tone patterns
  const voicePatterns = analyzeVoiceTone(allSamples);

  // Step 3: Analyze capitalization patterns
  const capitalizationPatterns = analyzeCapitalization(allSamples);

  // Step 4: Analyze error message grammar (filter to error context only)
  const errorSamples = allSamples.filter(s => s.context === 'error');
  const errorPatterns = analyzeErrorMessages(errorSamples);

  // Step 5: Analyze CTA hierarchy from button components
  const ctaHierarchy = analyzeCTAHierarchy(components);

  // Step 6: Calculate overall confidence (weighted average)
  // Voice: 0.3, Capitalization: 0.3, CTA: 0.25, Errors: 0.15
  // Errors weighted lower because they may not be found (per research pitfall)
  const voiceConfidence = voicePatterns.length > 0
    ? voicePatterns.reduce((sum, p) => sum + p.confidence, 0) / voicePatterns.length
    : 0;
  const capConfidence = capitalizationPatterns.length > 0
    ? capitalizationPatterns.reduce((sum, p) => sum + p.confidence, 0) / capitalizationPatterns.length
    : 0;
  const ctaConfidence = ctaHierarchy.length > 0
    ? ctaHierarchy.reduce((sum, h) => sum + h.confidence, 0) / ctaHierarchy.length
    : 0;
  const errorConfidence = errorPatterns.length > 0
    ? errorPatterns.reduce((sum, p) => sum + (p.frequency / errorSamples.length), 0) / errorPatterns.length
    : 0;

  const overallConfidence =
    voiceConfidence * 0.3 +
    capConfidence * 0.3 +
    ctaConfidence * 0.25 +
    errorConfidence * 0.15;

  return {
    voicePatterns,
    capitalizationPatterns,
    ctaHierarchy,
    errorPatterns,
    totalSamples: allSamples.length,
    confidence: overallConfidence,
  };
}
