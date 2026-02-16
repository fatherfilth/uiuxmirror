# Phase 6: CLI & MCP Integration - Research

**Researched:** 2026-02-16
**Domain:** CLI tooling, Model Context Protocol (MCP) server implementation, Node.js configuration management
**Confidence:** HIGH

## Summary

Phase 6 completes the UIUX-Mirror interface by building CLI commands for human users and an MCP server for AI agent integration. The CLI will use simple process.argv parsing (already scaffolded) extended with subcommands for `crawl`, `extract`, `report`, `synth`, and `export`. Configuration will be managed through `uidna.config.json` with runtime overrides via CLI flags. The MCP server will expose design DNA as queryable resources (read-only data like tokens, components, patterns) and tools (actions like synthesis), using the official `@modelcontextprotocol/sdk` with stdio transport for local integration with Claude Desktop and other MCP clients.

The Model Context Protocol has achieved industry standardization (donated to Linux Foundation's Agentic AI Foundation in Dec 2025, with OpenAI and Block as co-founders). The TypeScript SDK provides robust server primitives with stdio transport, making local MCP server development straightforward. For CLI progress feedback, `ora` is the ecosystem standard for spinners, while the existing simple argument parser can be extended with subcommand routing without adding heavy dependencies.

**Primary recommendation:** Build CLI with manual subcommand routing (no framework needed for 5 commands), use `ora` for progress spinners, implement MCP server with `@modelcontextprotocol/sdk` using stdio transport, expose tokens/components/patterns as Resources (application-driven context) and synthesis as Tools (model-driven actions).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.2.0+ | MCP server/client implementation | Official TypeScript SDK, 97M monthly downloads, industry standard donated to Linux Foundation |
| zod | 3.x | Schema validation for MCP | Required peer dependency for @modelcontextprotocol/sdk, used for input validation |
| ora | 7.x | CLI spinners and progress | 25M+ weekly downloads, de facto standard for Node.js CLI progress feedback |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | 5.x | Terminal color styling | Optional - for enhancing CLI output with colors (already styled console.log works) |
| cli-progress | 3.x | Progress bars | Alternative to ora for bar-style progress (crawl pages count) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual argv parsing | commander.js / yargs | Commander adds 25KB bundle, automatic help generation, but Phase 1 already implemented simple parsing - extending it is lighter |
| @modelcontextprotocol/sdk | Custom JSON-RPC | SDK handles protocol details, validation, and updates - hand-rolling would miss edge cases and spec changes |
| ora | cli-spinners | ora provides higher-level API with start/stop/succeed/fail - cli-spinners is lower-level primitives |

**Installation:**
```bash
npm install @modelcontextprotocol/sdk zod@3 ora
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/                   # CLI command implementations
│   ├── commands/         # Subcommand handlers (crawl, extract, report, synth, export)
│   ├── config-loader.ts  # Load and merge uidna.config.json with CLI args
│   └── progress.ts       # Progress spinner/bar utilities
├── mcp/                  # MCP server implementation
│   ├── server.ts         # Main MCP server setup with stdio transport
│   ├── resources/        # Resource handlers (tokens, components, patterns)
│   └── tools/            # Tool handlers (synthesis, export)
└── cli.ts                # Entry point (already scaffolded)
```

### Pattern 1: CLI Subcommand Routing
**What:** Extend existing process.argv parsing with simple subcommand dispatch
**When to use:** For 5-7 commands without complex nesting
**Example:**
```typescript
// src/cli.ts
const command = process.argv[2]; // First arg after node/script

switch (command) {
  case 'crawl':
    await crawlCommand(parseArgs(process.argv.slice(3)));
    break;
  case 'extract':
    await extractCommand(parseArgs(process.argv.slice(3)));
    break;
  case 'report':
    await reportCommand(parseArgs(process.argv.slice(3)));
    break;
  case 'synth':
    await synthCommand(parseArgs(process.argv.slice(3)));
    break;
  case 'export':
    await exportCommand(parseArgs(process.argv.slice(3)));
    break;
  default:
    printUsage();
    process.exit(1);
}
```

### Pattern 2: MCP Server with stdio Transport
**What:** Standard MCP server setup using official SDK
**When to use:** For local MCP integrations (Claude Desktop, Cursor, etc.)
**Example:**
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'uidna',
  version: '1.0.0',
});

