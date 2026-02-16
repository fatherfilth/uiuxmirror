/**
 * Dual-layer JSON export generators for machine-readable files
 * Phase 05 Plan 02: Generates tokens.json, components.json, patterns.json, content_style.json, evidence_index.json
 *
 * Each export has two layers:
 * - Quick layer: Fast lookups (name->value maps, simple summaries)
 * - Rich layer: Full context with evidence, confidence, relationships
 */

import type { NormalizationResult } from '../../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../components/component-aggregator.js';
import type { EvidenceIndex } from '../../types/evidence.js';
import { formatEvidenceForJSON, formatEvidenceSummary } from '../evidence-linker.js';
import {
  generateSemanticColorName,
  generateSemanticTypographyName,
  generateSemanticSpacingName,
  generateRadiusName,
  generateShadowName,
  generateMotionName,
} from '../semantic-namer.js';

/**
 * Generic dual-layer export structure
 */
export interface DualLayerExport<Q, R> {
  quick: Q;
  rich: R;
  metadata: {
    generatedAt: string;
    version: string;
  };
}

/**
 * Rich token with full context
 */
interface RichToken {
  value: string;
  type: string;
  description: string;
  evidence: Array<{
    pageUrl: string;
    selector: string;
    screenshotPath?: string;
  }>;
  confidence: {
    value: number;
    level: string;
    reasoning: string;
  };
  relationships?: {
    similarTo?: string[];
    usedIn?: string[];
  };
}

/**
 * Rich component with full catalog data
 */
interface RichComponent {
  type: string;
  instances: number;
  pageUrls: string[];
  canonicalStyles: Record<string, string>;
  variants: Array<{
    size?: string;
    emphasis?: string;
    shape?: string;
  }>;
  states: string[] | null;
  confidence: {
    value: number;
    level: string;
  };
  evidence: Array<{
    pageUrl: string;
    selector: string;
    screenshotPath?: string;
  }>;
}

/**
 * Generate tokens.json with dual layers
 * Quick: name->value mapping for fast lookups
 * Rich: Full token context with evidence and confidence
 */
