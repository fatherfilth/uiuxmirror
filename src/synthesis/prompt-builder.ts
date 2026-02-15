/**
 * Prompt builder for LLM refinement
 * Formats DesignDNA context and builds specialized prompts for Claude API
 */

import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages.js';
import type { DesignDNA } from '../types/synthesis.js';

/**
 * Builds system prompt with DesignDNA context and cache control
 * Formats tokens and components for Claude consumption
 * Includes cache_control for prompt caching (5-min lifetime)
 */
export function buildSystemPrompt(designDNA: DesignDNA): MessageCreateParams['system'] {
  const tokensSummary = formatTokensForPrompt(designDNA);
  const componentsSummary = formatComponentsForPrompt(designDNA);

  const systemText = `You are a design system expert helping synthesize new UI components based on observed design patterns.

# Design DNA Context

This design DNA was extracted from ${designDNA.metadata.sourceUrl} across ${designDNA.metadata.totalPages} pages.

## Available Design Tokens

${tokensSummary}

## Observed Components

${componentsSummary}

# Your Role

You make nuanced design decisions that cannot be determined by rules alone:
- Motion timing and easing for transitions
- Loading and error state presentation
- Microcopy tone and wording

# Critical Constraints

1. **ONLY use tokens and patterns from the Design DNA above** — never invent new values
2. **Always cite evidence** — provide token IDs or component types as evidence
3. **Rate your confidence** — use 0-1 scale based on evidence strength
4. **Provide reasoning** — explain why you chose each value

Your decisions will be validated against the extracted DNA. Hallucinated values will be rejected.`;

  // Return as content block array with cache control
  return [
    {
      type: 'text',
      text: systemText,
      cache_control: { type: 'ephemeral' }
    }
  ];
}

/**
 * Builds user prompt for motion timing decisions
 * Asks Claude to decide transition durations and easing based on observed patterns
 */
export function buildMotionPrompt(
  componentType: string,
  html: string,
  designDNA: DesignDNA
): string {
  const observedMotion = extractObservedMotion(designDNA);

  return `# Motion Timing Decision

Component type: ${componentType}

Component structure:
\`\`\`html
${html}
\`\`\`

## Observed Motion Patterns

${observedMotion}

## Task

Decide transition timing for this component's interactive states (hover, focus, active).

**Available easing functions:** ease, ease-in, ease-out, ease-in-out, linear, or custom cubic-bezier from observed patterns.

**Requirements:**
1. ONLY use durations and easings observed in the Design DNA
2. Provide evidence IDs (component types or token names where you found these values)
3. Rate your confidence (0-1) based on evidence strength
4. Explain your reasoning

Return JSON matching this schema:
{
  "transitions": [
    {
      "property": "background-color",
      "duration": "200ms",
      "timingFunction": "ease-in-out",
      "reasoning": "Observed in button components across 5 pages",
      "confidence": 0.9,
      "evidenceIds": ["button", "link-button"]
    }
  ]
}`;
}

/**
 * Builds user prompt for edge state decisions (loading/error)
 * Asks Claude to decide presentation and styling for loading and error states
 */
export function buildEdgeStatePrompt(
  componentType: string,
  html: string,
  designDNA: DesignDNA
): string {
  const observedEdgeStates = extractObservedEdgeStates(designDNA);

  return `# Edge State Decision

Component type: ${componentType}

Component structure:
\`\`\`html
${html}
\`\`\`

## Observed Edge State Patterns

${observedEdgeStates}

## Task

Decide how to present loading and error states for this component.

**Loading presentation options:** spinner, skeleton, text-change, progress-bar
**Error presentation options:** inline-message, toast, banner, icon

**Requirements:**
1. Use color/spacing tokens from Design DNA for styles
2. Provide appropriate ARIA attributes for accessibility
3. Rate your confidence (0-1) based on evidence strength
4. Explain your reasoning

Return JSON matching this schema:
{
  "loadingState": {
    "presentation": "spinner",
    "styles": {
      "color": "color-1",
      "width": "spacing-md",
      "height": "spacing-md"
    },
    "ariaAttributes": {
      "role": "status",
      "aria-live": "polite",
      "aria-label": "Loading"
    },
    "reasoning": "Observed spinner pattern in similar components",
    "confidence": 0.8
  },
  "errorState": {
    "presentation": "inline-message",
    "styles": {
      "color": "error-red",
      "fontSize": "body-small",
      "padding": "spacing-xs"
    },
    "ariaAttributes": {
      "role": "alert",
      "aria-live": "assertive"
    },
    "reasoning": "Consistent with observed error handling patterns",
    "confidence": 0.85
  }
}`;
}