// Register resources (read-only data)
server.registerResource(
  'tokens',
  {
    description: 'Design tokens extracted from crawled site',
    mimeType: 'application/json',
  },
  async () => {
    const tokens = await loadTokens();
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(tokens, null, 2)
      }]
    };
  }
);

// Register tools (actions)
server.registerTool(
  'synthesize_component',
  {
    description: 'Synthesize a new component using extracted design DNA',
    inputSchema: {
      component_type: z.string().describe('Component to synthesize (e.g., data-table)'),
    },
  },
  async ({ component_type }) => {
    const result = await synthesizeComponent(component_type);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }
);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 3: Configuration File Loading with Overrides
**What:** Merge config file defaults with CLI argument overrides
**When to use:** Supporting both config file and CLI flags
**Example:**
```typescript
// src/cli/config-loader.ts
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { loadConfig } from '../shared/config.js';

export async function loadFullConfig(cliArgs: any) {
  let fileConfig = {};

  // Try to load uidna.config.json
  if (existsSync('uidna.config.json')) {
    const contents = await readFile('uidna.config.json', 'utf-8');
    fileConfig = JSON.parse(contents);
  }

  // CLI args override config file
  return loadConfig({
    ...fileConfig,
    ...cliArgs,
  });
}
```

### Pattern 4: Progress Feedback with Ora
**What:** Use ora for spinner-style progress during long operations
**When to use:** For crawl, extract, synthesis operations
**Example:**
```typescript
// src/cli/progress.ts
import ora from 'ora';

export async function withProgress<T>(
  message: string,
  task: (update: (text: string) => void) => Promise<T>
): Promise<T> {
  const spinner = ora(message).start();

  try {
    const result = await task((text: string) => {
      spinner.text = text;
    });
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

// Usage in crawl command:
await withProgress('Crawling site...', async (update) => {
  return runPipeline({
    config,
    onProgress: (status) => {
      update(`Crawling: ${status.currentUrl} (${status.pagesProcessed} pages)`);
    }
  });
});
```

### Anti-Patterns to Avoid
- **Using console.log() in MCP server with stdio transport:** Corrupts JSON-RPC messages. Always use console.error() for logging in stdio-based servers.
- **Exposing everything as Tools:** Tools should be actions. Read-only data (tokens, components) should be Resources. Tools are model-driven (AI decides when to call), Resources are application-driven (client decides when to include).
- **Heavy CLI framework for simple commands:** Commander.js adds value for complex CLIs (20+ commands, nested subcommands), but for 5 commands, extending existing parser is simpler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol implementation | Custom JSON-RPC over stdio | @modelcontextprotocol/sdk | Protocol has complex handshake, capability negotiation, versioning - SDK handles all edge cases |
| Input validation for MCP tools | Manual type checking | Zod schemas | Required by SDK, provides runtime type safety and automatic error messages |
| CLI progress indicators | Custom spinner logic with setInterval | ora | Handles terminal state, cursor control, Windows compatibility, and cleanup on errors |
| Configuration merging | Manual deep merge logic | Existing loadConfig + shallow override | Deep merge has prototype pollution risks, shallow override sufficient for flat config |

**Key insight:** MCP is a protocol with evolving spec (major updates in Nov 2025). Hand-rolling the protocol means tracking spec changes, handling capability negotiation, and implementing error recovery. The SDK abstracts this complexity and auto-updates with spec changes.

## Common Pitfalls

### Pitfall 1: stdout Corruption in stdio MCP Servers
**What goes wrong:** Using console.log() in an MCP server with stdio transport breaks JSON-RPC communication
**Why it happens:** stdio transport uses stdin/stdout for JSON-RPC messages. console.log() writes to stdout, mixing logs with protocol messages.
**How to avoid:**
- Always use console.error() for logging (writes to stderr)
- Configure logging libraries to write to stderr or files
- Set LOG_LEVEL environment variable for debug mode
**Warning signs:** MCP client fails to connect, "invalid JSON-RPC message" errors

