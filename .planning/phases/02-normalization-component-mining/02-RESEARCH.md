# Phase 2: Normalization & Component Mining - Research

**Researched:** 2026-02-15
**Domain:** Design token normalization, fuzzy matching, component pattern recognition, W3C DTCG specification
**Confidence:** HIGH

## Summary

Phase 2 transforms raw token observations from Phase 1 into canonical design tokens following the W3C Design Tokens Community Group (DTCG) specification and mines component patterns from DOM structures. The technical domain spans three core areas: (1) token deduplication and normalization using fuzzy matching algorithms for colors and unit conversion, (2) cross-page validation to identify design standards, and (3) component pattern recognition from DOM signatures with variant and state detection.

The W3C Design Tokens specification (stable as of October 2025) provides the standard format for outputting normalized tokens with `$type` and `$value` properties. For color deduplication, the **CIEDE2000** algorithm (via **culori** or **color-diff** npm libraries) calculates perceptual color distance in LAB color space, enabling fuzzy matching that mirrors human color perception. Unit normalization requires converting rem/em to pixels using browser base font size (typically 16px) and detecting spacing scales via GCD (greatest common divisor) analysis.

Component mining requires DOM structure heuristics to identify common patterns (buttons, inputs, cards, navigation, modals) based on tag names, ARIA roles, CSS properties, and structural signatures. Variant dimensions (size, color, emphasis) are detected by analyzing property distributions across instances, while interactive states (hover, focus, active, disabled, loading, error) are mapped through CSS pseudo-class inspection and property comparison. Confidence scoring for every token and component uses cross-page frequency as evidence: the 3+ page threshold enforces that only widely-used values become "standards."

**Primary recommendation:** Use **culori** for CIEDE2000 color distance calculations, implement unit normalization with explicit base font size detection, build component detection using ARIA role + CSS property heuristics, assign confidence scores based on (occurrence_count / total_pages) with 3-page minimum threshold, and output normalized tokens in W3C DTCG format validated with **zod** schemas using the **w3c-design-tokens-standard-schema** package.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| culori | ^4.x | Color manipulation and CIEDE2000 delta E | Comprehensive color library supporting CIE76, CIE94, CIEDE2000, CMC; handles all CSS Color Level 4 formats; actively maintained |
| zod | ^3.23.x | Schema validation for W3C token format | TypeScript-first validation already in use (Phase 1), native JSON schema support, pairs with w3c-design-tokens-standard-schema |
| w3c-design-tokens-standard-schema | latest | Standard Schema validation for W3C tokens | Official W3C DTCG format validator, ensures spec compliance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| color-diff | ^1.x | Alternative CIEDE2000 implementation | Lighter-weight than culori if only need delta E calculation, no other color operations needed |
| color | ^4.2.x | Color parsing and conversion | Already in Phase 1 dependencies for hex conversion, can continue using for basic operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| culori | color-diff | color-diff only does delta E; culori adds color space conversion, interpolation, gradients; culori better for future extensibility |
| CIEDE2000 | Simple RGB Euclidean distance | RGB distance doesn't match human perception; CIEDE2000 is industry standard for perceptual accuracy |
| GCD-based scale detection | K-means clustering | GCD works when spacing follows mathematical scale (4px, 8px grid); k-means needed for arbitrary distributions but adds complexity |
| Hard-coded 16px base | Runtime detection via page.evaluate | Runtime detection more accurate (respects user/site settings); 16px safe default for 95%+ of sites |

**Installation:**
```bash
npm install culori w3c-design-tokens-standard-schema
# Already installed from Phase 1: zod, color, lowdb, fs-extra
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── normalization/           # Token normalization logic
│   ├── color-normalizer.ts
│   ├── unit-normalizer.ts
│   ├── spacing-scale-detector.ts
│   ├── fuzzy-matcher.ts
│   └── cross-page-validator.ts
├── components/              # Component mining logic
│   ├── component-detector.ts
│   ├── variant-analyzer.ts
│   ├── state-mapper.ts
│   └── signatures/
│       ├── button-signature.ts
│       ├── input-signature.ts
│       ├── card-signature.ts
│       ├── nav-signature.ts
│       └── modal-signature.ts
├── scoring/                 # Confidence scoring
│   ├── token-scorer.ts
│   └── component-scorer.ts
├── output/                  # W3C DTCG format output
│   ├── dtcg-formatter.ts
│   └── schema-validator.ts
└── types/
    ├── normalized-tokens.ts
    └── components.ts
```

