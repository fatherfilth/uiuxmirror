/**
 * Synth command - Synthesize new component using design DNA
 * Phase 6 Plan 3: CLI output commands
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDir, outputFile } from 'fs-extra';
import { loadFullConfig } from '../config-loader.js';
import { withProgress } from '../progress.js';
import { synthesizeComponent } from '../../synthesis/component-composer.js';
import type { DesignDNA, ComponentRequest } from '../../types/synthesis.js';
import type { NormalizationResult } from '../../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../../components/component-aggregator.js';

/**
 * Print synth help message
 */
function printSynthHelp() {
  console.log(`
Usage: uidna synth <component-type> [options]

Synthesize a new component using extracted design DNA.

Examples:
  uidna synth data-table
  uidna synth modal
  uidna synth card

Options:
  --output-dir <dir>  Output directory (default: .uidna/exports)
  --help, -h          Show this help message
  `.trim());
}

/**
 * Parse synth command arguments
 */
function parseSynthArgs(args: string[]): {
  componentType?: string;
  outputDir?: string;
  help: boolean;
} {
  const result: { componentType?: string; outputDir?: string; help: boolean } = {
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--output-dir' && i + 1 < args.length) {
      result.outputDir = args[i + 1];
      i++; // Skip next arg
    } else if (!arg.startsWith('--') && !result.componentType) {
      // First non-flag argument is component type
      result.componentType = arg;
    }
  }

  return result;
}

/**
 * Synth command handler
 * Synthesizes a new component using design DNA
 *
 * @param args - Command line arguments (after 'synth')
 */
export async function synthCommand(args: string[]): Promise<void> {
  // Parse flags
  const parsed = parseSynthArgs(args);

  if (parsed.help) {
    printSynthHelp();
    process.exit(0);
  }

  // Validate component type
  if (!parsed.componentType) {
    console.error('Error: Component type required\n');
    console.error('Examples:');
    console.error('  uidna synth data-table');
    console.error('  uidna synth modal');
    console.error('  uidna synth card');
    console.error('\nRun "uidna synth --help" for more information.');
    process.exit(1);
  }

  // Load config
  const config = await loadFullConfig({
    outputDir: parsed.outputDir,
    seedUrls: ['http://example.com'], // Dummy value - not used for synth
  });

  // Verify extracted data exists
  const dataDir = config.outputDir || '.uidna';
  const tokensPath = join(dataDir, 'tokens.json');
  const componentsPath = join(dataDir, 'components.json');

  if (!existsSync(tokensPath) || !existsSync(componentsPath)) {
    console.error('Error: No extracted data found.');
    console.error(`Expected files in: ${dataDir}/`);
    console.error('\nRun "uidna extract" first to extract design DNA from crawled data.');
    process.exit(1);
  }

  // Load design DNA data
  let tokens: NormalizationResult;
  let components: AggregatedComponent[];

  try {
    tokens = JSON.parse(await readFile(tokensPath, 'utf-8'));
    components = JSON.parse(await readFile(componentsPath, 'utf-8'));
  } catch (error) {
    console.error('Error: Failed to load extracted data files.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Build DesignDNA input
  const designDNA: DesignDNA = {
    tokens,
    components,
    metadata: {
      sourceUrl: 'extracted',
      crawlDate: new Date().toISOString(),
      totalPages: 1, // TODO: Get from actual metadata
    },
  };

  // Build ComponentRequest
  const request: ComponentRequest = {
    type: parsed.componentType,
    constraints: {},
  };

  // Run synthesis
  const synthesized = await withProgress(
    `Synthesizing ${parsed.componentType} component...`,
    async () => {
      const result = await synthesizeComponent(request, designDNA);
      return result;
    }
  );

  // Prepare output
  const outputDir = join(dataDir, 'exports', 'stubs');
  await ensureDir(outputDir);

  const htmlPath = join(outputDir, `${parsed.componentType}.html`);
  const jsonPath = join(outputDir, `${parsed.componentType}.json`);

  // Write HTML stub
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parsed.componentType} - Synthesized Component</title>
  <style>
${synthesized.css}
  </style>
</head>
<body>
${synthesized.html}
</body>
</html>`;

  await outputFile(htmlPath, htmlContent, 'utf-8');

  // Write JSON metadata (evidence and confidence)
  const jsonMetadata = {
    type: synthesized.type,
    confidence: synthesized.confidence,
    confidenceLevel: synthesized.confidenceLevel,
    evidence: synthesized.evidence,
    decisions: synthesized.decisions.map((d) => ({
      type: d.type,
      property: d.property,
      value: d.value,
      confidence: d.confidence,
      evidenceCount: d.evidence.length,
    })),
    states: synthesized.states.map((s) => ({
      name: s.name,
      confidence: s.confidence,
    })),
  };

  await outputFile(jsonPath, JSON.stringify(jsonMetadata, null, 2), 'utf-8');

  // Print summary
  const hasLLMRefinement = synthesized.decisions.some((d) => d.type === 'llm_refinement');

  console.log(`\nComponent synthesized successfully:`);
  console.log(`  Type: ${synthesized.type}`);
  console.log(`  Confidence: ${(synthesized.confidence * 100).toFixed(1)}% (${synthesized.confidenceLevel})`);
  console.log(`  Evidence: ${synthesized.evidence.length} items`);
  console.log(`  LLM Refinement: ${hasLLMRefinement ? 'Applied' : 'Not applied (ANTHROPIC_API_KEY not set)'}`);
  console.log(`\nOutput files:`);
  console.log(`  HTML: ${htmlPath}`);
  console.log(`  Metadata: ${jsonPath}`);
}
