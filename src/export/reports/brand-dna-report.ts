/**
 * Brand DNA Report Generator
 * Produces human-readable markdown report of design system tokens, components, and patterns
 * Primary audience: Claude agents and developers
 */

import type { NormalizationResult } from '../../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../components/component-aggregator.js';
import type { StoredPattern } from '../../types/patterns.js';
import { generateTable, codeBlock, heading, bold } from './markdown-utils.js';
import { formatEvidenceCitation } from '../evidence-linker.js';
import {
  generateSemanticColorName,
  generateSemanticTypographyName,
  generateSemanticSpacingName,
  generateRadiusName,
  generateShadowName,
  generateMotionName,
} from '../semantic-namer.js';

export interface BrandDNAReportParams {
  tokens: NormalizationResult;
  components: AggregatedComponent[];
  patterns: StoredPattern[];
  metadata: {
    sourceUrl: string;
    crawlDate: string;
    totalPages: number;
  };
}

/**
 * Generate Brand DNA Report markdown
 * Includes: Overview, Design Tokens (6 types), Component Catalog (inline), Interaction Patterns, Export Files
 */
export function generateBrandDNAReport(params: BrandDNAReportParams): string {
  const { tokens, components, patterns, metadata } = params;
  const sections: string[] = [];

  // Header with metadata
  sections.push(heading('Brand DNA Report', 1));
  sections.push('');
  sections.push(`> Design system extracted from ${metadata.sourceUrl} on ${metadata.crawlDate}`);
  sections.push(`> Pages analyzed: ${metadata.totalPages}`);
  sections.push('');

  // Overview section
  sections.push(heading('Overview', 2));
  sections.push('');
  const colorCount = tokens.colors.standards.length;
  const typoCount = tokens.typography.standards.length;
  const spacingCount = tokens.spacing.standards.length;
  const radiusCount = tokens.radii.standards.length;
  const shadowCount = tokens.shadows.standards.length;
  const motionCount = tokens.motion.standards.length;
  const componentCount = components.length;
  const flowPatterns = patterns.filter(p => p.type === 'flow');

  sections.push(`Brief summary: ${colorCount} color tokens, ${typoCount} typography tokens, ${spacingCount} spacing tokens, ${radiusCount} radius tokens, ${shadowCount} shadow tokens, ${motionCount} motion tokens, ${componentCount} components detected, ${flowPatterns.length} interaction patterns found.`);
  sections.push('');

  // Design Tokens section
  sections.push(heading('Design Tokens', 2));
  sections.push('');

  // Colors subsection
  sections.push(heading('Colors', 3));
  sections.push('');
  sections.push(generateColorTable(tokens));
  sections.push('');
  sections.push(bold('Usage Example:'));
  sections.push(codeBlock(
    `.primary-button {
  background-color: var(--primary);
  color: var(--neutral-1);
}`,
    'css'
  ));
  sections.push('');

  // Typography subsection
  sections.push(heading('Typography', 3));
  sections.push('');
  sections.push(generateTypographyTable(tokens));
  sections.push('');
  sections.push(bold('Usage Example:'));
  sections.push(codeBlock(
    `h1 {
  font-family: var(--heading-1-family);
  font-size: var(--heading-1-size);
  font-weight: var(--heading-1-weight);
  line-height: var(--heading-1-line-height);
}`,
    'css'
  ));
  sections.push('');

  // Spacing subsection
  sections.push(heading('Spacing', 3));
  sections.push('');
  sections.push(generateSpacingTable(tokens));
  sections.push('');

  // Border Radius subsection
  sections.push(heading('Border Radius', 3));
  sections.push('');
  sections.push(generateRadiusTable(tokens));
  sections.push('');

  // Shadows subsection
  sections.push(heading('Shadows', 3));
  sections.push('');
  sections.push(generateShadowTable(tokens));
  sections.push('');

  // Motion subsection
  sections.push(heading('Motion', 3));
  sections.push('');
  sections.push(generateMotionTable(tokens));
  sections.push('');

  // Component Catalog section
  sections.push(heading('Component Catalog', 2));
  sections.push('');
  sections.push(generateComponentCatalog(components));
  sections.push('');

  // Interaction Patterns section
  sections.push(heading('Interaction Patterns', 2));
  sections.push('');
  sections.push(generateInteractionPatterns(flowPatterns));
  sections.push('');

  // Export Files section
  sections.push(heading('Export Files', 2));
  sections.push('');
  sections.push('List of all generated export files with descriptions:');
  sections.push('- `tokens.css` — CSS custom properties');
  sections.push('- `tailwind.config.js` — Tailwind v3 configuration');
  sections.push('- `figma-tokens.json` — Figma tokens plugin format');
  sections.push('- `tokens.json` — Machine-readable tokens (dual-layer)');
  sections.push('- `components.json` — Component catalog');
  sections.push('- `patterns.json` — Interaction patterns');
  sections.push('- `content_style.json` — Content style rules');
  sections.push('- `evidence_index.json` — Full evidence index');
  sections.push('- `stubs/[component].html` — Component starter files');
  sections.push('');

  // Footer
  sections.push('---');
  sections.push('*Generated by UIUX-Mirror*');

  return sections.join('\n');
}