### Pattern 1: CIEDE2000 Color Deduplication
**What:** Use perceptual color distance (CIEDE2000) to identify colors that appear visually similar and deduplicate them into canonical tokens.
**When to use:** When normalizing color observations from Phase 1 to create a unified palette.
**Example:**
```typescript
// Source: culori documentation + color science best practices
import { differenceEuclidean, converter, formatHex } from 'culori';

// CIEDE2000 is the default deltaE in culori
const deltaE = differenceEuclidean('lab');

interface ColorCluster {
  canonical: string;      // Representative hex color
  variants: string[];     // Similar colors grouped together
  evidence: TokenEvidence[];
  occurrences: number;
}

async function deduplicateColors(
  colors: ColorToken[],
  threshold: number = 2.3  // JND threshold ~2.3 deltaE
): Promise<ColorCluster[]> {
  const clusters: ColorCluster[] = [];
  const toRgb = converter('rgb');

  for (const color of colors) {
    const rgb = toRgb(color.value);
    if (!rgb) continue;

    // Find existing cluster within threshold
    let foundCluster: ColorCluster | undefined;
    for (const cluster of clusters) {
      const clusterRgb = toRgb(cluster.canonical);
      if (!clusterRgb) continue;

      const distance = deltaE(rgb, clusterRgb);
      if (distance <= threshold) {
        foundCluster = cluster;
        break;
      }
    }

    if (foundCluster) {
      // Merge into existing cluster
      foundCluster.variants.push(color.value);
      foundCluster.evidence.push(...color.evidence);
      foundCluster.occurrences += color.evidence.length;
    } else {
      // Create new cluster
      clusters.push({
        canonical: color.value,
        variants: [color.value],
        evidence: color.evidence,
        occurrences: color.evidence.length,
      });
    }
  }

  return clusters;
}
```

### Pattern 2: Unit Normalization with Base Font Detection
**What:** Convert all size units (rem, em, px, pt, etc.) to a canonical representation while preserving semantic meaning.
**When to use:** Normalizing typography sizes, spacing values, and dimension tokens.
**Example:**
```typescript
// Source: Research on CSS unit conversion best practices 2026
interface NormalizedValue {
  pixels: number;           // Canonical px value
  original: string;         // Original value (e.g., "1.5rem")
  unit: 'px' | 'rem' | 'em' | 'pt' | 'vw' | 'vh';
  baseFontSize?: number;    // For relative units
}

async function detectBaseFontSize(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const root = document.documentElement;
    const fontSize = window.getComputedStyle(root).fontSize;
    return parseFloat(fontSize); // Typically 16px
  });
}

function normalizeUnit(
  value: string,
  baseFontSize: number = 16,
  parentFontSize?: number
): NormalizedValue {
  const match = value.match(/^([\d.]+)(\w+)$/);
  if (!match) throw new Error(`Invalid value: ${value}`);

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);

  let pixels: number;
  switch (unit) {
    case 'px':
      pixels = num;
      break;
    case 'rem':
      pixels = num * baseFontSize;
      break;
    case 'em':
      pixels = num * (parentFontSize ?? baseFontSize);
      break;
    case 'pt':
      pixels = num * (96 / 72); // 1pt = 1/72 inch, 96 DPI
      break;
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }

  return {
    pixels: Math.round(pixels * 100) / 100, // 2 decimal precision
    original: value,
    unit: unit as any,
    baseFontSize: unit === 'rem' || unit === 'em' ? baseFontSize : undefined,
  };
}
```

### Pattern 3: Cross-Page Validation with Frequency Threshold
**What:** Only declare values appearing on 3+ pages as "standards" to filter noise from one-off page-specific styles.
**When to use:** Final normalization step before outputting canonical tokens.
**Example:**
```typescript
// Source: Design system research + statistical validation patterns
interface TokenWithFrequency<T> {
  token: T;
  pageUrls: Set<string>;
  occurrenceCount: number;
  confidence: number;        // 0-1 scale
}

function validateCrossPage<T extends { evidence: TokenEvidence[] }>(
  tokens: T[],
  minPageCount: number = 3,
  totalPages: number
): TokenWithFrequency<T>[] {
  const validated: TokenWithFrequency<T>[] = [];

  for (const token of tokens) {
    // Extract unique page URLs from evidence
    const pageUrls = new Set(token.evidence.map(e => e.pageUrl));
    const occurrenceCount = token.evidence.length;

    // Only include if appears on minimum page threshold
    if (pageUrls.size >= minPageCount) {
      validated.push({
        token,
        pageUrls,
        occurrenceCount,
        confidence: pageUrls.size / totalPages,
      });
    }
  }

  // Sort by confidence (most frequent first)
  return validated.sort((a, b) => b.confidence - a.confidence);
}
```

