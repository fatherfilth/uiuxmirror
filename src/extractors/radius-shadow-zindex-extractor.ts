/**
 * Extractors for border radius, box shadow, and z-index tokens (TOKEN-05)
 *
 * Key features:
 * - Border radius detection with shorthand parsing
 * - Multi-layer box shadow parsing
 * - Z-index extraction with stacking context awareness
 */

import type { Page } from 'playwright';
import type { RadiusToken, ShadowToken, ZIndexToken, ShadowLayer } from '../types/index.js';
import { getAllVisibleElements, parseSizeToPixels } from './shared/index.js';

/**
 * Extract border radius tokens from a page
 * Returns sorted by valuePixels ascending (reveals the radius scale)
 */
export async function extractRadii(page: Page, pageUrl: string): Promise<RadiusToken[]> {
  try {
  const elements = await getAllVisibleElements(page);
  const radiusMap = new Map<number, RadiusToken>();
  const timestamp = new Date().toISOString();

  for (const element of elements) {
    const borderRadius = element.computedStyles.borderRadius;

    if (!borderRadius || borderRadius === '0px') {
      continue;
    }

    // Parse borderRadius - may be shorthand like "8px" or "8px 4px 8px 4px"
    const values = borderRadius.split(/\s+/);
    const pixelValues = values
      .map(v => parseSizeToPixels(v))
      .filter((v): v is number => v !== null);

    if (pixelValues.length === 0) {
      continue;
    }

    // Use the largest value as the representative radius
    const maxRadius = Math.max(...pixelValues);

    // Deduplicate by valuePixels
    if (!radiusMap.has(maxRadius)) {
      radiusMap.set(maxRadius, {
        value: borderRadius,
        valuePixels: maxRadius,
        evidence: [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: {
            borderRadius,
          },
        }],
      });
    } else {
      // Add evidence to existing token
      radiusMap.get(maxRadius)!.evidence.push({
        pageUrl,
        selector: element.selector,
        timestamp,
        computedStyles: {
          borderRadius,
        },
      });
    }
  }

  // Return sorted by valuePixels ascending
  return Array.from(radiusMap.values()).sort((a, b) => a.valuePixels - b.valuePixels);
  } catch (error) { return []; }
}

/**
 * Extract box shadow tokens from a page
 * Parses multi-layer shadows into structured components
 */
export async function extractShadows(page: Page, pageUrl: string): Promise<ShadowToken[]> {
  try {
  const elements = await getAllVisibleElements(page);
  const shadowMap = new Map<string, ShadowToken>();
  const timestamp = new Date().toISOString();

  for (const element of elements) {
    const boxShadow = element.computedStyles.boxShadow;

    if (!boxShadow || boxShadow === 'none') {
      continue;
    }

    // Parse box-shadow into layers
    const layers = parseShadowLayers(boxShadow);

    if (layers.length === 0) {
      continue;
    }

    // Deduplicate by value string (exact match)
    if (!shadowMap.has(boxShadow)) {
      shadowMap.set(boxShadow, {
        value: boxShadow,
        layers,
        evidence: [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: {
            boxShadow,
          },
        }],
      });
    } else {
      // Add evidence to existing token
      shadowMap.get(boxShadow)!.evidence.push({
        pageUrl,
        selector: element.selector,
        timestamp,
        computedStyles: {
          boxShadow,
        },
      });
    }
  }

  return Array.from(shadowMap.values());
  } catch (error) { return []; }
}

/**
 * Parse box-shadow string into structured layers
 * Format: [inset] offsetX offsetY [blur] [spread] color
 * Multiple layers separated by commas
 */
function parseShadowLayers(boxShadow: string): ShadowLayer[] {
  const layers: ShadowLayer[] = [];

  // Split by commas (but not within color functions)
  const layerStrings = boxShadow.split(/,(?![^(]*\))/);

  for (const layerStr of layerStrings) {
    const trimmed = layerStr.trim();

    // Check for inset
    const inset = trimmed.startsWith('inset');
    const withoutInset = inset ? trimmed.replace(/^inset\s+/, '') : trimmed;

    // Match pattern: offsetX offsetY [blur] [spread] color
    // Color can be: rgb(), rgba(), hsl(), hsla(), hex, or named
    const colorPattern = /(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]+|\w+)$/i;
    const colorMatch = withoutInset.match(colorPattern);

    if (!colorMatch) {
      continue; // Skip if no color found
    }

    const color = colorMatch[1];
    const withoutColor = withoutInset.replace(colorPattern, '').trim();

    // Split remaining parts (offsetX, offsetY, blur, spread)
    const parts = withoutColor.split(/\s+/).filter(p => p);

    // Need at least offsetX and offsetY
    if (parts.length < 2) {
      continue;
    }

    layers.push({
      offsetX: parts[0] || '0px',
      offsetY: parts[1] || '0px',
      blur: parts[2] || '0px',
      spread: parts[3] || '0px',
      color,
      inset,
    });
  }

  return layers;
}

/**
 * Extract z-index tokens from a page with stacking context awareness
 * Returns sorted by value ascending
 */
export async function extractZIndexes(page: Page, pageUrl: string): Promise<ZIndexToken[]> {
  try {
  const elements = await getAllVisibleElements(page);
  const zIndexMap = new Map<string, ZIndexToken>();
  const timestamp = new Date().toISOString();

  for (const element of elements) {
    const zIndex = element.computedStyles.zIndex;

    if (!zIndex || zIndex === 'auto') {
      continue;
    }

    // Parse z-index to number
    const zIndexValue = parseInt(zIndex, 10);
    if (isNaN(zIndexValue)) {
      continue;
    }

    // Determine stacking context
    // For v1, use simplified approach: check if element appears to be a global vs local context
    // Global = top-level positioned elements (direct children of body/root-level containers)
    // Local = nested positioned elements
    // We use selector depth as a heuristic: > 2 levels deep = local
    const selectorDepth = element.selector.split('>').length;
    const stackingContext = selectorDepth <= 2 ? 'global' : `local:${element.selector.split('>').slice(0, -1).join('>').trim()}`;

    // Create unique key: value + stacking context
    const key = `${zIndexValue}:${stackingContext}`;

    if (!zIndexMap.has(key)) {
      zIndexMap.set(key, {
        value: zIndexValue,
        stackingContext,
        evidence: [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: {
            zIndex,
          },
        }],
      });
    } else {
      // Add evidence to existing token
      zIndexMap.get(key)!.evidence.push({
        pageUrl,
        selector: element.selector,
        timestamp,
        computedStyles: {
          zIndex,
        },
      });
    }
  }

  // Sort by value ascending
  const tokens = Array.from(zIndexMap.values()).sort((a, b) => a.value - b.value);

  // Warn if too many unique z-index values (indicates z-index mess)
  const uniqueValues = new Set(tokens.map(t => t.value));
  if (uniqueValues.size > 20) {
    console.warn(`[extractZIndexes] Found ${uniqueValues.size} unique z-index values - this may indicate a z-index management issue`);
  }

  return tokens;
  } catch (error) { return []; }
}