/**
 * Generate color tokens table
 */
function generateColorTable(tokens: NormalizationResult): string {
  const colorStandards = tokens.colors.standards.slice(0, 100); // Limit to 100 rows

  if (colorStandards.length === 0) {
    return 'No color tokens detected.';
  }

  const headers = ['Token Name', 'Value', 'Occurrences', 'Pages', 'Evidence'];
  const rows: string[][] = [];

  colorStandards.forEach((result, index) => {
    const name = generateSemanticColorName(
      result.token,
      index,
      colorStandards.length
    );
    const value = result.token.canonical;
    const occurrences = result.token.occurrences.toString();
    const pageCount = result.pageUrls.size.toString();
    const evidence = formatEvidenceCitation(result.token.evidence, 3);

    rows.push([name, value, occurrences, pageCount, evidence]);
  });

  let table = generateTable(headers, rows);

  if (tokens.colors.standards.length > 100) {
    const remaining = tokens.colors.standards.length - 100;
    table += `\n\n*${remaining} more color tokens in tokens.json*`;
  }

  return table;
}

/**
 * Generate typography tokens table
 */
function generateTypographyTable(tokens: NormalizationResult): string {
  const typoStandards = tokens.typography.standards.slice(0, 100);

  if (typoStandards.length === 0) {
    return 'No typography tokens detected.';
  }

  const headers = ['Token Name', 'Font Family', 'Size', 'Weight', 'Line Height', 'Evidence'];
  const rows: string[][] = [];

  typoStandards.forEach((result, index) => {
    const name = generateSemanticTypographyName(
      result.token,
      index,
      typoStandards.length
    );
    const family = result.token.family || 'inherited';
    const size = `${result.token.normalizedSize.pixels}px`;
    const weight = result.token.weight?.toString() || 'normal';
    const lineHeight = result.token.lineHeight || 'normal';
    const evidence = formatEvidenceCitation(result.token.evidence, 3);

    rows.push([name, family, size, weight, lineHeight, evidence]);
  });

  let table = generateTable(headers, rows);

  if (tokens.typography.standards.length > 100) {
    const remaining = tokens.typography.standards.length - 100;
    table += `\n\n*${remaining} more typography tokens in tokens.json*`;
  }

  return table;
}

/**
 * Generate spacing tokens table
 */