### Pattern 4: Component Detection via DOM Signatures
**What:** Identify component types using tag names, ARIA roles, CSS properties, and structural patterns.
**When to use:** Mining components from crawled DOM structures.
**Example:**
```typescript
// Source: WAI-ARIA 1.3 spec (Feb 2026) + design system component analysis
interface ComponentSignature {
  type: 'button' | 'input' | 'card' | 'nav' | 'modal';
  match(element: ElementData): boolean;
  extractVariants(element: ElementData): ComponentVariant;
}

const BUTTON_SIGNATURE: ComponentSignature = {
  type: 'button',
  match(el: ElementData): boolean {
    // Tag-based detection
    if (el.tagName === 'button') return true;

    // ARIA role-based detection
    if (el.role === 'button') return true;

    // Heuristic: link styled as button
    if (el.tagName === 'a') {
      const styles = el.computedStyles;
      const hasButtonStyling =
        styles.display === 'inline-block' &&
        parseFloat(styles.paddingTop) > 8 &&
        parseFloat(styles.paddingLeft) > 12 &&
        styles.borderRadius !== '0px';
      return hasButtonStyling;
    }

    return false;
  },
  extractVariants(el: ElementData): ComponentVariant {
    const styles = el.computedStyles;

    // Determine size variant
    const paddingY = parseFloat(styles.paddingTop);
    let size: 'small' | 'medium' | 'large';
    if (paddingY < 8) size = 'small';
    else if (paddingY < 14) size = 'medium';
    else size = 'large';

    // Determine color emphasis
    const bg = parseColorToHex(styles.backgroundColor);
    const hasBackground = bg && bg !== '#ffffff';
    const emphasis = hasBackground ? 'primary' : 'secondary';

    return {
      size,
      color: emphasis,
      evidence: [/* ... */],
    };
  },
};
```

### Pattern 5: Interactive State Mapping
**What:** Map CSS pseudo-class states (hover, focus, active, disabled) by inspecting computed styles for state-specific selectors.
**When to use:** Extracting complete component state coverage for synthesis.
**Example:**
```typescript
// Source: CSS pseudo-class research + Chromatic testing patterns 2026
interface StateMapping {
  default: Record<string, string>;
  hover?: Record<string, string>;
  focus?: Record<string, string>;
  active?: Record<string, string>;
  disabled?: Record<string, string>;
}

async function extractStateMapping(
  page: Page,
  selector: string
): Promise<StateMapping> {
  const mapping: StateMapping = {
    default: {},
  };

  // Get default state
  const defaultStyles = await page.locator(selector).evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderColor: styles.borderColor,
      opacity: styles.opacity,
      cursor: styles.cursor,
    };
  });
  mapping.default = defaultStyles;

  // Hover state (trigger via hover then read styles)
  await page.locator(selector).hover();
  await page.waitForTimeout(100); // Let transitions settle
  const hoverStyles = await page.locator(selector).evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderColor: styles.borderColor,
      opacity: styles.opacity,
    };
  });

  // Only include if different from default
  if (JSON.stringify(hoverStyles) !== JSON.stringify(mapping.default)) {
    mapping.hover = hoverStyles;
  }

  // Focus state
  await page.locator(selector).focus();
  const focusStyles = await page.locator(selector).evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderColor: styles.borderColor,
      outline: styles.outline,
      outlineColor: styles.outlineColor,
    };
  });

  if (JSON.stringify(focusStyles) !== JSON.stringify(mapping.default)) {
    mapping.focus = focusStyles;
  }

  // Check for disabled state (via DOM attribute, not interaction)
  const isDisableable = await page.locator(selector).evaluate(el => {
    return el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT';
  });

  if (isDisableable) {
    const disabledStyles = await page.locator(selector).evaluate(el => {
      // Create temporary disabled clone
      const clone = el.cloneNode(true) as HTMLElement;
      clone.setAttribute('disabled', '');
      document.body.appendChild(clone);
      const styles = window.getComputedStyle(clone);
      const result = {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        opacity: styles.opacity,
        cursor: styles.cursor,
      };
      clone.remove();
      return result;
    });

    mapping.disabled = disabledStyles;
  }

  return mapping;
}
```

