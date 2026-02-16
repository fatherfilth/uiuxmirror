---
phase: quick-1
plan: 01
subsystem: cli-extract
tags: [bugfix, pipeline, file-output]
dependency_graph:
  requires:
    - normalization-pipeline (tokens.json source)
    - pattern-analysis (patterns.json, content_style.json source)
    - evidence-store (evidence_index.json source)
  provides:
    - standardized-json-output (5 files at outputDir root)
  affects:
    - report-command (now receives tokens.json, patterns.json, content_style.json)
    - synth-command (now receives tokens.json, components.json)
    - export-command (now receives all 5 files)
    - mcp-resources (now receives tokens.json, components.json, patterns.json, content_style.json)
tech_stack:
  added: []
  patterns:
    - Standardized JSON file output protocol
    - Empty array defaults for unavailable data (components.json)
    - Evidence index copying from evidence/ to root
key_files:
  created: []
  modified:
    - src/cli/commands/extract.ts
decisions:
  - id: quick-1-01
    summary: Write all 5 standardized JSON files unconditionally (not gated by pageData)
    rationale: Downstream consumers expect consistent file structure; empty/null defaults better than missing files
    impact: Improved reliability of pipeline, consistent consumer experience
  - id: quick-1-02
    summary: components.json written as empty array (component detection requires live browser)
    rationale: Extract command runs post-crawl without browser access; component detection must happen during crawl
    impact: Consumers receive valid empty array instead of missing file
  - id: quick-1-03
    summary: evidence_index.json copied from evidence/evidence-index.json with empty fallback
    rationale: Evidence store writes to subdirectory; consumers expect root-level access
    impact: Evidence traceability available to all consumers via standardized location
metrics:
  duration_minutes: 1.6
  tasks_completed: 1
  files_modified: 1
  commits: 1
  deviations: 0
  completed_date: 2026-02-16
---

# Quick Task 1: Fix Extract Command Output File Mismatch

Extract command now writes 5 standardized JSON files (tokens.json, components.json, patterns.json, content_style.json, evidence_index.json) to outputDir root for downstream consumer commands.

## Objective

Fix the extract command output file mismatch so that downstream consumer commands (report, synth, export, MCP) can find the standardized JSON files they expect at the outputDir root instead of intermediate locations.

## Implementation Summary

### Task 1: Write standardized JSON output files from extract command

**Status:** Complete
**Commit:** 8b698cf
**Files modified:** src/cli/commands/extract.ts

Added Phase 5 to extract command pipeline that writes 5 standardized JSON files after all processing completes:

1. **tokens.json** - NormalizationResult from normalization pipeline
2. **components.json** - Empty array (component detection requires live browser, skipped in extract)
3. **patterns.json** - StoredPattern[] from pattern analysis
4. **content_style.json** - ContentStyleResult from content analysis
5. **evidence_index.json** - Copied from evidence/evidence-index.json or empty default

**Key changes:**
- Moved `storedPatterns` variable declaration outside `if (pageData.length > 0)` block for proper scope access
- Added Phase 5 spinner "Writing standardized output files..."
- Wrote all 5 files unconditionally to outputDir root with fs.writeJson
- Updated console summary to mention standardized JSON output location
- Evidence index loaded from evidence/ subdirectory with fallback to empty structure

**Verification:**
- TypeScript compilation: PASSED (npx tsc --noEmit)
- CLI tests: PASSED (11/11 tests in tests/cli/cli.test.ts)
- All 5 filenames present in extract.ts: CONFIRMED
- storedPatterns scoped correctly: CONFIRMED

## Success Criteria

- [x] extract.ts writes tokens.json to outputDir root containing NormalizationResult
- [x] extract.ts writes components.json to outputDir root containing empty array
- [x] extract.ts writes patterns.json to outputDir root containing StoredPattern[]
- [x] extract.ts writes content_style.json to outputDir root containing ContentStyleResult or null
- [x] extract.ts writes evidence_index.json to outputDir root containing EvidenceIndex
- [x] All writes happen unconditionally (not gated by pageData availability)
- [x] TypeScript compiles without errors
- [x] Existing tests pass

## Deviations from Plan

None - plan executed exactly as written.

## Impact Assessment

### Consumer Commands Now Unblocked

**Before:** Extract command wrote to intermediate locations (.uidna/normalized/, .uidna/patterns/*.json), breaking downstream consumers.

**After:** Extract command writes 5 standardized JSON files to outputDir root, enabling:
- **report** command to load tokens.json, components.json, patterns.json, content_style.json
- **synth** command to load tokens.json, components.json
- **export** command to load all 5 files
- **MCP resources** to serve tokens.json, components.json, patterns.json, content_style.json

### Pipeline Reliability

- Consumers receive consistent file structure regardless of extraction outcome
- Empty/null defaults prevent missing file errors
- Evidence traceability available via standardized evidence_index.json location

## Self-Check: PASSED

**Created files:** None (only modified existing)

**Modified files:**
- src/cli/commands/extract.ts: FOUND

**Commits:**
- 8b698cf: FOUND

**All verifications passed.**

---

**Execution time:** 1.6 minutes
**Completed:** 2026-02-16T05:29:27Z
