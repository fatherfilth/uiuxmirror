/**
 * SKILL.md formatter
 * Generates a Claude Code skill file from extracted design DNA
 * Produces prescriptive Markdown instructions with YAML frontmatter
 */

import type { NormalizationResult } from '../../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../components/component-aggregator.js';
import type { ContentStyleResult } from '../../types/content-style.js';
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

/** Max tokens per section to keep the skill concise */
const MAX_TOKENS_PER_SECTION = 20;

/**
 * Input for SKILL.md generation
 */
export interface SkillMDInput {
  tokens: NormalizationResult;
  components: AggregatedComponent[];
  contentStyle: ContentStyleResult;
  metadata: {
    sourceUrl: string;
    crawlDate: string;
    totalPages: number;
  };
}

/**
 * Extract a domain slug from a URL for use in the skill name
 * Strips protocol, www., trailing slashes; dots become hyphens
 *
 * @param url - Source URL (e.g., "https://www.cooked.com/recipes")
 * @returns Domain slug (e.g., "cooked-com")
 */
export function extractDomainSlug(url: string): string {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname;
    // Strip www.
    hostname = hostname.replace(/^www\./, '');
    // Dots to hyphens
    return hostname.replace(/\./g, '-');
  } catch {
    return 'unknown-site';
  }
}

/**
 * Generate a SKILL.md string from design DNA
 *
 * @param input - Full design DNA (tokens, components, content style, metadata)
 * @returns SKILL.md file content with YAML frontmatter
 */
export function generateSkillMD(input: SkillMDInput): string {
  const { tokens, components, contentStyle, metadata } = input;
  const domainSlug = extractDomainSlug(metadata.sourceUrl);
  const lines: string[] = [];

  // --- YAML Frontmatter ---
  lines.push('---');
  lines.push(`name: ${domainSlug}-style`);
  lines.push(`description: Replicate the design system of ${domainSlug.replace(/-/g, '.')} when building new UI components and pages.`);
  lines.push('---');
  lines.push('');

  // --- Title & Intro ---
  lines.push(`# Design System: ${domainSlug.replace(/-/g, '.')}`);
  lines.push('');
  lines.push(`Extracted from ${metadata.sourceUrl} on ${metadata.crawlDate}.`);
  lines.push(`Pages analyzed: ${metadata.totalPages}.`);
  lines.push('');
  lines.push('Use these tokens and rules **exclusively** when building UI that should match this site\'s visual identity.');
  lines.push('');

  // --- Color Palette ---
  lines.push(generateColorSection(tokens));

  // --- Typography ---
  lines.push(generateTypographySection(tokens));

  // --- Spacing Scale ---
  lines.push(generateSpacingSection(tokens));

  // --- Border Radius ---
  lines.push(generateRadiusSection(tokens));

  // --- Shadows (conditional) ---
  const shadowSection = generateShadowSection(tokens);
  if (shadowSection) {
    lines.push(shadowSection);
  }

  // --- Motion & Animation (conditional) ---
  const motionSection = generateMotionSection(tokens);
  if (motionSection) {
    lines.push(motionSection);
  }

  // --- Components (conditional) ---
  if (components && components.length > 0) {
    lines.push(generateComponentsSection(components));
  }

  // --- Content Style (conditional) ---
  if (contentStyle && hasContentStyleData(contentStyle)) {
    lines.push(generateContentStyleSection(contentStyle));
  }

  // --- Quick Reference ---
  lines.push(generateQuickReferenceSection(tokens));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateColorSection(tokens: NormalizationResult): string {
  const lines: string[] = [];
  lines.push('## Color Palette');
  lines.push('');
  lines.push('Use these colors exclusively. Do not invent new colors.');
  lines.push('');

  const sorted = [...tokens.colors.standards]
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sorted.length === 0) {
    lines.push('_No color tokens extracted._');
    lines.push('');
    return lines.join('\n');
  }

  // Table
  lines.push('| Token | Hex | CSS Variable |');
  lines.push('|-------|-----|-------------|');
  sorted.forEach((colorResult, index) => {
    const cluster = colorResult.token as ColorCluster;
    const name = generateSemanticColorName(
      { canonical: cluster.canonical, variants: cluster.variants, occurrences: cluster.occurrences },
      index,
      sorted.length,
    );
    lines.push(`| ${name} | \`${cluster.canonical}\` | \`var(--${name})\` |`);
  });
  lines.push('');

  return lines.join('\n');
}