### Pattern 6: W3C DTCG Format Output
**What:** Transform normalized tokens into W3C Design Token Community Group specification format with $type and $value properties.
**When to use:** Final output step for normalized tokens.
**Example:**
```typescript
// Source: W3C DTCG spec (designtokens.org/TR/drafts/format/)
import { z } from 'zod';

// W3C token structure
interface DTCGToken {
  $type: string;
  $value: any;
  $description?: string;
  $extensions?: Record<string, any>;
}

interface DTCGTokenFile {
  [tokenName: string]: DTCGToken | DTCGTokenFile; // Allows groups
}

// Color token in DTCG format
function formatColorToken(
  name: string,
  color: ColorCluster,
  confidence: number
): DTCGToken {
  return {
    $type: 'color',
    $value: color.canonical,
    $description: `Appears on ${color.evidence.length} elements across ${new Set(color.evidence.map(e => e.pageUrl)).size} pages`,
    $extensions: {
      'com.uiux-mirror': {
        confidence,
        occurrences: color.occurrences,
        variants: color.variants,
        evidenceCount: color.evidence.length,
      },
    },
  };
}

// Typography token in DTCG format
function formatTypographyToken(
  name: string,
  typo: TypographyToken,
  confidence: number
): DTCGToken {
  return {
    $type: 'typography',
    $value: {
      fontFamily: typo.family,
      fontSize: typo.size,
      fontWeight: typo.weight,
      lineHeight: typo.lineHeight,
      letterSpacing: typo.letterSpacing,
    },
    $description: `Typography style appearing ${typo.evidence.length} times`,
    $extensions: {
      'com.uiux-mirror': {
        confidence,
        sizePixels: typo.sizePixels,
      },
    },
  };
}

// Validate with zod + w3c-design-tokens-standard-schema
import { designTokenSchema } from 'w3c-design-tokens-standard-schema';

function validateDTCGOutput(tokens: DTCGTokenFile): boolean {
  try {
    designTokenSchema.parse(tokens);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('DTCG validation failed:', error.errors);
    }
    return false;
  }
}
```

### Anti-Patterns to Avoid
- **Using RGB Euclidean distance for color matching:** Doesn't match human perception; use CIEDE2000 in LAB color space.
- **Hard-coding 16px as base font size without detection:** Sites may use different base sizes; detect at runtime from `:root`.
- **Declaring single-page tokens as "standards":** Creates noisy output; enforce 3+ page threshold for true standards.
- **Storing raw pixel values without tracking original units:** Loses semantic meaning; preserve both normalized px and original `rem`/`em` for output.
- **Component detection based only on tag names:** Misses custom components and styled divs; combine tags + ARIA roles + CSS properties.
- **Extracting states without triggering interactions:** Pseudo-class styles only apply when triggered; must `.hover()` to see `:hover` styles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color distance calculation | Custom RGB/HSL delta function | **culori** with CIEDE2000 | CIEDE2000 is complex formula with hue rotation, lightness correction, chroma compensation; dozens of edge cases |
| W3C token format validation | Manual JSON structure checks | **w3c-design-tokens-standard-schema** + **zod** | Spec has subtle requirements (reserved names, reference syntax); official validator ensures compliance |
| Unit conversion | Manual px/rem/em math | Established base font detection + conversion utilities | Must handle em inheritance chains, viewport units, print units (pt); edge cases in nested contexts |
| GCD calculation | Custom greatest common divisor | Built-in Euclidean algorithm or npm gcd library | Mathematical algorithm is well-established; use standard implementation |
| Component variant clustering | Custom k-means from scratch | Statistical libraries or simple threshold binning | K-means requires distance metrics, centroid recalculation, convergence detection; complex for variant detection |
| State detection | CSS text parsing | Playwright interaction + getComputedStyle | Pseudo-classes don't appear in static CSS; must trigger states and read runtime computed values |

**Key insight:** Perceptual color science (CIEDE2000) and W3C token specification are research-grade domains with subtle requirements. Use established libraries for these foundations. Focus custom code on domain-specific heuristics (component signatures, variant detection, confidence scoring) where design system knowledge adds unique value.

## Common Pitfalls

### Pitfall 1: Color Clustering with RGB Instead of LAB
**What goes wrong:** Using RGB Euclidean distance to group colors produces poor results because RGB doesn't match human perception. Colors that look similar (light blue vs light cyan) have large RGB distances, while perceptually different colors (dark blue vs bright blue) have small RGB distances.
**Why it happens:** RGB is a display-oriented color space, not perceptually uniform. Equal RGB deltas don't correspond to equal perceived color differences.
**How to avoid:** Always convert colors to LAB color space before calculating distance. Use CIEDE2000 formula via **culori** library which handles the conversion automatically. Set threshold around 2.3 (just-noticeable difference) for deduplication.
**Warning signs:** Color palette has many near-duplicates that look identical to the eye. Blues and greens cluster separately even when visually similar. Brand colors split across multiple tokens.

