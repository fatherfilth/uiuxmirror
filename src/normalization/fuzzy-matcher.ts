/**
 * Generic fuzzy matching utilities for token deduplication
 * Provides clustering based on custom distance functions
 */

/**
 * Cluster tokens based on a distance function and threshold
 *
 * @param tokens - Array of tokens to cluster
 * @param distanceFn - Function to calculate distance between two tokens
 * @param threshold - Maximum distance to consider tokens similar
 * @returns Array of token groups (each group contains similar tokens)
 */
export function fuzzyMatchTokens<T>(
  tokens: T[],
  distanceFn: (a: T, b: T) => number,
  threshold: number
): T[][] {
  if (tokens.length === 0) {
    return [];
  }

  const groups: T[][] = [];

  for (const token of tokens) {
    // Find existing group within threshold
    let foundGroup: T[] | undefined;

    for (const group of groups) {
      // Check distance against first item in group (representative)
      const representative = group[0];
      const distance = distanceFn(token, representative);

      if (distance < threshold) {
        foundGroup = group;
        break;
      }
    }

    if (foundGroup) {
      // Add to existing group
      foundGroup.push(token);
    } else {
      // Create new group
      groups.push([token]);
    }
  }

  return groups;
}
