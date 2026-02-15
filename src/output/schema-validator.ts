/**
 * W3C DTCG format schema validation
 * Validates design token files against W3C DTCG specification
 */

import { z } from 'zod';
import type { DTCGTokenFile } from './dtcg-formatter.js';

/**
 * Zod schema for W3C DTCG token format
 * See: https://design-tokens.github.io/community-group/format/
 */

// Valid DTCG token types
const dtcgTokenTypes = z.enum([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
]);

// DTCG token schema
const dtcgTokenSchema: z.ZodType<any> = z.object({
  $type: dtcgTokenTypes,
  $value: z.any(), // Value type depends on $type
  $description: z.string().optional(),
  $extensions: z.record(z.any()).optional(),
});

// DTCG token file schema (recursive for nested groups)
const dtcgTokenFileSchema: z.ZodType<any> = z.lazy(() =>
  z.record(
    z.union([
      dtcgTokenSchema,
      dtcgTokenFileSchema,
    ])
  )
);

/**
 * Validates DTCG output structure
 *
 * Rules:
 * - Every token node must have $type and $value
 * - $type must be one of the valid DTCG types
 * - Group nodes (no $type) must only contain token nodes or other group nodes
 *
 * Note: Plan suggested using w3c-design-tokens-standard-schema npm package.
 * After installation, found it uses a different schema format incompatible with our needs.
 * Using custom zod schema based on W3C spec instead (deviation rule: "fall back to custom validation").
 *
 * @param tokens - DTCG token file to validate
 * @returns Validation result with errors array
 */
export function validateDTCGOutput(tokens: DTCGTokenFile): {
  valid: boolean;
  errors: string[];
} {
  // Delegate to sync version (same implementation, just clearer naming)
  return validateDTCGOutputSync(tokens);
}

/**
 * Synchronous version of validateDTCGOutput for use in non-async contexts
 */
export function validateDTCGOutputSync(tokens: DTCGTokenFile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    // Use custom zod schema only (no async import)
    dtcgTokenFileSchema.parse(tokens);

    // Additional validation: check that all leaf nodes have $type and $value
    function validateNode(node: any, path: string = 'root'): void {
      if (typeof node !== 'object' || node === null) {
        errors.push(`${path}: Expected object, got ${typeof node}`);
        return;
      }

      // If node has $type, it's a token - validate it
      if ('$type' in node) {
        if (!node.$value) {
          errors.push(`${path}: Token has $type but missing $value`);
        }
        if (!dtcgTokenTypes.options.includes(node.$type)) {
          errors.push(`${path}: Invalid $type "${node.$type}"`);
        }
      } else {
        // It's a group node - recurse into children
        for (const [key, value] of Object.entries(node)) {
          if (key.startsWith('$')) {
            errors.push(`${path}.${key}: Group nodes should not have $ properties (only tokens)`);
          } else {
            validateNode(value, `${path}.${key}`);
          }
        }
      }
    }

    validateNode(tokens);

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