function generateSpacingTable(tokens: NormalizationResult): string {
  const spacingStandards = tokens.spacing.standards.slice(0, 100);

  if (spacingStandards.length === 0) {
    return 'No spacing tokens detected.';
  }

  const headers = ['Token Name', 'Value (px)', 'Context', 'Evidence'];
  const rows: string[][] = [];

  spacingStandards.forEach((result, index) => {
    const name = generateSemanticSpacingName(
      result.token,
      index,
      spacingStandards.length
    );
    const value = `${result.token.normalizedValue.pixels}px`;
    const context = result.token.context || 'general';
    const evidence = formatEvidenceCitation(result.token.evidence, 3);

    rows.push([name, value, context, evidence]);
  });

  let table = generateTable(headers, rows);

  if (tokens.spacing.standards.length > 100) {
    const remaining = tokens.spacing.standards.length - 100;
    table += `\n\n*${remaining} more spacing tokens in tokens.json*`;
  }

  return table;
}

/**
 * Generate border radius tokens table
 */
function generateRadiusTable(tokens: NormalizationResult): string {
  const radiusStandards = tokens.radii.standards.slice(0, 100);

  if (radiusStandards.length === 0) {
    return 'No border radius tokens detected.';
  }

  const headers = ['Token Name', 'Value', 'Evidence'];
  const rows: string[][] = [];

  radiusStandards.forEach((result, index) => {
    const name = generateRadiusName(index, radiusStandards.length);
    const value = result.token.value;
    const evidence = formatEvidenceCitation(result.token.evidence, 3);

    rows.push([name, value, evidence]);
  });

  return generateTable(headers, rows);
}

/**
 * Generate shadow tokens table
 */
function generateShadowTable(tokens: NormalizationResult): string {
  const shadowStandards = tokens.shadows.standards.slice(0, 100);

  if (shadowStandards.length === 0) {
    return 'No shadow tokens detected.';
  }

  const headers = ['Token Name', 'Value', 'Evidence'];
  const rows: string[][] = [];

  shadowStandards.forEach((result, index) => {
    const name = generateShadowName(index, shadowStandards.length);
    const value = result.token.value;
    const evidence = formatEvidenceCitation(result.token.evidence, 3);

    rows.push([name, value, evidence]);
  });

  return generateTable(headers, rows);
}

/**
 * Generate motion tokens table
 */
function generateMotionTable(tokens: NormalizationResult): string {
  const motionStandards = tokens.motion.standards.slice(0, 100);

  if (motionStandards.length === 0) {
    return 'No motion tokens detected.';
  }

  const headers = ['Token Name', 'Property', 'Value', 'Evidence'];
  const rows: string[][] = [];

  motionStandards.forEach((result, index) => {
    const name = generateMotionName(result.token, index);
    const property = result.token.property;
    const value = result.token.value;
    const evidence = formatEvidenceCitation(result.token.evidence, 3);

    rows.push([name, property, value, evidence]);
  });

  return generateTable(headers, rows);
}

/**
 * Generate component catalog section
 */
