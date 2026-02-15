/**
 * Rule-based structural synthesis engine
 * Stage 1 of the two-stage synthesis pipeline
 * Generates HTML+CSS from Handlebars templates using only extracted design tokens
 */

import type {
  DesignDNA,
  ComponentRequest,
  StructuralSynthesis,
  SynthesisDecision,
  EvidenceLink,
} from '../types/synthesis.js';
import { buildTokenMap, type TokenMap } from './constraint-checker.js';
import { compileTemplate, getAvailableTemplates } from './template-registry.js';

/**
 * Template name aliases for common variations
 */
const TEMPLATE_ALIASES: Record<string, string> = {
  table: 'data-table',
  dialog: 'modal',
  navbar: 'nav',
  'text-input': 'input',
  'text-field': 'input',
};

/**
 * Resolve template name from request type
 * Handles exact matches and common aliases
 *
 * @param requestType - Component type from request
 * @returns Template name or throws error if not found
 */
function resolveTemplateName(requestType: string): string {
  const available = getAvailableTemplates();

  // Check exact match first
  if (available.includes(requestType)) {
    return requestType;
  }

  // Check aliases
  const normalized = requestType.toLowerCase();
  if (TEMPLATE_ALIASES[normalized]) {
    const aliased = TEMPLATE_ALIASES[normalized];
    if (available.includes(aliased)) {
      return aliased;
    }
  }

  // Not found - throw descriptive error
  throw new Error(
    `Template not found for component type: ${requestType}. ` +
      `Available templates: ${available.join(', ')}. ` +
      `Supported aliases: ${Object.keys(TEMPLATE_ALIASES).join(', ')}`
  );
}

/**
 * Calculate relative luminance for a color
 * Used for contrast calculations
 * Formula from WCAG 2.1
 */
function getRelativeLuminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const toLinear = (val: number) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Resolve contrasting text color for a background color
 * Simple luminance-based approach: light bg -> dark text, dark bg -> light text
 *
 * @param backgroundColor - Hex color code
 * @returns '#000000' or '#ffffff' for maximum contrast
 */
