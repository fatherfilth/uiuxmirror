/**
 * Pattern storage with evidence linking and cross-page validation
 * Phase 4: Pattern detection and content analysis
 */

import { createHash } from 'crypto';
import fs from 'fs-extra';
import { join } from 'path';
import type {
  DetectedFlow,
  StoredPattern,
} from '../types/patterns.js';
import type {
  VoicePattern,
  CapitalizationPattern,
  ErrorMessagePattern,
  CTAHierarchy,
} from '../types/content-style.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('pattern-store');

/**
 * Pattern storage class with evidence linking
 */
export class PatternStore {
  private readonly patternsDir: string;

  constructor(outputDir: string = '.uidna') {
    this.patternsDir = join(outputDir, 'patterns');
  }

  /**
   * Convert DetectedFlow to StoredPattern with evidence linking
   */
  storeFlow(flow: DetectedFlow): StoredPattern {
    // Extract unique page URLs from flow path
    const pageUrls = flow.evidence;

    // Extract selectors from transitions
    const selectors = flow.transitions
      .map(t => t.action.selector)
      .filter((s): s is string => s !== undefined);

    // Count unique pages
    const crossPageCount = new Set(pageUrls).size;
    const occurrenceCount = flow.transitions.length;

    // Generate deterministic ID
    const id = this.generatePatternId('flow', flow.type, flow.entryPoint);

    // Enforce cross-page threshold
    let confidence = flow.confidence;
    if (crossPageCount < 3) {
      confidence *= 0.5;
      logger.warn(
        `Flow ${id} has only ${crossPageCount} pages (threshold: 3). Confidence reduced to ${confidence.toFixed(2)}`
      );
    }

    const storedPattern: StoredPattern = {
      id,
      type: 'flow',
      pattern: flow,
      evidence: {
        pageUrls,
        selectors,
        screenshotPaths: [], // Screenshots linked via evidence IDs
        occurrenceCount,
        crossPageCount,
      },
      confidence,
      detectedAt: new Date().toISOString(),
    };

    return storedPattern;
  }

  /**
   * Store content pattern (voice, capitalization, error, CTA) with evidence
   */
  storeContentPattern(
    pattern: VoicePattern | CapitalizationPattern | ErrorMessagePattern | CTAHierarchy,
    type: StoredPattern['type'],
    pageUrls: string[]
  ): StoredPattern {
    // Generate ID based on pattern type and characteristics
    let idSeeds: string[];
    let selectors: string[] = [];
    let occurrenceCount = 0;

    if ('tone' in pattern && 'tense' in pattern) {
      // VoicePattern
      idSeeds = [pattern.tone, pattern.tense, pattern.perspective];
      occurrenceCount = pattern.examples.length;
    } else if ('style' in pattern && 'contexts' in pattern) {
      // CapitalizationPattern
      idSeeds = [pattern.style, ...pattern.contexts];
      occurrenceCount = pattern.frequency;
    } else if ('structure' in pattern && 'tone' in pattern) {
      // ErrorMessagePattern
      idSeeds = [pattern.structure, pattern.tone];
      occurrenceCount = pattern.frequency;
    } else if ('level' in pattern && 'characteristics' in pattern) {
      // CTAHierarchy
      idSeeds = [pattern.level];
      occurrenceCount = pattern.frequency;
      selectors = pattern.examples.map(e => e.selector);
    } else {
      throw new Error(`Unknown pattern type for content pattern storage`);
    }

    const id = this.generatePatternId(type, ...idSeeds);

    // Count unique pages
    const crossPageCount = new Set(pageUrls).size;

    // Get confidence from pattern (all content patterns have this property)
    let confidence = ('confidence' in pattern) ? pattern.confidence : 0.5;
    if (crossPageCount < 3) {
      confidence *= 0.5;
      logger.warn(
        `Pattern ${id} (${type}) has only ${crossPageCount} pages (threshold: 3). Confidence reduced to ${confidence.toFixed(2)}`
      );
    }

    const storedPattern: StoredPattern = {
      id,
      type,
      pattern,
      evidence: {
        pageUrls,
        selectors,
        screenshotPaths: [],
        occurrenceCount,
        crossPageCount,
      },
      confidence,
      detectedAt: new Date().toISOString(),
    };

    return storedPattern;
  }

  /**
   * Persist patterns to JSON files, grouped by type
   */
  async savePatterns(patterns: StoredPattern[]): Promise<void> {
    await fs.ensureDir(this.patternsDir);

    // Group patterns by type
    const grouped = new Map<StoredPattern['type'], StoredPattern[]>();
    for (const pattern of patterns) {
      if (!grouped.has(pattern.type)) {
        grouped.set(pattern.type, []);
      }
      grouped.get(pattern.type)!.push(pattern);
    }

    // Write each group to its own file
    const fileMap: Record<StoredPattern['type'], string> = {
      flow: 'flows.json',
      'voice-tone': 'voice-tone.json',
      capitalization: 'capitalization.json',
      'error-grammar': 'error-grammar.json',
      'cta-hierarchy': 'cta-hierarchy.json',
    };

    for (const [type, typePatterns] of Array.from(grouped.entries())) {
      const filename = fileMap[type];
      const filepath = join(this.patternsDir, filename);
      await fs.writeJSON(filepath, typePatterns, { spaces: 2 });
      logger.info(`Saved ${typePatterns.length} ${type} patterns to ${filename}`);
    }
  }

  /**
   * Load patterns from JSON files
   */
  async loadPatterns(type?: StoredPattern['type']): Promise<StoredPattern[]> {
    const fileMap: Record<StoredPattern['type'], string> = {
      flow: 'flows.json',
      'voice-tone': 'voice-tone.json',
      capitalization: 'capitalization.json',
      'error-grammar': 'error-grammar.json',
      'cta-hierarchy': 'cta-hierarchy.json',
    };

    if (type) {
      // Load specific type
      const filepath = join(this.patternsDir, fileMap[type]);
      if (!(await fs.pathExists(filepath))) {
        return [];
      }
      return await fs.readJSON(filepath);
    }

    // Load all types
    const allPatterns: StoredPattern[] = [];
    for (const filename of Object.values(fileMap)) {
      const filepath = join(this.patternsDir, filename);
      if (await fs.pathExists(filepath)) {
        const patterns = await fs.readJSON(filepath);
        allPatterns.push(...patterns);
      }
    }

    return allPatterns;
  }

  /**
   * Generate deterministic pattern ID from type and seed strings
   */
  private generatePatternId(type: string, ...seeds: string[]): string {
    const hash = createHash('sha256');
    hash.update(type);
    for (const seed of seeds) {
      hash.update(seed);
    }
    const digest = hash.digest('hex').slice(0, 12);
    return `${type}-${digest}`;
  }
}
