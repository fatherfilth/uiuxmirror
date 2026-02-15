/**
 * W3C Design Token Community Group (DTCG) format output
 * Transforms normalized tokens to W3C DTCG standard format
 */

import type { ColorCluster } from '../types/normalized-tokens.js';
import type { NormalizedTypographyToken, NormalizedSpacingToken } from '../types/normalized-tokens.js';
import type { RadiusToken, ShadowToken, MotionToken } from '../types/tokens.js';
import type { ConfidenceScore } from '../scoring/token-scorer.js';

/**
 * W3C DTCG token format
 * See: https://design-tokens.github.io/community-group/format/
 */
export interface DTCGToken {
  $type: string;
  $value: any;
  $description?: string;
  $extensions?: Record<string, any>;
}

/**
 * DTCG token file with nested groups
 */
export interface DTCGTokenFile {
  [key: string]: DTCGToken | DTCGTokenFile;
}

/**
 * Normalization result interface (to be used by normalize-pipeline)
 */
export interface NormalizationResult {
  colors: {
    clusters: ColorCluster[];
    standards: any[]; // CrossPageResult<ColorCluster>
    all: any[];
  };
  typography: {
    normalized: NormalizedTypographyToken[];
    standards: any[];
    all: any[];
  };
  spacing: {
    normalized: NormalizedSpacingToken[];
    scale: any; // SpacingScale
    standards: any[];
    all: any[];
  };
  radii: {
    standards: any[];
    all: any[];
  };
  shadows: {
    standards: any[];
    all: any[];
  };
  motion: {
    standards: any[];
    all: any[];
  };
  dtcg: DTCGTokenFile;
  metadata: {
    totalPages: number;
    minPageThreshold: number;
    baseFontSize: number;
    timestamp: string;
  };
}

/**
 * Format color cluster into DTCG color token
 */
export function formatColorToken(
  _name: string,
  cluster: ColorCluster,
  confidence: ConfidenceScore
): DTCGToken {
  // Count unique pages from evidence
  const uniquePages = new Set(cluster.evidence.map(e => e.pageUrl));
  const pageCount = uniquePages.size;
  const elementCount = cluster.evidence.length;

  return {
    $type: 'color',
    $value: cluster.canonical,
    $description: `Appears on ${elementCount} elements across ${pageCount} pages`,
    $extensions: {
      'com.uiux-mirror': {
        confidence: confidence.value,
        level: confidence.level,
        occurrences: cluster.occurrences,
        variants: cluster.variants,
        evidenceCount: cluster.evidence.length,
      },
    },
  };
}

/**
 * Format typography token into DTCG typography token
 */
export function formatTypographyToken(
  _name: string,
  token: NormalizedTypographyToken,
  confidence: ConfidenceScore
): DTCGToken {
  return {
    $type: 'typography',
    $value: {
      fontFamily: token.family,
      fontSize: token.size,
      fontWeight: token.weight,
      lineHeight: token.lineHeight,
      letterSpacing: token.letterSpacing,
    },
    $extensions: {
      'com.uiux-mirror': {
        confidence: confidence.value,
        level: confidence.level,
        normalizedSizePixels: token.normalizedSize.pixels,
        evidenceCount: token.evidence.length,
      },
    },
  };
}

/**
 * Format spacing token into DTCG dimension token
 */
export function formatSpacingToken(
  _name: string,
  token: NormalizedSpacingToken,
  confidence: ConfidenceScore
): DTCGToken {
  return {
    $type: 'dimension',
    $value: token.value,
    $extensions: {
      'com.uiux-mirror': {
        confidence: confidence.value,
        level: confidence.level,
        normalizedValuePixels: token.normalizedValue.pixels,
        context: token.context,
        evidenceCount: token.evidence.length,
      },
    },
  };
}

/**
 * Format radius token into DTCG dimension token
 */
export function formatRadiusToken(
  _name: string,
  token: RadiusToken,
  confidence: ConfidenceScore
): DTCGToken {
  return {
    $type: 'dimension',
    $value: token.value,
    $extensions: {
      'com.uiux-mirror': {
        confidence: confidence.value,
        level: confidence.level,
        normalizedValuePixels: token.valuePixels,
        evidenceCount: token.evidence.length,
      },
    },
  };
}

/**
 * Format shadow token into DTCG shadow token
 */
export function formatShadowToken(
  _name: string,
  token: ShadowToken,
  confidence: ConfidenceScore
): DTCGToken {
  // DTCG shadow format: { offsetX, offsetY, blur, spread, color }
  // For multi-layer shadows, we take the first layer or could combine
  const shadowValue = token.layers.map(layer => ({
    offsetX: layer.offsetX,
    offsetY: layer.offsetY,
    blur: layer.blur,
    spread: layer.spread,
    color: layer.color,
  }));

  return {
    $type: 'shadow',
    $value: shadowValue.length === 1 ? shadowValue[0] : shadowValue,
    $extensions: {
      'com.uiux-mirror': {
        confidence: confidence.value,
        level: confidence.level,
        layers: token.layers.length,
        evidenceCount: token.evidence.length,
      },
    },
  };
}

/**
 * Format motion token into DTCG duration or cubicBezier token
 */
export function formatMotionToken(
  _name: string,
  token: MotionToken,
  confidence: ConfidenceScore
): DTCGToken {
  // Determine type based on property
  const type = token.property === 'duration' ? 'duration' :
               token.property === 'easing' ? 'cubicBezier' : 'duration';

  return {
    $type: type,
    $value: token.value,
    $extensions: {
      'com.uiux-mirror': {
        confidence: confidence.value,
        level: confidence.level,
        property: token.property,
        durationMs: token.durationMs,
        evidenceCount: token.evidence.length,
      },
    },
  };
}

