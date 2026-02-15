# Technology Stack

**Project:** UIUX-Mirror (uidna)
**Researched:** 2026-02-15
**Overall Confidence:** MEDIUM (based on training data through Jan 2025; version numbers should be verified)

## Recommended Stack

### Core Runtime & Language

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Node.js** | 20.x LTS or 22.x | Runtime environment | Active LTS with best performance for I/O-heavy workloads like crawling. Playwright requires Node 18+, recommend 20.x for stability |
| **TypeScript** | ^5.4.0 | Type-safe development | Industry standard for Node.js tooling. Excellent inference, decorators support, satisfies operator for schema validation |
| **tsx** | ^4.7.0 | TypeScript execution | Zero-config TypeScript runner for development and CLI. Faster than ts-node, no build step needed for local dev |

**Confidence:** HIGH - These are stable, well-established choices for TypeScript CLI tools.

---

### Web Crawling & Browser Automation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Playwright** | ^1.47.0+ | Headless browser automation | Only tool that provides reliable computed styles, handles CSS-in-JS, supports modern web apps. Chromium engine captures exact rendered state. Multi-context isolation for parallel crawling |

**Why not Puppeteer:** Playwright has better TypeScript support, more stable API for style extraction, and superior handling of modern CSS (grid, container queries, cascade layers).

**Why not Cheerio/jsdom:** Cannot compute styles or handle JavaScript-rendered content. Useless for design system extraction from modern sites.

**Confidence:** HIGH - Playwright is the only viable choice for computed style extraction from dynamic sites.

---

### LLM Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@anthropic-ai/sdk** | ^0.27.0+ | Claude API client | Official Anthropic SDK. Supports streaming, tool use, prompt caching (critical for token efficiency with design context). TypeScript-first design |

**Key features for this project:**
- **Prompt caching:** Reuse extracted design system context across multiple synthesis requests (huge token savings)
- **Streaming:** Show component generation progress in CLI
- **System messages:** Inject design DNA as system context
- **Token counting:** Track inference costs per component

**Confidence:** HIGH - Official SDK, project requirements explicitly mention Claude API.

---

### CLI Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **commander** | ^12.0.0 | CLI argument parsing | Battle-tested, zero-bloat, excellent TypeScript types. Subcommand support for `crawl`, `extract`, `synth`, `report`, `export` |
| **chalk** | ^5.3.0 | Terminal styling | Pure ESM, widely used, no dependencies. Critical for readable CLI output |
| **ora** | ^8.0.0 | Spinners/progress | Best UX for long-running operations (crawling, inference). ESM-only, clean API |
| **inquirer** | ^10.0.0 | Interactive prompts | When crawl config needs user input (e.g., "Continue past 100 pages?") |

**Why not yargs:** Commander has cleaner TypeScript types and better subcommand ergonomics.

**Why not oclif:** Over-engineered for a focused CLI. Adds framework complexity without value for this use case.

**Confidence:** HIGH - Commander is the Node.js CLI standard. Chalk/ora are universally used for UX.

---

### MCP Server Implementation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@modelcontextprotocol/sdk** | ^1.0.0+ | MCP server SDK | Official Model Context Protocol SDK from Anthropic. Provides server primitives, transport layer, tool registration |

**MCP Server Architecture:**
```typescript
// Server exposes extracted design DNA as tools/resources
mcp.tool("get-brand-tokens", async ({ brand }) => { ... })
mcp.tool("synth-component", async ({ type, constraints }) => { ... })
mcp.resource("design-dna://brand/tokens.json")
```

**Confidence:** MEDIUM - MCP SDK exists and is official, but version/API surface may have evolved since Jan 2025 training cutoff. Verify current docs.

---

### Schema Validation & Type Safety

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **zod** | ^3.23.0 | Runtime schema validation | TypeScript-first, zero-dependency, excellent error messages. Critical for validating extracted tokens/components against canonical schemas |

