/**
 * Report command - Generate Brand DNA Report and Content Style Guide
 * Phase 6 Plan 3: CLI output commands
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDir, outputFile } from 'fs-extra';
import { loadFullConfig } from '../config-loader.js';
import { withProgress } from '../progress.js';
import { generateBrandDNAReport, generateContentStyleGuide } from '../../export/reports/index.js';
import type { NormalizationResult } from '../../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../components/component-aggregator.js';
import type { StoredPattern } from '../../types/patterns.js';
import type { ContentStyleResult } from '../../types/content-style.js';

/**
 * Print report help message
 */
function printReportHelp() {
  console.log(`
Usage: uidna report [options]

Generate Brand DNA Report and Content Style Guide from extracted data.

Options:
  --output-dir <dir>  Output directory (default: .uidna/exports)
  --help, -h          Show this help message
  `.trim());
}

/**
 * Parse report command arguments
 */
function parseReportArgs(args: string[]): { outputDir?: string; help: boolean } {
  const result: { outputDir?: string; help: boolean } = { help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--output-dir' && i + 1 < args.length) {
      result.outputDir = args[i + 1];
      i++; // Skip next arg
    }
  }

  return result;
}

/**
 * Report command handler
 * Generates Brand DNA Report and Content Style Guide from extracted data
 *
 * @param args - Command line arguments (after 'report')
 */
export async function reportCommand(args: string[]): Promise<void> {
  // Parse flags
  const parsed = parseReportArgs(args);

  if (parsed.help) {
    printReportHelp();
    process.exit(0);
  }

  // Load config
  const config = await loadFullConfig({ outputDir: parsed.outputDir });

  // Verify extracted data exists
  const dataDir = config.outputDir || '.uidna';
  const tokensPath = join(dataDir, 'tokens.json');
  const componentsPath = join(dataDir, 'components.json');
  const patternsPath = join(dataDir, 'patterns.json');
  const contentStyleDataPath = join(dataDir, 'content_style.json');

  if (!existsSync(tokensPath)) {
    console.error('Error: No extracted data found.');
    console.error(`Expected file: ${tokensPath}`);
    console.error('\nRun "uidna extract" first to extract design DNA from crawled data.');
    process.exit(1);
  }

  // Load extracted data
  let tokens: NormalizationResult;
  let components: AggregatedComponent[];
  let patterns: StoredPattern[];
  let contentStyle: ContentStyleResult;

  try {
    tokens = JSON.parse(await readFile(tokensPath, 'utf-8'));
    components = JSON.parse(await readFile(componentsPath, 'utf-8'));
    patterns = JSON.parse(await readFile(patternsPath, 'utf-8'));
    contentStyle = JSON.parse(await readFile(contentStyleDataPath, 'utf-8'));
  } catch (error) {
    console.error('Error: Failed to load extracted data files.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Generate reports
  const outputDir = join(dataDir, 'exports');
  await ensureDir(outputDir);

  const brandDNAReport = await withProgress(
    'Generating Brand DNA Report...',
    async () => {
      return generateBrandDNAReport({
        tokens,
        components,
        patterns,
        metadata: {
          sourceUrl: 'extracted',
          crawlDate: new Date().toISOString(),
          totalPages: 1, // TODO: Get from actual metadata
        },
      });
    }
  );

  const contentStyleGuide = await withProgress(
    'Generating Content Style Guide...',
    async () => {
      return generateContentStyleGuide({
        contentResult: contentStyle,
        metadata: {
          sourceUrl: 'extracted',
          crawlDate: new Date().toISOString(),
        },
      });
    }
  );

  // Write reports
  const brandDNAPath = join(outputDir, 'brand-dna-report.md');
  const contentStylePath = join(outputDir, 'content-style-guide.md');

  await outputFile(brandDNAPath, brandDNAReport, 'utf-8');
  await outputFile(contentStylePath, contentStyleGuide, 'utf-8');

  // Print summary
  const brandDNASize = (brandDNAReport.length / 1024).toFixed(1);
  const contentStyleSize = (contentStyleGuide.length / 1024).toFixed(1);

  console.log('\nReports generated successfully:');
  console.log(`  Brand DNA Report: ${brandDNAPath} (${brandDNASize} KB)`);
  console.log(`  Content Style Guide: ${contentStylePath} (${contentStyleSize} KB)`);
}
