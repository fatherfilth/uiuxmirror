/**
 * Component aggregator
 * Merges per-page component instances into canonical component definitions
 * across multiple pages
 */

import type { DetectedComponent, AnalyzedComponent, ComponentType, ComponentVariant } from '../types/components.js';
import type { ComponentConfidenceScore } from '../scoring/component-scorer.js';
import type { StateMapping } from './state-mapper.js';
import { analyzeVariants } from './variant-analyzer.js';
import { calculateComponentConfidence } from '../scoring/component-scorer.js';

/**
 * Aggregated component across multiple pages
 * Represents the canonical definition of a component type
 */
export interface AggregatedComponent {
  /** Component type */
  type: ComponentType;
  /** All instances of this component across pages */
  instances: DetectedComponent[];
  /** URLs of pages where this component appears */
  pageUrls: Set<string>;
  /** Analyzed variants for all instances */
  variants: AnalyzedComponent[];
  /** State mappings (if available) */
  states: StateMapping | null;
  /** Confidence score for this component */
  confidence: ComponentConfidenceScore | null;
  /** Canonical representation (most common variant and styles) */
  canonical: {
    /** Most common style values (mode of each CSS property) */
    styles: Record<string, string>;
    /** Most common variant */
    variant: ComponentVariant;
  };
}

/**
 * Calculate mode (most common value) for a CSS property across instances
 */
function calculateMode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  let maxCount = 0;
  let mode = values[0] || '';
  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  }

  return mode;
}

/**
 * Determine canonical variant (most common across all instances)
 */
function calculateCanonicalVariant(variants: AnalyzedComponent[]): ComponentVariant {
  if (variants.length === 0) {
    return {
      evidence: []
    };
  }

  // Count variant signatures
  const variantCounts = new Map<string, { count: number; variant: ComponentVariant }>();

  for (const analyzed of variants) {
    const signature = JSON.stringify({
      size: analyzed.variant.size,
      emphasis: analyzed.variant.emphasis,
      shape: analyzed.variant.shape
    });

    const existing = variantCounts.get(signature);
    if (existing) {
      existing.count++;
    } else {
      variantCounts.set(signature, {
        count: 1,
        variant: analyzed.variant
      });
    }
  }

  // Find most common variant
  let maxCount = 0;
  let canonicalVariant: ComponentVariant = variants[0].variant;

  for (const { count, variant } of variantCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
      canonicalVariant = variant;
    }
  }

  return canonicalVariant;
}

/**
 * Aggregate components across multiple pages into canonical definitions
 *
 * Process:
 * 1. Collect all components across pages
 * 2. Group by component type
 * 3. For each type group:
 *    - Collect unique page URLs
 *    - Analyze variants across all instances
 *    - Determine canonical representation (most common variant and styles)
 *    - Calculate confidence score
 * 4. Sort by confidence descending within each type
 * 5. Return flat array of AggregatedComponent
 *
 * @param perPageComponents - Map of page URL to detected components
 * @param totalPages - Total number of pages analyzed
 * @returns Array of aggregated components sorted by confidence
 */
export function aggregateComponents(
  perPageComponents: Map<string, DetectedComponent[]>,
  totalPages: number
): AggregatedComponent[] {
  // Step 1: Collect all components across pages
  const allComponents: DetectedComponent[] = [];
  for (const components of perPageComponents.values()) {
    allComponents.push(...components);
  }

  // Step 2: Group by component type
  const byType = new Map<ComponentType, DetectedComponent[]>();
  for (const component of allComponents) {
    const existing = byType.get(component.type) || [];
    existing.push(component);
    byType.set(component.type, existing);
  }

  const aggregated: AggregatedComponent[] = [];

  // Step 3: Process each type group
  for (const [type, instances] of byType.entries()) {
    // Collect unique page URLs
    const pageUrls = new Set<string>();
    for (const instance of instances) {
      pageUrls.add(instance.pageUrl);
    }

    // Analyze variants across all instances
    const variants = analyzeVariants(instances);

    // Determine canonical representation
    const canonicalVariant = calculateCanonicalVariant(variants);

    // Calculate mode for each CSS property
    const styleProperties = new Set<string>();
    for (const instance of instances) {
      for (const prop of Object.keys(instance.computedStyles)) {
        styleProperties.add(prop);
      }
    }

    const canonicalStyles: Record<string, string> = {};
    for (const prop of styleProperties) {
      const values = instances
        .map(i => i.computedStyles[prop])
        .filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        canonicalStyles[prop] = calculateMode(values);
      }
    }

    // Create aggregated component (confidence will be calculated next)
    const aggregatedComponent: AggregatedComponent = {
      type,
      instances,
      pageUrls,
      variants,
      states: null, // States are mapped separately via state-mapper
      confidence: null, // Will be calculated below
      canonical: {
        styles: canonicalStyles,
        variant: canonicalVariant
      }
    };

    // Calculate confidence score
    const confidence = calculateComponentConfidence(
      aggregatedComponent,
      totalPages
    );
    aggregatedComponent.confidence = confidence;

    aggregated.push(aggregatedComponent);
  }

  // Step 4: Sort by confidence descending
  aggregated.sort((a, b) => {
    const aConf = a.confidence?.value ?? 0;
    const bConf = b.confidence?.value ?? 0;
    return bConf - aConf;
  });

  return aggregated;
}