**Usage pattern:**
```typescript
// Define canonical schemas for extracted design tokens
const ColorTokenSchema = z.object({
  name: z.string(),
  value: z.string().regex(/^#[0-9a-f]{6}$/i),
  usage: z.array(z.string()),
  evidence: z.array(EvidenceSchema)
})

// Validate and type-narrow
const token = ColorTokenSchema.parse(rawExtraction)
```

**Why not io-ts:** Zod has better DX and error messages. **Why not Yup:** Zod is TypeScript-native, Yup is schema-first.

**Confidence:** HIGH - Zod is the standard for TypeScript schema validation in 2024-2025.

---

### CSS Processing & Analysis

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **css** | ^3.0.0 | CSS parsing | Parse extracted stylesheets into AST for token mining (e.g., find all --custom-properties). Mature, stable |
| **css-tree** | ^2.3.0 | Advanced CSS AST analysis | When you need semantic CSS analysis (e.g., "find all @media queries with min-width"). More powerful than `css` pkg |
| **color** | ^4.2.0 | Color manipulation | Normalize color formats (hex, rgb, hsl), calculate contrast ratios for a11y checks, detect color harmony |

**Why not PostCSS:** Overkill for read-only analysis. PostCSS is for transforming/building CSS, not extracting design tokens.

**Confidence:** MEDIUM-HIGH - Standard packages for CSS analysis, though specific features for token extraction workflows should be validated.

---

### File System & Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **fs-extra** | ^11.2.0 | Enhanced file operations | Promisified fs + extras (ensureDir, copy, move). Cleaner than raw Node.js fs promises |
| **fast-glob** | ^3.3.0 | Pattern-based file finding | If you need to scan output directories (e.g., "find all components/*.json"). Faster than built-in globbing |

**File structure design:**
```
output/
  brand-name/
    tokens.json          # Canonical design tokens
    components.json      # Extracted component catalog
    patterns.json        # Interaction patterns
    content_style.json   # Voice/tone rules
    evidence/
      page-{hash}.json   # Evidence index per page
      screenshots/       # DOM element crops
```

**Confidence:** HIGH - fs-extra is standard for Node.js file operations.

---

### Testing & Quality

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **vitest** | ^2.0.0+ | Test runner | Fastest test runner for TypeScript. Native ESM support, Vite-powered, instant watch mode. Better DX than Jest for modern TS |
| **@playwright/test** | (same as Playwright) | E2E testing for extraction | Test crawling logic against real sites (or local fixtures). Playwright Test integrates with Playwright naturally |
| **eslint** | ^9.0.0 (flat config) | Linting | TypeScript ESLint with strict rules. Use flat config (eslint.config.js) — legacy .eslintrc is deprecated |
| **prettier** | ^3.2.0 | Code formatting | Standard formatter. Zero config, integrates with ESLint |

**Why not Jest:** Vitest is faster, has better TypeScript support, and native ESM. Jest still requires transform hacks for ESM.

**Why Playwright Test over Puppeteer Test:** Already using Playwright for crawling, test suite can reuse browser contexts.

**Confidence:** HIGH - Vitest is the clear 2024-2025 choice for TypeScript testing. Flat ESLint config is the current standard.

---

### Build & Distribution

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **tsup** | ^8.0.0 | TypeScript bundler | Zero-config bundler for libraries and CLIs. Outputs ESM + CJS, handles shebang for CLI bins, tree-shaking. Faster than tsc for production builds |
| **pkg** (or **@vercel/ncc**) | varies | Optional: standalone binary | If you want single-file executable (no Node.js install required). `pkg` for full binaries, `ncc` for bundled Node.js apps |

**Build outputs:**
- `dist/index.js` - CLI entry (ESM)
- `dist/mcp-server.js` - MCP server entry (ESM)
- `dist/lib/` - Importable library modules

**Confidence:** HIGH - tsup is the modern standard for TypeScript library/CLI builds.

---

### Development Tools

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **tsx** | ^4.7.0 | Dev execution | Already listed above. Run `tsx src/cli.ts crawl ...` directly without build step |
| **nodemon** | ^3.1.0 | Watch mode | Auto-restart on file changes during dev. `nodemon --exec tsx src/cli.ts` |
| **typescript** | ^5.4.0 | Type checking | Runtime (tsx) and tooling (tsup) need TS installed as peer dependency |

