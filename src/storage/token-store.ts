/**
 * Token persistence layer
 * Saves extracted tokens to JSON files for inspection and re-crawl comparison
 */

import fs from 'fs-extra';
import path from 'node:path';
import crypto from 'crypto';
import { createLogger } from '../shared/logger.js';
import type { PageTokens } from '../types/tokens.js';

const logger = createLogger('token-store');

/**
 * Sanitize URL to create safe filename
 */
function sanitizeFilename(url: string): string {
  // Use hash for collision resistance and filename safety
  const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
  return hash;
}

/**
 * TokenStore persists extracted tokens to JSON files
 */
export class TokenStore {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
    logger.debug(`TokenStore initialized at ${this.outputDir}`);
  }

  /**
   * Save tokens for a single page
   */
  async savePageTokens(pageUrl: string, tokens: PageTokens): Promise<void> {
    const urlHash = sanitizeFilename(pageUrl);
    const filename = `page-${urlHash}.json`;
    const filepath = path.join(this.outputDir, filename);

    // Include metadata in saved file
    const data = {
      url: pageUrl,
      timestamp: new Date().toISOString(),
      tokens,
    };

    await fs.writeJson(filepath, data, { spaces: 2 });
    logger.debug(`Saved tokens for ${pageUrl} to ${filename}`);
  }

  /**
   * Load tokens for a single page
   */
  async loadPageTokens(pageUrl: string): Promise<PageTokens | null> {
    const urlHash = sanitizeFilename(pageUrl);
    const filename = `page-${urlHash}.json`;
    const filepath = path.join(this.outputDir, filename);

    if (!await fs.pathExists(filepath)) {
      return null;
    }

    const data = await fs.readJson(filepath);
    return data.tokens as PageTokens;
  }

  /**
   * Get all page URLs that have stored tokens
   */
  async getAllPageUrls(): Promise<string[]> {
    const files = await fs.readdir(this.outputDir);
    const pageFiles = files.filter(f => f.startsWith('page-') && f.endsWith('.json'));

    const urls: string[] = [];
    for (const file of pageFiles) {
      const filepath = path.join(this.outputDir, file);
      const data = await fs.readJson(filepath);
      if (data.url) {
        urls.push(data.url);
      }
    }

    return urls;
  }

  /**
   * Save aggregated tokens across all pages
   */
  async saveAggregatedTokens(allTokens: Record<string, PageTokens>): Promise<void> {
    // Aggregate tokens by type
    const aggregated = {
      colors: new Map<string, any>(),
      typography: new Map<string, any>(),
      spacing: new Map<string, any>(),
      customProperties: new Map<string, any>(),
      radii: new Map<string, any>(),
      shadows: new Map<string, any>(),
      zIndexes: new Map<string, any>(),
      motion: new Map<string, any>(),
      icons: new Map<string, any>(),
      imagery: new Map<string, any>(),
    };

    // Merge tokens from all pages
    for (const [, tokens] of Object.entries(allTokens)) {
      // Colors
      for (const token of tokens.colors) {
        const key = token.value;
        if (!aggregated.colors.has(key)) {
          aggregated.colors.set(key, { ...token, evidence: [] });
        }
        // Merge evidence from this page
        const existing = aggregated.colors.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Typography
      for (const token of tokens.typography) {
        const key = `${token.family}-${token.size}-${token.weight}`;
        if (!aggregated.typography.has(key)) {
          aggregated.typography.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.typography.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Spacing
      for (const token of tokens.spacing) {
        const key = token.value;
        if (!aggregated.spacing.has(key)) {
          aggregated.spacing.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.spacing.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Custom Properties
      for (const token of tokens.customProperties) {
        const key = token.name;
        if (!aggregated.customProperties.has(key)) {
          aggregated.customProperties.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.customProperties.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Radii
      for (const token of tokens.radii) {
        const key = token.value;
        if (!aggregated.radii.has(key)) {
          aggregated.radii.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.radii.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Shadows
      for (const token of tokens.shadows) {
        const key = token.value;
        if (!aggregated.shadows.has(key)) {
          aggregated.shadows.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.shadows.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Z-Indexes
      for (const token of tokens.zIndexes) {
        const key = token.value.toString();
        if (!aggregated.zIndexes.has(key)) {
          aggregated.zIndexes.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.zIndexes.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Motion
      for (const token of tokens.motion) {
        const key = `${token.property}-${token.value}`;
        if (!aggregated.motion.has(key)) {
          aggregated.motion.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.motion.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Icons
      for (const token of tokens.icons) {
        const key = `${token.style}-${token.sizePixels}`;
        if (!aggregated.icons.has(key)) {
          aggregated.icons.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.icons.get(key);
        existing.evidence.push(...token.evidence);
      }

      // Imagery
      for (const token of tokens.imagery) {
        const key = `${token.aspectRatio}-${token.treatment}`;
        if (!aggregated.imagery.has(key)) {
          aggregated.imagery.set(key, { ...token, evidence: [] });
        }
        const existing = aggregated.imagery.get(key);
        existing.evidence.push(...token.evidence);
      }
    }

    // Write aggregated files
    await fs.writeJson(
      path.join(this.outputDir, 'all-colors.json'),
      Array.from(aggregated.colors.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-typography.json'),
      Array.from(aggregated.typography.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-spacing.json'),
      Array.from(aggregated.spacing.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-custom-properties.json'),
      Array.from(aggregated.customProperties.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-radii.json'),
      Array.from(aggregated.radii.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-shadows.json'),
      Array.from(aggregated.shadows.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-zindexes.json'),
      Array.from(aggregated.zIndexes.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-motion.json'),
      Array.from(aggregated.motion.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-icons.json'),
      Array.from(aggregated.icons.values()),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(this.outputDir, 'all-imagery.json'),
      Array.from(aggregated.imagery.values()),
      { spaces: 2 }
    );

    // Write summary
    const summary = {
      colors: aggregated.colors.size,
      typography: aggregated.typography.size,
      spacing: aggregated.spacing.size,
      customProperties: aggregated.customProperties.size,
      radii: aggregated.radii.size,
      shadows: aggregated.shadows.size,
      zIndexes: aggregated.zIndexes.size,
      motion: aggregated.motion.size,
      icons: aggregated.icons.size,
      imagery: aggregated.imagery.size,
    };

    await fs.writeJson(
      path.join(this.outputDir, 'summary.json'),
      summary,
      { spaces: 2 }
    );

    logger.info(`Aggregated tokens saved: ${JSON.stringify(summary)}`);
  }
}
