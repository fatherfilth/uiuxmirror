/**
 * Extract command handler
 * Runs extraction pipeline on crawled data (normalization, component detection, pattern analysis)
 */

import fs from 'fs-extra';
import path from 'node:path';
import { loadFullConfig } from '../config-loader.js';
import { createSpinner } from '../progress.js';
import { TokenStore } from '../../storage/index.js';
import { normalizePipeline } from '../../normalization/normalize-pipeline.js';
import { detectFlows, analyzeContentStyle, PatternStore } from '../../patterns/index.js';
import type { PageTokens } from '../../types/tokens.js';
import type { PageData } from '../../types/crawl-config.js';
import type { DetectedComponent } from '../../types/components.js';
import type { StoredPattern } from '../../types/patterns.js';

/**
 * Print extract-specific help
 */
function printExtractHelp() {
  console.log(`
Usage: uidna extract [options]

Run extraction pipeline on crawled data (normalize tokens, detect components, analyze patterns).

Options:
  --output-dir <dir>  Output directory (default: .uidna)
  --help              Show this help message
  `.trim());
}

/**
 * Parse command-line arguments
 */
function parseExtractArgs(args: string[]): { outputDir?: string; showHelp?: boolean } {
  const config: { outputDir?: string; showHelp?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      config.showHelp = true;
      continue;
    }

    if (arg === '--output-dir') {
      config.outputDir = args[++i];
      continue;
    }
  }

  return config;
}

/**
 * Extract command entry point
 */
