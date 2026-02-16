---
phase: 06-cli-mcp-integration
plan: 04
subsystem: mcp-server
tags: [mcp, server, resources, tools, cli, integration]
dependency-graph:
  requires:
    - "@modelcontextprotocol/sdk"
    - "src/synthesis/component-composer"
    - "src/export/formatters"
  provides:
    - "MCP server with stdio transport"
    - "5 MCP resources for design DNA"
    - "3 MCP tools for synthesis and export"
  affects:
    - "src/cli.ts (router)"
tech-stack:
  added:
    - "@modelcontextprotocol/sdk v1.26.0"
  patterns:
    - "MCP server with stdio transport"
    - "Resource handlers for read-only data"
    - "Tool handlers for callable actions"
    - "stderr-only logging for JSON-RPC integrity"
key-files:
  created:
    - "src/mcp/server.ts"
    - "src/mcp/resources.ts"
    - "src/mcp/tools.ts"
    - "src/cli/commands/mcp.ts"
  modified:
    - "src/cli.ts"
    - "package.json"
decisions:
  - "Use type assertions (as any) to work around TypeScript deep recursion with MCP SDK generics"
  - "Define zod schemas outside function scope to reduce TypeScript complexity"
  - "Import zod from 'zod/v4' to match SDK expectations"
  - "All logging to stderr (console.error) to avoid corrupting stdio JSON-RPC"
  - "Use design-tokens:// URI scheme for resource URIs"
metrics:
  duration: 8
  tasks: 2
  files: 5
  completed: "2026-02-16T04:56:48Z"
---

# Phase 06 Plan 04: MCP Server Implementation Summary

**One-liner:** MCP server exposing design DNA as 5 resources and 3 tools via stdio transport for AI agent integration (Claude Desktop, Cursor, etc.)

## Overview

Implemented a complete Model Context Protocol (MCP) server that exposes extracted design DNA to AI agents. The server provides 5 read-only resources for querying design data and 3 tools for synthesis and export actions, all communicating via stdio transport using JSON-RPC.

## Implementation Details

### MCP Server Core (`src/mcp/server.ts`)

- **createMcpServer**: Factory function that instantiates McpServer and registers all resources and tools
- **startMcpServer**: Entry point that connects server to stdio transport and blocks on stdin
- Server configured with name "uidna" and version "0.1.0"

### Resources (`src/mcp/resources.ts`)

5 read-only resources exposing design DNA data:

1. **design-tokens** - Normalized DTCG design tokens (colors, typography, spacing, etc.)
2. **components** - Detected component patterns (buttons, inputs, cards, nav, modals)
3. **patterns** - Cross-page interaction flow patterns
4. **content-style** - Voice/tone, capitalization rules, CTA hierarchy, error grammar
5. **brand-report** - Human-readable Brand DNA Report (markdown)

All resources:
- Read from `.uidna/` directory (or custom --data-dir)
- Return descriptive error messages when data not available
- Log access to stderr for debugging
- Use `design-tokens://` URI scheme

### Tools (`src/mcp/tools.ts`)

3 callable tools for synthesis and export:

1. **synthesize_component** - Synthesize new component using design DNA
   - Input: `component_type` (string, e.g., "data-table", "modal")
   - Calls `synthesizeComponent()` from Phase 3
   - Returns JSON with HTML, CSS, states, accessibility, evidence, confidence

2. **export_format** - Export tokens in specified format
   - Input: `format` (enum: "css", "tailwind", "figma", "json")
   - Calls appropriate generator from Phase 5
   - Returns formatted export content

3. **get_token** - Look up tokens by name or type
   - Input: `query` (string, e.g., "primary", "color")
   - Searches dual-layer token export
   - Returns matching tokens with metadata