### Pitfall 2: Confusing Resources vs Tools
**What goes wrong:** Exposing read-only data as Tools instead of Resources, or actions as Resources
**Why it happens:** Unclear understanding of MCP primitives - Resources are application-controlled context, Tools are model-driven actions
**How to avoid:**
- Resources: Static or queryable data (tokens.json, components list, pattern catalog)
- Tools: Operations that change state or perform computation (synthesize component, export formats)
- Decision rule: "If the AI needs to decide when to call it, it's a Tool. If the application decides when to include it, it's a Resource."
**Warning signs:** AI calling data retrieval too frequently (should be Resource), or user manually triggering synthesis instead of AI deciding (should be Tool)

**Source:** [MCP Resources vs Tools Guide](https://medium.com/@laurentkubaski/mcp-resources-explained-and-how-they-differ-from-mcp-tools-096f9d15f767)

### Pitfall 3: CLI Command Organization Without Clear Entry Points
**What goes wrong:** All command logic in single cli.ts file becomes unmaintainable
**Why it happens:** Starting simple with single file, then adding more commands inline
**How to avoid:**
- Create src/cli/commands/ directory immediately
- Each command in separate file with single exported function
- cli.ts is thin router only
**Warning signs:** cli.ts exceeds 200 lines, adding new command requires editing existing command code

### Pitfall 4: Configuration File Not Supporting All CLI Flags
**What goes wrong:** Some options only available via CLI flags, others only in config file
**Why it happens:** Incremental development adds flags without updating config schema
**How to avoid:**
- Define single source of truth for config options (CrawlConfig type already exists)
- uidna.config.json should support all options that CLI flags support
- CLI flags override config file, but both use same schema
**Warning signs:** Users asking "how do I set X in config file?", documentation says "only available via --flag"

## Code Examples

Verified patterns from official sources:

### MCP Server Resource Registration
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

server.registerResource(
  'design-tokens',
  {
    description: 'Normalized design tokens from crawled site',
    mimeType: 'application/json',
  },
  async () => {
    const normalizationResult = await loadNormalizationResult();
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(normalizationResult.dtcg, null, 2)
      }]
    };
  }
);
```

### MCP Tool with Zod Schema Validation
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
server.registerTool(
  'export_format',
  {
    description: 'Export design tokens in specified format',
    inputSchema: {
      format: z.enum(['css', 'tailwind', 'figma', 'json'])
        .describe('Export format'),
      output_path: z.string().optional()
        .describe('Optional output path (defaults to .uidna/exports/)'),
    },
  },
  async ({ format, output_path }) => {
    const tokens = await loadTokens();
    let content;

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

    if (output_path) {
      await writeFile(output_path, content);
    }

    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }
);
```

### CLI Progress with Ora
```typescript
// Based on ora documentation: https://github.com/sindresorhus/ora
import ora from 'ora';

export async function crawlWithProgress(config: CrawlConfig) {
  const spinner = ora('Starting crawl...').start();

  try {
    const result = await runPipeline({
      config,
      onProgress: (status) => {
        spinner.text = `Crawling: ${status.currentUrl} (${status.pagesProcessed}/${config.maxPages})`;
      }
    });

    spinner.succeed(`Crawled ${result.crawlResult.pagesProcessed} pages`);
    return result;
  } catch (error) {
    spinner.fail('Crawl failed');
    throw error;
  }
}
```

