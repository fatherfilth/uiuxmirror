/**
 * Export command - Export design tokens in various formats
 * Phase 6 Plan 3: CLI output commands
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDir, outputFile } from 'fs-extra';
import { loadFullConfig } from '../config-loader.js';
import { withProgress } from '../progress.js';
import {
  exportDesignDNA,
  generateExportSummary,
  type ExportInput,
} from '../../export/export-orchestrator.js';
import {
  generateCSSCustomProperties,
  generateTailwindConfig,
  generateFigmaTokens,
  generateTokensJSON,
  generateComponentsJSON,
  generatePatternsJSON,
  generateContentStyleJSON,
  generateEvidenceIndexJSON,
} from '../../export/formatters/index.js';
import type { NormalizationResult } from '../../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../components/component-aggregator.js';
import type { StoredPattern } from '../../types/patterns.js';
import type { ContentStyleResult } from '../../types/content-style.js';
import type { EvidenceIndex } from '../../types/evidence.js';

/**
 * Valid export formats
 */
const VALID_FORMATS = ['tokens', 'figma', 'tailwind', 'cssvars', 'json', 'all'] as const;
type ExportFormat = typeof VALID_FORMATS[number];

/**
 * Print export help message
 */
function printExportHelp() {
  console.log(`
Usage: uidna export [options]

Export design tokens in various formats.

Options:
  --format <fmt>      Export format (repeatable): tokens, figma, tailwind, cssvars, json, all
                      Default: all
  --output-dir <dir>  Output directory (default: .uidna/exports)
  --help, -h          Show this help message

Examples:
  uidna export                          Export all formats
  uidna export --format tailwind        Export Tailwind config only
  uidna export --format cssvars --format figma  Export CSS vars and Figma tokens
  `.trim());
}

/**
 * Parse export command arguments
 */
function parseExportArgs(args: string[]): {
  formats: ExportFormat[];
  outputDir?: string;
  help: boolean;
} {
  const result: { formats: ExportFormat[]; outputDir?: string; help: boolean } = {
    formats: [],
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--output-dir' && i + 1 < args.length) {
      result.outputDir = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--format' && i + 1 < args.length) {
      const format = args[i + 1];
      if (!VALID_FORMATS.includes(format as ExportFormat)) {
        console.error(`Error: Invalid format '${format}'`);
        console.error(`Valid formats: ${VALID_FORMATS.join(', ')}`);
        process.exit(1);
      }
      result.formats.push(format as ExportFormat);
      i++; // Skip next arg
    }
  }

  // Default to 'all' if no formats specified
  if (result.formats.length === 0) {
    result.formats.push('all');
  }

  return result;
}

/**
 * Export command handler
 * Exports design tokens in various formats
 *
 * @param args - Command line arguments (after 'export')
 */
