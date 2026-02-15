/**
 * Diff tracking for crawl snapshots
 * Detects added, removed, changed, and unchanged pages across crawls
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import crypto from 'crypto';
import { createLogger } from '../shared/logger.js';
import type { CrawlConfig, CrawlSnapshot, DiffResult } from '../types/crawl-config.js';

const logger = createLogger('diff-tracker');

/**
 * Hash the crawl config for comparison
 */
function hashConfig(config: CrawlConfig): string {
  const configStr = JSON.stringify({
    seedUrls: config.seedUrls,
    maxDepth: config.maxDepth,
    maxPages: config.maxPages,
    domainAllowlist: config.domainAllowlist,
  });
  return crypto.createHash('sha256').update(configStr).digest('hex').substring(0, 16);
}

/**
 * DiffTracker manages crawl snapshots and change detection
 */
export class DiffTracker {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
    logger.debug(`DiffTracker initialized at ${this.outputDir}`);
  }

  /**
   * Save a crawl snapshot for future comparison
   */
  async saveSnapshot(
    config: CrawlConfig,
    pageTokenHashes: Record<string, string>
  ): Promise<CrawlSnapshot> {
    const timestamp = new Date().toISOString();
    const snapshot: CrawlSnapshot = {
      timestamp,
      configHash: hashConfig(config),
      tokenHashes: pageTokenHashes,
      totalPages: Object.keys(pageTokenHashes).length,
    };

    // Save timestamped snapshot
    const timestampedFile = path.join(this.outputDir, `snapshot-${timestamp.replace(/[:.]/g, '-')}.json`);
    await fs.writeJson(timestampedFile, snapshot, { spaces: 2 });

    // Also save as latest snapshot (overwrite)
    const latestFile = path.join(this.outputDir, 'latest-snapshot.json');
    await fs.writeJson(latestFile, snapshot, { spaces: 2 });

    logger.info(`Saved snapshot with ${snapshot.totalPages} pages`);
    return snapshot;
  }

  /**
   * Load the most recent snapshot
   */
  async loadLatestSnapshot(): Promise<CrawlSnapshot | null> {
    const latestFile = path.join(this.outputDir, 'latest-snapshot.json');

    if (!await fs.pathExists(latestFile)) {
      logger.debug('No previous snapshot found (first crawl)');
      return null;
    }

    const snapshot = await fs.readJson(latestFile) as CrawlSnapshot;
    logger.debug(`Loaded snapshot from ${snapshot.timestamp} with ${snapshot.totalPages} pages`);
    return snapshot;
  }

  /**
   * Compute diff between two snapshots
   */
  async computeDiff(previous: CrawlSnapshot, current: CrawlSnapshot): Promise<DiffResult> {
    const previousUrls = new Set(Object.keys(previous.tokenHashes));
    const currentUrls = new Set(Object.keys(current.tokenHashes));

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    const unchanged: string[] = [];

    // Find added and changed pages
    for (const url of currentUrls) {
      if (!previousUrls.has(url)) {
        added.push(url);
      } else if (previous.tokenHashes[url] !== current.tokenHashes[url]) {
        changed.push(url);
      } else {
        unchanged.push(url);
      }
    }

    // Find removed pages
    for (const url of previousUrls) {
      if (!currentUrls.has(url)) {
        removed.push(url);
      }
    }

    return {
      previousSnapshot: previous,
      currentSnapshot: current,
      added,
      removed,
      changed,
      unchanged,
    };
  }

  /**
   * Generate human-readable diff report
   */
  async generateDiffReport(diff: DiffResult): Promise<string> {
    const lines: string[] = [];

    lines.push('Crawl Diff Report');
    lines.push('=================');
    lines.push('');
    lines.push(`Previous: ${diff.previousSnapshot.timestamp}`);
    lines.push(`Current:  ${diff.currentSnapshot.timestamp}`);
    lines.push('');
    lines.push('Summary:');
    lines.push(`  Pages added:     ${diff.added.length}`);
    lines.push(`  Pages removed:   ${diff.removed.length}`);
    lines.push(`  Pages changed:   ${diff.changed.length}`);
    lines.push(`  Pages unchanged: ${diff.unchanged.length}`);
    lines.push('');

    if (diff.added.length > 0) {
      lines.push('Added pages:');
      for (const url of diff.added) {
        lines.push(`  - ${url}`);
      }
      lines.push('');
    }

    if (diff.changed.length > 0) {
      lines.push('Changed pages:');
      for (const url of diff.changed) {
        lines.push(`  - ${url} (token hash changed)`);
      }
      lines.push('');
    }

    if (diff.removed.length > 0) {
      lines.push('Removed pages:');
      for (const url of diff.removed) {
        lines.push(`  - ${url}`);
      }
      lines.push('');
    }

    const report = lines.join('\n');

    // Save report to file
    const timestamp = diff.currentSnapshot.timestamp.replace(/[:.]/g, '-');
    const reportFile = path.join(this.outputDir, `diff-report-${timestamp}.txt`);
    await fs.writeFile(reportFile, report, 'utf-8');

    logger.info(`Diff report saved to ${reportFile}`);
    return report;
  }
}
