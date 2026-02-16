/**
 * Figma tokens plugin formatter
 * Generates W3C DTCG format compatible with Figma tokens plugin
 */

import type { NormalizationResult } from '../../output/dtcg-formatter.js';
import type { ColorCluster, NormalizedTypographyToken, NormalizedSpacingToken } from '../../types/normalized-tokens.js';
import type { RadiusToken, ShadowToken, MotionToken } from '../../types/tokens.js';
import {
  generateSemanticColorName,
  generateSemanticTypographyName,
  generateSemanticSpacingName,
  generateRadiusName,
  generateShadowName,
  generateMotionName,
} from '../semantic-namer.js';

/**
 * Strip type prefix from semantic name for cleaner Figma display
 * E.g., "spacing-xs" -> "xs", "color-primary" -> "primary"
 */
function stripTypePrefix(name: string, type: string): string {
  const prefix = `${type}-`;
  if (name.startsWith(prefix)) {
    return name.slice(prefix.length);
  }
  return name;
}

/**
 * Generate Figma tokens plugin format from normalized design tokens
 * Uses W3C DTCG format with $type and $value
 *
 * @param result - Normalized design tokens from Phase 2
 * @returns JSON string in Figma tokens format
 */
export function generateFigmaTokens(result: NormalizationResult): string {
  const figmaTokens: any = {};

  // Colors group
  if (result.colors.standards.length > 0) {
    const colorGroup: any = {};

    // Sort by occurrence descending
    const sortedColors = [...result.colors.standards].sort(
      (a, b) => b.occurrenceCount - a.occurrenceCount
    );

    sortedColors.forEach((colorResult, index) => {
      const cluster = colorResult.token as ColorCluster;
      const semanticName = generateSemanticColorName(
        { canonical: cluster.canonical, variants: cluster.variants, occurrences: cluster.occurrences },
        index,
        sortedColors.length
      );

      // Strip "color-" prefix for cleaner Figma display
      const figmaKey = semanticName.startsWith('color-')
        ? semanticName.slice(6)
        : semanticName;

      // Count unique pages from evidence
      const uniquePages = new Set(cluster.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = cluster.evidence.length;

      colorGroup[figmaKey] = {
        $type: 'color',
        $value: cluster.canonical,
        $description: `Appears on ${elementCount} elements across ${pageCount} pages`,
      };
    });

    figmaTokens.color = colorGroup;
  }

  // Typography group
  if (result.typography.standards.length > 0) {
    const typographyGroup: any = {};

    // Sort by size descending
    const sortedTypography = [...result.typography.standards].sort(
      (a, b) => (b.token as NormalizedTypographyToken).normalizedSize.pixels -
                (a.token as NormalizedTypographyToken).normalizedSize.pixels
    );

    sortedTypography.forEach((typoResult, index) => {
      const token = typoResult.token as NormalizedTypographyToken;
      const semanticName = generateSemanticTypographyName(
        { normalizedSize: token.normalizedSize, weight: token.weight },
        index,
        sortedTypography.length
      );

      const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = token.evidence.length;

      const typographyValue: any = {
        fontFamily: token.family,
        fontSize: token.size,
        fontWeight: token.weight,
        lineHeight: token.lineHeight,
      };

      // Include letterSpacing only if meaningful
      if (token.letterSpacing && token.letterSpacing !== 'normal' && token.letterSpacing !== '0px') {
        typographyValue.letterSpacing = token.letterSpacing;
      }

      typographyGroup[semanticName] = {
        $type: 'typography',
        $value: typographyValue,
        $description: `Appears on ${elementCount} elements across ${pageCount} pages`,
      };
    });

    figmaTokens.typography = typographyGroup;
  }

  // Spacing group
  if (result.spacing.standards.length > 0) {
    const spacingGroup: any = {};

    // Sort by value ascending
    const sortedSpacing = [...result.spacing.standards].sort(
      (a, b) => (a.token as NormalizedSpacingToken).normalizedValue.pixels -
                (b.token as NormalizedSpacingToken).normalizedValue.pixels
    );

    sortedSpacing.forEach((spacingResult, index) => {
      const token = spacingResult.token as NormalizedSpacingToken;
      const semanticName = generateSemanticSpacingName(
        { normalizedValue: token.normalizedValue },
        index,
        sortedSpacing.length
      );

      // Strip "spacing-" prefix
      const figmaKey = stripTypePrefix(semanticName, 'spacing');

      const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = token.evidence.length;

      spacingGroup[figmaKey] = {
        $type: 'dimension',
        $value: token.value,
        $description: `${token.context} - appears ${elementCount} times across ${pageCount} pages`,
      };
    });

    figmaTokens.spacing = spacingGroup;
  }

  // Border radius group
  if (result.radii.standards.length > 0) {
    const borderRadiusGroup: any = {};

    // Sort by value ascending
    const sortedRadii = [...result.radii.standards].sort(
      (a, b) => (a.token as RadiusToken).valuePixels - (b.token as RadiusToken).valuePixels
    );

    sortedRadii.forEach((radiusResult, index) => {
      const token = radiusResult.token as RadiusToken;
      const semanticName = generateRadiusName(index, sortedRadii.length);
      const figmaKey = stripTypePrefix(semanticName, 'radius');

      const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = token.evidence.length;

      borderRadiusGroup[figmaKey] = {
        $type: 'dimension',
        $value: token.value,
        $description: `Appears ${elementCount} times across ${pageCount} pages`,
      };
    });

    figmaTokens.borderRadius = borderRadiusGroup;
  }

  // Box shadow group
  if (result.shadows.standards.length > 0) {
    const boxShadowGroup: any = {};

    result.shadows.standards.forEach((shadowResult, index) => {
      const token = shadowResult.token as ShadowToken;
      const semanticName = generateShadowName(index, result.shadows.standards.length);
      const figmaKey = stripTypePrefix(semanticName, 'shadow');

      const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = token.evidence.length;

      // W3C DTCG shadow format
      const shadowValue = token.layers.map(layer => ({
        offsetX: layer.offsetX,
        offsetY: layer.offsetY,
        blur: layer.blur,
        spread: layer.spread,
        color: layer.color,
      }));

      boxShadowGroup[figmaKey] = {
        $type: 'shadow',
        $value: shadowValue.length === 1 ? shadowValue[0] : shadowValue,
        $description: `${token.layers.length} layer(s) - appears ${elementCount} times across ${pageCount} pages`,
      };
    });

    figmaTokens.boxShadow = boxShadowGroup;
  }

  // Motion group
  if (result.motion.standards.length > 0) {
    const motionGroup: any = {};

    // Group by property type
    const durations = result.motion.standards.filter(
      m => (m.token as MotionToken).property === 'duration'
    );
    const easings = result.motion.standards.filter(
      m => (m.token as MotionToken).property === 'easing'
    );

    // Process durations
    durations.forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const semanticName = generateMotionName({ property: 'duration' }, index);

      const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = token.evidence.length;

      motionGroup[semanticName] = {
        $type: 'duration',
        $value: token.value,
        $description: `Appears ${elementCount} times across ${pageCount} pages`,
      };
    });

    // Process easings
    easings.forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const semanticName = generateMotionName({ property: 'easing' }, index);

      const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
      const pageCount = uniquePages.size;
      const elementCount = token.evidence.length;

      motionGroup[semanticName] = {
        $type: 'cubicBezier',
        $value: token.value,
        $description: `Appears ${elementCount} times across ${pageCount} pages`,
      };
    });

    if (durations.length > 0 || easings.length > 0) {
      figmaTokens.motion = motionGroup;
    }
  }

  return JSON.stringify(figmaTokens, null, 2);
}
