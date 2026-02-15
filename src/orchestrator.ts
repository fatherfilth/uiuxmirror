/**
 * End-to-end pipeline orchestrator
 * Wires together crawler -> extractors -> evidence -> storage
 */

import path from 'node:path';
import crypto from 'crypto';
import { runCrawl } from './crawler/index.js';
import type { CrawlerHandlers } from './crawler/index.js';
import type { Page } from 'playwright';
import { extractAllTokens } from './extractors/index.js';
import { EvidenceStore, ScreenshotManager } from './evidence/index.js';
import { TokenStore, DiffTracker } from './storage/index.js';
import { createLogger } from './shared/logger.js';
import type { CrawlConfig, CrawlResult, PageData, DiffResult } from './types/crawl-config.js';
import type { PageTokens } from './types/tokens.js';

const logger = createLogger('orchestrator');

/**
 * Options for running the pipeline
 */
export interface PipelineOptions {
  config: CrawlConfig;
  onProgress?: (status: { pagesProcessed: number; totalEnqueued: number; currentUrl: string }) => void;
}

/**
 * Result from running the full pipeline
 */
export interface PipelineResult {
  crawlResult: CrawlResult;
  tokenSummary: {
    colors: number;
    typography: number;
    spacing: number;
    customProperties: number;
    radii: number;
    shadows: number;
    zIndexes: number;
    motion: number;
    icons: number;
    imagery: number;
  };
  evidenceCount: number;
  diffResult?: DiffResult;
  outputDir: string;
}

/**
 * Hash tokens for change detection
 */
function hashTokens(tokens: PageTokens): string {
  const tokenStr = JSON.stringify({
    colors: tokens.colors.length,
    typography: tokens.typography.length,
    spacing: tokens.spacing.length,
    customProperties: tokens.customProperties.length,
    radii: tokens.radii.length,
    shadows: tokens.shadows.length,
    zIndexes: tokens.zIndexes.length,
    motion: tokens.motion.length,
    icons: tokens.icons.length,
    imagery: tokens.imagery.length,
    // Include representative samples for better change detection
    colorSample: tokens.colors.slice(0, 5).map(c => c.value),
    typographySample: tokens.typography.slice(0, 5).map(t => `${t.family}-${t.size}`),
  });
  return crypto.createHash('sha256').update(tokenStr).digest('hex').substring(0, 16);
}