function generateTypographySection(tokens: NormalizationResult): string {
  const lines: string[] = [];
  lines.push('## Typography');
  lines.push('');
  lines.push('Apply these type specs as-is. Do not override font sizes or weights.');
  lines.push('');

  const sorted = [...tokens.typography.standards]
    .sort(
      (a, b) =>
        (b.token as NormalizedTypographyToken).normalizedSize.pixels -
        (a.token as NormalizedTypographyToken).normalizedSize.pixels,
    )
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sorted.length === 0) {
    lines.push('_No typography tokens extracted._');
    lines.push('');
    return lines.join('\n');
  }

  // Collect unique font families
  const families = new Set<string>();
  sorted.forEach((t) => families.add((t.token as NormalizedTypographyToken).family));

  lines.push(`**Font families to load:** ${[...families].join(', ')}`);
  lines.push('');

  lines.push('| Token | Family | Size | Weight | Line Height |');
  lines.push('|-------|--------|------|--------|-------------|');
  sorted.forEach((typoResult, index) => {
    const token = typoResult.token as NormalizedTypographyToken;
    const name = generateSemanticTypographyName(
      { normalizedSize: token.normalizedSize, weight: token.weight },
      index,
      sorted.length,
    );
    lines.push(`| ${name} | ${token.family} | ${token.size} | ${token.weight} | ${token.lineHeight} |`);
  });
  lines.push('');

  return lines.join('\n');
}

function generateSpacingSection(tokens: NormalizationResult): string {
  const lines: string[] = [];
  lines.push('## Spacing Scale');
  lines.push('');

  const sorted = [...tokens.spacing.standards]
    .sort(
      (a, b) =>
        (a.token as NormalizedSpacingToken).normalizedValue.pixels -
        (b.token as NormalizedSpacingToken).normalizedValue.pixels,
    )
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sorted.length === 0) {
    lines.push('_No spacing tokens extracted._');
    lines.push('');
    return lines.join('\n');
  }

  const baseUnit = tokens.spacing.scale?.baseUnit;
  if (baseUnit) {
    lines.push(`**Base unit:** ${baseUnit}px`);
    lines.push('');
  }

  lines.push('Use only these spacing values for margins, padding, and gaps.');
  lines.push('');

  lines.push('| Token | Value | CSS Variable |');
  lines.push('|-------|-------|-------------|');
  sorted.forEach((spacingResult, index) => {
    const token = spacingResult.token as NormalizedSpacingToken;
    const name = generateSemanticSpacingName(
      { normalizedValue: token.normalizedValue },
      index,
      sorted.length,
    );
    lines.push(`| ${name} | \`${token.value}\` | \`var(--${name})\` |`);
  });
  lines.push('');

  return lines.join('\n');
}

function generateRadiusSection(tokens: NormalizationResult): string {
  const lines: string[] = [];
  lines.push('## Border Radius');
  lines.push('');

  const sorted = [...tokens.radii.standards]
    .sort((a, b) => (a.token as RadiusToken).valuePixels - (b.token as RadiusToken).valuePixels)
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sorted.length === 0) {
    lines.push('_No border-radius tokens extracted._');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| Token | Value | CSS Variable |');
  lines.push('|-------|-------|-------------|');
  sorted.forEach((radiusResult, index) => {
    const token = radiusResult.token as RadiusToken;
    const name = generateRadiusName(index, sorted.length);
    lines.push(`| ${name} | \`${token.value}\` | \`var(--${name})\` |`);
  });
  lines.push('');

  return lines.join('\n');
}

function generateShadowSection(tokens: NormalizationResult): string | null {
  if (tokens.shadows.standards.length === 0) {
    return null;
  }

  const lines: string[] = [];
  lines.push('## Shadows');
  lines.push('');
  lines.push('Apply these shadow tokens for elevation. Do not create custom shadows.');
  lines.push('');

  const capped = tokens.shadows.standards.slice(0, MAX_TOKENS_PER_SECTION);

  lines.push('| Token | Value | CSS Variable |');
  lines.push('|-------|-------|-------------|');
  capped.forEach((shadowResult, index) => {
    const token = shadowResult.token as ShadowToken;
    const name = generateShadowName(index, capped.length);
    const value = token.layers
      .map((layer) => {
        const parts: string[] = [];
        if (layer.inset) parts.push('inset');
        parts.push(layer.offsetX, layer.offsetY, layer.blur);
        if (layer.spread !== '0px' && layer.spread !== '0') {
          parts.push(layer.spread);
        }
        parts.push(layer.color);
        return parts.join(' ');
      })
      .join(', ');
    lines.push(`| ${name} | \`${value}\` | \`var(--${name})\` |`);
  });
  lines.push('');

  return lines.join('\n');
}