export async function exportCommand(args: string[]): Promise<void> {
  // Parse flags
  const parsed = parseExportArgs(args);

  if (parsed.help) {
    printExportHelp();
    process.exit(0);
  }

  // Load config
  const config = await loadFullConfig({
    outputDir: parsed.outputDir,
    seedUrls: ['http://example.com'], // Dummy value - not used for export
  });

  // Verify extracted data exists
  const dataDir = config.outputDir || '.uidna';
  const tokensPath = join(dataDir, 'tokens.json');
  const componentsPath = join(dataDir, 'components.json');
  const patternsPath = join(dataDir, 'patterns.json');
  const contentStyleDataPath = join(dataDir, 'content_style.json');
  const evidencePath = join(dataDir, 'evidence_index.json');

  if (!existsSync(tokensPath)) {
    console.error('Error: No extracted data found.');
    console.error(`Expected file: ${tokensPath}`);
    console.error('\nRun "uidna extract" first to extract design DNA from crawled data.');
    process.exit(1);
  }

  // Load design DNA data
  let tokens: NormalizationResult;
  let components: AggregatedComponent[];
  let patterns: StoredPattern[];
  let contentStyle: ContentStyleResult;
  let evidenceIndex: EvidenceIndex;

  try {
    tokens = JSON.parse(await readFile(tokensPath, 'utf-8'));
    components = JSON.parse(await readFile(componentsPath, 'utf-8'));
    patterns = JSON.parse(await readFile(patternsPath, 'utf-8'));
    contentStyle = JSON.parse(await readFile(contentStyleDataPath, 'utf-8'));
    evidenceIndex = existsSync(evidencePath)
      ? JSON.parse(await readFile(evidencePath, 'utf-8'))
      : { tokens: {}, components: {}, patterns: {} };
  } catch (error) {
    console.error('Error: Failed to load extracted data files.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const outputDir = join(dataDir, 'exports');
  await ensureDir(outputDir);

  // If format is "all", use exportDesignDNA orchestrator
  if (parsed.formats.includes('all')) {
    const exportInput: ExportInput = {
      tokens,
      components,
      patterns,
      contentStyle,
      evidenceIndex,
      metadata: {
        sourceUrl: 'extracted',
        crawlDate: new Date().toISOString(),
        totalPages: 1, // TODO: Get from actual metadata
      },
    };

    const result = await withProgress('Exporting design DNA...', async () => {
      return await exportDesignDNA(exportInput, outputDir);
    });

    // Print summary
    console.log('\n' + generateExportSummary(result));
    return;
  }

  // Otherwise, call individual generators based on format flags
  const generatedFiles: string[] = [];

  for (const format of parsed.formats) {
    switch (format) {
      case 'cssvars': {
        await withProgress('Generating CSS custom properties...', async () => {
          const cssVars = generateCSSCustomProperties(tokens);
          const cssPath = join(outputDir, 'formats', 'tokens.css');
          await ensureDir(join(outputDir, 'formats'));
          await outputFile(cssPath, cssVars, 'utf-8');
          generatedFiles.push(cssPath);
        });
        break;
      }

      case 'tailwind': {
        await withProgress('Generating Tailwind config...', async () => {
          const tailwindConfig = generateTailwindConfig(tokens);
          const tailwindPath = join(outputDir, 'formats', 'tailwind.config.js');
          await ensureDir(join(outputDir, 'formats'));
          await outputFile(tailwindPath, tailwindConfig, 'utf-8');
          generatedFiles.push(tailwindPath);
        });
        break;
      }

      case 'figma': {
        await withProgress('Generating Figma tokens...', async () => {
          const figmaTokens = generateFigmaTokens(tokens);
          const figmaPath = join(outputDir, 'formats', 'figma-tokens.json');
          await ensureDir(join(outputDir, 'formats'));
          await outputFile(figmaPath, figmaTokens, 'utf-8');
          generatedFiles.push(figmaPath);
        });
        break;
      }

      case 'json':
      case 'tokens': {
        await withProgress('Generating JSON exports...', async () => {
          const tokensJSON = generateTokensJSON(tokens);
          const tokensJSONPath = join(outputDir, 'tokens.json');
          await outputFile(tokensJSONPath, JSON.stringify(tokensJSON, null, 2), 'utf-8');
          generatedFiles.push(tokensJSONPath);

          const componentsJSON = generateComponentsJSON(components);
          const componentsJSONPath = join(outputDir, 'components.json');
          await outputFile(componentsJSONPath, JSON.stringify(componentsJSON, null, 2), 'utf-8');
          generatedFiles.push(componentsJSONPath);

          const patternsJSON = generatePatternsJSON(patterns);
          const patternsJSONPath = join(outputDir, 'patterns.json');
          await outputFile(patternsJSONPath, JSON.stringify(patternsJSON, null, 2), 'utf-8');
          generatedFiles.push(patternsJSONPath);

          const contentStyleJSON = generateContentStyleJSON(contentStyle);
          const contentStyleJSONPath = join(outputDir, 'content_style.json');
          await outputFile(contentStyleJSONPath, JSON.stringify(contentStyleJSON, null, 2), 'utf-8');
          generatedFiles.push(contentStyleJSONPath);

          const evidenceIndexJSON = generateEvidenceIndexJSON(evidenceIndex);
          const evidenceIndexJSONPath = join(outputDir, 'evidence_index.json');
          await outputFile(evidenceIndexJSONPath, JSON.stringify(evidenceIndexJSON, null, 2), 'utf-8');
          generatedFiles.push(evidenceIndexJSONPath);
        });
        break;
      }
    }
  }

  // Print summary
  console.log(`\nGenerated ${generatedFiles.length} file(s):`);
  generatedFiles.forEach((file) => console.log(`  - ${file}`));
}