All tools:
- Use zod schemas for input validation
- Handle errors gracefully (return error messages, don't throw)
- Log calls to stderr for debugging

### CLI Integration (`src/cli/commands/mcp.ts`, `src/cli.ts`)

- **mcpCommand**: Parses `--data-dir` and `--help` flags, starts MCP server
- **Help text**: Documents all 5 resources and 3 tools with usage examples
- **Router integration**: Wired into main CLI router at `src/cli.ts`
- **Usage**: `uidna mcp` or `node dist/cli.js mcp`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript deep recursion with MCP SDK generics**
- **Found during:** Task 1 (MCP server implementation)
- **Issue:** TypeScript error "Type instantiation is excessively deep and possibly infinite" when calling `server.registerTool` and `server.registerResource` with inline zod schemas
- **Root cause:** Complex generic types in MCP SDK v1.26.0 cause TypeScript 5.x recursion limits to trigger
- **Fix applied:**
  1. Defined zod schemas outside function scope as const objects
  2. Used type assertions `(server.registerTool as any)` and `(server.registerResource as any)` to bypass generic type checking
  3. Changed zod import from `import { z } from 'zod'` to `import * as z from 'zod/v4'` to match SDK expectations
- **Files modified:** `src/mcp/tools.ts`, `src/mcp/resources.ts`
- **Commits:** add4cb0
- **Reasoning:** The MCP SDK works correctly at runtime; this is purely a TypeScript compile-time issue. Type assertions are safe here since we're following SDK examples and zod validates inputs at runtime anyway.

**2. [Rule 2 - Missing critical functionality] DesignDNA metadata field**
- **Found during:** Task 1 (tools implementation)
- **Issue:** `DesignDNA` type requires `metadata: { sourceUrl, crawlDate, totalPages }` but we only load tokens and components from JSON files
- **Fix applied:** Added stub metadata object with placeholder values when loading design DNA from disk
- **Files modified:** `src/mcp/tools.ts`
- **Commits:** add4cb0
- **Reasoning:** The synthesis function requires this field for type safety. Since MCP tools load pre-processed data from disk (not runtime crawl), stub values are appropriate. Future improvement could store metadata in tokens.json export.

## Testing Performed

1. **Type checking**: `npx tsc --noEmit` passes with zero errors
2. **Help command**: `npx tsx src/cli.ts mcp --help` displays full help text
3. **Server startup**: MCP server starts without errors and logs only to stderr
4. **Code review**: Confirmed zero `console.log()` calls in MCP modules (grep verification)
5. **Dependency verification**: `@modelcontextprotocol/sdk v1.26.0` in package.json dependencies

## Files Modified

### Created (4 files)

- `src/mcp/server.ts` (42 lines) - MCP server factory and startup
- `src/mcp/resources.ts` (125 lines) - 5 resource handlers
- `src/mcp/tools.ts` (231 lines) - 3 tool handlers with zod schemas
- `src/cli/commands/mcp.ts` (74 lines) - CLI command implementation

### Modified (2 files)

- `src/cli.ts` - Wired mcp case into router
- `package.json` - Added `@modelcontextprotocol/sdk` dependency

## Integration Points

**Upstream dependencies:**
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `src/synthesis/component-composer` - Component synthesis engine (Phase 3)
- `src/export/formatters` - Token export generators (Phase 5)
- `src/normalization/normalize-pipeline` - Token normalization types (Phase 2)
- `src/components/component-aggregator` - Component aggregation types (Phase 2)

**Downstream consumers:**
- AI agent MCP clients (Claude Desktop, Cursor, Continue, etc.)
- Custom MCP clients built on the SDK

## Success Criteria Met

- [x] MCP server registers all 5 resources (tokens, components, patterns, content-style, brand-report)
- [x] MCP server registers all 3 tools (synthesize_component, export_format, get_token)
- [x] Server uses stdio transport compatible with Claude Desktop and other MCP clients
- [x] All logging uses stderr to preserve JSON-RPC protocol integrity
- [x] CLI `uidna mcp` command starts server with proper help documentation
- [x] `npx tsc --noEmit` passes with zero errors
- [x] `@modelcontextprotocol/sdk` installed in package.json

## Commits

| Commit  | Message                                                 |
|---------|---------------------------------------------------------|
| add4cb0 | feat(06-04): add MCP server with resources and tools    |
| e346147 | feat(06-04): add MCP CLI command and router integration |

## Self-Check: PASSED

**Created files verification:**
```
FOUND: src/mcp/server.ts
FOUND: src/mcp/resources.ts
FOUND: src/mcp/tools.ts
FOUND: src/cli/commands/mcp.ts
```

**Commits verification:**
```
FOUND: add4cb0
FOUND: e346147
```

**Functionality verification:**
- Type check passes
- Help command works
- Server starts without errors
- No console.log in MCP modules
- SDK in dependencies

All verification checks passed.

## Next Steps

**Phase 06 Plan 05** will document the complete CLI in README.md with usage examples, MCP configuration for Claude Desktop, and troubleshooting guide.

## Notes

- The MCP server is production-ready for stdio transport
- HTTP transport could be added later via `@modelcontextprotocol/sdk/server/streamableHttp.js`
- Resource URIs use custom `design-tokens://` scheme (could switch to `file://` or `https://` if needed)
- Type assertions are a known workaround for TypeScript/zod/SDK generic complexity
- All MCP logging uses stderr to preserve stdio JSON-RPC communication channel