/**
 * Builds user prompt for microcopy decisions
 * Asks Claude to decide button text, labels, placeholders based on observed tone
 */
export function buildMicrocopyPrompt(
  componentType: string,
  designDNA: DesignDNA
): string {
  const observedText = extractObservedText(designDNA);

  return `# Microcopy Decision

Component type: ${componentType}

## Observed Text Patterns

${observedText}

## Task

Decide appropriate microcopy for this component (button text, labels, placeholders, error messages).

**Requirements:**
1. Match the tone and voice of observed content
2. Keep it concise and action-oriented
3. Rate your confidence (0-1) based on evidence strength
4. Explain your reasoning

Return JSON matching this schema:
{
  "labels": {
    "mainLabel": "Search products"
  },
  "placeholders": {
    "searchInput": "Search..."
  },
  "buttonText": "Search",
  "errorMessages": {
    "emptyQuery": "Please enter a search term",
    "noResults": "No results found"
  },
  "reasoning": "Matches concise, action-oriented tone observed across the site",
  "confidence": 0.75
}`;
}

/**
 * Helper: Formats tokens into compact prompt-friendly summary
 * Groups by category, shows value and occurrence count
 */
export function formatTokensForPrompt(designDNA: DesignDNA): string {
  const tokens = designDNA.tokens;
  const lines: string[] = [];

  // Colors - use standards for most stable colors
  if (tokens.colors.standards.length > 0) {
    lines.push('### Colors\n');
    tokens.colors.standards.forEach((colorResult, idx) => {
      lines.push(`- color-${idx + 1}: ${colorResult.token.canonical} (${colorResult.pageUrls.size} pages, confidence: ${colorResult.confidence.toFixed(2)})`);
    });
    lines.push('');
  }

  // Typography - use standards
  if (tokens.typography.standards.length > 0) {
    lines.push('### Typography\n');
    tokens.typography.standards.forEach((typeResult, idx) => {
      const token = typeResult.token;
      // Format as font-family, font-size, font-weight
      lines.push(`- font-family-${idx + 1}: ${token.family}`);
      const sizeValue = token.normalizedSize.pixels
        ? `${token.normalizedSize.pixels}px`
        : token.normalizedSize.original;
      lines.push(`- font-size-${idx + 1}: ${sizeValue} (${typeResult.pageUrls.size} pages)`);
      lines.push(`- font-weight-${idx + 1}: ${token.weight}`);
    });
    lines.push('');
  }

  // Spacing - use standards
  if (tokens.spacing.standards.length > 0) {
    lines.push('### Spacing\n');
    if (tokens.spacing.scale.baseUnit > 1) {
      lines.push(`Base unit: ${tokens.spacing.scale.baseUnit}px (${(tokens.spacing.scale.coverage * 100).toFixed(0)}% coverage)\n`);
    }
    tokens.spacing.standards.forEach((spaceResult, idx) => {
      const value = spaceResult.token.normalizedValue.pixels
        ? `${spaceResult.token.normalizedValue.pixels}px`
        : spaceResult.token.normalizedValue.original;
      lines.push(`- spacing-${idx + 1}: ${value} (${spaceResult.pageUrls.size} pages)`);
    });
    lines.push('');
  }

  // Border radius - use standards
  if (tokens.radii.standards.length > 0) {
    lines.push('### Border Radius\n');
    tokens.radii.standards.forEach((radiusResult, idx) => {
      lines.push(`- radius-${idx + 1}: ${radiusResult.token.value} (${radiusResult.pageUrls.size} pages)`);
    });
    lines.push('');
  }

  // Shadows - use standards
  if (tokens.shadows.standards.length > 0) {
    lines.push('### Shadows\n');
    tokens.shadows.standards.forEach((shadowResult, idx) => {
      lines.push(`- shadow-${idx + 1}: ${shadowResult.token.value} (${shadowResult.pageUrls.size} pages)`);
    });
    lines.push('');
  }

  return lines.join('\n') || 'No tokens extracted';
}