/**
 * Generate semantic name for token based on type and index
 */
function generateTokenName(type: string, index: number, total: number): string {
  // For colors, use numbered names
  if (type === 'color') {
    return `color-${index + 1}`;
  }

  // For typography, distinguish by size
  if (type === 'typography') {
    if (index < total * 0.2) return `heading-${index + 1}`;
    if (index < total * 0.5) return `subheading-${index - Math.floor(total * 0.2) + 1}`;
    return `body-${index - Math.floor(total * 0.5) + 1}`;
  }

  // For spacing, use t-shirt sizes
  if (type === 'spacing') {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    if (index < sizes.length) return `spacing-${sizes[index]}`;
    return `spacing-${index + 1}`;
  }

  // Default numeric naming
  return `${type}-${index + 1}`;
}

/**
 * Format all normalized tokens into DTCG token file
 */
export function formatAllTokens(normalizedResult: NormalizationResult): DTCGTokenFile {
  const dtcgFile: DTCGTokenFile = {};

  // Colors group
  if (normalizedResult.colors.standards.length > 0) {
    const colorsGroup: DTCGTokenFile = {};
    normalizedResult.colors.standards.forEach((result, index) => {
      const name = generateTokenName('color', index, normalizedResult.colors.standards.length);
      // Calculate confidence for this cluster
      const confidence: ConfidenceScore = {
        value: result.confidence,
        level: result.confidence > 0.6 ? 'high' : result.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `${result.occurrenceCount} occurrences across ${result.pageUrls.size} pages`,
      };
      colorsGroup[name] = formatColorToken(name, result.token, confidence);
    });
    dtcgFile.colors = colorsGroup;
  }

  // Typography group
  if (normalizedResult.typography.standards.length > 0) {
    const typographyGroup: DTCGTokenFile = {};
    // Sort by font size descending (largest first)
    const sortedTypography = [...normalizedResult.typography.standards].sort(
      (a, b) => b.token.normalizedSize.pixels - a.token.normalizedSize.pixels
    );
    sortedTypography.forEach((result, index) => {
      const name = generateTokenName('typography', index, sortedTypography.length);
      const confidence: ConfidenceScore = {
        value: result.confidence,
        level: result.confidence > 0.6 ? 'high' : result.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `${result.occurrenceCount} occurrences across ${result.pageUrls.size} pages`,
      };
      typographyGroup[name] = formatTypographyToken(name, result.token, confidence);
    });
    dtcgFile.typography = typographyGroup;
  }

  // Spacing group
  if (normalizedResult.spacing.standards.length > 0) {
    const spacingGroup: DTCGTokenFile = {};
    // Sort by size ascending (smallest first for xs, sm, md pattern)
    const sortedSpacing = [...normalizedResult.spacing.standards].sort(
      (a, b) => a.token.normalizedValue.pixels - b.token.normalizedValue.pixels
    );
    sortedSpacing.forEach((result, index) => {
      const name = generateTokenName('spacing', index, sortedSpacing.length);
      const confidence: ConfidenceScore = {
        value: result.confidence,
        level: result.confidence > 0.6 ? 'high' : result.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `${result.occurrenceCount} occurrences across ${result.pageUrls.size} pages`,
      };
      spacingGroup[name] = formatSpacingToken(name, result.token, confidence);
    });
    dtcgFile.spacing = spacingGroup;
  }

  // Radii group
  if (normalizedResult.radii.standards.length > 0) {
    const radiiGroup: DTCGTokenFile = {};
    normalizedResult.radii.standards.forEach((result, index) => {
      const name = `radius-${index + 1}`;
      const confidence: ConfidenceScore = {
        value: result.confidence,
        level: result.confidence > 0.6 ? 'high' : result.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `${result.occurrenceCount} occurrences across ${result.pageUrls.size} pages`,
      };
      radiiGroup[name] = formatRadiusToken(name, result.token, confidence);
    });
    dtcgFile.radii = radiiGroup;
  }

  // Shadows group
  if (normalizedResult.shadows.standards.length > 0) {
    const shadowsGroup: DTCGTokenFile = {};
    normalizedResult.shadows.standards.forEach((result, index) => {
      const name = `shadow-${index + 1}`;
      const confidence: ConfidenceScore = {
        value: result.confidence,
        level: result.confidence > 0.6 ? 'high' : result.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `${result.occurrenceCount} occurrences across ${result.pageUrls.size} pages`,
      };
      shadowsGroup[name] = formatShadowToken(name, result.token, confidence);
    });
    dtcgFile.shadows = shadowsGroup;
  }

  // Motion group
  if (normalizedResult.motion.standards.length > 0) {
    const motionGroup: DTCGTokenFile = {};
    normalizedResult.motion.standards.forEach((result, index) => {
      const name = `motion-${index + 1}`;
      const confidence: ConfidenceScore = {
        value: result.confidence,
        level: result.confidence > 0.6 ? 'high' : result.confidence > 0.3 ? 'medium' : 'low',
        reasoning: `${result.occurrenceCount} occurrences across ${result.pageUrls.size} pages`,
      };
      motionGroup[name] = formatMotionToken(name, result.token, confidence);
    });
    dtcgFile.motion = motionGroup;
  }

  return dtcgFile;
}
