/**
 * Playwright stealth and anti-bot configuration for UIUX-Mirror
 * Implements CRAWL-05: Anti-bot detection and stealth measures
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { sleep, randomJitter } from '../shared/utils.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('stealth-config');

/**
 * Create a stealth-configured Chromium browser launcher
 * Uses playwright-extra with puppeteer-extra-plugin-stealth
 */
export function createStealthBrowser() {
  // Apply stealth plugin to chromium
  chromium.use(StealthPlugin());
  logger.debug('Stealth plugin applied to Chromium');
  return chromium;
}

/**
 * Get a random user agent from the provided list
 * @param userAgents - Array of user agent strings
 * @returns Random user agent string
 */
export function getRandomUserAgent(userAgents: string[]): string {
  if (!userAgents || userAgents.length === 0) {
    const fallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    logger.warn('No user agents provided, using fallback');
    return fallback;
  }

  const selected = userAgents[Math.floor(Math.random() * userAgents.length)];
  logger.debug(`Selected user agent: ${selected.substring(0, 50)}...`);
  return selected;
}

/**
 * Get a random viewport size from the provided list
 * @param viewports - Array of viewport size objects
 * @returns Random viewport {width, height}
 */
export function getRandomViewport(
  viewports: Array<{ width: number; height: number }>
): { width: number; height: number } {
  if (!viewports || viewports.length === 0) {
    const fallback = { width: 1920, height: 1080 };
    logger.warn('No viewports provided, using fallback 1920x1080');
    return fallback;
  }

  const selected = viewports[Math.floor(Math.random() * viewports.length)];
  logger.debug(`Selected viewport: ${selected.width}x${selected.height}`);
  return selected;
}

/**
 * Add random timing jitter to avoid detection patterns
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 */
export async function addTimingJitter(minMs: number, maxMs: number): Promise<void> {
  const jitter = randomJitter(minMs, maxMs);
  logger.debug(`Adding timing jitter: ${jitter}ms`);
  await sleep(jitter);
}
