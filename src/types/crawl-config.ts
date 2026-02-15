/**
 * Crawl configuration and result type definitions for UIUX-Mirror
 * Implements all CRAWL requirements
 */

// Wait strategy options for handling dynamic content
export type WaitStrategy =
  | 'networkidle'
  | 'framework-hydration'
  | 'css-injection'
  | 'custom-delay';

// Crawl configuration (all CRAWL requirements reflected here)
export interface CrawlConfig {
  seedUrls: string[];
  maxDepth: number;                      // default 3
  maxPages: number;                      // default 100
  domainAllowlist?: string[];
  respectRobotsTxt: boolean;             // default true (strict mode)
  maxConcurrency: number;                // default 5
  maxRequestsPerMinute: number;          // default 60
  timingJitterMs: [number, number];      // default [100, 500] min/max jitter
  userAgents: string[];                  // rotation list
  viewportSizes: Array<{ width: number; height: number }>;
  waitStrategies: WaitStrategy[];
  outputDir: string;                     // default '.uidna'
}

// Detected framework and CSS-in-JS library
export type Framework = 'react' | 'vue' | 'angular' | 'svelte' | 'unknown';
export type CssInJsLibrary = 'emotion' | 'styled-components' | 'stitches' | 'none';

// Page data extracted during crawl
export interface PageData {
  url: string;
  finalUrl: string;                      // after redirects
  statusCode: number;
  title: string;
  timestamp: string;
  framework: Framework;
  cssInJsLibrary: CssInJsLibrary;
  htmlContent: string;
  screenshotPath?: string;               // full page screenshot
}

// Complete crawl result
export interface CrawlResult {
  config: CrawlConfig;
  startTime: string;
  endTime: string;
  pagesProcessed: number;
  pagesFailed: number;
  pagesSkipped: number;                  // robots.txt blocked
  pages: PageData[];
}

// Snapshot for diff detection (CRAWL-08)
export interface CrawlSnapshot {
  timestamp: string;
  configHash: string;
  tokenHashes: Record<string, string>;   // pageUrl -> hash of extracted tokens
  totalPages: number;
}

// Diff result between two snapshots
export interface DiffResult {
  previousSnapshot: CrawlSnapshot;
  currentSnapshot: CrawlSnapshot;
  added: string[];                       // new page URLs
  removed: string[];                     // removed page URLs
  changed: string[];                     // pages with changed tokens
  unchanged: string[];
}
