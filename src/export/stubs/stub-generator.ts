/**
 * Component stub generator
 * Generates framework-agnostic HTML stubs with embedded CSS custom property references
 * Each component becomes a single .html file with embedded <style> block
 */

import type { AggregatedComponent } from '../../components/component-aggregator.js';
import type { NormalizationResult } from '../../output/dtcg-formatter.js';
import type { ComponentType } from '../../types/components.js';
import {
  generateSemanticColorName,
  generateSemanticTypographyName,
  generateSemanticSpacingName,
  generateRadiusName,
  generateShadowName,
} from '../semantic-namer.js';

/**
 * Token name map for CSS var() references
 * Maps from token array index to semantic name
 */
export interface TokenNameMap {
  colors: Map<number, string>;
  typography: Map<number, string>;
  spacing: Map<number, string>;
  radii: Map<number, string>;
  shadows: Map<number, string>;
}

/**
 * Build token name map from NormalizationResult
 * Creates index->name mappings for all token types
 */
function buildTokenNameMap(result: NormalizationResult): TokenNameMap {
  const map: TokenNameMap = {
    colors: new Map(),
    typography: new Map(),
    spacing: new Map(),
    radii: new Map(),
    shadows: new Map(),
  };

  // Colors - sorted by occurrence descending
  const sortedColors = [...result.colors.standards].sort(
    (a, b) => b.occurrenceCount - a.occurrenceCount
  );
  sortedColors.forEach((colorResult: any, index) => {
    const cluster = colorResult.token;
    const name = generateSemanticColorName(
      { canonical: cluster.canonical, variants: cluster.variants, occurrences: cluster.occurrences },
      index,
      sortedColors.length
    );
    map.colors.set(index, name);
  });

  // Typography - sorted by size descending
  const sortedTypography = [...result.typography.standards].sort(
    (a: any, b: any) => b.token.normalizedSize.pixels - a.token.normalizedSize.pixels
  );
  sortedTypography.forEach((typoResult: any, index) => {
    const token = typoResult.token;
    const baseName = generateSemanticTypographyName(
      { normalizedSize: token.normalizedSize, weight: token.weight },
      index,
      sortedTypography.length
    );
    map.typography.set(index, baseName);
  });

  // Spacing - sorted by value ascending
  const sortedSpacing = [...result.spacing.standards].sort(
    (a: any, b: any) => a.token.normalizedValue.pixels - b.token.normalizedValue.pixels
  );
  sortedSpacing.forEach((spacingResult: any, index) => {
    const name = generateSemanticSpacingName(
      { normalizedValue: spacingResult.token.normalizedValue },
      index,
      sortedSpacing.length
    );
    map.spacing.set(index, name);
  });

  // Radii - sorted by value ascending
  const sortedRadii = [...result.radii.standards].sort(
    (a: any, b: any) => a.token.valuePixels - b.token.valuePixels
  );
  sortedRadii.forEach((_radiusResult: any, index) => {
    const name = generateRadiusName(index, sortedRadii.length);
    map.radii.set(index, name);
  });

  // Shadows
  result.shadows.standards.forEach((_shadowResult: any, index) => {
    const name = generateShadowName(index, result.shadows.standards.length);
    map.shadows.set(index, name);
  });

  return map;
}

/**
 * Parse numeric value from CSS string (e.g., "16px" -> 16)
 */
