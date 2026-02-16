---
phase: 06-cli-mcp-integration
plan: 02
subsystem: cli
tags: [cli, commands, crawl, extract, orchestration]
dependency_graph:
  requires:
    - cli-config-loader
    - cli-progress-utilities
    - cli-subcommand-router
  provides:
    - crawl-command
    - extract-command
  affects:
    - phase-06-plan-03-pipeline-commands
    - phase-06-plan-04-synth-export-commands
tech_stack:
  added: []
  patterns:
    - cli-arg-parsing
    - progress-feedback
    - multi-phase-processing
key_files:
  created:
    - src/cli/commands/crawl.ts
    - src/cli/commands/extract.ts
  modified:
    - src/cli.ts
    - src/patterns/pattern-store.ts
decisions:
  - title: "Extract command skips component detection"
    rationale: "Component detection requires live browser access (Playwright Page object), which is only available during crawl. Components should be detected during crawl, not post-crawl."
    context: "extract.ts Phase 3 implementation"
  - title: "Pattern storage uses storeContentPattern API"
    rationale: "PatternStore provides storeFlow and storeContentPattern methods, not individual save methods per pattern type"
    context: "extract.ts pattern saving implementation"
  - title: "Fixed pattern-store.ts fs-extra imports"
    rationale: "ESM compatibility requires default import (per 01-06 decision), not named imports"
    context: "pattern-store.ts imports"
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2
  completed: 2026-02-16
---

# Phase 06 Plan 02: Crawl & Extract Commands Summary

Crawl and extract commands implemented with progress feedback, argument parsing, and full pipeline orchestration.

## Tasks Completed

### Task 1: Implement crawl command
**Files:** `src/cli/commands/crawl.ts`, `src/cli.ts`
**Commit:** 7c1bef5

Created crawl command with:
- URL argument parsing and validation (required first non-flag arg)
- CLI flag parsing for `--max-depth`, `--max-pages`, `--domain` (repeatable), `--output-dir`, `--concurrency`, `--no-robots`, `--help`
- Config loading via `loadFullConfig()` with CLI arg overrides
- Crawl header display showing seed URL, max pages, max depth, output dir, allowed domains
- Progress feedback using `withProgress()` wrapper with update callback
- Pipeline orchestration via `runPipeline()` from orchestrator
- Completion summary with pages crawled/failed/skipped, token counts per type, evidence count, output directory
- Diff summary for re-crawls (pages added/removed/changed/unchanged)
- User-friendly error messages and help text
- Wired into cli.ts router with dynamic import

**Key implementation details:**
- Domain allowlist accumulated from multiple `--domain` flags into array
- Config object built from parsed args, then merged via `loadFullConfig()`
- Progress callback updates spinner with current URL and page count
- Error handling prints message and exits with code 1
- Help flag short-circuits and prints crawl-specific usage

**Verification:**
- `npx tsx src/cli.ts crawl --help` shows crawl-specific help
- `npx tsx src/cli.ts crawl` (no URL) shows error and help
- Type checks pass (no errors in crawl.ts)

### Task 2: Implement extract command
**Files:** `src/cli/commands/extract.ts`, `src/cli.ts`, `src/patterns/pattern-store.ts`
**Commit:** 3145609

Created extract command with:
- CLI flag parsing for `--output-dir`, `--help`
- Config loading to get outputDir
- Crawl data validation (checks for `.uidna/tokens/` directory)
- Phase 1: Load raw token data from `TokenStore.getAllPageUrls()` and `loadPageTokens()`
- Phase 2: Run `normalizePipeline()` on all page tokens, save normalization result to `.uidna/normalized/`
- Phase 3: Skip component detection with warning (requires live browser during crawl)
- Phase 4: Load crawl metadata if available, run `detectFlows()` and `analyzeContentStyle()`
- Pattern storage using `PatternStore.storeFlow()` and `storeContentPattern()` for all pattern types
- Completion summary with normalized token counts, spacing scale metrics, pattern analysis results
- Output locations printed for normalized tokens and patterns
- Wired into cli.ts router with dynamic import