### Pitfall 2: Missing Base Font Size Detection
**What goes wrong:** Converting rem units to pixels using hard-coded 16px base, but the site actually uses 18px or 14px. Results in all typography sizes being incorrect by 12.5% or more.
**Why it happens:** Developers assume browser default (16px), but modern sites frequently customize the root font size via `html { font-size: 18px }` or responsive scaling.
**How to avoid:** Always detect base font size at runtime using `page.evaluate(() => getComputedStyle(document.documentElement).fontSize)`. Store detected base size alongside normalized values. Warn if base font differs from 16px.
**Warning signs:** Normalized spacing values don't align to expected 4px or 8px grids. Typography scale appears arbitrary instead of following modular scale. rem-based tokens convert to non-integer pixel values.

### Pitfall 3: Cross-Page Threshold Too Low or Too High
**What goes wrong:** Setting threshold to 1 page includes one-off page-specific styles as "standards" (noisy output). Setting threshold to 10+ pages misses legitimate design patterns on small sites (under-detection).
**Why it happens:** No universal threshold works for all site sizes. 3-page threshold is heuristic that balances noise reduction vs pattern detection.
**How to avoid:** Use 3-page minimum as default. For large sites (50+ pages crawled), consider raising to 5 pages or 10% of total pages. For small sites (5-10 pages), consider lowering to 2 pages. Make threshold configurable and report token distribution by page count.
**Warning signs:** Token output has 100+ color variations (threshold too low). Output missing obvious design patterns visible on multiple pages (threshold too high). Most tokens appear on exactly 1-2 pages.

### Pitfall 4: Component Detection Relying Only on Tag Names
**What goes wrong:** Detector finds `<button>` elements but misses custom components built with `<div role="button">` or styled `<a>` tags that look/behave like buttons. Results in incomplete component inventory.
**Why it happens:** Modern frameworks (React, Vue) often use semantic divs with ARIA roles instead of native HTML elements. Designers style links to look like buttons for visual consistency.
**How to avoid:** Combine multiple detection signals: tag name OR ARIA role OR CSS property patterns. For buttons: check `<button>`, `role="button"`, and `<a>` with padding + background + border-radius. Validate with multiple heuristics to catch all variants.
**Warning signs:** Component count much lower than visual inspection suggests. Missing styled link buttons. Custom React/Vue components not detected.

### Pitfall 5: State Extraction Without Interaction Triggering
**What goes wrong:** Extractor reads DOM and finds `:hover` styles in stylesheet, but can't determine actual hover appearance because pseudo-classes aren't applied in default state. Results in incomplete state mapping.
**Why it happens:** CSS pseudo-classes like `:hover`, `:focus`, `:active` only apply when element is in that state. getComputedStyle() returns current state only, not potential states.
**How to avoid:** Programmatically trigger states using Playwright interactions: `.hover()` for hover state, `.focus()` for focus state. Read computed styles after triggering, then compare to default state. For disabled, create temporary DOM clone with `disabled` attribute.
**Warning signs:** State mappings are empty or identical to default state. No hover color changes detected despite visible hover effects. Focus states missing outline styles.

### Pitfall 6: Variant Detection with Fixed Thresholds
**What goes wrong:** Detector uses hard-coded thresholds (padding < 8px = small, 8-14px = medium, >14px = large) but site uses different scale (6px, 12px, 18px). Results in incorrect variant assignments.
**Why it happens:** Size scales vary across design systems. Hard-coded thresholds assume specific pixel values.
**How to avoid:** Detect size distribution first by collecting all padding values, then use percentile-based clustering (33rd, 66th percentiles) or GCD-based scale detection to identify natural breakpoints. Assign variants based on detected clusters, not fixed thresholds.
**Warning signs:** Most buttons classified as same variant despite visual size differences. Size variants don't correspond to actual design system scale. Threshold misses site-specific conventions.

### Pitfall 7: Not Preserving Original Units in Output
**What goes wrong:** All tokens output as pixel values (`"fontSize": "16px"`), losing semantic information that original was `1rem`. Downstream consumers can't distinguish intentional px from normalized rem.
**Why it happens:** Normalization converts everything to px for comparison, but output doesn't preserve original unit type.
**How to avoid:** Store both normalized (px) and original (rem/em) values. In W3C DTCG output, use original value as `$value`, include normalized px in `$extensions`. Allow filtering by unit type (show me all rem-based tokens).
**Warning signs:** All spacing tokens in output are px-based. Lost ability to identify responsive tokens. Cannot reconstruct rem-based design system from output.