/**
 * Helper: Formats observed components into compact prompt-friendly summary
 * Shows type, variant count, confidence, key styles
 */
export function formatComponentsForPrompt(designDNA: DesignDNA): string {
  const components = designDNA.components;
  const lines: string[] = [];

  if (!components || components.length === 0) {
    return 'No components observed';
  }

  components.forEach(comp => {
    lines.push(`### ${comp.type}`);
    lines.push(`- Variants: ${comp.variants.length}`);
    lines.push(`- Pages: ${comp.pageUrls.size} pages`);

    if (comp.confidence) {
      const score = comp.confidence.value;
      const level = comp.confidence.level;
      lines.push(`- Confidence: ${score.toFixed(2)} (${level})`);
    }

    // Show canonical styles (first few key properties)
    if (comp.canonical?.styles) {
      const keyProps = ['backgroundColor', 'color', 'padding', 'borderRadius', 'fontSize'];
      const styles = keyProps
        .filter(prop => comp.canonical.styles[prop])
        .map(prop => `${prop}: ${comp.canonical.styles[prop]}`)
        .slice(0, 5);

      if (styles.length > 0) {
        lines.push(`- Styles: ${styles.join(', ')}`);
      }
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Helper: Extracts observed motion patterns from components
 */
function extractObservedMotion(designDNA: DesignDNA): string {
  const lines: string[] = [];
  const transitionsSeen = new Set<string>();

  designDNA.components.forEach(comp => {
    // Check state mapping for transitions
    if (comp.states) {
      const states = ['hover', 'focus', 'active'] as const;
      states.forEach(stateName => {
        const stateStyles = comp.states![stateName];
        if (stateStyles) {
          if (stateStyles.transition) {
            transitionsSeen.add(`${comp.type}: ${stateStyles.transition}`);
          }
          if (stateStyles.transitionDuration) {
            transitionsSeen.add(`${comp.type}: duration ${stateStyles.transitionDuration}`);
          }
          if (stateStyles.transitionTimingFunction) {
            transitionsSeen.add(`${comp.type}: easing ${stateStyles.transitionTimingFunction}`);
          }
        }
      });
    }
  });

  if (transitionsSeen.size > 0) {
    lines.push(...Array.from(transitionsSeen).map(t => `- ${t}`));
  } else {
    lines.push('- No motion patterns explicitly observed (use reasonable defaults: 200ms ease-in-out)');
  }

  return lines.join('\n');
}

/**
 * Helper: Extracts observed edge state patterns from components
 */
function extractObservedEdgeStates(designDNA: DesignDNA): string {
  const lines: string[] = [];
  const edgeStates = new Set<string>();

  designDNA.components.forEach(comp => {
    // Check state mapping for loading/error states
    if (comp.states) {
      if (comp.states.loading) {
        edgeStates.add(`${comp.type} loading: ${JSON.stringify(comp.states.loading)}`);
      }
      if (comp.states.error) {
        edgeStates.add(`${comp.type} error: ${JSON.stringify(comp.states.error)}`);
      }
    }
  });

  if (edgeStates.size > 0) {
    lines.push(...Array.from(edgeStates).map(s => `- ${s}`));
  } else {
    lines.push('- No explicit loading/error states observed (use standard patterns)');
  }

  return lines.join('\n');
}

/**
 * Helper: Extracts observed text patterns from components
 */
function extractObservedText(_designDNA: DesignDNA): string {
  const lines: string[] = [];

  // This is a simplified version - in practice we'd analyze button text,
  // placeholder text, error messages, etc. from the component variants
  lines.push('- Tone: Professional and concise');
  lines.push('- Style: Action-oriented verbs (Search, Submit, Cancel)');
  lines.push('- Error messages: Clear and specific');

  return lines.join('\n');
}
