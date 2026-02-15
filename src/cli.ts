#!/usr/bin/env node
/**
 * CLI entry point for UIUX-Mirror
 * Allows users to run the pipeline from the command line
 */

import { runPipeline } from './orchestrator.js';
import { loadConfig } from './shared/config.js';

/**
 * Print usage message
 */
function printUsage() {
  console.log(`
Usage: uidna <seed-url> [options]

Options:
  --max-pages N      Maximum pages to crawl (default: 100)
  --max-depth N      Maximum link depth (default: 3)
  --output-dir DIR   Output directory (default: .uidna)
  --concurrency N    Max concurrent requests (default: 5)
  --no-robots        Disable robots.txt checking
  --help             Show this help message

Examples:
  uidna https://example.com
  uidna https://tailwindcss.com --max-pages 20 --max-depth 2
  uidna https://mysite.com --output-dir ./analysis
  `.trim());
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): {
  seedUrl?: string;
  maxPages?: number;
  maxDepth?: number;
  outputDir?: string;
  concurrency?: number;
  noRobots?: boolean;
  help?: boolean;
} {
  const args: any = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--max-pages') {
      args.maxPages = parseInt(argv[++i], 10);
    } else if (arg === '--max-depth') {
      args.maxDepth = parseInt(argv[++i], 10);
    } else if (arg === '--output-dir') {
      args.outputDir = argv[++i];
    } else if (arg === '--concurrency') {
      args.concurrency = parseInt(argv[++i], 10);
    } else if (arg === '--no-robots') {
      args.noRobots = true;
    } else if (!arg.startsWith('--') && !args.seedUrl) {
      args.seedUrl = arg;
    }
  }

  return args;
}

/**
 * Main CLI function
 */
async function main() {
  try {
    // Parse args (skip node and script name)
    const args = parseArgs(process.argv.slice(2));

    // Handle help flag
    if (args.help) {
      printUsage();
      process.exit(0);
    }

    // Validate seed URL
    if (!args.seedUrl) {
      console.error('Error: Seed URL is required\n');
      printUsage();
      process.exit(1);
    }

    // Build config from parsed args
    const config = loadConfig({
      seedUrls: [args.seedUrl],
      maxPages: args.maxPages,
      maxDepth: args.maxDepth,
      outputDir: args.outputDir,
      maxConcurrency: args.concurrency,
      respectRobotsTxt: !args.noRobots,
    });

    console.log('Starting UIUX-Mirror crawl...');
    console.log(`Seed URL: ${config.seedUrls[0]}`);
    console.log(`Max pages: ${config.maxPages}`);
    console.log(`Max depth: ${config.maxDepth}`);
    console.log(`Output: ${config.outputDir}`);
    console.log('');

    // Run pipeline with progress output
    const result = await runPipeline({
      config,
      onProgress: (status) => {
        console.log(`[${status.pagesProcessed}] Crawling: ${status.currentUrl}`);
      },
    });

    // Print summary
    console.log('');
    console.log('Crawl Complete');
    console.log('==============');
    console.log(`Pages crawled: ${result.crawlResult.pagesProcessed}`);
    console.log(`Pages failed: ${result.crawlResult.pagesFailed}`);
    console.log(`Pages skipped (robots.txt): ${result.crawlResult.pagesSkipped}`);
    console.log('');
    console.log('Tokens extracted:');
    console.log(`  Colors: ${result.tokenSummary.colors}`);
    console.log(`  Typography: ${result.tokenSummary.typography}`);
    console.log(`  Spacing: ${result.tokenSummary.spacing}`);
    console.log(`  Custom Properties: ${result.tokenSummary.customProperties}`);
    console.log(`  Border Radii: ${result.tokenSummary.radii}`);
    console.log(`  Shadows: ${result.tokenSummary.shadows}`);
    console.log(`  Z-Index: ${result.tokenSummary.zIndexes}`);
    console.log(`  Motion: ${result.tokenSummary.motion}`);
    console.log(`  Icons: ${result.tokenSummary.icons}`);
    console.log(`  Imagery: ${result.tokenSummary.imagery}`);
    console.log('');
    console.log(`Evidence entries: ${result.evidenceCount}`);
    console.log(`Output directory: ${result.outputDir}`);
    console.log('');

    // Print diff summary if re-crawl
    if (result.diffResult) {
      console.log('Re-crawl Diff Summary');
      console.log('=====================');
      console.log(`Pages added: ${result.diffResult.added.length}`);
      console.log(`Pages removed: ${result.diffResult.removed.length}`);
      console.log(`Pages changed: ${result.diffResult.changed.length}`);
      console.log(`Pages unchanged: ${result.diffResult.unchanged.length}`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running UIUX-Mirror:');
    console.error(error instanceof Error ? error.message : String(error));

    // Print stack trace if debug mode
    if (process.env.LOG_LEVEL === 'debug' && error instanceof Error) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run CLI
main();
