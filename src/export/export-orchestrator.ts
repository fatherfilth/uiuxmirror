/**
 * Export Orchestrator
 * Top-level export function that generates all export files in one call
 * Phase 5 Plan 6: Integration of all export generators
 */

import { ensureDir, outputFile } from 'fs-extra';
import { join } from 'path';
import type { NormalizationResult } from '../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../components/component-aggregator.js';
import type { StoredPattern } from '../types/patterns.js';
import type { ContentStyleResult } from '../types/content-style.js';
import type { EvidenceIndex } from '../types/evidence.js';

// Import all generators
import {
  generateCSSCustomProperties,
  generateTailwindConfig,
  generateFigmaTokens,
  generateTokensJSON,
  generateComponentsJSON,
  generatePatternsJSON,
  generateContentStyleJSON,
  generateEvidenceIndexJSON,
  generateSkillMD,
} from './formatters/index.js';
import { generateAllStubs } from './stubs/index.js';
import { generateBrandDNAReport, generateContentStyleGuide } from './reports/index.js';

/**
 * Input required for export generation
 */
export interface ExportInput {
  tokens: NormalizationResult;
  components: AggregatedComponent[];
  patterns: StoredPattern[];
  contentStyle: ContentStyleResult;
  evidenceIndex: EvidenceIndex;
  metadata: {
    sourceUrl: string;
    crawlDate: string;
    totalPages: number;
  };
}

/**
 * Result of export generation
 */
export interface ExportResult {
  files: Map<string, string>; // relative path -> content
  summary: {
    totalFiles: number;
    formats: string[];
    jsonExports: string[];
    stubs: string[];
    reports: string[];
  };
}

/**
 * Export all design DNA data to files
 * Generates: 3 format files, 5 JSON files, N component stubs, 2 report documents
 *
 * @param input - All extracted design DNA data
 * @param outputDir - Directory to write files (default: .uidna/exports/)
 * @returns ExportResult with file map and summary
 */
export async function exportDesignDNA(
  input: ExportInput,
  outputDir: string = '.uidna/exports/'
): Promise<ExportResult> {
  const files = new Map<string, string>();

  // Generate format files
  const cssVars = generateCSSCustomProperties(input.tokens);
  files.set('formats/tokens.css', cssVars);

  const tailwindConfig = generateTailwindConfig(input.tokens);
  files.set('formats/tailwind.config.js', tailwindConfig);

  const figmaTokens = generateFigmaTokens(input.tokens);
  files.set('formats/figma-tokens.json', figmaTokens);

  // Generate JSON exports
  const tokensJSON = generateTokensJSON(input.tokens);
  files.set('tokens.json', JSON.stringify(tokensJSON, null, 2));

  const componentsJSON = generateComponentsJSON(input.components);
  files.set('components.json', JSON.stringify(componentsJSON, null, 2));

  const patternsJSON = generatePatternsJSON(input.patterns);
  files.set('patterns.json', JSON.stringify(patternsJSON, null, 2));

  const contentStyleJSON = generateContentStyleJSON(input.contentStyle);
  files.set('content_style.json', JSON.stringify(contentStyleJSON, null, 2));

  const evidenceIndexJSON = generateEvidenceIndexJSON(input.evidenceIndex);
  files.set('evidence_index.json', JSON.stringify(evidenceIndexJSON, null, 2));

  // Generate component stubs
  const stubs = generateAllStubs(input.components, input.tokens);
  for (const [componentType, stubHTML] of stubs.entries()) {
    files.set(`stubs/${componentType}.html`, stubHTML);
  }

  // Generate reports
  const brandDNAReport = generateBrandDNAReport({
    tokens: input.tokens,
    components: input.components,
    patterns: input.patterns,
    metadata: input.metadata,
  });
  files.set('brand-dna-report.md', brandDNAReport);

  const contentStyleGuide = generateContentStyleGuide({
    contentResult: input.contentStyle,
    metadata: {
      sourceUrl: input.metadata.sourceUrl,
      crawlDate: input.metadata.crawlDate,
    },
  });
  files.set('content-style-guide.md', contentStyleGuide);

  // Generate SKILL.md
  const skillMD = generateSkillMD({
    tokens: input.tokens,
    components: input.components,
    contentStyle: input.contentStyle,
    metadata: input.metadata,
  });
  files.set('SKILL.md', skillMD);

  // Write all files to disk if outputDir provided
  if (outputDir) {
    await ensureDir(outputDir);

    for (const [relativePath, content] of files.entries()) {
      const fullPath = join(outputDir, relativePath);
      await outputFile(fullPath, content, 'utf-8');
    }
  }

  // Generate summary
  const formatFiles = Array.from(files.keys()).filter((p) => p.startsWith('formats/'));
  const jsonFiles = Array.from(files.keys()).filter((p) => p.endsWith('.json'));
  const stubFiles = Array.from(files.keys()).filter((p) => p.startsWith('stubs/'));
  const reportFiles = Array.from(files.keys()).filter((p) => p.endsWith('.md'));

  const summary = {
    totalFiles: files.size,
    formats: formatFiles,
    jsonExports: jsonFiles,
    stubs: stubFiles,
    reports: reportFiles,
  };

  return { files, summary };
}

/**
 * Generate human-readable summary of export result
 * Useful for CLI output
 *
 * @param result - Export result from exportDesignDNA
 * @returns Formatted summary string
 */
export function generateExportSummary(result: ExportResult): string {
  const lines: string[] = [];

  lines.push(`Generated ${result.summary.totalFiles} files:`);
  lines.push('');

  if (result.summary.formats.length > 0) {
    lines.push(`Formats (${result.summary.formats.length}):`);
    result.summary.formats.forEach((file) => lines.push(`  - ${file}`));
    lines.push('');
  }

  if (result.summary.jsonExports.length > 0) {
    lines.push(`JSON Exports (${result.summary.jsonExports.length}):`);
    result.summary.jsonExports.forEach((file) => lines.push(`  - ${file}`));
    lines.push('');
  }

  if (result.summary.stubs.length > 0) {
    lines.push(`Component Stubs (${result.summary.stubs.length}):`);
    result.summary.stubs.forEach((file) => lines.push(`  - ${file}`));
    lines.push('');
  }

  if (result.summary.reports.length > 0) {
    lines.push(`Reports (${result.summary.reports.length}):`);
    result.summary.reports.forEach((file) => lines.push(`  - ${file}`));
  }

  return lines.join('\n');
}
