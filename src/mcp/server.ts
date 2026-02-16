import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

/**
 * Create MCP server with registered resources and tools
 * @param dataDir - Directory containing design DNA data (default: .uidna)
 * @returns Configured McpServer instance
 */
export function createMcpServer(dataDir: string): McpServer {
  const server = new McpServer({
    name: 'uidna',
    version: '0.1.0',
  });

  // Register resources (read-only data)
  registerResources(server, dataDir);

  // Register tools (callable actions)
  registerTools(server, dataDir);

  return server;
}

/**
 * Start MCP server with stdio transport
 * This function blocks until the server is terminated
 *
 * @param dataDir - Directory containing design DNA data (default: .uidna)
 */
export async function startMcpServer(dataDir: string): Promise<void> {
  const server = createMcpServer(dataDir);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('UIUX-Mirror MCP server started (stdio mode)');
}