export async function extractCommand(args: string[]): Promise<void> {
  // Parse arguments
  const parsed = parseExtractArgs(args);

  // Handle --help
  if (parsed.showHelp) {
    printExtractHelp();
    return;
  }

  try {
    // Load config to get outputDir
    const config = await loadFullConfig({
      outputDir: parsed.outputDir,
      seedUrls: ['http://example.com'], // Dummy value - not used for extract
    });

    const outputDir = config.outputDir;
    const tokensDir = path.join(outputDir, 'tokens');

    // Check if crawl data exists
    if (!await fs.pathExists(tokensDir)) {
      console.error('\nNo crawl data found. Run `uidna crawl <url>` first.');
      process.exit(1);
    }

    // Phase 1: Load raw token data from storage
    const spinner1 = createSpinner('Loading crawl data...').start();
    const tokenStore = new TokenStore(tokensDir);
    const pageUrls = await tokenStore.getAllPageUrls();

    if (pageUrls.length === 0) {
      spinner1.fail();
      console.error('\nNo page tokens found in crawl data. Run `uidna crawl <url>` first.');
      process.exit(1);
    }

    // Load all page tokens
    const allPageTokens: Record<string, PageTokens> = {};
    for (const url of pageUrls) {
      const tokens = await tokenStore.loadPageTokens(url);
      if (tokens) {
        allPageTokens[url] = tokens;
      }
    }
    spinner1.succeed(`Loaded data from ${pageUrls.length} pages`);

    // Phase 2: Run normalization pipeline
    const spinner2 = createSpinner('Normalizing tokens...').start();
    const normalizationResult = normalizePipeline(allPageTokens);

    // Save normalization result
    const normalizedDir = path.join(outputDir, 'normalized');
    await fs.ensureDir(normalizedDir);
    await fs.writeJson(
      path.join(normalizedDir, 'normalization-result.json'),
      normalizationResult,
      { spaces: 2 }
    );

    spinner2.succeed(`Normalized tokens (${normalizationResult.colors.clusters.length} color clusters, ${normalizationResult.typography.normalized.length} typography tokens)`);

    // Phase 3: Run component detection and aggregation
    const spinner3 = createSpinner('Detecting components...').start();

    // We need to load HTML content and page data for component detection
    // For now, we'll skip this since we need the PageData from the crawl
    // This is a limitation - extract assumes component detection was done during crawl
    // We'll detect components from the crawled HTML if available

    const crawlMetaPath = path.join(outputDir, 'crawl-result.json');
    let pageData: PageData[] = [];
    let htmlContents = new Map<string, string>();
    let detectedComponents: DetectedComponent[] = [];

    if (await fs.pathExists(crawlMetaPath)) {
      const crawlResult = await fs.readJson(crawlMetaPath);
      pageData = crawlResult.pages || [];

      // Load HTML content from page data
      for (const page of pageData) {
        htmlContents.set(page.url, page.htmlContent || '');
      }

      // Detect components per page (simplified - would need live browser for full detection)
      // For v1, we skip component detection in extract command
      // Components should be detected during crawl with live browser access
      spinner3.warn('Component detection requires live browser - run during crawl');
    } else {
      spinner3.warn('No crawl metadata found - skipping component detection');
    }

    // Phase 4: Run pattern detection and content analysis
    const spinner4 = createSpinner('Analyzing patterns...').start();

    let contentStyleResult = null;
    let flows: any[] = [];
    let storedPatterns: StoredPattern[] = [];

    if (pageData.length > 0) {
      // Detect flows
      flows = detectFlows(pageData, htmlContents);

      // Analyze content style
      contentStyleResult = analyzeContentStyle(pageData, htmlContents, detectedComponents);

      // Save pattern results
      const patternStore = new PatternStore(outputDir);

      // Convert flows to stored patterns
      for (const flow of flows) {
        storedPatterns.push(patternStore.storeFlow(flow));
      }

      // Convert content patterns to stored patterns
      if (contentStyleResult) {
        // Voice patterns
        for (const pattern of contentStyleResult.voicePatterns) {
          storedPatterns.push(patternStore.storeContentPattern(pattern, 'voice-tone', pageUrls));
        }

        // Capitalization patterns
        for (const pattern of contentStyleResult.capitalizationPatterns) {
          storedPatterns.push(patternStore.storeContentPattern(pattern, 'capitalization', pageUrls));
        }

        // CTA hierarchy
        for (const pattern of contentStyleResult.ctaHierarchy) {
          storedPatterns.push(patternStore.storeContentPattern(pattern, 'cta-hierarchy', pageUrls));
        }

        // Error patterns
        for (const pattern of contentStyleResult.errorPatterns) {
          storedPatterns.push(patternStore.storeContentPattern(pattern, 'error-grammar', pageUrls));
        }
      }

      // Save all patterns
      await patternStore.savePatterns(storedPatterns);

      spinner4.succeed(`Analyzed patterns (${flows.length} flows, ${contentStyleResult?.voicePatterns.length || 0} voice patterns)`);
    } else {
      spinner4.warn('No page metadata found - skipping pattern analysis');
    }

    // Phase 5: Write standardized output files for downstream consumers
    // Consumer commands (report, synth, export, MCP) read from outputDir root
    const spinner5 = createSpinner('Writing standardized output files...').start();

    // 1. tokens.json - NormalizationResult (already computed as normalizationResult)
    await fs.writeJson(path.join(outputDir, 'tokens.json'), normalizationResult, { spaces: 2 });

    // 2. components.json - empty array (component detection requires live browser, skipped in extract)
    await fs.writeJson(path.join(outputDir, 'components.json'), [], { spaces: 2 });

    // 3. patterns.json - StoredPattern[] (already computed as storedPatterns)
    await fs.writeJson(path.join(outputDir, 'patterns.json'), storedPatterns, { spaces: 2 });

    // 4. content_style.json - ContentStyleResult (already computed as contentStyleResult)
    await fs.writeJson(path.join(outputDir, 'content_style.json'), contentStyleResult, { spaces: 2 });

    // 5. evidence_index.json - load from evidence store if it exists
    const evidenceSourcePath = path.join(outputDir, 'evidence', 'evidence-index.json');
    const evidenceIndex = await fs.pathExists(evidenceSourcePath)
      ? await fs.readJson(evidenceSourcePath)
      : { entries: {}, byPage: {}, bySelector: {} };
    await fs.writeJson(path.join(outputDir, 'evidence_index.json'), evidenceIndex, { spaces: 2 });

    spinner5.succeed('Wrote standardized output files');

    // Print summary
    console.log('\n=== Extraction Complete ===');
    console.log('\nToken Summary (Normalized):');
    console.log(`  Color clusters: ${normalizationResult.colors.clusters.length}`);
    console.log(`  Typography tokens: ${normalizationResult.typography.normalized.length}`);
    console.log(`  Spacing tokens: ${normalizationResult.spacing.normalized.length}`);
    console.log(`  Spacing scale: base=${normalizationResult.spacing.scale.baseUnit}px, coverage=${(normalizationResult.spacing.scale.coverage * 100).toFixed(1)}%`);
    console.log(`  DTCG tokens: ${Object.keys(normalizationResult.dtcg).length} categories`);

    if (flows.length > 0 || contentStyleResult) {
      console.log('\nPattern Analysis:');
      console.log(`  Flows detected: ${flows.length}`);
      if (contentStyleResult) {
        console.log(`  Voice patterns: ${contentStyleResult.voicePatterns.length}`);
        console.log(`  Capitalization patterns: ${contentStyleResult.capitalizationPatterns.length}`);
        console.log(`  CTA hierarchy levels: ${contentStyleResult.ctaHierarchy.length}`);
        console.log(`  Error patterns: ${contentStyleResult.errorPatterns.length}`);
      }
    }

    console.log('\nOutput locations:');
    console.log(`  Normalized tokens: ${normalizedDir}`);
    console.log(`  Patterns: ${path.join(outputDir, 'patterns')}`);
    console.log(`  Standardized JSON: ${outputDir}`);
    console.log('    tokens.json, components.json, patterns.json, content_style.json, evidence_index.json');
    console.log('');
  } catch (error) {
    console.error('\nExtraction failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
