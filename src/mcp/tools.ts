import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as z from 'zod/v4';
import { synthesizeComponent } from '../synthesis/component-composer.js';
import type { DesignDNA, ComponentRequest } from '../types/synthesis.js';
import type { NormalizationResult } from '../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../components/component-aggregator.js';
import {
  generateCSSCustomProperties,
  generateTailwindConfig,
  generateFigmaTokens,
  generateTokensJSON,
} from '../export/formatters/index.js';

/**
 * Register MCP tools that expose design DNA actions
 */
// Define schemas outside the function to avoid TypeScript recursion issues
const synthesizeSchema = {
  component_type: z
    .string()
    .describe('Component to synthesize, e.g. data-table, modal, tabs'),
} as const;

const exportSchema = {
  format: z
    .enum(['css', 'tailwind', 'figma', 'json'])
    .describe('Export format'),
} as const;

const getTokenSchema = {
  query: z
    .string()
    .describe(
      "Token name or type to search for, e.g. 'primary' or 'color'"
    ),
} as const;

export async function registerTools(server: McpServer, dataDir: string): Promise<void> {
  // Helper to load design DNA from dataDir
  async function loadDesignDNA(): Promise<DesignDNA> {
    try {
      const tokensPath = join(dataDir, 'tokens.json');
      const componentsPath = join(dataDir, 'components.json');

      const [tokensRaw, componentsRaw] = await Promise.all([
        readFile(tokensPath, 'utf-8'),
        readFile(componentsPath, 'utf-8'),
      ]);

      const tokens: NormalizationResult = JSON.parse(tokensRaw);
      const components: AggregatedComponent[] = JSON.parse(componentsRaw);

      return {
        tokens,
        components,
        metadata: {
          sourceUrl: 'unknown',
          crawlDate: new Date().toISOString(),
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Failed to load design DNA:', error);
      throw new Error(
        'Design DNA not available. Run `uidna crawl` and `uidna extract` first.'
      );
    }
  }

  // 1. synthesize_component tool
  (server.registerTool as any)(
    'synthesize_component',
    {
      description:
        'Synthesize a new component using extracted design DNA as constraints',
      inputSchema: synthesizeSchema,
    },
    async (args: any) => {
      const component_type = args.component_type as string;
      console.error(`[MCP Tool] synthesize_component: ${component_type}`);
      try {
        const designDNA = await loadDesignDNA();
        const request: ComponentRequest = {
          type: component_type,
          constraints: {},
        };

        const result = await synthesizeComponent(request, designDNA);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  component_type,
                  html: result.html,
                  css: result.css,
                  states: result.states,
                  accessibility: result.accessibility,
                  evidence: result.evidence,
                  confidence: result.confidence,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error('synthesize_component error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
        };
      }
    }
  );

  // 2. export_format tool
  (server.registerTool as any)(
    'export_format',
    {
      description: 'Export design tokens in a specified format',
      inputSchema: exportSchema,
    },
    async (args: any) => {
      const format = args.format as 'css' | 'tailwind' | 'figma' | 'json';
      console.error(`[MCP Tool] export_format: ${format}`);
      try {
        const tokensPath = join(dataDir, 'tokens.json');
        const tokensRaw = await readFile(tokensPath, 'utf-8');
        const tokens: NormalizationResult = JSON.parse(tokensRaw);

        let content: string;
        switch (format) {
          case 'css':
            content = generateCSSCustomProperties(tokens);
            break;
          case 'tailwind':
            content = generateTailwindConfig(tokens);
            break;
          case 'figma':
            content = generateFigmaTokens(tokens);
            break;
          case 'json':
            content = JSON.stringify(generateTokensJSON(tokens), null, 2);
            break;
        }

        return {
          content: [{ type: 'text' as const, text: content }],
        };
      } catch (error) {
        console.error('export_format error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
        };
      }
    }
  );

  // 3. get_token tool
  (server.registerTool as any)(
    'get_token',
    {
      description: 'Look up specific design tokens by name or type',
      inputSchema: getTokenSchema,
    },
    async (args: any) => {
      const query = args.query as string;
      console.error(`[MCP Tool] get_token: ${query}`);
      try {
        const tokensPath = join(dataDir, 'tokens.json');
        const tokensRaw = await readFile(tokensPath, 'utf-8');
        const tokensExport = JSON.parse(tokensRaw);

        // Search in quick layer for matching names/types
        const results: Record<string, any> = {};
        const queryLower = query.toLowerCase();

        // Helper to search an object recursively
        function searchTokens(obj: any, prefix = '') {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null) {
              // If it looks like a token object (has $value), include it
              if ('$value' in value) {
                if (
                  fullKey.toLowerCase().includes(queryLower) ||
                  key.toLowerCase().includes(queryLower)
                ) {
                  results[fullKey] = value;
                }
              } else {
                // Recurse into nested objects
                searchTokens(value, fullKey);
              }
            }
          }
        }

        // Search in quick layer (tokens.json is a DualLayerExport)
        if (tokensExport.quick) {
          searchTokens(tokensExport.quick);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  query,
                  matches: Object.keys(results).length,
                  results,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error('get_token error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
        };
      }
    }
  );

  console.error(
    '[MCP] Registered 3 tools (synthesize_component, export_format, get_token)'
  );
}