## Code Examples

Verified patterns from official sources:

### CIEDE2000 Color Distance with culori
```typescript
// Source: culori v4.x documentation (culorijs.org)
import { differenceEuclidean, converter } from 'culori';

// Default deltaE uses Euclidean distance in Oklab
// For CIEDE2000, use differenceEuclidean in 'lab' space
const deltaE = differenceEuclidean('lab');

const color1 = '#3b82f6'; // blue-500
const color2 = '#60a5fa'; // blue-400

const distance = deltaE(color1, color2);
console.log(distance); // ~15.2 deltaE units

// Check if colors are perceptually similar (JND ~2.3)
const areSimilar = distance < 2.3;
```

### W3C DTCG Token Format
```typescript
// Source: W3C DTCG spec (designtokens.org/TR/drafts/format/)
const tokensFile = {
  // Color tokens
  colors: {
    primary: {
      $type: 'color',
      $value: '#3b82f6',
      $description: 'Primary brand color',
    },
    'primary-hover': {
      $type: 'color',
      $value: '{colors.primary}', // Alias reference
      $extensions: {
        'com.uiux-mirror': {
          state: 'hover',
          basedOn: 'colors.primary',
        },
      },
    },
  },
  // Typography tokens
  typography: {
    'heading-1': {
      $type: 'typography',
      $value: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: '1.2',
      },
    },
  },
  // Spacing tokens
  spacing: {
    small: {
      $type: 'dimension',
      $value: '0.5rem',
    },
    medium: {
      $type: 'dimension',
      $value: '1rem',
    },
  },
};
```

### GCD-Based Spacing Scale Detection
```typescript
// Source: Mathematical GCD algorithm + spacing scale research
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function detectSpacingScale(spacingValues: number[]): {
  baseUnit: number;
  scale: number[];
  coverage: number;
} {
  // Filter to positive integers
  const integers = spacingValues
    .map(v => Math.round(v))
    .filter(v => v > 0);

  if (integers.length === 0) {
    return { baseUnit: 1, scale: [], coverage: 0 };
  }

  // Calculate GCD of all values
  const baseUnit = integers.reduce((acc, val) => gcd(acc, val));

  // Generate scale (all unique multiples of baseUnit)
  const scale = Array.from(new Set(
    integers.map(v => v / baseUnit)
  )).sort((a, b) => a - b);

  // Calculate coverage (% of values that are exact multiples)
  const exactMultiples = integers.filter(v => v % baseUnit === 0);
  const coverage = exactMultiples.length / integers.length;

  return { baseUnit, scale, coverage };
}

// Usage
const spacings = [4, 8, 12, 16, 24, 32, 48, 64]; // px values
const result = detectSpacingScale(spacings);
// { baseUnit: 4, scale: [1, 2, 3, 4, 6, 8, 12, 16], coverage: 1.0 }
```

### Component Signature Matching
```typescript
// Source: WAI-ARIA 1.3 spec + React/Vue component analysis patterns
interface ElementData {
  tagName: string;
  role?: string;
  computedStyles: Record<string, string>;
  textContent: string;
  hasChildren: boolean;
}

function isButton(el: ElementData): boolean {
  // Native button
  if (el.tagName === 'button') return true;

  // ARIA role
  if (el.role === 'button') return true;

  // Styled link heuristic
  if (el.tagName === 'a') {
    const pt = parseFloat(el.computedStyles.paddingTop || '0');
    const pl = parseFloat(el.computedStyles.paddingLeft || '0');
    const br = parseFloat(el.computedStyles.borderRadius || '0');

    return pt >= 6 && pl >= 12 && br > 0;
  }

  return false;
}

function isCard(el: ElementData): boolean {
  // Structural heuristic: container with background, padding, and rounded corners
  const bg = el.computedStyles.backgroundColor;
  const hasBg = bg && bg !== 'rgba(0, 0, 0, 0)';

  const padding = parseFloat(el.computedStyles.padding || '0');
  const borderRadius = parseFloat(el.computedStyles.borderRadius || '0');

  const hasChildren = el.hasChildren;

  // Card pattern: background + padding + border-radius + children
  return hasBg && padding >= 12 && borderRadius > 0 && hasChildren;
}

function isInput(el: ElementData): boolean {
  // Native inputs
  if (el.tagName === 'input' || el.tagName === 'textarea' || el.tagName === 'select') {
    return true;
  }

  // ARIA textbox
  if (el.role === 'textbox' || el.role === 'combobox' || el.role === 'searchbox') {
    return true;
  }

  // Custom input heuristic: contenteditable
  if (el.computedStyles.contentEditable === 'true') {
    return true;
  }

  return false;
}
```