**Confidence:** HIGH - Standard TypeScript development stack.

---

## Supporting Libraries by Use Case

### When Crawling
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **robots-txt-parser** | ^2.0.0 | Parse robots.txt | Respect crawl rules (strict mode default). Check before every domain |
| **p-queue** | ^8.0.0 | Rate limiting | Enforce crawl delays, max concurrency. Prevents site overload |
| **p-retry** | ^6.2.0 | Retry logic | Handle transient network errors during crawling |

### When Extracting Tokens
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **color** | ^4.2.0 | (Already listed) | Normalize colors, calculate contrast |
| **culori** | ^4.0.0 | Alternative to `color` | More modern, better OKLCH/OKLAB support if you need perceptual color spaces |

### When Synthesizing Components
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@anthropic-ai/sdk** | (Already listed) | LLM inference | All synthesis operations |
| **diff** | ^6.0.0 | Show before/after | When CLI needs to show component variations |

### When Serving as MCP
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@modelcontextprotocol/sdk** | (Already listed) | MCP server core | Always for MCP server mode |

**Confidence:** MEDIUM - Specific crawling/utility libraries may have updated APIs; verify `robots-txt-parser` and rate-limiting libraries.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Browser automation** | Playwright | Puppeteer | Playwright has better TS support, more reliable style extraction, superior cross-browser testing |
| **Browser automation** | Playwright | Selenium | Too heavyweight, poor DX, not designed for style extraction |
| **CLI framework** | Commander | oclif | oclif is over-engineered for a focused CLI. Too much framework boilerplate |
| **CLI framework** | Commander | yargs | Yargs has weaker TypeScript types and awkward subcommand API |
| **Test runner** | Vitest | Jest | Jest has poor ESM support, slower for TypeScript, legacy architecture |
| **Schema validation** | Zod | Yup | Yup is not TypeScript-native, worse type inference |
| **Schema validation** | Zod | AJV | AJV is JSON Schema-based (verbose), Zod is code-first (DX++) |
| **Bundler** | tsup | tsc + rollup | tsup is zero-config, handles CLI shebangs, faster for this use case |
| **LLM SDK** | @anthropic-ai/sdk | OpenAI SDK | Project explicitly targets Claude API for inference |

**Confidence:** HIGH - These alternatives were considered based on established ecosystem knowledge.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Puppeteer** | Weaker TypeScript support, less reliable computed style access | Playwright |
| **Cheerio** | Cannot compute styles, no JS execution | Playwright |
| **jsdom** | Incomplete CSS support, no real browser rendering | Playwright |
| **Jest** | Poor ESM support, slow TypeScript execution, requires babel/swc hacks | Vitest |
| **ts-node** | Slower than tsx, more configuration needed | tsx |
| **nodemailer** (for email reports) | Out of scope, adds unnecessary complexity | File-based output only |
| **Database (SQLite/Postgres)** | Project explicitly uses file-based storage for v1 | JSON + fs-extra |
| **React/Vue/Svelte** | Project outputs vanilla HTML/CSS stubs, not framework components | Plain HTML/CSS templates |
| **Webpack/Parcel** | Overkill for a Node.js library/CLI | tsup (or esbuild directly) |
| **yarn/pnpm** (mandated) | No strong reason to avoid npm in 2025-2026 | npm (default) or user's choice |

**Confidence:** HIGH - These are clearly wrong choices for the stated requirements.

---

## Installation

```bash
# Core dependencies
npm install playwright @anthropic-ai/sdk @modelcontextprotocol/sdk commander chalk ora zod fs-extra

# CSS processing
npm install css css-tree color

# Crawling utilities
npm install robots-txt-parser p-queue p-retry

# Development dependencies
npm install -D typescript tsx tsup vitest @playwright/test eslint prettier @types/node

# Optional: CLI UX enhancements
npm install inquirer

# Optional: Standalone binary builder
npm install -D @vercel/ncc
```

