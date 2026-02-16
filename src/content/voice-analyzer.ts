/**
 * Voice and tone pattern analysis
 * Uses Compromise NLP to detect tense, tone, and perspective patterns in text
 */

import nlp from 'compromise';
import type { TextSample, VoicePattern, ToneType, TenseType, PerspectiveType } from '../types/content-style.js';

/**
 * Analyzes voice and tone patterns from text samples
 * Focuses on CTAs (buttons/links) which carry voice/tone signals
 */
export function analyzeVoiceTone(samples: TextSample[]): VoicePattern[] {
  // Filter to CTA contexts (buttons and links)
  const ctaSamples = samples.filter(
    s => s.context === 'button' || s.context === 'link'
  );

  if (ctaSamples.length === 0) {
    return [];
  }

  // Analyze each sample
  const analyzed = ctaSamples.map(sample => {
    const doc = nlp(sample.text);

    // Detect tense
    const tense = detectTense(doc);

    // Detect tone
    const tone = detectTone(sample.text);

    // Detect perspective
    const perspective = detectPerspective(sample.text);

    return {
      text: sample.text,
      tense,
      tone,
      perspective,
    };
  });

  // Cluster by tone+tense+perspective
  const clusters = new Map<string, { pattern: Omit<VoicePattern, 'confidence'>; count: number }>();

  for (const item of analyzed) {
    const key = `${item.tone}::${item.tense}::${item.perspective}`;

    if (!clusters.has(key)) {
      clusters.set(key, {
        pattern: {
          tone: item.tone,
          tense: item.tense,
          perspective: item.perspective,
          examples: [],
        },
        count: 0,
      });
    }

    const cluster = clusters.get(key)!;
    cluster.count++;

    // Add example if not already present
    if (!cluster.pattern.examples.includes(item.text)) {
      cluster.pattern.examples.push(item.text);
    }
  }

  // Calculate confidence and convert to VoicePattern[]
  const totalSamples = analyzed.length;
  const patterns: VoicePattern[] = [];

  for (const [_, { pattern, count }] of Array.from(clusters.entries())) {
    const confidence = count / totalSamples;

    // High confidence threshold requires at least 10 samples
    const adjustedConfidence = totalSamples < 10 ? confidence * 0.5 : confidence;

    patterns.push({
      ...pattern,
      confidence: adjustedConfidence,
    });
  }

  // Sort by confidence descending
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect tense using Compromise NLP
 */
function detectTense(doc: any): TenseType {
  const verbs = doc.verbs();
  const verbData = verbs.json();

  // No verbs found - check if it's a command phrase
  if (verbData.length === 0) {
    // Short phrases without subject are often imperative (e.g., "Sign Up", "Buy Now")
    const text = doc.text().toLowerCase();
    if (text.split(/\s+/).length <= 3 && /^[a-z]+\s+(up|now|here|more|in|out)/i.test(doc.text())) {
      return 'imperative';
    }
    return 'present';
  }

  // Check verb tense from grammar
  for (const verb of verbData) {
    const tense = verb.verb?.grammar?.tense;

    if (tense === 'FutureTense' || verb.verb?.auxiliary === 'will') {
      return 'future';
    }

    // Imperatives are often in base form without subject
    if (verb.verb?.grammar?.form === 'simple-present' && !doc.has('#Pronoun')) {
      return 'imperative';
    }
  }

  // Default to present
  return 'present';
}

/**
 * Detect tone using regex markers
 */
function detectTone(text: string): ToneType {
  const lowerText = text.toLowerCase();

  // Check for formal markers
  if (/please|kindly|would you|could you/i.test(lowerText)) {
    return 'formal';
  }

  // Check for casual markers
  if (/hey|yeah|cool|awesome|grab|check out|let's/i.test(lowerText)) {
    return 'casual';
  }

  // Check for urgent markers
  if (/now|today|don't miss|limited|hurry|act fast|last chance/i.test(lowerText)) {
    return 'urgent';
  }

  // Check for friendly markers
  if (/welcome|thanks|great|love|enjoy/i.test(lowerText)) {
    return 'friendly';
  }

  // Default to professional
  return 'professional';
}

/**
 * Detect perspective (first-person, second-person, third-person)
 */
function detectPerspective(text: string): PerspectiveType {
  const lowerText = text.toLowerCase();

  // Check for first-person markers
  if (/\b(i|we|our|my)\b/i.test(lowerText)) {
    return 'first-person';
  }

  // Check for second-person markers
  if (/\b(you|your|yours)\b/i.test(lowerText)) {
    return 'second-person';
  }

  // Default to third-person
  return 'third-person';
}
