/**
 * CLI configuration loader
 * Loads uidna.config.json from project root and merges with CLI flag overrides
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { loadConfig } from '../shared/config.js';
import type { CrawlConfig } from '../types/crawl-config.js';

/**
 * Zod schema for uidna.config.json validation
 * All fields optional - defaults come from shared/config.ts loadConfig
 */
export const UidnaConfigSchema = z.object({
  maxDepth: z.number().int().min(1).max(10).optional(),
  maxPages: z.number().int().min(1).max(10000).optional(),
  domainAllowlist: z.array(z.string()).optional(),
  respectRobotsTxt: z.boolean().optional(),
  viewportSizes: z.array(z.object({
    width: z.number().int().min(320).max(3840),
    height: z.number().int().min(240).max(2160),
  })).optional(),
  outputDir: z.string().min(1).optional(),
  maxConcurrency: z.number().int().min(1).max(20).optional(),
}).passthrough(); // Allow additional fields for future extensibility

/**
 * Load full configuration from file + CLI args
 * Priority: CLI args > uidna.config.json > defaults from shared/config.ts
 */
export async function loadFullConfig(cliArgs: Partial<CrawlConfig>): Promise<CrawlConfig> {
  let fileConfig: Partial<CrawlConfig> = {};

  // Check if uidna.config.json exists in cwd
  const configPath = 'uidna.config.json';
  if (existsSync(configPath)) {
    try {
      // Read and parse JSON
      const fileContent = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(fileContent);

      // Validate with Zod schema
      const validated = UidnaConfigSchema.parse(parsed);
      fileConfig = validated as Partial<CrawlConfig>;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in uidna.config.json: ${error.message}`);
      }
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
        throw new Error(`Invalid uidna.config.json:\n${fieldErrors}`);
      }
      throw error;
    }
  }

  // Merge: fileConfig first, then cliArgs on top (CLI overrides file)
  const merged = {
    ...fileConfig,
    ...cliArgs,
  };

  // Pass to shared loadConfig for final validation and defaults
  return loadConfig(merged);
}