function parseNumericValue(value: string): number {
  const match = value.match(/^([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Map canonical CSS property value to CSS custom property reference
 * Finds nearest matching token by value comparison
 */
function mapStyleToVar(
  property: string,
  value: string,
  tokenNames: TokenNameMap,
  result: NormalizationResult
): string | null {
  // Normalize value
  const normalizedValue = value.toLowerCase().trim();

  // Color properties
  if (property.includes('color') || property === 'background' || property === 'backgroundColor') {
    // Try to find matching color token
    const sortedColors = [...result.colors.standards].sort(
      (a, b) => b.occurrenceCount - a.occurrenceCount
    );

    for (let i = 0; i < sortedColors.length; i++) {
      const cluster = sortedColors[i].token;
      // Check canonical and variants
      if (cluster.canonical.toLowerCase() === normalizedValue) {
        const name = tokenNames.colors.get(i);
        return name ? `var(--${name})` : null;
      }
      for (const variant of cluster.variants) {
        if (variant.toLowerCase() === normalizedValue) {
          const name = tokenNames.colors.get(i);
          return name ? `var(--${name})` : null;
        }
      }
    }
  }

  // Font size
  if (property === 'fontSize') {
    const pixelValue = parseNumericValue(normalizedValue);
    const sortedTypography = [...result.typography.standards].sort(
      (a: any, b: any) => b.token.normalizedSize.pixels - a.token.normalizedSize.pixels
    );

    // Find closest match (within 2px tolerance)
    let closestIndex = -1;
    let closestDiff = Infinity;

    for (let i = 0; i < sortedTypography.length; i++) {
      const token = sortedTypography[i].token;
      const diff = Math.abs(token.normalizedSize.pixels - pixelValue);
      if (diff < closestDiff && diff <= 2) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0) {
      const name = tokenNames.typography.get(closestIndex);
      return name ? `var(--${name}-size)` : null;
    }
  }

  // Font family
  if (property === 'fontFamily') {
    const sortedTypography = [...result.typography.standards].sort(
      (a: any, b: any) => b.token.normalizedSize.pixels - a.token.normalizedSize.pixels
    );

    for (let i = 0; i < sortedTypography.length; i++) {
      const token = sortedTypography[i].token;
      if (token.family === normalizedValue) {
        const name = tokenNames.typography.get(i);
        return name ? `var(--${name}-family)` : null;
      }
    }
  }

  // Font weight
  if (property === 'fontWeight') {
    const weight = parseInt(normalizedValue, 10);
    if (!isNaN(weight)) {
      const sortedTypography = [...result.typography.standards].sort(
        (a: any, b: any) => b.token.normalizedSize.pixels - a.token.normalizedSize.pixels
      );

      for (let i = 0; i < sortedTypography.length; i++) {
        const token = sortedTypography[i].token;
        if (token.weight === weight) {
          const name = tokenNames.typography.get(i);
          return name ? `var(--${name}-weight)` : null;
        }
      }
    }
  }

  // Padding/margin (spacing)
  if (property === 'padding' || property === 'margin' || property.includes('padding') || property.includes('margin')) {
    const pixelValue = parseNumericValue(normalizedValue);
    const sortedSpacing = [...result.spacing.standards].sort(
      (a: any, b: any) => a.token.normalizedValue.pixels - b.token.normalizedValue.pixels
    );

    // Find closest match (within 2px tolerance)
    let closestIndex = -1;
    let closestDiff = Infinity;

    for (let i = 0; i < sortedSpacing.length; i++) {
      const token = sortedSpacing[i].token;
      const diff = Math.abs(token.normalizedValue.pixels - pixelValue);
      if (diff < closestDiff && diff <= 2) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0) {
      const name = tokenNames.spacing.get(closestIndex);
      return name ? `var(--${name})` : null;
    }
  }

  // Border radius
  if (property === 'borderRadius' || property.includes('radius')) {
    const pixelValue = parseNumericValue(normalizedValue);
    const sortedRadii = [...result.radii.standards].sort(
      (a: any, b: any) => a.token.valuePixels - b.token.valuePixels
    );

    // Find closest match (within 2px tolerance)
    let closestIndex = -1;
    let closestDiff = Infinity;

    for (let i = 0; i < sortedRadii.length; i++) {
      const token = sortedRadii[i].token;
      const diff = Math.abs(token.valuePixels - pixelValue);
      if (diff < closestDiff && diff <= 2) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0) {
      const name = tokenNames.radii.get(closestIndex);
      return name ? `var(--${name})` : null;
    }
  }

  // Box shadow
  if (property === 'boxShadow') {
    // For now, use first shadow token if available
    if (result.shadows.standards.length > 0) {
      const name = tokenNames.shadows.get(0);
      return name ? `var(--${name})` : null;
    }
  }

  return null;
}

/**
 * Generate component stub HTML with embedded CSS custom property references
 */
export function generateComponentStub(
  component: AggregatedComponent,
  tokenNames: TokenNameMap,
  result: NormalizationResult
): string {
  const type = component.type;
  const canonical = component.canonical.styles;

  // Generate HTML structure based on component type
  let htmlContent = '';
  let elementTag = 'div';
  let cssClassName = type;

  switch (type) {
    case 'button':
      elementTag = 'button';
      htmlContent = `  <${elementTag} class="${cssClassName}">Example Button</${elementTag}>\n\n`;
      htmlContent += `  <!-- Variants -->\n`;
      htmlContent += `  <${elementTag} class="${cssClassName} ${cssClassName}--secondary">Secondary Button</${elementTag}>\n`;
      htmlContent += `  <${elementTag} class="${cssClassName} ${cssClassName}--small">Small Button</${elementTag}>\n\n`;
      htmlContent += `  <!-- States -->\n`;
      htmlContent += `  <${elementTag} class="${cssClassName}" disabled>Disabled Button</${elementTag}>`;
      break;

    case 'input':
      elementTag = 'input';
      htmlContent = `  <label for="example-input">Example Label</label>\n`;
      htmlContent += `  <${elementTag} type="text" id="example-input" class="${cssClassName}" placeholder="Enter text...">\n\n`;
      htmlContent += `  <!-- States -->\n`;
      htmlContent += `  <${elementTag} type="text" class="${cssClassName}" disabled placeholder="Disabled input">`;
      break;

    case 'card':
      elementTag = 'div';
      htmlContent = `  <${elementTag} class="${cssClassName}">\n`;
      htmlContent += `    <img src="https://via.placeholder.com/300x200" alt="Placeholder" class="${cssClassName}__image">\n`;
      htmlContent += `    <div class="${cssClassName}__content">\n`;
      htmlContent += `      <h3 class="${cssClassName}__title">Card Title</h3>\n`;
      htmlContent += `      <p class="${cssClassName}__body">Card description text goes here.</p>\n`;
      htmlContent += `      <div class="${cssClassName}__actions">\n`;
      htmlContent += `        <button class="${cssClassName}__button">Action</button>\n`;
      htmlContent += `      </div>\n`;
      htmlContent += `    </div>\n`;
      htmlContent += `  </${elementTag}>`;
      break;

    case 'nav':
      elementTag = 'nav';
      htmlContent = `  <${elementTag} class="${cssClassName}">\n`;
      htmlContent += `    <ul class="${cssClassName}__list">\n`;
      htmlContent += `      <li class="${cssClassName}__item"><a href="#" class="${cssClassName}__link">Home</a></li>\n`;
      htmlContent += `      <li class="${cssClassName}__item"><a href="#" class="${cssClassName}__link">About</a></li>\n`;
      htmlContent += `      <li class="${cssClassName}__item"><a href="#" class="${cssClassName}__link">Contact</a></li>\n`;
      htmlContent += `    </ul>\n`;
      htmlContent += `  </${elementTag}>`;
      break;

    case 'modal':
      elementTag = 'dialog';
      htmlContent = `  <${elementTag} class="${cssClassName}" id="example-modal">\n`;
      htmlContent += `    <div class="${cssClassName}__header">\n`;
      htmlContent += `      <h2 class="${cssClassName}__title">Modal Title</h2>\n`;
      htmlContent += `      <button class="${cssClassName}__close" aria-label="Close">×</button>\n`;
      htmlContent += `    </div>\n`;
      htmlContent += `    <div class="${cssClassName}__body">\n`;
      htmlContent += `      <p>Modal content goes here.</p>\n`;
      htmlContent += `    </div>\n`;
      htmlContent += `    <div class="${cssClassName}__footer">\n`;
      htmlContent += `      <button class="${cssClassName}__button ${cssClassName}__button--secondary">Cancel</button>\n`;
      htmlContent += `      <button class="${cssClassName}__button ${cssClassName}__button--primary">Confirm</button>\n`;
      htmlContent += `    </div>\n`;
      htmlContent += `  </${elementTag}>`;
      break;

    default:
      htmlContent = `  <${elementTag} class="${cssClassName}">Example ${type}</${elementTag}>`;
  }

  // Generate CSS styles with var() references
  const cssLines: string[] = [];
  cssLines.push(`    /* ${type.charAt(0).toUpperCase() + type.slice(1)} Component Styles */`);
  cssLines.push(`    .${cssClassName} {`);

  // Map canonical styles to CSS custom properties
  const styleProps = [
    'backgroundColor',
    'color',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderRadius',
    'boxShadow',
    'border',
    'borderColor',
    'borderWidth',
  ];

  for (const prop of styleProps) {
    const value = canonical[prop];
    if (value && value !== 'none' && value !== '0' && value !== '0px') {
      const varRef = mapStyleToVar(prop, value, tokenNames, result);

      // Convert camelCase to kebab-case for CSS
      const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();

      if (varRef) {
        cssLines.push(`      ${cssProp}: ${varRef};`);
      } else {
        // Use raw value as fallback with comment
        cssLines.push(`      ${cssProp}: ${value}; /* Not tokenized */`);
      }
    }
  }

  // Add common structural styles
  if (type === 'button') {
    cssLines.push(`      display: inline-flex;`);
    cssLines.push(`      align-items: center;`);
    cssLines.push(`      justify-content: center;`);
    cssLines.push(`      cursor: pointer;`);
    cssLines.push(`      border: none;`);
    cssLines.push(`      transition: all 0.2s ease;`);
  }

  cssLines.push(`    }`);
  cssLines.push(``);

  // Add state styles
  cssLines.push(`    /* States */`);
  cssLines.push(`    .${cssClassName}:hover {`);

  // Check if component has hover state
  if (component.states?.hover) {
    const hoverStyles = component.states.hover;
    for (const [prop, value] of Object.entries(hoverStyles)) {
      if (value) {
        const varRef = mapStyleToVar(prop, value, tokenNames, result);
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        if (varRef) {
          cssLines.push(`      ${cssProp}: ${varRef};`);
        } else {
          cssLines.push(`      ${cssProp}: ${value};`);
        }
      }
    }
  } else {
    cssLines.push(`      opacity: 0.9;`);
  }

  cssLines.push(`    }`);
  cssLines.push(``);

  cssLines.push(`    .${cssClassName}:focus {`);
  cssLines.push(`      outline: 2px solid var(--primary);`);
  cssLines.push(`      outline-offset: 2px;`);
  cssLines.push(`    }`);
  cssLines.push(``);

  if (type === 'button' || type === 'input') {
    cssLines.push(`    .${cssClassName}:disabled {`);
    cssLines.push(`      opacity: 0.5;`);
    cssLines.push(`      cursor: not-allowed;`);
    cssLines.push(`    }`);
    cssLines.push(``);
  }

  // Add variant styles if component has variants
  if (component.variants.length > 0) {
    cssLines.push(`    /* Variants */`);

    // Size variants
    const hasSmall = component.variants.some(v => v.variant.size === 'small');
    const hasMedium = component.variants.some(v => v.variant.size === 'medium');
    const hasLarge = component.variants.some(v => v.variant.size === 'large');

    if (hasSmall) {
      cssLines.push(`    .${cssClassName}--small {`);
      cssLines.push(`      font-size: 0.875rem;`);
      cssLines.push(`      padding: var(--spacing-xs) var(--spacing-sm);`);
      cssLines.push(`    }`);
      cssLines.push(``);
    }

    if (hasMedium) {
      cssLines.push(`    .${cssClassName}--medium {`);
      cssLines.push(`      font-size: 1rem;`);
      cssLines.push(`      padding: var(--spacing-sm) var(--spacing-md);`);
      cssLines.push(`    }`);
      cssLines.push(``);
    }

    if (hasLarge) {
      cssLines.push(`    .${cssClassName}--large {`);
      cssLines.push(`      font-size: 1.125rem;`);
      cssLines.push(`      padding: var(--spacing-md) var(--spacing-lg);`);
      cssLines.push(`    }`);
      cssLines.push(``);
    }

    // Emphasis variants
    const hasSecondary = component.variants.some(v => v.variant.emphasis === 'secondary');
    const hasTertiary = component.variants.some(v => v.variant.emphasis === 'tertiary');
    const hasGhost = component.variants.some(v => v.variant.emphasis === 'ghost');

    if (hasSecondary) {
      cssLines.push(`    .${cssClassName}--secondary {`);
      cssLines.push(`      background-color: transparent;`);
      cssLines.push(`      border: 1px solid var(--secondary);`);
      cssLines.push(`      color: var(--secondary);`);
      cssLines.push(`    }`);
      cssLines.push(``);
    }

    if (hasTertiary) {
      cssLines.push(`    .${cssClassName}--tertiary {`);
      cssLines.push(`      background-color: var(--neutral-1);`);
      cssLines.push(`      color: var(--primary);`);
      cssLines.push(`    }`);
      cssLines.push(``);
    }

    if (hasGhost) {
      cssLines.push(`    .${cssClassName}--ghost {`);
      cssLines.push(`      background-color: transparent;`);
      cssLines.push(`      border: none;`);
      cssLines.push(`      color: var(--primary);`);
      cssLines.push(`    }`);
      cssLines.push(``);
    }
  }

  // Generate complete HTML document
  const timestamp = new Date().toISOString();
  const html = `<!-- Component: ${type} -->
<!-- Generated by UIUX-Mirror -->
<!-- Generated: ${timestamp} -->
<!-- Requires: tokens.css (CSS custom properties) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type.charAt(0).toUpperCase() + type.slice(1)} Component</title>
  <link rel="stylesheet" href="tokens.css">
  <style>
${cssLines.join('\n')}
  </style>
</head>
<body>
  <h1>${type.charAt(0).toUpperCase() + type.slice(1)} Component</h1>

${htmlContent}
</body>
</html>`;

  return html;
}

/**
 * Generate all component stubs from aggregated components
 * Returns map of component type -> HTML stub content
 */
export function generateAllStubs(
  components: AggregatedComponent[],
  result: NormalizationResult
): Map<ComponentType, string> {
  // Build token name map once
  const tokenNames = buildTokenNameMap(result);

  const stubs = new Map<ComponentType, string>();

  for (const component of components) {
    const stub = generateComponentStub(component, tokenNames, result);
    stubs.set(component.type, stub);
  }

  return stubs;
}