function generateComponentCatalog(components: AggregatedComponent[]): string {
  if (components.length === 0) {
    return 'No components detected.';
  }

  const sections: string[] = [];

  for (const component of components) {
    // Component type heading
    const componentName = component.type.charAt(0).toUpperCase() + component.type.slice(1);
    sections.push(heading(componentName, 3));
    sections.push('');

    // Detection summary
    const pageCount = component.pageUrls.size;
    const instanceCount = component.instances.length;
    const confidenceLevel = getConfidenceLevel(component.confidence?.value || 0);
    sections.push(bold('Detection Summary:') + ` Found on ${pageCount} pages, ${instanceCount} instances, confidence: ${confidenceLevel}`);
    sections.push('');

    // Canonical styles table
    sections.push(bold('Canonical Styles:'));
    sections.push('');
    const styleHeaders = ['Property', 'Value'];
    const styleRows: string[][] = [];

    // Show key CSS properties (limit to important ones)
    const keyProperties = [
      'display', 'padding', 'margin', 'border', 'borderRadius',
      'backgroundColor', 'color', 'fontSize', 'fontWeight'
    ];

    for (const prop of keyProperties) {
      const value = component.canonical.styles[prop];
      if (value) {
        styleRows.push([prop, value]);
      }
    }

    sections.push(generateTable(styleHeaders, styleRows));
    sections.push('');

    // Variants
    if (component.variants.length > 0) {
      const variantInfo = extractVariantInfo(component);
      if (variantInfo.length > 0) {
        sections.push(bold('Variants:'));
        for (const info of variantInfo) {
          sections.push(`- ${info}`);
        }
        sections.push('');
      }
    }

    // States
    if (component.states) {
      const stateNames = Object.keys(component.states);
      if (stateNames.length > 0) {
        sections.push(bold('States:') + ` ${stateNames.join(', ')}`);
        sections.push('');
      }
    }

    // Evidence
    const allEvidence = component.instances.flatMap(i => i.evidence);
    const evidenceCitation = formatEvidenceCitation(allEvidence, 3);
    sections.push(bold('Evidence:') + ` (${evidenceCitation})`);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Extract variant information from component
 */
function extractVariantInfo(component: AggregatedComponent): string[] {
  const info: string[] = [];
  const allVariants = component.variants;

  // Size variants
  const sizes = new Set<string>();
  for (const v of allVariants) {
    if (v.variant.size) {
      sizes.add(v.variant.size);
    }
  }
  if (sizes.size > 0) {
    info.push(`Size: ${Array.from(sizes).join(' | ')}`);
  }

  // Emphasis variants
  const emphasis = new Set<string>();
  for (const v of allVariants) {
    if (v.variant.emphasis) {
      emphasis.add(v.variant.emphasis);
    }
  }
  if (emphasis.size > 0) {
    info.push(`Emphasis: ${Array.from(emphasis).join(' | ')}`);
  }

  // Shape variants
  const shapes = new Set<string>();
  for (const v of allVariants) {
    if (v.variant.shape) {
      shapes.add(v.variant.shape);
    }
  }
  if (shapes.size > 0) {
    info.push(`Shape: ${Array.from(shapes).join(' | ')}`);
  }

  return info;
}

/**
 * Get confidence level label
 */
function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.6) {
    return 'high';
  }
  if (confidence >= 0.3) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generate interaction patterns section
 */
function generateInteractionPatterns(flowPatterns: StoredPattern[]): string {
  if (flowPatterns.length === 0) {
    return 'No interaction patterns detected.';
  }

  const sections: string[] = [];

  for (const pattern of flowPatterns) {
    const flow = pattern.pattern; // DetectedFlow

    // Flow type heading
    const flowName = flow.type.split('-').map((word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Flow';

    sections.push(heading(flowName, 3));
    sections.push('');

    // Confidence
    const confidenceStr = flow.confidence.toFixed(2);
    sections.push(bold('Confidence:') + ` ${confidenceStr}`);
    sections.push('');

    // Path
    const pathStr = flow.path.join(' → ');
    sections.push(bold('Path:') + ` ${pathStr}`);
    sections.push('');

    // Steps
    sections.push(bold('Steps:') + ` ${flow.characteristics.stepCount}`);
    sections.push('');

    // Characteristics
    sections.push(bold('Characteristics:'));
    sections.push(`- Has form submission: ${flow.characteristics.hasFormSubmission ? 'yes' : 'no'}`);
    sections.push(`- Requires auth: ${flow.characteristics.requiresAuth ? 'yes' : 'no'}`);
    sections.push('');

    // Evidence
    const evidencePages = pattern.evidence.pageUrls.slice(0, 3);
    const remaining = pattern.evidence.pageUrls.length - 3;
    const evidenceStr = remaining > 0
      ? `${evidencePages.join(', ')} (+${remaining} more)`
      : evidencePages.join(', ');
    sections.push(bold('Evidence:') + ` (${evidenceStr})`);
    sections.push('');
  }

  return sections.join('\n');
}
