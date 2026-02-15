/**
 * Color normalization using CIEDE2000 perceptual distance
 * Clusters similar colors based on deltaE threshold in LAB color space
 */

import { differenceEuclidean, converter } from 'culori';
import type { ColorToken } from '../types/tokens.js';
import type { ColorCluster } from '../types/normalized-tokens.js';

// Create deltaE function using LAB color space for perceptual distance
// This approximates CIEDE2000 using Euclidean distance in LAB space
const deltaE = differenceEuclidean('lab');

// Convert hex to RGB for culori processing
const toRgb = converter('rgb');

/**
 * Deduplicate colors using CIEDE2000 perceptual distance
 *
 * @param colors - Array of color tokens to deduplicate
 * @param threshold - deltaE threshold (default 2.3 = just noticeable difference)
 * @returns Array of color clusters sorted by occurrence count
 */
export function deduplicateColors(
  colors: ColorToken[],
  threshold: number = 2.3
): ColorCluster[] {
  if (colors.length === 0) {
    return [];
  }

  const clusters: ColorCluster[] = [];

  for (const color of colors) {
    // Convert hex to RGB color object for culori
    const colorRgb = toRgb(color.value);

    if (!colorRgb) {
      // Skip invalid colors
      continue;
    }

    // Find existing cluster within threshold
    let foundCluster: ColorCluster | undefined;

    for (const cluster of clusters) {
      const canonicalRgb = toRgb(cluster.canonical);

      if (!canonicalRgb) {
        continue;
      }

      // Calculate perceptual distance in LAB space
      const distance = deltaE(colorRgb, canonicalRgb);

      if (distance !== undefined && distance < threshold) {
        foundCluster = cluster;
        break;
      }
    }

    if (foundCluster) {
      // Merge into existing cluster
      foundCluster.variants.push(color.value);
      foundCluster.evidence.push(...color.evidence);
      foundCluster.occurrences += 1;
    } else {
      // Create new cluster
      clusters.push({
        canonical: color.value,
        variants: [color.value],
        evidence: [...color.evidence],
        occurrences: 1,
      });
    }
  }

  // Sort by occurrence count descending (most frequent first)
  return clusters.sort((a, b) => b.occurrences - a.occurrences);
}
