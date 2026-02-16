/**
 * Tailwind v3 config formatter
 * Generates JavaScript config file extending Tailwind theme
 */

import type { NormalizationResult } from '../../output/dtcg-formatter.js';
import type { ColorCluster, NormalizedTypographyToken, NormalizedSpacingToken } from '../../types/normalized-tokens.js';
import type { RadiusToken, ShadowToken } from '../../types/tokens.js';
import {
  generateSemanticColorName,
  generateSemanticTypographyName,
  generateSemanticSpacingName,
  generateRadiusName,
  generateShadowName,
} from '../semantic-namer.js';

/**
 * Strip type prefix from semantic name for Tailwind
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
 * Generate Tailwind v3 config from normalized design tokens
 *
 * @param result - Normalized design tokens from Phase 2
 * @returns JavaScript config file content
 */
export function generateTailwindConfig(result: NormalizationResult): string {
  const config: any = {
    theme: {
      extend: {},
    },
  };

  // Colors
  if (result.colors.standards.length > 0) {
    const colors: Record<string, string> = {};

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
      // Strip "color-" prefix but keep semantic names like "primary", "neutral-1"
      const tailwindKey = semanticName.startsWith('color-')
        ? semanticName.slice(6) // Remove "color-" prefix
        : semanticName;
      colors[tailwindKey] = cluster.canonical;
    });

    config.theme.extend.colors = colors;
  }

  // Typography (fontSize)
  if (result.typography.standards.length > 0) {
    const fontSize: Record<string, [string, { lineHeight: string; fontWeight: string; letterSpacing?: string }]> = {};

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

      // Build Tailwind fontSize extended format
      const fontConfig: { lineHeight: string; fontWeight: string; letterSpacing?: string } = {
        lineHeight: token.lineHeight,
        fontWeight: token.weight.toString(),
      };

      // Only include letterSpacing if it's meaningful
      if (token.letterSpacing && token.letterSpacing !== 'normal' && token.letterSpacing !== '0px') {
        fontConfig.letterSpacing = token.letterSpacing;
      }

      fontSize[semanticName] = [token.size, fontConfig];
    });

    config.theme.extend.fontSize = fontSize;
  }

  // Spacing
  if (result.spacing.standards.length > 0) {
    const spacing: Record<string, string> = {};

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
      const tailwindKey = stripTypePrefix(semanticName, 'spacing');
      spacing[tailwindKey] = token.value;
    });

    config.theme.extend.spacing = spacing;
  }

  // Border radius
  if (result.radii.standards.length > 0) {
    const borderRadius: Record<string, string> = {};

    // Sort by value ascending
    const sortedRadii = [...result.radii.standards].sort(
      (a, b) => (a.token as RadiusToken).valuePixels - (b.token as RadiusToken).valuePixels
    );

    sortedRadii.forEach((radiusResult, index) => {
      const token = radiusResult.token as RadiusToken;
      const semanticName = generateRadiusName(index, sortedRadii.length);
      // Strip "radius-" prefix
      const tailwindKey = stripTypePrefix(semanticName, 'radius');
      borderRadius[tailwindKey] = token.value;
    });

    config.theme.extend.borderRadius = borderRadius;
  }

  // Box shadows
  if (result.shadows.standards.length > 0) {
    const boxShadow: Record<string, string> = {};

    result.shadows.standards.forEach((shadowResult, index) => {
      const token = shadowResult.token as ShadowToken;
      const semanticName = generateShadowName(index, result.shadows.standards.length);
      // Strip "shadow-" prefix
      const tailwindKey = stripTypePrefix(semanticName, 'shadow');

      // Reconstruct CSS shadow shorthand
      const shadowValue = token.layers.map(layer => {
        const parts: string[] = [];
        if (layer.inset) parts.push('inset');
        parts.push(layer.offsetX);
        parts.push(layer.offsetY);
        parts.push(layer.blur);
        if (layer.spread !== '0px' && layer.spread !== '0') {
          parts.push(layer.spread);
        }
        parts.push(layer.color);
        return parts.join(' ');
      }).join(', ');

      boxShadow[tailwindKey] = shadowValue;
    });

    config.theme.extend.boxShadow = boxShadow;
  }

  // Generate JavaScript module.exports format
  const lines: string[] = [];
  lines.push("/** @type {import('tailwindcss').Config} */");
  lines.push('module.exports = ' + JSON.stringify(config, null, 2));

  return lines.join('\n');
}
