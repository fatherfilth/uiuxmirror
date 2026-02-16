/**
 * Crawl command handler
 * Crawls a website and extracts design tokens with progress feedback
 */

import { loadFullConfig } from '../config-loader.js';
import { withProgress } from '../progress.js';
import { runPipeline } from '../../orchestrator.js';
import type { CrawlConfig } from '../../types/crawl-config.js';

/**
 * Print crawl-specific help
 */
function printCrawlHelp() {
  console.log(`
Usage: uidna crawl <url> [options]

Crawl a website and extract design tokens.

Options:
  --max-depth N       Maximum link depth (default: 3)
  --max-pages N       Maximum pages to crawl (default: 100)
  --domain <domain>   Allowed domain (repeatable)
  --output-dir <dir>  Output directory (default: .uidna)
  --concurrency N     Max concurrent requests (default: 5)
  --no-robots         Disable robots.txt checking
  --help              Show this help message
  `.trim());
}

/**
 * Parse command-line arguments into config overrides
 */
function parseCrawlArgs(args: string[]): Partial<CrawlConfig> & { seedUrl?: string; showHelp?: boolean } {
  const config: Partial<CrawlConfig> & { seedUrl?: string; showHelp?: boolean } = {
    domainAllowlist: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Handle flags
    if (arg === '--help' || arg === '-h') {
      config.showHelp = true;
      continue;
    }

    if (arg === '--max-depth') {
      config.maxDepth = parseInt(args[++i], 10);
      continue;
    }

    if (arg === '--max-pages') {
      config.maxPages = parseInt(args[++i], 10);
      continue;
    }

    if (arg === '--domain') {
      config.domainAllowlist!.push(args[++i]);
      continue;
    }

    if (arg === '--output-dir') {
      config.outputDir = args[++i];
      continue;
    }

    if (arg === '--concurrency') {
      config.maxConcurrency = parseInt(args[++i], 10);
      continue;
    }

    if (arg === '--no-robots') {
      config.respectRobotsTxt = false;
      continue;
    }

    // If not a flag, treat as seed URL
    if (!arg.startsWith('--')) {
      config.seedUrl = arg;
    }
  }

  return config;
}

/**
 * Crawl command entry point
 */
export async function crawlCommand(args: string[]): Promise<void> {
  // Parse arguments
  const parsed = parseCrawlArgs(args);

  // Handle --help
  if (parsed.showHelp) {
    printCrawlHelp();
    return;
  }

  // Validate seed URL is provided
  if (!parsed.seedUrl) {
    console.error('Error: Missing required argument <url>\n');
    printCrawlHelp();
    process.exit(1);
  }

  try {
    // Prepare config overrides
    const { seedUrl, showHelp, ...configOverrides } = parsed;
    const crawlConfig: Partial<CrawlConfig> = {
      ...configOverrides,
      seedUrls: [seedUrl],
    };

    // Load full config (file + CLI overrides)
    const config = await loadFullConfig(crawlConfig);

    // Print crawl header
    console.log('\n=== Crawl Configuration ===');
    console.log(`Seed URL: ${config.seedUrls[0]}`);
    console.log(`Max Pages: ${config.maxPages}`);
    console.log(`Max Depth: ${config.maxDepth}`);
    console.log(`Output Dir: ${config.outputDir}`);
    if (config.domainAllowlist && config.domainAllowlist.length > 0) {
      console.log(`Allowed Domains: ${config.domainAllowlist.join(', ')}`);
    }
    console.log('');

    // Run crawl with progress feedback
    const result = await withProgress(
      `Crawling ${config.seedUrls[0]}...`,
      async (update) => {
        return runPipeline({
          config,
          onProgress: (status) => {
            update(`Crawling: ${status.currentUrl} (${status.pagesProcessed}/${config.maxPages} pages)`);
          },
        });
      }
    );

    // Print completion summary
    console.log('\n=== Crawl Complete ===');
    console.log(`Pages crawled: ${result.crawlResult.pagesProcessed}`);
    console.log(`Pages failed: ${result.crawlResult.pagesFailed}`);
    console.log(`Pages skipped (robots.txt): ${result.crawlResult.pagesSkipped}`);
    console.log('');

    console.log('=== Token Summary ===');
    console.log(`Colors: ${result.tokenSummary.colors}`);
    console.log(`Typography: ${result.tokenSummary.typography}`);
    console.log(`Spacing: ${result.tokenSummary.spacing}`);
    console.log(`Custom Properties: ${result.tokenSummary.customProperties}`);
    console.log(`Border Radii: ${result.tokenSummary.radii}`);
    console.log(`Shadows: ${result.tokenSummary.shadows}`);
    console.log(`Z-Indexes: ${result.tokenSummary.zIndexes}`);
    console.log(`Motion: ${result.tokenSummary.motion}`);
    console.log(`Icons: ${result.tokenSummary.icons}`);
    console.log(`Imagery: ${result.tokenSummary.imagery}`);
    console.log('');

    console.log(`Evidence entries: ${result.evidenceCount}`);
    console.log(`Output directory: ${result.outputDir}`);
    console.log('');

    // Show diff summary if re-crawl
    if (result.diffResult) {
      console.log('=== Change Summary ===');
      console.log(`Pages added: ${result.diffResult.added.length}`);
      console.log(`Pages removed: ${result.diffResult.removed.length}`);
      console.log(`Pages changed: ${result.diffResult.changed.length}`);
      console.log(`Pages unchanged: ${result.diffResult.unchanged.length}`);
      console.log('');
    }
  } catch (error) {
    console.error('\nCrawl failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
