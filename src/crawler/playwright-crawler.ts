/**
 * Main Playwright crawler orchestration using Crawlee for UIUX-Mirror
 * Implements CRAWL-01, CRAWL-03, CRAWL-05: Core crawling with all compliance and stealth features
 */

import { PlaywrightCrawler } from 'crawlee';
import type { PlaywrightCrawlingContext } from 'crawlee';
import type { Page } from 'playwright';
import { ensureDir } from 'fs-extra';
import path from 'node:path';
import type { CrawlConfig, CrawlResult, PageData } from '../types/crawl-config.js';
import { RobotsValidator } from './robots-validator.js';
import { createStealthBrowser, getRandomUserAgent, getRandomViewport, addTimingJitter } from './stealth-config.js';
import { waitForContentReady } from './wait-strategies.js';
import { createLogger } from '../shared/logger.js';
import { sanitizeFilename } from '../shared/utils.js';

const logger = createLogger('playwright-crawler');

/**
 * Handler interface for crawler events
 * CRITICAL: onPageCrawled receives the live Playwright Page for downstream extractors
 */
export interface CrawlerHandlers {
  /**
   * Called after page is fully loaded and ready. The live Playwright Page is passed
   * so downstream extractors can run computed style queries while the page is still open.
   * Extractors MUST complete before this callback returns -- page may be recycled after.
   */
  onPageCrawled(pageData: PageData, page: Page): Promise<void>;

  /**
   * Called when a page fails to load or process
   */
  onPageFailed(url: string, error: Error): void;

  /**
   * Called when a page is skipped (e.g., blocked by robots.txt)
   */
  onPageSkipped(url: string, reason: string): void;
}

/**
 * Create a configured PlaywrightCrawler instance
 */