/**
 * Run the complete crawl -> extract -> store pipeline
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { config, onProgress } = options;

  logger.info('Starting pipeline', { seedUrls: config.seedUrls, outputDir: config.outputDir });

  // Initialize services
  const tokenStore = new TokenStore(path.join(config.outputDir, 'tokens'));
  const evidenceStore = new EvidenceStore(path.join(config.outputDir, 'evidence'));
  const screenshotManager = new ScreenshotManager(path.join(config.outputDir, 'evidence', 'screenshots'));
  const diffTracker = new DiffTracker(path.join(config.outputDir, 'snapshots'));

  // Load previous snapshot for diff detection
  const previousSnapshot = await diffTracker.loadLatestSnapshot();
  if (previousSnapshot) {
    logger.info(`Found previous snapshot from ${previousSnapshot.timestamp} with ${previousSnapshot.totalPages} pages`);
  }

  // Track state across pages
  const pageTokenHashes: Record<string, string> = {};
  const allPageTokens: Record<string, PageTokens> = {};
  let pagesProcessed = 0;

  // Define crawler handlers
  const handlers: CrawlerHandlers = {
    async onPageCrawled(pageData: PageData, page: Page): Promise<void> {
      logger.info(`Extracting tokens from ${pageData.url}`);

      try {
        // Step 1: Extract all tokens from the live page
        const tokens = await extractAllTokens(page, pageData.url);

        // Step 2: Save per-page tokens
        await tokenStore.savePageTokens(pageData.url, tokens);

        // Step 3: Store evidence for a sample of tokens (avoid overwhelming storage)
        // Store evidence for first 10 tokens of each type with evidence
        const sampleSize = 10;

        for (const token of tokens.colors.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 2)) { // Max 2 evidence items per token
            const screenshot = await screenshotManager.captureElement(page, ev.selector, pageData.url);
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
              screenshotPath: screenshot.screenshotPath,
              boundingBox: screenshot.boundingBox || undefined,
            });
          }
        }

        for (const token of tokens.typography.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 2)) {
            const screenshot = await screenshotManager.captureElement(page, ev.selector, pageData.url);
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
              screenshotPath: screenshot.screenshotPath,
              boundingBox: screenshot.boundingBox || undefined,
            });
          }
        }

        for (const token of tokens.spacing.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 1)) { // Fewer for spacing
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
            });
          }
        }

        for (const token of tokens.customProperties.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 1)) {
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
            });
          }
        }

        for (const token of tokens.radii.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 1)) {
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
            });
          }
        }

        for (const token of tokens.shadows.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 1)) {
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
            });
          }
        }

        for (const token of tokens.icons.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 2)) {
            const screenshot = await screenshotManager.captureElement(page, ev.selector, pageData.url);
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
              screenshotPath: screenshot.screenshotPath,
              boundingBox: screenshot.boundingBox || undefined,
            });
          }
        }

        for (const token of tokens.imagery.slice(0, sampleSize)) {
          for (const ev of token.evidence.slice(0, 2)) {
            const screenshot = await screenshotManager.captureElement(page, ev.selector, pageData.url);
            await evidenceStore.addEvidence({
              pageUrl: ev.pageUrl,
              selector: ev.selector,
              computedStyles: ev.computedStyles,
              screenshotPath: screenshot.screenshotPath,
              boundingBox: screenshot.boundingBox || undefined,
            });
          }
        }

        // Step 4: Compute token hash for this page
        pageTokenHashes[pageData.url] = hashTokens(tokens);

        // Step 5: Store tokens for aggregation
        allPageTokens[pageData.url] = tokens;

        // Step 6: Flush evidence periodically
        await evidenceStore.flush();

        // Step 7: Call progress callback
        pagesProcessed++;
        if (onProgress) {
          onProgress({
            pagesProcessed,
            totalEnqueued: pagesProcessed, // Approximation - exact count requires Crawlee state
            currentUrl: pageData.url,
          });
        }

        logger.info(`Extracted ${tokens.colors.length} colors, ${tokens.typography.length} typography tokens from ${pageData.url}`);
      } catch (error) {
        logger.error(`Failed to extract tokens from ${pageData.url}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't throw - allow crawl to continue
      }
    },

    onPageFailed(url: string, error: Error): void {
      logger.warn(`Page failed: ${url}`, { error: error.message });
      // Don't throw - failures are logged, not fatal
    },

    onPageSkipped(url: string, reason: string): void {
      logger.info(`Page skipped: ${url}`, { reason });
    },
  };

  // Run the crawl
  const crawlResult = await runCrawl(config, handlers);

  logger.info('Crawl complete, aggregating tokens');

  // Save aggregated tokens
  await tokenStore.saveAggregatedTokens(allPageTokens);

  // Final evidence flush
  await evidenceStore.flush();

  // Save snapshot
  const currentSnapshot = await diffTracker.saveSnapshot(config, pageTokenHashes);

  // Compute diff if previous snapshot exists
  let diffResult: DiffResult | undefined;
  if (previousSnapshot) {
    diffResult = await diffTracker.computeDiff(previousSnapshot, currentSnapshot);
    const report = await diffTracker.generateDiffReport(diffResult);
    logger.info(`Diff report:\n${report}`);
  }

  // Calculate token summary
  const tokenSummary = {
    colors: Object.values(allPageTokens).reduce((sum, t) => sum + t.colors.length, 0),
    typography: Object.values(allPageTokens).reduce((sum, t) => sum + t.typography.length, 0),
    spacing: Object.values(allPageTokens).reduce((sum, t) => sum + t.spacing.length, 0),
    customProperties: Object.values(allPageTokens).reduce((sum, t) => sum + t.customProperties.length, 0),
    radii: Object.values(allPageTokens).reduce((sum, t) => sum + t.radii.length, 0),
    shadows: Object.values(allPageTokens).reduce((sum, t) => sum + t.shadows.length, 0),
    zIndexes: Object.values(allPageTokens).reduce((sum, t) => sum + t.zIndexes.length, 0),
    motion: Object.values(allPageTokens).reduce((sum, t) => sum + t.motion.length, 0),
    icons: Object.values(allPageTokens).reduce((sum, t) => sum + t.icons.length, 0),
    imagery: Object.values(allPageTokens).reduce((sum, t) => sum + t.imagery.length, 0),
  };

  logger.info('Pipeline complete', { tokenSummary, evidenceCount: evidenceStore.count });

  return {
    crawlResult,
    tokenSummary,
    evidenceCount: evidenceStore.count,
    diffResult,
    outputDir: config.outputDir,
  };
}
