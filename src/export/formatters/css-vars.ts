/**
 * CSS Custom Properties formatter
 * Generates :root block with all design tokens as CSS variables
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
 * Generate CSS custom properties file from normalized design tokens
 *
 * @param result - Normalized design tokens from Phase 2
 * @returns CSS file content with :root block
 */
export function generateCSSCustomProperties(result: NormalizationResult): string {
  const timestamp = new Date().toISOString();
  const lines: string[] = [];

  // Header comment
  lines.push('/**');
  lines.push(' * Design Tokens - CSS Custom Properties');
  lines.push(` * Generated: ${timestamp}`);
  lines.push(' * Source: UIUX-Mirror design DNA extraction');
  lines.push(' * Do not edit manually - regenerate from source');
  lines.push(' */');
  lines.push('');
  lines.push(':root {');

  // Colors section
  if (result.colors.standards.length > 0) {
    lines.push('  /* Colors */');

    // Sort by occurrence descending (most frequent first)
    const sortedColors = [...result.colors.standards].sort(
      (a, b) => b.occurrenceCount - a.occurrenceCount
    );

    sortedColors.forEach((colorResult, index) => {
      const cluster = colorResult.token as ColorCluster;
      const name = generateSemanticColorName(
        { canonical: cluster.canonical, variants: cluster.variants, occurrences: cluster.occurrences },
        index,
        sortedColors.length
      );
      lines.push(`  --${name}: ${cluster.canonical};`);
    });
    lines.push('');
  }

  // Typography section
  if (result.typography.standards.length > 0) {
    lines.push('  /* Typography */');

    // Sort by size descending (largest first)
    const sortedTypography = [...result.typography.standards].sort(
      (a, b) => (b.token as NormalizedTypographyToken).normalizedSize.pixels -
                (a.token as NormalizedTypographyToken).normalizedSize.pixels
    );

    sortedTypography.forEach((typoResult, index) => {
      const token = typoResult.token as NormalizedTypographyToken;
      const baseName = generateSemanticTypographyName(
        { normalizedSize: token.normalizedSize, weight: token.weight },
        index,
        sortedTypography.length
      );

      // Emit separate variables for each typography property
      lines.push(`  --${baseName}-family: ${token.family};`);
      lines.push(`  --${baseName}-size: ${token.size};`);
      lines.push(`  --${baseName}-weight: ${token.weight};`);
      lines.push(`  --${baseName}-line-height: ${token.lineHeight};`);
      if (token.letterSpacing && token.letterSpacing !== 'normal' && token.letterSpacing !== '0px') {
        lines.push(`  --${baseName}-letter-spacing: ${token.letterSpacing};`);
      }
    });
    lines.push('');
  }

  // Spacing section
  if (result.spacing.standards.length > 0) {
    lines.push('  /* Spacing */');

    // Sort by value ascending (smallest first)
    const sortedSpacing = [...result.spacing.standards].sort(
      (a, b) => (a.token as NormalizedSpacingToken).normalizedValue.pixels -
                (b.token as NormalizedSpacingToken).normalizedValue.pixels
    );

    sortedSpacing.forEach((spacingResult, index) => {
      const token = spacingResult.token as NormalizedSpacingToken;
      const name = generateSemanticSpacingName(
        { normalizedValue: token.normalizedValue },
        index,
        sortedSpacing.length
      );
      lines.push(`  --${name}: ${token.value};`);
    });
    lines.push('');
  }

  // Border Radius section
  if (result.radii.standards.length > 0) {
    lines.push('  /* Border Radius */');

    // Sort by value ascending
    const sortedRadii = [...result.radii.standards].sort(
      (a, b) => (a.token as RadiusToken).valuePixels - (b.token as RadiusToken).valuePixels
    );

    sortedRadii.forEach((radiusResult, index) => {
      const token = radiusResult.token as RadiusToken;
      const name = generateRadiusName(index, sortedRadii.length);
      lines.push(`  --${name}: ${token.value};`);
    });
    lines.push('');
  }

  // Shadows section
  if (result.shadows.standards.length > 0) {
    lines.push('  /* Shadows */');

    result.shadows.standards.forEach((shadowResult, index) => {
      const token = shadowResult.token as ShadowToken;
      const name = generateShadowName(index, result.shadows.standards.length);

      // Reconstruct CSS shadow shorthand from layers
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

      lines.push(`  --${name}: ${shadowValue};`);
    });
    lines.push('');
  }

  // Motion section
  if (result.motion.standards.length > 0) {
    lines.push('  /* Motion */');

    // Group by property type
    const durations = result.motion.standards.filter(
      m => (m.token as MotionToken).property === 'duration'
    );
    const easings = result.motion.standards.filter(
      m => (m.token as MotionToken).property === 'easing'
    );

    // Emit durations
    durations.forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const name = generateMotionName({ property: 'duration' }, index);
      lines.push(`  --${name}: ${token.value};`);
    });

    // Emit easings
    easings.forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const name = generateMotionName({ property: 'easing' }, index);
      lines.push(`  --${name}: ${token.value};`);
    });

    if (durations.length > 0 || easings.length > 0) {
      lines.push('');
    }
  }

  lines.push('}');

  return lines.join('\n');
}
