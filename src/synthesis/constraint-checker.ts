/**
 * Token constraint checker for synthesis pipeline
 * Validates that all token references exist in extracted DesignDNA
 * Core anti-hallucination guard: NEVER fabricate token values
 */

import type { DesignDNA, TokenConstraintResult, EvidenceLink } from '../types/synthesis.js';

/**
 * Token category types for lookup
 */
export type TokenCategory = 'color' | 'spacing' | 'typography' | 'radius' | 'shadow' | 'motion';

/**
 * Token map for quick lookups
 * Maps semantic names to values: { 'color-primary': '#3b82f6', 'spacing-md': '16px', ... }
 */
export interface TokenMap {
  colors: Map<string, { value: string; evidence: EvidenceLink }>;
  spacing: Map<string, { value: string; evidence: EvidenceLink }>;
  typography: Map<string, { value: string; evidence: EvidenceLink }>;
  radii: Map<string, { value: string; evidence: EvidenceLink }>;
  shadows: Map<string, { value: string; evidence: EvidenceLink }>;
  motion: Map<string, { value: string; evidence: EvidenceLink }>;
}

/**
 * Build a flat lookup map from DesignDNA for quick token resolution
 * Uses DTCG output naming conventions (color-1, spacing-xs, heading-1, etc.)
 */
export function buildTokenMap(dna: DesignDNA): TokenMap {
  const map: TokenMap = {
    colors: new Map(),
    spacing: new Map(),
    typography: new Map(),
    radii: new Map(),
    shadows: new Map(),
    motion: new Map(),
  };

  // Colors from standards
  dna.tokens.colors.standards.forEach((result, index) => {
    const cluster = result.token;
    const key = `color-${index + 1}`;
    map.colors.set(key, {
      value: cluster.canonical,
      evidence: {
        sourceType: 'observed_token',
        reference: key,
        occurrenceCount: cluster.occurrences,
      },
    });
  });

  // Typography from standards
  dna.tokens.typography.standards.forEach((result, index) => {
    const token = result.token;
    const key = `heading-${index + 1}`;
    // Store as CSS font shorthand or individual properties
    const value = `${token.weight} ${token.normalizedSize.original}/${token.lineHeight} ${token.family}`;
    map.typography.set(key, {
      value,
      evidence: {
        sourceType: 'observed_token',
        reference: key,
        occurrenceCount: result.occurrenceCount,
      },
    });
    // Also store individual properties
    map.typography.set(`${key}-size`, {
      value: token.normalizedSize.original,
      evidence: {
        sourceType: 'observed_token',
        reference: `${key}-size`,
        occurrenceCount: result.occurrenceCount,
      },
    });
    map.typography.set(`${key}-weight`, {
      value: String(token.weight),
      evidence: {
        sourceType: 'observed_token',
        reference: `${key}-weight`,
        occurrenceCount: result.occurrenceCount,
      },
    });
  });

  // Spacing from standards
  const spacingScaleNames = ['xs', 'sm', 'md', 'lg', 'xl'];
  dna.tokens.spacing.standards.forEach((result, index) => {
    const token = result.token;
    const key = `spacing-${spacingScaleNames[index] || index + 1}`;
    map.spacing.set(key, {
      value: token.normalizedValue.original,
      evidence: {
        sourceType: 'observed_token',
        reference: key,
        occurrenceCount: result.occurrenceCount,
      },
    });
  });

  // Radii from standards
  dna.tokens.radii.standards.forEach((result, index) => {
    const token = result.token;
    const key = `radius-${index + 1}`;
    map.radii.set(key, {
      value: token.value,
      evidence: {
        sourceType: 'observed_token',
        reference: key,
        occurrenceCount: result.occurrenceCount,
      },
    });
  });

  // Shadows from standards
  dna.tokens.shadows.standards.forEach((result, index) => {
    const token = result.token;
    const key = `shadow-${index + 1}`;
    map.shadows.set(key, {
      value: token.value,
      evidence: {
        sourceType: 'observed_token',
        reference: key,
        occurrenceCount: result.occurrenceCount,
      },
    });
  });

  // Motion from standards
  dna.tokens.motion.standards.forEach((result, index) => {
    const token = result.token;
    const key = `motion-${index + 1}`;
    map.motion.set(key, {
      value: token.value,
      evidence: {
        sourceType: 'observed_token',
        reference: key,
        occurrenceCount: result.occurrenceCount,
      },
    });
  });

  return map;
}

/**
 * Resolve a token value from DesignDNA
 * Returns the token value and an EvidenceLink with sourceType: 'observed_token'
 *
 * @param category - Token category ('color', 'spacing', 'typography', 'radius', 'shadow', 'motion')
 * @param dna - The extracted DesignDNA
 * @param index - Optional index/position hint (0-based)
 * @returns Object with value and evidence, or null if not found
 */
