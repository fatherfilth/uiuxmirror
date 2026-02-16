/**
 * Error message grammar and structure analysis
 * Analyzes error message patterns for structure, tone, and common prefixes
 */

import nlp from 'compromise';
import type { TextSample, ErrorMessagePattern, ErrorStructure, ErrorTone } from '../types/content-style.js';

/**
 * Analyzes error message patterns from text samples
 * Returns patterns with structure, tone, prefixes, and examples
 */
export function analyzeErrorMessages(samples: TextSample[]): ErrorMessagePattern[] {
  // Filter to error context only
  const errorSamples = samples.filter(s => s.context === 'error');

  // Require at least 3 error samples (per research: insufficient evidence otherwise)
  if (errorSamples.length < 3) {
    console.warn(`analyzeErrorMessages: Only ${errorSamples.length} error samples found. Minimum 3 required.`);
    return [];
  }

  // Analyze each error sample
  const analyzed = errorSamples.map(sample => {
    const doc = nlp(sample.text);

    // Detect structure
    const structure = detectStructure(doc, sample.text);

    // Detect tone
    const tone = detectTone(sample.text);

    // Extract prefix if present
    const prefix = extractPrefix(sample.text);

    // Check if suggests action
    const suggestsAction = hasSuggestionWords(sample.text);

    return {
      text: sample.text,
      structure,
      tone,
      prefix,
      suggestsAction,
    };
  });

  // Cluster by structure+tone
  const clusters = new Map<string, {
    structure: ErrorStructure;
    tone: ErrorTone;
    examples: string[];
    prefixes: string[];
    suggestsAction: boolean;
    count: number;
  }>();

  for (const item of analyzed) {
    const key = `${item.structure}::${item.tone}`;

    if (!clusters.has(key)) {
      clusters.set(key, {
        structure: item.structure,
        tone: item.tone,
        examples: [],
        prefixes: [],
        suggestsAction: false,
        count: 0,
      });
    }

    const cluster = clusters.get(key)!;
    cluster.count++;

    // Add example if not already present (limit to 10)
    if (!cluster.examples.includes(item.text) && cluster.examples.length < 10) {
      cluster.examples.push(item.text);
    }

    // Add prefix if present and not already in list
    if (item.prefix && !cluster.prefixes.includes(item.prefix)) {
      cluster.prefixes.push(item.prefix);
    }

    // Update suggestsAction (true if any in cluster suggests action)
    if (item.suggestsAction) {
      cluster.suggestsAction = true;
    }
  }

  // Convert to ErrorMessagePattern[]
  const patterns: ErrorMessagePattern[] = [];

  for (const [_, cluster] of Array.from(clusters.entries())) {
    patterns.push({
      structure: cluster.structure,
      tone: cluster.tone,
      examples: cluster.examples,
      commonPrefixes: cluster.prefixes,
      suggestsAction: cluster.suggestsAction,
      frequency: cluster.count,
    });
  }

  // Sort by frequency descending
  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Detect error message structure
 */
function detectStructure(doc: any, text: string): ErrorStructure {
  const sentences = doc.sentences();
  const sentenceCount = sentences.length;

  // Check if question format
  if (text.trim().endsWith('?')) {
    return 'question-format';
  }

  // Check if multiple sentences with suggestion words
  if (sentenceCount > 1 && hasSuggestionWords(text)) {
    return 'reason-suggestion';
  }

  // Check if starts with common prefix pattern
  if (hasPrefix(text)) {
    return 'prefix-reason';
  }

  // Default to reason-only
  return 'reason-only';
}

/**
 * Detect error message tone
 */
function detectTone(text: string): ErrorTone {
  const lowerText = text.toLowerCase();

  // Check for apologetic tone
  if (/sorry|apologies|oops|unfortunately/.test(lowerText)) {
    return 'apologetic';
  }

  // Check for instructive tone (suggestion words)
  if (hasSuggestionWords(text)) {
    return 'instructive';
  }

  // Check for technical tone
  if (/error|invalid|failed|cannot|exception/.test(lowerText)) {
    return 'technical';
  }

  // Default to neutral
  return 'neutral';
}

/**
 * Check if text contains suggestion words
 */
function hasSuggestionWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return /please|try|should|can you|make sure/.test(lowerText);
}

/**
 * Check if text starts with common error prefix pattern
 */
function hasPrefix(text: string): boolean {
  return /^(error|warning|invalid|oops|sorry|unfortunately)\s*:?\s+/i.test(text);
}

/**
 * Extract prefix from error message if present
 */
function extractPrefix(text: string): string | null {
  const match = text.match(/^([a-z]+)\s*:?\s+/i);
  return match ? match[1] : null;
}
