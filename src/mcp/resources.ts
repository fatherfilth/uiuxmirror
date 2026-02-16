import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Register MCP resources that expose design DNA data as queryable resources
 */
export async function registerResources(server: McpServer, dataDir: string): Promise<void> {
  // Helper function to safely read JSON files
  async function readJsonFile(relativePath: string): Promise<string> {
    try {
      const fullPath = join(dataDir, relativePath);
      const content = await readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Failed to read ${relativePath}:`, error);
      return JSON.stringify({
        error: `No data available. Run \`uidna crawl\` and \`uidna extract\` first.`,
        details: error instanceof Error ? error.message : String(error)
      }, null, 2);
    }
  }

  // 1. design-tokens resource
  (server.registerResource as any)(
    'design-tokens',
    'design-tokens://tokens',
    {
      description: 'Normalized design tokens extracted from the crawled site (colors, typography, spacing, etc.)',
      mimeType: 'application/json',
    },
    async () => {
      console.error('[MCP Resource] design-tokens requested');
      const content = await readJsonFile('tokens.json');
      return {
        contents: [{
          uri: 'design-tokens://tokens',
          text: content,
        }],
      };
    }
  );

  // 2. components resource
  (server.registerResource as any)(
    'components',
    'design-tokens://components',
    {
      description: 'Component patterns detected from the crawled site (buttons, inputs, cards, nav, modals)',
      mimeType: 'application/json',
    },
    async () => {
      console.error('[MCP Resource] components requested');
      const content = await readJsonFile('components.json');
      return {
        contents: [{
          uri: 'design-tokens://components',
          text: content,
        }],
      };
    }
  );

  // 3. patterns resource
  (server.registerResource as any)(
    'patterns',
    'design-tokens://patterns',
    {
      description: 'Cross-page interaction patterns and content style rules',
      mimeType: 'application/json',
    },
    async () => {
      console.error('[MCP Resource] patterns requested');
      const content = await readJsonFile('patterns.json');
      return {
        contents: [{
          uri: 'design-tokens://patterns',
          text: content,
        }],
      };
    }
  );

  // 4. content-style resource
  (server.registerResource as any)(
    'content-style',
    'design-tokens://content-style',
    {
      description: 'Voice/tone, capitalization rules, CTA hierarchy, and error message grammar',
      mimeType: 'application/json',
    },
    async () => {
      console.error('[MCP Resource] content-style requested');
      const content = await readJsonFile('content_style.json');
      return {
        contents: [{
          uri: 'design-tokens://content-style',
          text: content,
        }],
      };
    }
  );

  // 5. brand-report resource
  (server.registerResource as any)(
    'brand-report',
    'design-tokens://brand-report',
    {
      description: 'Human-readable Brand DNA Report summarizing the complete design system',
      mimeType: 'text/markdown',
    },
    async () => {
      console.error('[MCP Resource] brand-report requested');
      try {
        const fullPath = join(dataDir, 'exports', 'brand-dna-report.md');
        const content = await readFile(fullPath, 'utf-8');
        return {
          contents: [{
            uri: 'design-tokens://brand-report',
            text: content,
          }],
        };
      } catch (error) {
        console.error(`Failed to read brand-dna-report.md:`, error);
        const errorMsg = 'Brand DNA Report not available. Run `uidna export` to generate reports.';
        return {
          contents: [{
            uri: 'design-tokens://brand-report',
            text: errorMsg,
          }],
        };
      }
    }
  );

  console.error('[MCP] Registered 5 resources (design-tokens, components, patterns, content-style, brand-report)');
}
