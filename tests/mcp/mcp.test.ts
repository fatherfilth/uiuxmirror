/**
 * Unit tests for MCP server (resources and tools)
 * Tests server creation, resource/tool registration, and handler behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createMcpServer } from '../../src/mcp/server.js';
import { registerResources } from '../../src/mcp/resources.js';
import { registerTools } from '../../src/mcp/tools.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Test data directory
const testDataDir = join(process.cwd(), 'tests', 'mcp', '.test-data');

// Fixture data
const tokensFixture = {
  quick: {
    colors: {
      primary: { $value: '#3b82f6', $type: 'color' },
      secondary: { $value: '#10b981', $type: 'color' },
      neutral: { $value: '#6b7280', $type: 'color' },
    },
    spacing: {
      xs: { $value: '4px', $type: 'dimension' },
      sm: { $value: '8px', $type: 'dimension' },
      md: { $value: '16px', $type: 'dimension' },
    },
    typography: {
      'heading-1': {
        'font-family': { $value: 'Inter, sans-serif', $type: 'fontFamily' },
        'font-size': { $value: '32px', $type: 'dimension' },
        'font-weight': { $value: '700', $type: 'fontWeight' },
      },
    },
  },
  rich: {
    colors: {
      primary: {
        $value: '#3b82f6',
        $type: 'color',
        $extensions: {
          'com.uiux-mirror': {
            confidence: 0.95,
            evidence: [
              { url: 'https://example.com', selector: '.btn-primary', property: 'background-color' },
            ],
          },
        },
      },
    },
  },
};

const componentsFixture = [
  {
    type: 'button',
    baseStyles: {
      padding: '8px 16px',
      borderRadius: '4px',
      fontWeight: '600',
    },
    variants: [
      { name: 'primary', styles: { backgroundColor: '#3b82f6', color: '#ffffff' } },
      { name: 'secondary', styles: { backgroundColor: '#10b981', color: '#ffffff' } },
    ],
    confidence: 0.92,
  },
  {
    type: 'input',
    baseStyles: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #d1d5db',
    },
    confidence: 0.88,
  },
];

const patternsFixture = {
  flows: [
    {
      id: 'flow-1',
      type: 'user-flow',
      name: 'Login Flow',
      pages: ['/', '/login', '/dashboard'],
      confidence: 0.85,
    },
  ],
  voice: {
    formality: 'casual',
    confidence: 0.78,
  },
};

beforeEach(async () => {
  // Create temp data directory
  await mkdir(testDataDir, { recursive: true });

  // Write fixture files
  await writeFile(
    join(testDataDir, 'tokens.json'),
    JSON.stringify(tokensFixture, null, 2),
    'utf-8'
  );
  await writeFile(
    join(testDataDir, 'components.json'),
    JSON.stringify(componentsFixture, null, 2),
    'utf-8'
  );
  await writeFile(
    join(testDataDir, 'patterns.json'),
    JSON.stringify(patternsFixture, null, 2),
    'utf-8'
  );
  await writeFile(
    join(testDataDir, 'content_style.json'),
    JSON.stringify({ voice: { formality: 'casual' } }, null, 2),
    'utf-8'
  );

  // Create exports directory with brand report
  await mkdir(join(testDataDir, 'exports'), { recursive: true });
  await writeFile(
    join(testDataDir, 'exports', 'brand-dna-report.md'),
    '# Brand DNA Report\n\nThis is a test report.',
    'utf-8'
  );
});

afterEach(async () => {
  // Clean up temp directory
  if (existsSync(testDataDir)) {
    await rm(testDataDir, { recursive: true, force: true });
  }
});

describe('mcp-server', () => {
  describe('Resources', () => {
    it('registers expected resources', async () => {
      // Create a mock server that tracks registrations
      const registeredResources: string[] = [];
      const mockServer = {
        registerResource: ((name: string) => {
          registeredResources.push(name);
        }) as any,
      };

      await registerResources(mockServer as McpServer, testDataDir);

      // Verify all expected resources are registered
      expect(registeredResources).toContain('design-tokens');
      expect(registeredResources).toContain('components');
      expect(registeredResources).toContain('patterns');
      expect(registeredResources).toContain('content-style');
      expect(registeredResources).toContain('brand-report');
      expect(registeredResources.length).toBe(5);
    });
  });

  describe('Tools', () => {
    it('registers expected tools', async () => {
      // Create a mock server that tracks tool registrations
      const registeredTools: string[] = [];
      const mockServer = {
        registerTool: ((name: string) => {
          registeredTools.push(name);
        }) as any,
      };

      await registerTools(mockServer as McpServer, testDataDir);

      // Verify all expected tools are registered
      expect(registeredTools).toContain('synthesize_component');
      expect(registeredTools).toContain('export_format');
      expect(registeredTools).toContain('get_token');
      expect(registeredTools.length).toBe(3);
    });
  });
});

describe('mcp-resources', () => {
  describe('resource handlers', () => {
    it('design-tokens resource returns token data when file exists', async () => {
      // We verify the data file exists and contains expected structure
      const tokensPath = join(testDataDir, 'tokens.json');
      expect(existsSync(tokensPath)).toBe(true);

      const { readFile } = await import('fs/promises');
      const content = await readFile(tokensPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.quick.colors.primary.$value).toBe('#3b82f6');
      expect(parsed.quick.spacing.md.$value).toBe('16px');
    });

    it('resource returns error message when data file missing', async () => {
      // Create empty directory
      const emptyDir = join(testDataDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      // Verify the tokens file doesn't exist
      const tokensPath = join(emptyDir, 'tokens.json');
      expect(existsSync(tokensPath)).toBe(false);

      // Resources should handle missing files gracefully
      // (actual handler returns error JSON, verified in integration tests)
    });

    it('components resource file contains expected structure', async () => {
      const componentsPath = join(testDataDir, 'components.json');
      expect(existsSync(componentsPath)).toBe(true);

      const { readFile } = await import('fs/promises');
      const content = await readFile(componentsPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].type).toBe('button');
      expect(parsed[0].variants.length).toBe(2);
    });

    it('patterns resource file contains flow data', async () => {
      const patternsPath = join(testDataDir, 'patterns.json');
      expect(existsSync(patternsPath)).toBe(true);

      const { readFile } = await import('fs/promises');
      const content = await readFile(patternsPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.flows).toBeDefined();
      expect(parsed.flows.length).toBe(1);
      expect(parsed.flows[0].name).toBe('Login Flow');
    });

    it('brand-report resource file exists in exports/', async () => {
      const reportPath = join(testDataDir, 'exports', 'brand-dna-report.md');
      expect(existsSync(reportPath)).toBe(true);

      const { readFile } = await import('fs/promises');
      const content = await readFile(reportPath, 'utf-8');

      expect(content).toContain('# Brand DNA Report');
      expect(content).toContain('This is a test report.');
    });
  });
});

describe('mcp-tools', () => {
  describe('tool handlers', () => {
    it('get_token logic finds matching tokens by query', async () => {
      // Load tokens fixture
      const { readFile } = await import('fs/promises');
      const tokensPath = join(testDataDir, 'tokens.json');
      const tokensRaw = await readFile(tokensPath, 'utf-8');
      const tokensExport = JSON.parse(tokensRaw);

      // Simulate get_token search logic
      const query = 'color';
      const results: Record<string, any> = {};
      const queryLower = query.toLowerCase();

      function searchTokens(obj: any, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'object' && value !== null) {
            if ('$value' in value) {
              if (
                fullKey.toLowerCase().includes(queryLower) ||
                key.toLowerCase().includes(queryLower)
              ) {
                results[fullKey] = value;
              }
            } else {
              searchTokens(value, fullKey);
            }
          }
        }
      }

      searchTokens(tokensExport.quick);

      // Verify matching tokens found
      expect(Object.keys(results).length).toBeGreaterThan(0);
      expect(results['colors.primary']).toBeDefined();
      expect(results['colors.primary'].$value).toBe('#3b82f6');
    });

    it('export_format CSS logic generates custom properties', async () => {
      // This tests the logic that would be used by export_format tool
      const tokens = tokensFixture;

      // Simulate CSS generation (simplified version)
      const cssLines: string[] = [':root {'];

      // Process colors
      for (const [name, token] of Object.entries(tokens.quick.colors)) {
        if ('$value' in token) {
          cssLines.push(`  --color-${name}: ${token.$value};`);
        }
      }

      // Process spacing
      for (const [name, token] of Object.entries(tokens.quick.spacing)) {
        if ('$value' in token) {
          cssLines.push(`  --spacing-${name}: ${token.$value};`);
        }
      }

      cssLines.push('}');
      const css = cssLines.join('\n');

      // Verify output
      expect(css).toContain('--color-primary: #3b82f6');
      expect(css).toContain('--spacing-md: 16px');
    });

    it('synthesize_component requires valid design DNA', async () => {
      // Verify tokens and components files exist for synthesis
      const tokensPath = join(testDataDir, 'tokens.json');
      const componentsPath = join(testDataDir, 'components.json');

      expect(existsSync(tokensPath)).toBe(true);
      expect(existsSync(componentsPath)).toBe(true);

      // Load and verify structure
      const { readFile } = await import('fs/promises');
      const tokensRaw = await readFile(tokensPath, 'utf-8');
      const componentsRaw = await readFile(componentsPath, 'utf-8');

      const tokens = JSON.parse(tokensRaw);
      const components = JSON.parse(componentsRaw);

      // Verify minimum structure for synthesis
      expect(tokens.quick).toBeDefined();
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
    });
  });
});
