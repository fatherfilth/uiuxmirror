/**
 * Evidence storage layer for UIUX-Mirror
 * Implements NORM-03: Evidence-based token extraction with full traceability
 */

import fs from 'fs-extra';
import { join } from 'node:path';
import { writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createLogger } from '../shared/logger.js';
import { generateEvidenceId } from '../shared/utils.js';
import type { EvidenceEntry, EvidenceIndex } from '../types/evidence.js';

const logger = createLogger('evidence-store');

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class EvidenceStore {
  private indexPath: string;
  private index: EvidenceIndex;

  constructor(outputDir: string) {
    this.indexPath = join(outputDir, 'evidence-index.json');
    fs.ensureDir(outputDir).catch((error) => {
      logger.error('Failed to create output directory', {
        error: error instanceof Error ? error.message : String(error)
      });
    });

    // Initialize empty index
    this.index = {
      entries: {},
      byPage: {},
      bySelector: {}
    };

    logger.info(`EvidenceStore initialized at ${outputDir}`);
  }

  /**
   * Add a new evidence entry to the store
   */
  async addEvidence(params: {
    pageUrl: string;
    selector: string;
    computedStyles: Record<string, string>;
    screenshotPath?: string;
    boundingBox?: BoundingBox;
  }): Promise<EvidenceEntry> {
    const timestamp = new Date().toISOString();
    const id = generateEvidenceId(params.pageUrl, params.selector, timestamp);

    const entry: EvidenceEntry = {
      id,
      pageUrl: params.pageUrl,
      selector: params.selector,
      timestamp,
      computedStyles: params.computedStyles,
      screenshotPath: params.screenshotPath,
      boundingBox: params.boundingBox
    };

    // Add to entries
    this.index.entries[id] = entry;

    // Update byPage index
    if (!this.index.byPage[params.pageUrl]) {
      this.index.byPage[params.pageUrl] = [];
    }
    this.index.byPage[params.pageUrl].push(id);

    // Update bySelector index
    if (!this.index.bySelector[params.selector]) {
      this.index.bySelector[params.selector] = [];
    }
    this.index.bySelector[params.selector].push(id);

    logger.debug(`Added evidence entry: ${id}`);

    return entry;
  }

  /**
   * Flush the in-memory index to disk atomically
   */
  async flush(): Promise<void> {
    const tempPath = `${this.indexPath}.tmp`;

    try {
      // Write to temp file first
      const content = JSON.stringify(this.index, null, 2);
      await writeFile(tempPath, content, 'utf-8');

      // Atomic rename
      await rename(tempPath, this.indexPath);

      const count = Object.keys(this.index.entries).length;
      logger.info(`Flushed ${count} evidence entries to disk`);
    } catch (error) {
      logger.error('Failed to flush evidence index', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Load the evidence index from disk
   */
  async load(): Promise<void> {
    if (!existsSync(this.indexPath)) {
      logger.info('No existing evidence index found, starting fresh');
      return;
    }

    try {
      this.index = (await fs.readJson(this.indexPath)) as EvidenceIndex;
      const count = Object.keys(this.index.entries).length;
      logger.info(`Loaded ${count} evidence entries from disk`);
    } catch (error) {
      logger.error('Failed to load evidence index', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all evidence entries for a specific page URL
   */
  getByPage(pageUrl: string): EvidenceEntry[] {
    const ids = this.index.byPage[pageUrl] || [];
    return ids.map(id => this.index.entries[id]).filter(Boolean);
  }

  /**
   * Get all evidence entries for a specific selector
   */
  getBySelector(selector: string): EvidenceEntry[] {
    const ids = this.index.bySelector[selector] || [];
    return ids.map(id => this.index.entries[id]).filter(Boolean);
  }

  /**
   * Get a specific evidence entry by ID
   */
  getById(id: string): EvidenceEntry | undefined {
    return this.index.entries[id];
  }

  /**
   * Get all evidence entries
   */
  getAll(): EvidenceEntry[] {
    return Object.values(this.index.entries);
  }

  /**
   * Get the total number of evidence entries
   */
  get count(): number {
    return Object.keys(this.index.entries).length;
  }
}