export function resolveTokenValue(
  category: TokenCategory,
  dna: DesignDNA,
  index?: number
): { value: string; evidence: EvidenceLink } | null {
  try {
    switch (category) {
      case 'color': {
        const standards = dna.tokens.colors.standards;
        if (index !== undefined && index >= 0 && index < standards.length) {
          const cluster = standards[index].token;
          return {
            value: cluster.canonical,
            evidence: {
              sourceType: 'observed_token',
              reference: `color-${index + 1}`,
              occurrenceCount: cluster.occurrences,
            },
          };
        }
        // Default to first color if no index
        if (standards.length > 0) {
          const cluster = standards[0].token;
          return {
            value: cluster.canonical,
            evidence: {
              sourceType: 'observed_token',
              reference: 'color-1',
              occurrenceCount: cluster.occurrences,
            },
          };
        }
        return null;
      }

      case 'spacing': {
        const standards = dna.tokens.spacing.standards;
        if (index !== undefined && index >= 0 && index < standards.length) {
          const token = standards[index].token;
          return {
            value: `${token.normalizedValue.pixels}px`,
            evidence: {
              sourceType: 'observed_token',
              reference: `spacing-${index + 1}`,
              occurrenceCount: standards[index].occurrenceCount,
            },
          };
        }
        // Default to middle spacing if no index
        const midIndex = Math.floor(standards.length / 2);
        if (standards.length > 0) {
          const token = standards[midIndex].token;
          return {
            value: `${token.normalizedValue.pixels}px`,
            evidence: {
              sourceType: 'observed_token',
              reference: `spacing-${midIndex + 1}`,
              occurrenceCount: standards[midIndex].occurrenceCount,
            },
          };
        }
        return null;
      }

      case 'typography': {
        const standards = dna.tokens.typography.standards;
        if (index !== undefined && index >= 0 && index < standards.length) {
          const token = standards[index].token;
          return {
            value: `${token.weight} ${token.normalizedSize.pixels}px/${token.lineHeight} ${token.family}`,
            evidence: {
              sourceType: 'observed_token',
              reference: `heading-${index + 1}`,
              occurrenceCount: standards[index].occurrenceCount,
            },
          };
        }
        // Default to first typography if no index
        if (standards.length > 0) {
          const token = standards[0].token;
          return {
            value: `${token.weight} ${token.normalizedSize.pixels}px/${token.lineHeight} ${token.family}`,
            evidence: {
              sourceType: 'observed_token',
              reference: 'heading-1',
              occurrenceCount: standards[0].occurrenceCount,
            },
          };
        }
        return null;
      }

      case 'radius': {
        const standards = dna.tokens.radii.standards;
        if (index !== undefined && index >= 0 && index < standards.length) {
          const token = standards[index].token;
          return {
            value: token.value,
            evidence: {
              sourceType: 'observed_token',
              reference: `radius-${index + 1}`,
              occurrenceCount: standards[index].occurrenceCount,
            },
          };
        }
        // Default to first radius if no index
        if (standards.length > 0) {
          const token = standards[0].token;
          return {
            value: token.value,
            evidence: {
              sourceType: 'observed_token',
              reference: 'radius-1',
              occurrenceCount: standards[0].occurrenceCount,
            },
          };
        }
        return null;
      }

      case 'shadow': {
        const standards = dna.tokens.shadows.standards;
        if (index !== undefined && index >= 0 && index < standards.length) {
          const token = standards[index].token;
          return {
            value: token.value,
            evidence: {
              sourceType: 'observed_token',
              reference: `shadow-${index + 1}`,
              occurrenceCount: standards[index].occurrenceCount,
            },
          };
        }
        // Default to first shadow if no index
        if (standards.length > 0) {
          const token = standards[0].token;
          return {
            value: token.value,
            evidence: {
              sourceType: 'observed_token',
              reference: 'shadow-1',
              occurrenceCount: standards[0].occurrenceCount,
            },
          };
        }
        return null;
      }

      case 'motion': {
        const standards = dna.tokens.motion.standards;
        if (index !== undefined && index >= 0 && index < standards.length) {
          const token = standards[index].token;
          return {
            value: token.value,
            evidence: {
              sourceType: 'observed_token',
              reference: `motion-${index + 1}`,
              occurrenceCount: standards[index].occurrenceCount,
            },
          };
        }
        // Default to first motion if no index
        if (standards.length > 0) {
          const token = standards[0].token;
          return {
            value: token.value,
            evidence: {
              sourceType: 'observed_token',
              reference: 'motion-1',
              occurrenceCount: standards[0].occurrenceCount,
            },
          };
        }
        return null;
      }

      default:
        return null;
    }
  } catch (error) {
    // If any error occurs during token resolution, return null
    // This ensures we never accidentally fabricate values
    return null;
  }
}

/**
 * Validate token constraints against extracted DesignDNA
 * Core function: ensures all token references exist in the source site
 *
 * @param constraints - Map of CSS property -> token category hint
 * @param dna - The extracted DesignDNA
 * @returns TokenConstraintResult with resolved values, missing list, and confidence
 */
export function validateTokenConstraints(
  constraints: Record<string, TokenCategory>,
  dna: DesignDNA
): TokenConstraintResult {
  const resolved: Record<string, string> = {};
  const missing: string[] = [];

  // Attempt to resolve each constraint
  for (const [property, category] of Object.entries(constraints)) {
    const result = resolveTokenValue(category, dna);

    if (result === null) {
      // Token not found in DesignDNA - add to missing list
      missing.push(property);
    } else {
      // Token found - add to resolved map
      resolved[property] = result.value;
    }
  }

  // Calculate confidence based on coverage (resolved / total)
  const totalConstraints = Object.keys(constraints).length;
  const resolvedCount = Object.keys(resolved).length;
  const confidence = totalConstraints > 0 ? resolvedCount / totalConstraints : 1;

  return {
    valid: missing.length === 0,
    resolved,
    missing,
    confidence,
  };
}
