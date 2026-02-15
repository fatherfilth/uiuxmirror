/**
 * Crawler module barrel export for UIUX-Mirror
 */

// Main crawler orchestration
export { createCrawler, runCrawl } from './playwright-crawler.js';
export type { CrawlerHandlers } from './playwright-crawler.js';

// Robots.txt validation
export { RobotsValidator } from './robots-validator.js';

// Stealth configuration
export {
  createStealthBrowser,
  getRandomUserAgent,
  getRandomViewport,
  addTimingJitter,
} from './stealth-config.js';

// Wait strategies
export {
  waitForContentReady,
  detectFramework,
  detectCSSInJSLibrary,
} from './wait-strategies.js';