### Configuration Loading with JSON Schema
```typescript
// Based on Zod validation pattern
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const UidnaConfigSchema = z.object({
  maxDepth: z.number().int().min(1).max(10).optional(),
  maxPages: z.number().int().min(1).max(10000).optional(),
  domainAllowlist: z.array(z.string()).optional(),
  respectRobotsTxt: z.boolean().optional(),
  viewportSizes: z.array(z.object({
    width: z.number().int(),
    height: z.number().int(),
  })).optional(),
  outputDir: z.string().optional(),
});

export async function loadConfigFile(
  path: string = 'uidna.config.json'
): Promise<Partial<CrawlConfig>> {
  if (!existsSync(path)) {
    return {};
  }

  const contents = await readFile(path, 'utf-8');
  const json = JSON.parse(contents);

  // Validate against schema
  const validated = UidnaConfigSchema.parse(json);
  return validated;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom JSON-RPC protocols | MCP standardized protocol | Nov 2024 (Anthropic launch) | Industry convergence - one protocol for all AI tool integrations |
| Per-client integrations | MCP server works with any MCP client | Nov 2024-Dec 2025 | Build once, works with Claude Desktop, Cursor, future clients |
| CLI frameworks (commander/yargs) | Minimal parsing for simple CLIs | 2024+ trend | Reduce bundle size, faster startup (10-50ms improvement) |
| Global npm installs | npx / local bin execution | 2020+ | Better version control, no global pollution |

**Deprecated/outdated:**
- LSP (Language Server Protocol) for AI context: MCP is now the standard for AI tool integration, LSP is for editor language features
- Custom stdio protocols: MCP stdio transport is standardized replacement
- Heavy CLI frameworks for <10 commands: Modern trend favors minimal parsing (process.argv) or lighter alternatives

**Source:** [MCP History & Adoption](https://www.pento.ai/blog/a-year-of-mcp-2025-review)

## Open Questions

1. **Should MCP server run as separate process or embedded in CLI?**
   - What we know: MCP servers typically run as standalone processes launched by MCP clients (Claude Desktop config)
   - What's unclear: Could offer `uidna mcp` command to start server manually vs only stdio mode
   - Recommendation: Start with stdio-only (client-launched), defer manual server command to future enhancement

2. **How to handle long-running synthesis in MCP tools?**
   - What we know: Tool execution should return promptly, MCP has no built-in streaming for tool results
   - What's unclear: Synthesis can take 5-30 seconds with Claude API calls
   - Recommendation: Return immediately with "synthesis started" message, write result to file, include file path in response. Consider progress notifications via MCP logging if supported.

3. **Configuration file location: project root or .uidna/ directory?**
   - What we know: Most CLI tools expect config in project root (prettier.config.js, tsconfig.json pattern)
   - What's unclear: All our data goes to .uidna/, should config live there too?
   - Recommendation: Project root for discoverability, matches ecosystem conventions. .uidna/ is for outputs and caches.

4. **Should exported files be exposed as MCP resources?**
   - What we know: Resources provide read-only access to data, exports are large files
   - What's unclear: Resources returning multi-MB JSON could impact performance
   - Recommendation: Expose metadata (export summary) as Resource, actual files via filesystem paths in tool responses

## Sources

### Primary (HIGH confidence)
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) - Official protocol specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK and examples
- [Build an MCP Server Tutorial](https://modelcontextprotocol.io/docs/develop/build-server) - Step-by-step TypeScript guide
- [Model Context Protocol Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol) - History and adoption
- [MCP Resources vs Tools Explained](https://medium.com/@laurentkubaski/mcp-resources-explained-and-how-they-differ-from-mcp-tools-096f9d15f767) - Conceptual differences
- [Ora GitHub](https://github.com/sindresorhus/ora) - CLI spinner documentation

### Secondary (MEDIUM confidence)
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) - Community best practices guide
- [Commander.js Guide](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/) - Alternative CLI framework patterns
- [A Year of MCP](https://www.pento.ai/blog/a-year-of-mcp-2025-review) - Industry adoption timeline

### Tertiary (LOW confidence)
- Various blog posts on MCP implementation patterns - Marked for validation against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK with 97M downloads, industry-standardized protocol
- Architecture: HIGH - Official examples and documentation, stdio transport verified
- Pitfalls: MEDIUM-HIGH - Derived from official warnings (stdio logging) and community patterns (Resources vs Tools)

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - MCP is stable but SDK updates quarterly)