function generateMotionSection(tokens: NormalizationResult): string | null {
  if (tokens.motion.standards.length === 0) {
    return null;
  }

  const lines: string[] = [];
  lines.push('## Motion & Animation');
  lines.push('');
  lines.push('Use these durations and easings for all transitions and animations.');
  lines.push('');

  const durations = tokens.motion.standards
    .filter((m) => (m.token as MotionToken).property === 'duration')
    .slice(0, MAX_TOKENS_PER_SECTION);
  const easings = tokens.motion.standards
    .filter((m) => (m.token as MotionToken).property === 'easing')
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (durations.length > 0) {
    lines.push('**Durations:**');
    lines.push('');
    lines.push('| Token | Value |');
    lines.push('|-------|-------|');
    durations.forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const name = generateMotionName({ property: 'duration' }, index);
      lines.push(`| ${name} | \`${token.value}\` |`);
    });
    lines.push('');
  }

  if (easings.length > 0) {
    lines.push('**Easings:**');
    lines.push('');
    lines.push('| Token | Value |');
    lines.push('|-------|-------|');
    easings.forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const name = generateMotionName({ property: 'easing' }, index);
      lines.push(`| ${name} | \`${token.value}\` |`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

function generateComponentsSection(components: AggregatedComponent[]): string {
  const lines: string[] = [];
  lines.push('## Components');
  lines.push('');
  lines.push('Replicate these component styles when building matching component types.');
  lines.push('');

  const capped = components.slice(0, MAX_TOKENS_PER_SECTION);

  for (const component of capped) {
    lines.push(`### ${component.type}`);
    lines.push('');

    // Canonical styles
    const styleEntries = Object.entries(component.canonical?.styles || {});
    if (styleEntries.length > 0) {
      lines.push('**Canonical styles:**');
      lines.push('');
      lines.push('```css');
      for (const [prop, val] of styleEntries.slice(0, 10)) {
        lines.push(`  ${prop}: ${val};`);
      }
      lines.push('```');
      lines.push('');
    }

    // Variants count
    const variantCount = component.variants?.length || 0;
    if (variantCount > 0) {
      lines.push(`Variants detected: ${variantCount}`);
      lines.push('');
    }

    // States
    if (component.states) {
      const stateNames = Object.keys(component.states);
      if (stateNames.length > 0) {
        lines.push(`Interactive states: ${stateNames.join(', ')}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function hasContentStyleData(contentStyle: ContentStyleResult): boolean {
  return (
    (contentStyle.voicePatterns?.length || 0) > 0 ||
    (contentStyle.capitalizationPatterns?.length || 0) > 0 ||
    (contentStyle.ctaHierarchy?.length || 0) > 0 ||
    (contentStyle.errorPatterns?.length || 0) > 0
  );
}

function generateContentStyleSection(contentStyle: ContentStyleResult): string {
  const lines: string[] = [];
  lines.push('## Content Style');
  lines.push('');

  // Voice & Tone
  if (contentStyle.voicePatterns?.length > 0) {
    const primary = contentStyle.voicePatterns[0];
    lines.push(`**Voice:** ${primary.tone}, ${primary.perspective}, ${primary.tense}`);
    lines.push('');
  }

  // Capitalization
  if (contentStyle.capitalizationPatterns?.length > 0) {
    lines.push('**Capitalization rules:**');
    lines.push('');
    for (const pattern of contentStyle.capitalizationPatterns.slice(0, 5)) {
      const contexts = pattern.contexts.join(', ');
      lines.push(`- ${pattern.style} in ${contexts}`);
    }
    lines.push('');
  }

  // CTA hierarchy
  if (contentStyle.ctaHierarchy?.length > 0) {
    lines.push('**CTA hierarchy:**');
    lines.push('');
    for (const cta of contentStyle.ctaHierarchy) {
      const bg = cta.characteristics.backgroundColor || 'none';
      lines.push(`- **${cta.level}**: background \`${bg}\`, text \`${cta.characteristics.textColor}\`, weight ${cta.characteristics.fontWeight}`);
    }
    lines.push('');
  }

  // Error patterns
  if (contentStyle.errorPatterns?.length > 0) {
    lines.push('**Error message patterns:**');
    lines.push('');
    for (const pattern of contentStyle.errorPatterns.slice(0, 3)) {
      lines.push(`- Structure: ${pattern.structure}, Tone: ${pattern.tone}`);
      if (pattern.suggestsAction) {
        lines.push('  - Errors should suggest corrective action');
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateQuickReferenceSection(tokens: NormalizationResult): string {
  const lines: string[] = [];
  lines.push('## Quick Reference');
  lines.push('');
  lines.push('Copy this `:root` block into your stylesheet:');
  lines.push('');
  lines.push('```css');
  lines.push(':root {');

  // Colors
  const sortedColors = [...tokens.colors.standards]
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sortedColors.length > 0) {
    lines.push('  /* Colors */');
    sortedColors.forEach((colorResult, index) => {
      const cluster = colorResult.token as ColorCluster;
      const name = generateSemanticColorName(
        { canonical: cluster.canonical, variants: cluster.variants, occurrences: cluster.occurrences },
        index,
        sortedColors.length,
      );
      lines.push(`  --${name}: ${cluster.canonical};`);
    });
  }

  // Typography
  const sortedTypo = [...tokens.typography.standards]
    .sort(
      (a, b) =>
        (b.token as NormalizedTypographyToken).normalizedSize.pixels -
        (a.token as NormalizedTypographyToken).normalizedSize.pixels,
    )
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sortedTypo.length > 0) {
    lines.push('  /* Typography */');
    sortedTypo.forEach((typoResult, index) => {
      const token = typoResult.token as NormalizedTypographyToken;
      const baseName = generateSemanticTypographyName(
        { normalizedSize: token.normalizedSize, weight: token.weight },
        index,
        sortedTypo.length,
      );
      lines.push(`  --${baseName}-family: ${token.family};`);
      lines.push(`  --${baseName}-size: ${token.size};`);
      lines.push(`  --${baseName}-weight: ${token.weight};`);
      lines.push(`  --${baseName}-line-height: ${token.lineHeight};`);
    });
  }

  // Spacing
  const sortedSpacing = [...tokens.spacing.standards]
    .sort(
      (a, b) =>
        (a.token as NormalizedSpacingToken).normalizedValue.pixels -
        (b.token as NormalizedSpacingToken).normalizedValue.pixels,
    )
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sortedSpacing.length > 0) {
    lines.push('  /* Spacing */');
    sortedSpacing.forEach((spacingResult, index) => {
      const token = spacingResult.token as NormalizedSpacingToken;
      const name = generateSemanticSpacingName(
        { normalizedValue: token.normalizedValue },
        index,
        sortedSpacing.length,
      );
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  // Radii
  const sortedRadii = [...tokens.radii.standards]
    .sort((a, b) => (a.token as RadiusToken).valuePixels - (b.token as RadiusToken).valuePixels)
    .slice(0, MAX_TOKENS_PER_SECTION);

  if (sortedRadii.length > 0) {
    lines.push('  /* Border Radius */');
    sortedRadii.forEach((radiusResult, index) => {
      const token = radiusResult.token as RadiusToken;
      const name = generateRadiusName(index, sortedRadii.length);
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  // Shadows
  const shadows = tokens.shadows.standards.slice(0, MAX_TOKENS_PER_SECTION);
  if (shadows.length > 0) {
    lines.push('  /* Shadows */');
    shadows.forEach((shadowResult, index) => {
      const token = shadowResult.token as ShadowToken;
      const name = generateShadowName(index, shadows.length);
      const value = token.layers
        .map((layer) => {
          const parts: string[] = [];
          if (layer.inset) parts.push('inset');
          parts.push(layer.offsetX, layer.offsetY, layer.blur);
          if (layer.spread !== '0px' && layer.spread !== '0') {
            parts.push(layer.spread);
          }
          parts.push(layer.color);
          return parts.join(' ');
        })
        .join(', ');
      lines.push(`  --${name}: ${value};`);
    });
  }

  // Motion
  if (tokens.motion.standards.length > 0) {
    lines.push('  /* Motion */');
    const durations = tokens.motion.standards.filter(
      (m) => (m.token as MotionToken).property === 'duration',
    );
    const easings = tokens.motion.standards.filter(
      (m) => (m.token as MotionToken).property === 'easing',
    );
    durations.slice(0, MAX_TOKENS_PER_SECTION).forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const name = generateMotionName({ property: 'duration' }, index);
      lines.push(`  --${name}: ${token.value};`);
    });
    easings.slice(0, MAX_TOKENS_PER_SECTION).forEach((motionResult, index) => {
      const token = motionResult.token as MotionToken;
      const name = generateMotionName({ property: 'easing' }, index);
      lines.push(`  --${name}: ${token.value};`);
    });
  }

  lines.push('}');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}