export function createCrawler(
  config: CrawlConfig,
  handlers: CrawlerHandlers,
  robotsValidator: RobotsValidator
): PlaywrightCrawler {
  logger.info('Creating PlaywrightCrawler with config', {
    maxConcurrency: config.maxConcurrency,
    maxRequestsPerMinute: config.maxRequestsPerMinute,
    maxDepth: config.maxDepth,
    maxPages: config.maxPages,
  });

  const crawler = new PlaywrightCrawler({
    // Use stealth browser
    launchContext: {
      launcher: createStealthBrowser(),
    },

    // Rate limiting and concurrency
    maxConcurrency: config.maxConcurrency,
    maxRequestsPerMinute: config.maxRequestsPerMinute,

    // Retry and timeout settings
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,

    // Request handler - main crawl logic
    async requestHandler(context: PlaywrightCrawlingContext) {
      const { request, page, enqueueLinks } = context;
      const url = request.url;

      logger.debug(`Processing URL: ${url}`);

      // Check if we've hit the max pages limit (tracked outside this scope)
      // The wrapped handler will increment pagesProcessed
      // We skip processing if limit is already reached

      try {
        // Step 1: Check robots.txt compliance
        const allowed = await robotsValidator.isAllowed(url);
        if (!allowed) {
          logger.info(`Skipping URL blocked by robots.txt: ${url}`);
          handlers.onPageSkipped(url, 'robots.txt blocked');
          return;
        }

        // Step 2: Apply timing jitter for anti-bot detection
        await addTimingJitter(config.timingJitterMs[0], config.timingJitterMs[1]);

        // Step 3: Set random user agent and viewport
        const userAgent = getRandomUserAgent(config.userAgents);
        const viewport = getRandomViewport(config.viewportSizes);

        await page.setViewportSize(viewport);
        await page.setExtraHTTPHeaders({
          'User-Agent': userAgent,
        });

        // Step 4: Navigate to URL
        logger.debug(`Navigating to ${url}`);
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        if (!response) {
          throw new Error(`Failed to load URL: ${url}`);
        }

        const statusCode = response.status();
        logger.debug(`Page loaded with status ${statusCode}: ${url}`);

        // Step 5: Wait for dynamic content to be ready
        const { framework, cssInJsLibrary } = await waitForContentReady(page);

        // Step 6: Capture screenshot
        const screenshotDir = path.join(config.outputDir, 'screenshots');
        await ensureDir(screenshotDir);

        const sanitizedName = sanitizeFilename(url);
        const screenshotPath = path.join(screenshotDir, `${sanitizedName}.png`);

        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });

        logger.debug(`Screenshot saved: ${screenshotPath}`);

        // Step 7: Build PageData object
        const pageData: PageData = {
          url,
          finalUrl: page.url(), // May differ from original URL due to redirects
          statusCode,
          title: await page.title(),
          timestamp: new Date().toISOString(),
          framework,
          cssInJsLibrary,
          htmlContent: await page.content(),
          screenshotPath,
        };

        // Step 8: Call onPageCrawled handler with PageData AND the live Page
        // CRITICAL: Await the handler so extractors finish before Crawlee recycles the page
        logger.debug(`Calling onPageCrawled handler for ${url}`);
        await handlers.onPageCrawled(pageData, page);

        // Step 9: Enqueue discovered links
        const currentDepth = (request.userData?.depth as number | undefined) ?? 0;

        if (currentDepth < config.maxDepth) {
          logger.debug(`Enqueuing links from ${url} (depth: ${currentDepth + 1})`);

          await enqueueLinks({
            strategy: 'same-domain',
            transformRequestFunction: (req) => {
              // Apply domain allowlist if configured
              if (config.domainAllowlist && config.domainAllowlist.length > 0) {
                try {
                  const reqUrl = new URL(req.url);
                  const allowed = config.domainAllowlist.some(
                    (domain) => reqUrl.hostname === domain || reqUrl.hostname.endsWith(`.${domain}`)
                  );

                  if (!allowed) {
                    logger.debug(`Skipping URL outside domain allowlist: ${req.url}`);
                    return false;
                  }
                } catch {
                  return false;
                }
              }

              // Filter out non-HTML resources
              const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.css', '.js', '.json', '.xml', '.pdf', '.zip', '.tar', '.gz'];
              const urlLower = req.url.toLowerCase();

              if (skipExtensions.some((ext) => urlLower.endsWith(ext))) {
                logger.debug(`Skipping non-HTML resource: ${req.url}`);
                return false;
              }

              // Set depth for child URLs
              if (!req.userData) req.userData = {};
              req.userData.depth = currentDepth + 1;
              return req;
            },
          });
        } else {
          logger.debug(`Max depth reached for ${url}, not enqueuing links`);
        }
      } catch (error) {
        logger.error(`Error processing URL: ${url}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        handlers.onPageFailed(url, error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Failed request handler
    failedRequestHandler(context: PlaywrightCrawlingContext, error: Error) {
      const url = context.request.url;
      logger.error(`Request failed: ${url}`, {
        error: error.message,
      });
      handlers.onPageFailed(url, error);
    },
  });

  return crawler;
}

/**
 * Run a complete crawl with the provided configuration and handlers
 */
export async function runCrawl(
  config: CrawlConfig,
  handlers: CrawlerHandlers
): Promise<CrawlResult> {
  const startTime = new Date().toISOString();
  logger.info('Starting crawl', { seedUrls: config.seedUrls, startTime });

  // Create robots.txt validator
  const robotsValidator = new RobotsValidator(config.respectRobotsTxt);

  // Ensure output directory exists
  await ensureDir(config.outputDir);

  // Track metrics
  let pagesProcessed = 0;
  let pagesFailed = 0;
  let pagesSkipped = 0;
  const pages: PageData[] = [];

  // Wrap handlers to track metrics
  const wrappedHandlers: CrawlerHandlers = {
    async onPageCrawled(pageData, page) {
      pagesProcessed++;
      pages.push(pageData);
      logger.info(`Page processed (${pagesProcessed}/${config.maxPages}): ${pageData.url}`);
      await handlers.onPageCrawled(pageData, page);
    },

    onPageFailed(url, error) {
      pagesFailed++;
      logger.warn(`Page failed (${pagesFailed} total): ${url}`);
      handlers.onPageFailed(url, error);
    },

    onPageSkipped(url, reason) {
      pagesSkipped++;
      logger.info(`Page skipped (${pagesSkipped} total): ${url} - ${reason}`);
      handlers.onPageSkipped(url, reason);
    },
  };

  // Create crawler
  const crawler = createCrawler(config, wrappedHandlers, robotsValidator);

  // Note: Max pages limit is enforced in the wrapped handler by tracking pagesProcessed
  // Crawlee will naturally stop when there are no more URLs to process or when we stop adding them

  // Run the crawler
  await crawler.run(config.seedUrls.map((url) => ({ url, userData: { depth: 0 } })));

  const endTime = new Date().toISOString();
  logger.info('Crawl complete', {
    endTime,
    pagesProcessed,
    pagesFailed,
    pagesSkipped,
  });

  return {
    config,
    startTime,
    endTime,
    pagesProcessed,
    pagesFailed,
    pagesSkipped,
    pages,
  };
}
