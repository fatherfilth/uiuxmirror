/**
 * Capitalization pattern analysis
 * Detects capitalization styles across different text contexts
 */

import { titleCase } from 'title-case';
import type { TextSample, CapitalizationPattern, CapitalizationStyle } from '../types/content-style.js';

/**
 * Detect capitalization style of a single text string
 */
export function detectCapitalizationStyle(text: string): CapitalizationStyle {
  // Check if text has any letters
  const hasLetters = /[a-zA-Z]/.test(text);
  if (!hasLetters) {
    return 'mixed';
  }

  // Check uppercase (all letters are uppercase)
  if (text === text.toUpperCase()) {
    return 'uppercase';
  }

  // Check lowercase (all letters are lowercase)
  if (text === text.toLowerCase()) {
    return 'lowercase';
  }

  // Check title case
  const titleCased = titleCase(text);
  if (text === titleCased) {
    return 'title-case';
  }

  // Check sentence case: first word capitalized, rest lowercase (except acronyms)
  const words = text.split(/\s+/);
  if (words.length > 0) {
    const firstWord = words[0];
    const restWords = words.slice(1);

    // First word should be capitalized
    const firstWordCapitalized =
      firstWord.length > 0 &&
      firstWord[0] === firstWord[0].toUpperCase();

    // Rest should be lowercase or acronyms (all caps words like API, CTA)
    const restValid = restWords.every(word => {
      // Allow acronyms (all uppercase)
      if (word === word.toUpperCase() && word.length <= 4) {
        return true;
      }
      // Otherwise should be lowercase
      return word === word.toLowerCase();
    });

    if (firstWordCapitalized && restValid) {
      return 'sentence-case';
    }
  }

  // Default to mixed if no pattern matches
  return 'mixed';
}

/**
 * Analyze capitalization patterns across text samples
 * Groups by context and identifies dominant styles
 */
export function analyzeCapitalization(samples: TextSample[]): CapitalizationPattern[] {
  // Group samples by context
  const byContext = new Map<string, TextSample[]>();

  for (const sample of samples) {
    const key = sample.context;
    if (!byContext.has(key)) {
      byContext.set(key, []);
    }
    byContext.get(key)!.push(sample);
  }

  // Analyze each context group
  const patterns: CapitalizationPattern[] = [];

  for (const [context, contextSamples] of byContext.entries()) {
    // Require minimum 5 samples per context (per research guidance)
    if (contextSamples.length < 5) {
      continue;
    }

    // Detect style for each sample
    const styleMap = new Map<CapitalizationStyle, string[]>();

    for (const sample of contextSamples) {
      const style = detectCapitalizationStyle(sample.text);

      if (!styleMap.has(style)) {
        styleMap.set(style, []);
      }

      const examples = styleMap.get(style)!;
      // Limit examples to avoid overwhelming data
      if (examples.length < 10) {
        examples.push(sample.text);
      }
    }

    // Convert to CapitalizationPattern objects
    const totalInContext = contextSamples.length;

    for (const [style, examples] of styleMap.entries()) {
      const frequency = examples.length;
      const confidence = frequency / totalInContext;

      patterns.push({
        style,
        examples,
        frequency,
        contexts: [context as any], // Single context for now
        confidence,
      });
    }
  }

  // Sort by frequency descending
  return patterns.sort((a, b) => b.frequency - a.frequency);
}
