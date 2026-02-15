/**
 * Screenshot management for element-level evidence capture
 * Handles screenshot cropping and storage with collision-resistant filenames
 */

import { Page } from 'playwright';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { join } from 'node:path';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('screenshot-manager');

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ScreenshotManager {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    fs.ensureDirSync(outputDir);
    logger.info(`ScreenshotManager initialized with outputDir: ${outputDir}`);
  }

  /**
   * Capture screenshot of a specific element
   * Returns screenshot path and bounding box, or undefined/null on failure
   */
  async captureElement(
    page: Page,
    selector: string,
    pageUrl: string
  ): Promise<{ screenshotPath: string | undefined; boundingBox: BoundingBox | null }> {
    try {
      // Generate unique filename to avoid collisions
      const urlHash = createHash('sha256').update(pageUrl).digest('hex').slice(0, 8);
      const selectorHash = createHash('sha256').update(selector).digest('hex').slice(0, 8);
      const timestamp = Date.now();
      const filename = `${urlHash}-${selectorHash}-${timestamp}.png`;
      const fullPath = join(this.outputDir, filename);

      // Locate and capture element
      const element = page.locator(selector);

      // Wait for element to be visible with 2s timeout
      await element.waitFor({ state: 'visible', timeout: 2000 });

      // Capture screenshot
      await element.screenshot({ path: fullPath });

      // Get bounding box
      const boundingBox = await element.boundingBox();

      logger.debug(`Captured element screenshot: ${filename}`);

      return {
        screenshotPath: filename, // Return relative path
        boundingBox: boundingBox || null
      };
    } catch (error) {
      logger.warn(`Failed to capture element screenshot for selector "${selector}": ${error instanceof Error ? error.message : String(error)}`);
      return {
        screenshotPath: undefined,
        boundingBox: null
      };
    }
  }

  /**
   * Capture full page screenshot
   * Returns screenshot path or undefined on failure
   */
  async captureFullPage(page: Page, pageUrl: string): Promise<string | undefined> {
    try {
      const urlHash = createHash('sha256').update(pageUrl).digest('hex').slice(0, 8);
      const timestamp = Date.now();
      const filename = `page-${urlHash}-${timestamp}.png`;
      const fullPath = join(this.outputDir, filename);

      await page.screenshot({ path: fullPath, fullPage: true });

      logger.debug(`Captured full page screenshot: ${filename}`);

      return filename; // Return relative path
    } catch (error) {
      logger.warn(`Failed to capture full page screenshot: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
}
