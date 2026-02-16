/**
 * MCP command - Start MCP server for AI agent integration
 * Phase 06 Plan 04: MCP CLI command
 */

import { startMcpServer } from '../../mcp/server.js';

/**
 * Parse command-line flags
 */
function parseFlags(args: string[]): {
  dataDir: string;
  help: boolean;
} {
  let dataDir = '.uidna';
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' && i + 1 < args.length) {
      dataDir = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--help') {
      help = true;
    }
  }

  return { dataDir, help };
}

/**
 * Print MCP help text
 */
function printHelp(): void {
  console.log(`Usage: uidna mcp [options]

Start MCP server for AI agent integration (stdio transport).

The MCP server exposes design DNA as queryable resources and tools.
Configure your MCP client (e.g., Claude Desktop) to launch:
  node dist/cli.js mcp

Resources (read-only data):
  design-tokens     Normalized design tokens (colors, typography, spacing)
  components        Detected component patterns
  patterns          Interaction flow patterns
  content-style     Voice/tone, capitalization, CTA hierarchy
  brand-report      Brand DNA Report (markdown)

Tools (actions):
  synthesize_component  Synthesize a new component
  export_format         Export tokens in css/tailwind/figma/json format
  get_token             Look up specific tokens by name or type

Options:
  --data-dir <dir>  Data directory (default: .uidna)
`);
}

/**
 * MCP command entry point
 */
export async function mcpCommand(args: string[]): Promise<void> {
  const { dataDir, help } = parseFlags(args);

  if (help) {
    printHelp();
    return;
  }

  // Log startup to stderr (NEVER stdout - corrupts JSON-RPC)
  console.error('Starting UIUX-Mirror MCP server...');

  // Start MCP server (blocks indefinitely on stdio)
  await startMcpServer(dataDir);
}