**TypeScript config (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Package.json scripts:**
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsup src/cli.ts src/mcp-server.ts --format esm --clean",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "bin": {
    "uidna": "./dist/cli.js"
  }
}
```

**Confidence:** HIGH - This is the standard modern TypeScript/Node.js project setup.

---

## Stack Patterns by Variant

### If targeting Windows users heavily
- **Add:** `cross-env` for environment variables in npm scripts
- **Reason:** Windows uses `SET VAR=value` vs Unix `VAR=value`

### If output must include visual diffs
- **Add:** `pixelmatch` + `pngjs` for screenshot diffing
- **Reason:** Show visual evidence of component extraction

### If legal compliance is critical
- **Add:** `@adobe/css-tools` (Apache 2.0 licensed) instead of `css-tree` (MIT but check vendor clauses)
- **Reason:** Some projects have restrictive license requirements

### If deploying as serverless function (MCP server)
- **Use:** `@vercel/ncc` or `esbuild` to bundle all dependencies
- **Reason:** Serverless environments often can't `npm install` at runtime

**Confidence:** MEDIUM - These are best practices but depend on specific deployment constraints.

---

## Version Compatibility Notes

### Known Constraints
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Playwright ^1.40+ | Node.js 18+ | Earlier Node.js versions not supported |
| chalk ^5.x | ESM only | If you need CJS, use chalk ^4.x |
| ora ^8.x | ESM only | If you need CJS, use ora ^5.x |
| commander ^12.x | Node.js 18+ | Earlier versions support Node 14+ |
| @anthropic-ai/sdk ^0.20+ | Node.js 18+ | Uses native fetch API |

### ESM Transition
Many packages (chalk, ora, inquirer) are now **ESM-only**. Your project MUST use `"type": "module"` in package.json. This is the 2025-2026 standard for new Node.js projects.

**If you need CJS compatibility:**
- tsup can output dual ESM+CJS formats
- Lock to older versions of chalk/ora (not recommended)

**Confidence:** HIGH - ESM transition is well-documented, version constraints are accurate as of Jan 2025.

---

## Stack Decision Rationale Summary

| Decision | Alternative | Why This Choice |
|----------|-------------|-----------------|
| Playwright over Puppeteer | Better TS support, more reliable computed styles | Project needs accurate design token extraction |
| Zod over AJV/Yup | TypeScript-native, better DX | Canonical schemas are code-defined, not JSON Schema |
| Commander over oclif | Lightweight, zero framework bloat | Simple CLI with 5-6 commands doesn't need a framework |
| Vitest over Jest | Faster, native ESM, better TS DX | Project is greenfield, no legacy Jest investment |
| tsup over tsc+rollup | Zero config, handles CLI shebangs | DX priority for small team/solo dev |
| File storage over DB | Git-friendly, portable, simple | V1 scope is section-scoped (20-100 pages), DB overkill |

**Confidence:** HIGH - These decisions align with project requirements and 2025-2026 TypeScript ecosystem best practices.

---

## Sources

**Note:** This research was conducted with limited tool access (no WebSearch/WebFetch verification). Recommendations are based on training data current through **January 2025**. Confidence levels reflect this limitation.

**Verification recommended for:**
1. Exact latest versions of all packages (use `npm view <package> version`)
2. @modelcontextprotocol/sdk API surface (check official docs at modelcontextprotocol.io)
3. Playwright latest features for style extraction (check playwright.dev/docs)
4. @anthropic-ai/sdk prompt caching API (check Anthropic docs)

**High-confidence sources (from training data):**
- Playwright documentation (playwright.dev)
- TypeScript handbook (typescriptlang.org)
- Node.js LTS release schedule
- npm registry trends for ecosystem standards (commander, zod, vitest)

**Areas marked MEDIUM confidence:**
- Specific version numbers (should verify with npm registry)
- MCP SDK API details (new protocol, may have evolved since Jan 2025)
- Niche libraries (robots-txt-parser, css-tree specific APIs)

---

**Researched:** 2026-02-15
**Domain:** UI/UX design system extraction and inference tools
**Overall Confidence:** MEDIUM (training data-based; versions should be verified; architectural choices are HIGH confidence)