export function generateTokensJSON(
  result: NormalizationResult
): DualLayerExport<Record<string, string>, Record<string, RichToken>> {
  const quick: Record<string, string> = {};
  const rich: Record<string, RichToken> = {};

  // Colors (use standards array, sorted by occurrence descending)
  const sortedColors = [...result.colors.standards].sort(
    (a, b) => b.token.occurrences - a.token.occurrences
  );
  sortedColors.forEach((crossPageToken, index) => {
    const cluster = crossPageToken.token; // token is ColorCluster
    const name = generateSemanticColorName(
      {
        canonical: cluster.canonical,
        variants: cluster.variants,
        occurrences: cluster.occurrences,
      },
      index,
      sortedColors.length
    );

    quick[name] = cluster.canonical;

    const evidenceSummary = formatEvidenceSummary(cluster.evidence);
    rich[name] = {
      value: cluster.canonical,
      type: 'color',
      description: `Color found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(cluster.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Based on ${cluster.occurrences} occurrences across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  // Typography (use standards array, sorted by size descending)
  const sortedTypography = [...result.typography.standards].sort(
    (a, b) => b.token.normalizedSize.pixels - a.token.normalizedSize.pixels
  );
  sortedTypography.forEach((crossPageToken, index) => {
    const token = crossPageToken.token;
    const name = generateSemanticTypographyName(
      {
        normalizedSize: { pixels: token.normalizedSize.pixels },
        weight: token.weight,
      },
      index,
      sortedTypography.length
    );

    // Quick layer: separate entries for size, weight, family, line-height
    quick[`${name}-size`] = token.normalizedSize.original;
    quick[`${name}-weight`] = String(token.weight);
    quick[`${name}-family`] = token.family;
    if (token.lineHeight) {
      quick[`${name}-line-height`] = token.lineHeight;
    }

    // Rich layer: single entry with all typography data
    const evidenceSummary = formatEvidenceSummary(token.evidence);
    rich[name] = {
      value: `${token.normalizedSize.original} ${token.weight} ${token.family}`,
      type: 'typography',
      description: `Typography found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(token.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Extracted from computed styles across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  // Spacing (use standards array, sorted by value ascending)
  const sortedSpacing = [...result.spacing.standards].sort(
    (a, b) => a.token.normalizedValue.pixels - b.token.normalizedValue.pixels
  );
  sortedSpacing.forEach((crossPageToken, index) => {
    const token = crossPageToken.token;
    const name = generateSemanticSpacingName(
      { normalizedValue: { pixels: token.normalizedValue.pixels } },
      index,
      sortedSpacing.length
    );

    quick[name] = token.normalizedValue.original;

    const evidenceSummary = formatEvidenceSummary(token.evidence);
    rich[name] = {
      value: token.normalizedValue.original,
      type: 'spacing',
      description: `Spacing found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(token.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Extracted from margin/padding values across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  // Radii (use standards array, sorted by value ascending)
  const sortedRadii = [...result.radii.standards].sort(
    (a, b) => parseFloat(a.token.value) - parseFloat(b.token.value)
  );
  sortedRadii.forEach((crossPageToken, index) => {
    const token = crossPageToken.token;
    const name = generateRadiusName(index, sortedRadii.length);
    quick[name] = token.value;

    const evidenceSummary = formatEvidenceSummary(token.evidence);
    rich[name] = {
      value: token.value,
      type: 'radius',
      description: `Border radius found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(token.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Extracted from borderRadius values across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  // Shadows (use standards array)
  result.shadows.standards.forEach((crossPageToken, index) => {
    const token = crossPageToken.token;
    const name = generateShadowName(index, result.shadows.standards.length);
    quick[name] = token.value;

    const evidenceSummary = formatEvidenceSummary(token.evidence);
    rich[name] = {
      value: token.value,
      type: 'shadow',
      description: `Box shadow found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(token.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Extracted from boxShadow values across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  // Motion (durations and easings from standards array)
  const durations = result.motion.standards.filter(cp => cp.token.property === 'duration');
  const easings = result.motion.standards.filter(cp => cp.token.property === 'easing');

  durations.forEach((crossPageToken, index) => {
    const token = crossPageToken.token;
    const name = generateMotionName({ property: 'duration' }, index);
    quick[name] = token.value;

    const evidenceSummary = formatEvidenceSummary(token.evidence);
    rich[name] = {
      value: token.value,
      type: 'motion-duration',
      description: `Transition duration found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(token.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Extracted from transition-duration values across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  easings.forEach((crossPageToken, index) => {
    const token = crossPageToken.token;
    const name = generateMotionName({ property: 'easing' }, index);
    quick[name] = token.value;

    const evidenceSummary = formatEvidenceSummary(token.evidence);
    rich[name] = {
      value: token.value,
      type: 'motion-easing',
      description: `Transition easing found on ${evidenceSummary.pageCount} page(s), ${evidenceSummary.elementCount} element(s)`,
      evidence: formatEvidenceForJSON(token.evidence.slice(0, 10)),
      confidence: {
        value: crossPageToken.confidence,
        level: crossPageToken.confidence > 0.6 ? 'high' : crossPageToken.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `Extracted from transition-timing-function values across ${crossPageToken.pageUrls.size} pages`,
      },
    };
  });

  return {
    quick,
    rich,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

/**
 * Generate components.json with dual layers
 * Quick: type->summary mapping
 * Rich: Full component catalog with variants and states
 */
export function generateComponentsJSON(
  components: AggregatedComponent[]
): DualLayerExport<
  Record<string, { type: string; variantCount: number; pageCount: number }>,
  Record<string, RichComponent>
> {
  const quick: Record<string, { type: string; variantCount: number; pageCount: number }> = {};
  const rich: Record<string, RichComponent> = {};

  components.forEach(component => {
    const key = component.type;

    // Quick layer: summary
    quick[key] = {
      type: component.type,
      variantCount: component.variants.length,
      pageCount: component.pageUrls.size,
    };

    // Rich layer: full catalog
    // Extract state names from states mapping if available
    let stateNames: string[] | null = null;
    if (component.states) {
      stateNames = Object.keys(component.states);
    }

    // Collect evidence from all instances (sample first 10)
    const allEvidence = component.instances.flatMap(i => i.evidence);
    const sampledEvidence = allEvidence.slice(0, 10);

    rich[key] = {
      type: component.type,
      instances: component.instances.length,
      pageUrls: Array.from(component.pageUrls),
      canonicalStyles: component.canonical.styles,
      variants: component.variants.map(v => ({
        size: v.variant.size,
        emphasis: v.variant.emphasis,
        shape: v.variant.shape,
      })),
      states: stateNames,
      confidence: {
        value: component.confidence?.value || 0,
        level: component.confidence?.level || 'low',
      },
      evidence: formatEvidenceForJSON(sampledEvidence),
    };
  });

  return {
    quick,
    rich,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

/**
 * Generate evidence_index.json (single layer - no dual structure)
 * Exports full evidence index without verbose computedStyles
 */
export function generateEvidenceIndexJSON(evidenceIndex: EvidenceIndex): {
  entries: Record<string, {
    id: string;
    pageUrl: string;
    selector: string;
    timestamp: string;
    screenshotPath?: string;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  byPage: Record<string, string[]>;
  bySelector: Record<string, string[]>;
  metadata: {
    totalEntries: number;
    uniquePages: number;
    generatedAt: string;
  };
} {
  // Strip computedStyles from entries (too large for export)
  const strippedEntries: Record<string, any> = {};
  for (const [id, entry] of Object.entries(evidenceIndex.entries)) {
    strippedEntries[id] = {
      id: entry.id,
      pageUrl: entry.pageUrl,
      selector: entry.selector,
      timestamp: entry.timestamp,
      screenshotPath: entry.screenshotPath,
      boundingBox: entry.boundingBox,
    };
  }

  return {
    entries: strippedEntries,
    byPage: evidenceIndex.byPage,
    bySelector: evidenceIndex.bySelector,
    metadata: {
      totalEntries: Object.keys(evidenceIndex.entries).length,
      uniquePages: Object.keys(evidenceIndex.byPage).length,
      generatedAt: new Date().toISOString(),
    },
  };
}