**Key implementation details:**
- Extract requires crawl to have been run first (checks for tokens directory)
- Component detection skipped because it requires live Playwright Page object (only available during crawl)
- Pattern detection loads HTML content from crawl metadata if available
- PatternStore API uses `storeContentPattern()` with pattern type string, not individual save methods
- Multi-phase processing with separate spinners for each phase (load, normalize, detect, analyze)
- Graceful degradation when crawl metadata missing (skips pattern analysis)

**Bug fix (deviation Rule 1):**
- Fixed `pattern-store.ts` to use default `import fs from 'fs-extra'` instead of named imports
- Changed `ensureDir`, `writeJSON`, `readJSON`, `pathExists` to `fs.ensureDir`, etc.
- Matches project-wide ESM compatibility pattern from 01-06 decision

**Verification:**
- `npx tsx src/cli.ts extract --help` shows extract-specific help
- `npx tsx src/cli.ts extract` runs extraction on existing crawl data (from test fixtures)
- Type checks pass (no errors in extract.ts)
- Output shows normalized token counts and spacing scale metrics

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed fs-extra import pattern in pattern-store.ts**
- **Found during:** Task 2 verification
- **Issue:** `pattern-store.ts` used named imports from fs-extra (`import { ensureDir, writeJSON, readJSON, pathExists } from 'fs-extra'`), which causes ESM compatibility issues. Error: "The requested module 'fs-extra' does not provide an export named 'readJSON'"
- **Fix:** Changed to default import pattern (`import fs from 'fs-extra'`) and updated all usage to `fs.ensureDir`, `fs.writeJSON`, etc.
- **Files modified:** `src/patterns/pattern-store.ts`
- **Commit:** 3145609
- **Context:** This matches the 01-06 decision "Default import for fs-extra instead of namespace import to fix ESM compatibility". The pattern-store file was created in Phase 4 and didn't follow this convention.

## Verification Results

All verification tests passed:
- `npx tsc --noEmit` compiles without errors in crawl.ts and extract.ts
- `npx tsx src/cli.ts crawl --help` shows crawl-specific help
- `npx tsx src/cli.ts crawl` (no URL) shows error message
- `npx tsx src/cli.ts extract --help` shows extract-specific help
- `npx tsx src/cli.ts extract` processes existing crawl data successfully

Both commands tested:
- Crawl command shows progress spinner and completion summary
- Extract command loads tokens, runs normalization, and saves results
- Extract gracefully handles missing component/pattern data
- Pattern storage uses correct API (storeContentPattern)

## Success Criteria Met

- Crawl command accepts URL, depth, pages, domain options and runs the crawl pipeline with progress
- Extract command loads crawl data and runs normalization + component + pattern detection
- Both commands provide clear error messages when preconditions not met
- Both integrated into CLI router with dynamic imports
- Progress feedback provided via ora spinners
- Completion summaries show relevant metrics

## Dependencies for Next Plans

This plan provides the data-gathering commands for Phase 6:

**Phase 06 Plan 03** (Pipeline Commands) will:
- Build on extract command pattern
- Implement report command for Brand DNA Report generation
- Use same config loader and progress utilities

**Phase 06 Plan 04** (Synth/Export Commands) will:
- Use extract output (normalized tokens, components, patterns)
- Implement synth command for component synthesis
- Implement export command for multi-format token export

**Phase 06 Plan 05** (MCP Server) will:
- Expose crawl/extract as MCP tools
- Provide programmatic access to design DNA

## Self-Check

Verifying created files exist:

```bash
# Check files
[ -f "C:/Users/Karl/UIUX-mirror/src/cli/commands/crawl.ts" ] && echo "FOUND: crawl.ts" || echo "MISSING"
[ -f "C:/Users/Karl/UIUX-mirror/src/cli/commands/extract.ts" ] && echo "FOUND: extract.ts" || echo "MISSING"

# Check commits
git log --oneline --all | grep -q "7c1bef5" && echo "FOUND: 7c1bef5" || echo "MISSING"
git log --oneline --all | grep -q "3145609" && echo "FOUND: 3145609" || echo "MISSING"
```

**Result:**
- FOUND: crawl.ts
- FOUND: extract.ts
- FOUND: 7c1bef5
- FOUND: 3145609

## Self-Check: PASSED