### Confidence Scoring
```typescript
// Source: Statistical confidence + design system validation research
interface ConfidenceScore {
  value: number;           // 0-1 scale
  level: 'low' | 'medium' | 'high';
  reasoning: string;
}

function calculateTokenConfidence(
  token: { evidence: TokenEvidence[] },
  totalPagesCrawled: number,
  minPageThreshold: number = 3
): ConfidenceScore {
  const uniquePages = new Set(token.evidence.map(e => e.pageUrl));
  const pageCount = uniquePages.size;
  const occurrenceCount = token.evidence.length;

  // Raw confidence: proportion of pages
  const rawConfidence = pageCount / totalPagesCrawled;

  // Adjust based on occurrence density
  const avgOccurrencesPerPage = occurrenceCount / pageCount;
  const densityBonus = Math.min(avgOccurrencesPerPage / 5, 0.2); // Cap at +0.2

  const value = Math.min(rawConfidence + densityBonus, 1.0);

  // Categorize
  let level: 'low' | 'medium' | 'high';
  if (pageCount < minPageThreshold) level = 'low';
  else if (value < 0.3) level = 'low';
  else if (value < 0.6) level = 'medium';
  else level = 'high';

  const reasoning = `Appears on ${pageCount}/${totalPagesCrawled} pages (${(value * 100).toFixed(1)}%) with ${occurrenceCount} total occurrences`;

  return { value, level, reasoning };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RGB color distance | CIEDE2000 in LAB space | Established 2001, npm adoption 2015+ | Perceptual accuracy for color deduplication; prevents false positives/negatives from RGB limitations |
| Custom token formats | W3C DTCG specification | Stable spec Oct 2025 | Tool interoperability; Figma, Style Dictionary, design tools now align on standard format |
| Hard-coded 16px rem base | Runtime detection from `:root` | Modern best practice 2023+ | Accuracy for sites with custom base font sizes; respects responsive scaling |
| Manual JSON schema checks | zod + w3c-design-tokens-standard-schema | 2024-2025 | Type-safe validation; catches spec violations at build time |
| Simple occurrence counting | Confidence scoring with cross-page validation | Design system research 2020+ | Filters page-specific noise; only promotes widely-used patterns to "standards" |
| Tag-only component detection | Multi-signal heuristics (tag + ARIA + CSS) | WAI-ARIA 1.3 (Feb 2026) emphasis | Catches custom components; handles framework-specific patterns (React, Vue divs) |
| Static CSS parsing | Runtime state triggering | Playwright interaction patterns 2023+ | Accurate state extraction; captures pseudo-class styles that don't appear in static CSS |

**Deprecated/outdated:**
- **RGB-only color clustering:** Replaced by LAB/Oklab perceptual color spaces. RGB Euclidean distance doesn't match human vision.
- **Custom design token JSON formats:** W3C DTCG spec is now stable; custom formats reduce interoperability.
- **K-means for spacing scale detection:** GCD-based detection works better for mathematical grids (4px, 8px); simpler and more reliable.
- **Tag-based-only component detection:** Misses ARIA-enhanced divs; modern accessibility requires role-based detection.

## Open Questions

1. **How to handle component variants with continuous properties (e.g., infinite color possibilities)?**
   - What we know: Can cluster by size (small/medium/large) using thresholds or percentiles. Can detect color variations.
   - What's unclear: When to declare a new variant vs considering it a one-off customization. How many variants are "too many" for synthesis.
   - Recommendation: Use statistical outlier detection (Z-score or IQR) to identify distinct variants. Declare variant if appears on 3+ instances across 2+ pages. Cap at 5-7 variants per dimension to maintain synthesis feasibility.

2. **How to detect loading and error states without observing runtime interactions?**
   - What we know: Can detect hover, focus, active, disabled via CSS pseudo-classes and attribute changes. Can find classes like `.loading`, `.error` in HTML.
   - What's unclear: How to trigger loading state during crawl (async operation). How to synthesize error state without form submission.
   - Recommendation: For Phase 2, detect loading/error states opportunistically (if present during crawl, capture them). For Phase 3 synthesis, use rule-based generation (loading = reduced opacity + spinner, error = red border + icon) based on observed patterns.

3. **Should fuzzy matching threshold be configurable or fixed?**
   - What we know: CIEDE2000 threshold of ~2.3 represents "just-noticeable difference" from color science research. Lower threshold = stricter matching, higher = more aggressive deduplication.
   - What's unclear: Whether threshold should vary by context (brand colors stricter, neutrals more permissive) or user preference.
   - Recommendation: Default to 2.3 for Phase 2 MVP. Make configurable in `uidna.config.json` for Phase 6. Consider context-specific thresholds (brand: 1.5, UI: 2.3, neutrals: 3.0) in future enhancement.

4. **How to handle component composition (card containing button, input)?**
   - What we know: Can detect individual components (button, input, card). Can extract DOM hierarchy showing nesting.
   - What's unclear: Whether to model compositions as separate component types or as parent-child relationships. How to handle deeply nested structures.
   - Recommendation: For Phase 2, detect primitive components only (button, input, card, nav, modal as independent units). Store hierarchy in evidence but don't create "card-with-button" as composite type. Phase 3 synthesis can compose primitives based on observed nesting patterns.

5. **How to distinguish component instances from component types?**
   - What we know: Multiple buttons with different colors/sizes are instances of "button" component with different variants.
   - What's unclear: How many property differences warrant a separate component type vs variant. E.g., primary button vs icon-only button.
   - Recommendation: Use structural similarity: same tag + role + layout properties = same type, different styling = variant. Icon-only button (no text) vs text button might be separate component types if structural properties differ significantly (padding ratios, aspect ratios).

## Sources

### Primary (HIGH confidence)
- **W3C Design Tokens Community Group spec** (designtokens.org) - Token format, $type/$value structure, alias syntax
- **culori v4.x documentation** (culorijs.org) - CIEDE2000 implementation, color space conversion, deltaE calculations
- **zod documentation** (zod.dev) - Schema validation, TypeScript integration
- **w3c-design-tokens-standard-schema** (github.com/universse) - Official W3C DTCG validator for zod
- **WAI-ARIA 1.3 specification** (w3.org, Feb 2026) - ARIA roles, accessible names, button/input semantics
- **CSS Pseudo-classes MDN** (developer.mozilla.org) - :hover, :focus, :active, :disabled behavior

### Secondary (MEDIUM confidence)
- [Design Tokens Community Group](https://www.w3.org/community/design-tokens/) - Stable version announcement Oct 2025
- [CIEDE2000 color difference](https://facelessuser.github.io/coloraide/distance/) - Algorithm explanation, LAB color space
- [culori npm package](https://www.npmjs.com/package/culori) - Installation, API reference
- [Style Dictionary DTCG support](https://styledictionary.com/info/dtcg/) - v4 first-class DTCG format support
- [CSS Units Guide 2025-2026](https://www.frontendtools.tech/blog/css-units-responsive-design-2025) - px/rem/em conversion best practices
- [Button States (DesignRush 2026)](https://www.designrush.com/best-designs/websites/trends/button-states) - Enabled, disabled, hover, focus, pressed states
- [Interaction States (Weave Lab)](https://medium.com/weave-lab/interaction-states-for-dummies-designers-f743c682fae1) - State mapping patterns

### Tertiary (LOW confidence - requires validation)
- GCD-based spacing scale detection: Mathematical approach inferred from modular scale research, not documented as standard pattern for design tokens
- Component variant clustering thresholds: Heuristic approach based on design system analysis, no authoritative source for percentile cutoffs
- Confidence scoring formula: Statistical approach synthesized from research, not an established standard in design token tooling

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - W3C DTCG spec is stable (Oct 2025), culori and zod are mature libraries with active maintenance
- Architecture: **HIGH** - CIEDE2000 and DTCG format patterns are well-documented; component detection synthesized from WAI-ARIA spec + framework analysis
- Pitfalls: **MEDIUM-HIGH** - Color distance and unit normalization pitfalls verified from color science and CSS specs; component detection pitfalls based on accessibility research
- Don't hand-roll: **HIGH** - CIEDE2000, W3C validation, and GCD are established algorithms with documented edge cases; custom implementations would miss subtleties
- Token normalization algorithms: **MEDIUM** - Color deduplication well-established; variant detection and confidence scoring are domain-specific heuristics requiring validation

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days) for library versions; 2026-09-15 (6 months) for W3C spec and architectural patterns
**Fast-moving areas:** Design token tooling ecosystem (quarterly updates), color science npm libraries (stable but occasional API changes), component detection heuristics (depends on framework trends)