export function resolveColorContrast(backgroundColor: string): string {
  const luminance = getRelativeLuminance(backgroundColor);

  // WCAG threshold is around 0.5, but we use 0.5 for simplicity
  // Light background (luminance > 0.5) -> black text
  // Dark background (luminance <= 0.5) -> white text
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Build token context for Handlebars template
 * Resolves all token placeholders from DesignDNA
 *
 * @param tokenMap - Flat token lookup map
 * @returns Object with resolved tokens and evidence
 */
function buildTokenContext(tokenMap: TokenMap): {
  tokens: Record<string, any>;
  evidence: EvidenceLink[];
  tokenMapRecord: Record<string, string>;
  resolvedCount: number;
  totalCount: number;
} {
  const tokens: Record<string, any> = {
    color: {},
    spacing: {},
    typography: {},
    radius: {},
    shadow: {},
    motion: {},
  };
  const evidence: EvidenceLink[] = [];
  const tokenMapRecord: Record<string, string> = {};

  let resolvedCount = 0;
  let totalCount = 0;

  // Resolve colors
  totalCount += 10; // We expect ~10 color tokens
  if (tokenMap.colors.size > 0) {
    // Primary color (first/most frequent)
    const primaryEntry = tokenMap.colors.get('color-1');
    if (primaryEntry) {
      tokens.color.primary = primaryEntry.value;
      tokenMapRecord['color.primary'] = primaryEntry.value;
      evidence.push(primaryEntry.evidence);
      resolvedCount++;

      // Derive onPrimary (contrasting text color)
      tokens.color.onPrimary = resolveColorContrast(primaryEntry.value);
      tokenMapRecord['color.onPrimary'] = tokens.color.onPrimary;
      resolvedCount++;
    }

    // Secondary/tertiary colors
    const secondaryEntry = tokenMap.colors.get('color-2');
    if (secondaryEntry) {
      tokens.color.secondary = secondaryEntry.value;
      tokenMapRecord['color.secondary'] = secondaryEntry.value;
      evidence.push(secondaryEntry.evidence);
      resolvedCount++;
    }

    // Text color (try color-3, or fallback to black/white based on background)
    const textEntry = tokenMap.colors.get('color-3');
    if (textEntry) {
      tokens.color.text = textEntry.value;
      tokenMapRecord['color.text'] = textEntry.value;
      evidence.push(textEntry.evidence);
      resolvedCount++;
    }

    // Border color (lighter shade, try color-4)
    const borderEntry = tokenMap.colors.get('color-4');
    if (borderEntry) {
      tokens.color.border = borderEntry.value;
      tokenMapRecord['color.border'] = borderEntry.value;
      evidence.push(borderEntry.evidence);
      resolvedCount++;
    }

    // Background colors
    const bgEntry = tokenMap.colors.get('color-5');
    if (bgEntry) {
      tokens.color.background = bgEntry.value;
      tokenMapRecord['color.background'] = bgEntry.value;
      evidence.push(bgEntry.evidence);
      resolvedCount++;
    }

    const bgSecondaryEntry = tokenMap.colors.get('color-6');
    if (bgSecondaryEntry) {
      tokens.color.backgroundSecondary = bgSecondaryEntry.value;
      tokenMapRecord['color.backgroundSecondary'] = bgSecondaryEntry.value;
      evidence.push(bgSecondaryEntry.evidence);
      resolvedCount++;
    }

    // Hover state (lighter/darker variant)
    const hoverEntry = tokenMap.colors.get('color-7');
    if (hoverEntry) {
      tokens.color.backgroundHover = hoverEntry.value;
      tokenMapRecord['color.backgroundHover'] = hoverEntry.value;
      evidence.push(hoverEntry.evidence);
      resolvedCount++;
    }

    // Error/success states
    const errorEntry = tokenMap.colors.get('color-8');
    if (errorEntry) {
      tokens.color.error = errorEntry.value;
      tokenMapRecord['color.error'] = errorEntry.value;
      evidence.push(errorEntry.evidence);
      resolvedCount++;
    }

    // Text secondary
    const textSecondaryEntry = tokenMap.colors.get('color-9');
    if (textSecondaryEntry) {
      tokens.color.textSecondary = textSecondaryEntry.value;
      tokenMapRecord['color.textSecondary'] = textSecondaryEntry.value;
      evidence.push(textSecondaryEntry.evidence);
      resolvedCount++;
    }
  }

  // Resolve spacing
  totalCount += 5; // xs, sm, md, lg, xl
  const spacingNames = ['xs', 'sm', 'md', 'lg', 'xl'];
  spacingNames.forEach((name) => {
    const entry = tokenMap.spacing.get(`spacing-${name}`);
    if (entry) {
      tokens.spacing[name] = entry.value;
      tokenMapRecord[`spacing.${name}`] = entry.value;
      evidence.push(entry.evidence);
      resolvedCount++;
    }
  });

  // Resolve typography
  totalCount += 4; // body + heading properties
  // Body typography (use first or default)
  const bodyTypoEntry = tokenMap.typography.get('heading-1-size');
  if (bodyTypoEntry) {
    tokens.typography.body = {
      fontSize: bodyTypoEntry.value,
      fontFamily: 'system-ui, sans-serif', // Default fallback
      fontWeight: '400',
      lineHeight: '1.5',
    };
    tokenMapRecord['typography.body.fontSize'] = bodyTypoEntry.value;
    evidence.push(bodyTypoEntry.evidence);
    resolvedCount++;
  }

  // Heading typography
  const headingTypoEntry = tokenMap.typography.get('heading-1-size');
  if (headingTypoEntry) {
    tokens.typography.heading = {
      fontSize: headingTypoEntry.value,
      fontWeight: '600',
      lineHeight: '1.2',
    };
    tokenMapRecord['typography.heading.fontSize'] = headingTypoEntry.value;
    evidence.push(headingTypoEntry.evidence);
    resolvedCount++;
  }

  const headingWeightEntry = tokenMap.typography.get('heading-1-weight');
  if (headingWeightEntry) {
    if (!tokens.typography.heading) {
      tokens.typography.heading = {};
    }
    tokens.typography.heading.fontWeight = headingWeightEntry.value;
    tokenMapRecord['typography.heading.fontWeight'] = headingWeightEntry.value;
    resolvedCount++;
  }

  // Resolve radius
  totalCount += 3; // sm, md, lg
  const radiusNames = ['sm', 'md', 'lg'];
  radiusNames.forEach((name, index) => {
    const entry = tokenMap.radii.get(`radius-${index + 1}`);
    if (entry) {
      tokens.radius[name] = entry.value;
      tokenMapRecord[`radius.${name}`] = entry.value;
      evidence.push(entry.evidence);
      resolvedCount++;
    }
  });

  // Resolve shadows
  totalCount += 3; // sm, md, lg
  const shadowNames = ['sm', 'md', 'lg'];
  shadowNames.forEach((name, index) => {
    const entry = tokenMap.shadows.get(`shadow-${index + 1}`);
    if (entry) {
      tokens.shadow[name] = entry.value;
      tokenMapRecord[`shadow.${name}`] = entry.value;
      evidence.push(entry.evidence);
      resolvedCount++;
    }
  });

  return {
    tokens,
    evidence,
    tokenMapRecord,
    resolvedCount,
    totalCount,
  };
}

/**
 * Synthesize component structure from template
 * Core function: generates HTML+CSS using only extracted design tokens
 *
 * @param request - Component request from user
 * @param designDNA - Extracted design DNA (tokens + components)
 * @returns StructuralSynthesis with HTML, CSS, and evidence chain
 */
export function synthesizeStructure(
  request: ComponentRequest,
  designDNA: DesignDNA
): StructuralSynthesis {
  // Step 1: Select template
  const templateName = resolveTemplateName(request.type);

  // Step 2: Build token map for lookups
  const tokenMap = buildTokenMap(designDNA);

  // Step 3: Resolve tokens from DesignDNA
  const { tokens, evidence, tokenMapRecord, resolvedCount, totalCount } =
    buildTokenContext(tokenMap);

  // Step 4: Validate token coverage
  const coverage = totalCount > 0 ? resolvedCount / totalCount : 0;

  // If critical tokens missing (less than 50% coverage), throw error
  if (coverage < 0.5) {
    throw new Error(
      `Insufficient token coverage (${Math.round(coverage * 100)}%). ` +
        `Design DNA must contain at least 50% of required tokens. ` +
        `Resolved: ${resolvedCount}/${totalCount}`
    );
  }

  // Step 5: Compile template with resolved tokens
  const compiledTemplate = compileTemplate(templateName);

  // Prepare template context (tokens + any request data)
  const templateContext = {
    tokens,
    ...request.constraints, // Allow user overrides
  };

  const rendered = compiledTemplate(templateContext);

  // Step 6: Extract HTML and CSS from rendered output
  const styleMatch = rendered.match(/<style>([\s\S]*?)<\/style>/);
  const css = styleMatch ? styleMatch[1].trim() : '';
  const html = rendered.replace(/<style>[\s\S]*?<\/style>/, '').trim();

  // Step 7: Build decisions list
  const decisions: SynthesisDecision[] = Object.entries(tokenMapRecord).map(
    ([property, value]) => ({
      type: 'token_application' as const,
      property,
      value,
      confidence: 1.0, // High confidence - directly from DesignDNA
      evidence: evidence.filter((e) => e.reference.includes(property.split('.')[0])),
      reasoning: `Token ${property} resolved from extracted design standards`,
    })
  );

  // Step 8: Calculate overall confidence
  const confidence = coverage;

  // Step 9: Return structural synthesis
  return {
    html,
    css,
    templateName,
    tokenMap: tokenMapRecord,
    decisions,
    evidence,
    confidence,
  };
}
