/**
 * Configuration loader for UIUX-Mirror
 * Provides sensible defaults and validates configuration using Zod
 */

import { z } from 'zod';
import type { CrawlConfig } from '../types/crawl-config.js';

// Zod schema for CrawlConfig validation
const CrawlConfigSchema = z.object({
  seedUrls: z.array(z.string().url()).min(1, 'At least one seed URL is required'),
  maxDepth: z.number().int().min(1).max(10).default(3),
  maxPages: z.number().int().min(1).max(10000).default(100),
  domainAllowlist: z.array(z.string()).optional(),
  respectRobotsTxt: z.boolean().default(true),
  maxConcurrency: z.number().int().min(1).max(20).default(5),
  maxRequestsPerMinute: z.number().int().min(1).max(600).default(60),
  timingJitterMs: z.tuple([z.number().int().min(0), z.number().int().min(0)]).default([100, 500]),
  userAgents: z.array(z.string()).min(1).default([
    // Realistic Chrome user-agent strings (various OS/versions)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ]),
  viewportSizes: z.array(z.object({
    width: z.number().int().min(320).max(3840),
    height: z.number().int().min(240).max(2160),
  })).min(1).default([
    { width: 1920, height: 1080 },  // Full HD desktop
    { width: 1366, height: 768 },   // Common laptop
  ]),
  waitStrategies: z.array(z.enum(['networkidle', 'framework-hydration', 'css-injection', 'custom-delay']))
    .min(1)
    .default(['networkidle', 'framework-hydration', 'css-injection']),
  outputDir: z.string().min(1).default('.uidna'),
});

/**
 * Default crawl configuration with sensible values based on research
 */
export const defaultConfig: CrawlConfig = {
  seedUrls: [],
  maxDepth: 3,
  maxPages: 100,
  respectRobotsTxt: true,
  maxConcurrency: 5,
  maxRequestsPerMinute: 60,
  timingJitterMs: [100, 500],
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ],
  viewportSizes: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
  ],
  waitStrategies: ['networkidle', 'framework-hydration', 'css-injection'],
  outputDir: '.uidna',
};

/**
 * Load and validate crawl configuration, merging overrides with defaults
 */
export function loadConfig(overrides?: Partial<CrawlConfig>): CrawlConfig {
  // Deep merge overrides with defaults
  const merged = {
    ...defaultConfig,
    ...overrides,
    // Handle nested objects explicitly
    ...(overrides?.viewportSizes && { viewportSizes: overrides.viewportSizes }),
    ...(overrides?.userAgents && { userAgents: overrides.userAgents }),
    ...(overrides?.waitStrategies && { waitStrategies: overrides.waitStrategies }),
  };

  // Validate using Zod schema
  const validated = CrawlConfigSchema.parse(merged);

  return validated as CrawlConfig;
}
