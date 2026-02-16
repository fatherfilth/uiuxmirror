---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/cli/commands/extract.ts
autonomous: true
must_haves:
  truths:
    - "After running extract, tokens.json exists in outputDir root"
    - "After running extract, components.json exists in outputDir root"
    - "After running extract, patterns.json exists in outputDir root"
    - "After running extract, content_style.json exists in outputDir root"
    - "After running extract, evidence_index.json exists in outputDir root"
    - "Downstream commands (report, synth, export, MCP) can find the files they expect"
  artifacts:
    - path: "src/cli/commands/extract.ts"
      provides: "Writes 5 standardized JSON files to outputDir root after extraction"
  key_links:
    - from: "src/cli/commands/extract.ts"
      to: ".uidna/tokens.json"
      via: "fs.writeJson after normalization completes"
    - from: "src/cli/commands/extract.ts"
      to: ".uidna/patterns.json"
      via: "fs.writeJson after pattern analysis completes"
---

<objective>
Fix the extract command output file mismatch so that downstream consumer commands (report, synth, export, MCP) can find the standardized JSON files they expect.

Purpose: The extract command currently writes to intermediate locations (.uidna/normalized/, .uidna/patterns/*.json) but never produces the 5 standardized JSON files that all consumer commands read from the .uidna/ root directory. This breaks the entire pipeline after extraction.

Output: Updated extract.ts that writes tokens.json, components.json, patterns.json, content_style.json, and evidence_index.json to the output directory root.
</objective>

<execution_context>
@C:/Users/Karl/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Karl/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/cli/commands/extract.ts
@src/cli/commands/report.ts (consumer - reads tokens.json, components.json, patterns.json, content_style.json)
@src/cli/commands/export.ts (consumer - reads all 5 files)
@src/cli/commands/synth.ts (consumer - reads tokens.json, components.json)
@src/mcp/resources.ts (consumer - reads tokens.json, components.json, patterns.json, content_style.json)
@src/evidence/evidence-store.ts (evidence-index.json lives at {outputDir}/evidence/evidence-index.json)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write standardized JSON output files from extract command</name>
  <files>src/cli/commands/extract.ts</files>
  <action>
In `src/cli/commands/extract.ts`, add a final output step after all processing completes (after line ~197 where `patternStore.savePatterns` is called, but before the summary console output at line ~204).

Add a new section between the pattern analysis phase and the summary output:

```
// Phase 5: Write standardized output files for downstream consumers
// Consumer commands (report, synth, export, MCP) read from outputDir root
const spinner5 = createSpinner('Writing standardized output files...').start();

// 1. tokens.json - NormalizationResult (already computed as normalizationResult)
await fs.writeJson(path.join(outputDir, 'tokens.json'), normalizationResult, { spaces: 2 });

// 2. components.json - empty array (component detection requires live browser, skipped in extract)
await fs.writeJson(path.join(outputDir, 'components.json'), [], { spaces: 2 });

// 3. patterns.json - StoredPattern[] (already computed as storedPatterns)
await fs.writeJson(path.join(outputDir, 'patterns.json'), storedPatterns, { spaces: 2 });

// 4. content_style.json - ContentStyleResult (already computed as contentStyleResult)
await fs.writeJson(path.join(outputDir, 'content_style.json'), contentStyleResult, { spaces: 2 });

// 5. evidence_index.json - load from evidence store if it exists
const evidenceSourcePath = path.join(outputDir, 'evidence', 'evidence-index.json');
const evidenceIndex = await fs.pathExists(evidenceSourcePath)
  ? await fs.readJson(evidenceSourcePath)
  : { entries: {}, byPage: {}, bySelector: {} };
await fs.writeJson(path.join(outputDir, 'evidence_index.json'), evidenceIndex, { spaces: 2 });

spinner5.succeed('Wrote standardized output files');
```

IMPORTANT: The `storedPatterns` variable is scoped inside the `if (pageData.length > 0)` block. To make it accessible for the output step, move the declaration `let storedPatterns: StoredPattern[] = [];` BEFORE the `if (pageData.length > 0)` block (around line 153, alongside the existing `let contentStyleResult = null;` and `let flows: any[] = [];` declarations). Then remove the `const` from the existing `const storedPatterns: StoredPattern[] = [];` at line 166, keeping it as just `storedPatterns = [];` (reassignment).

Also, the standardized output writing must happen OUTSIDE the `if (pageData.length > 0)` block so it always runs. Place it after the closing brace of that if/else block (after line 202) and before the summary console output (line 204). This ensures tokens.json always gets written (normalizationResult is always computed), and the other files get sensible defaults (empty arrays, null, empty evidence) when page data is not available.

Finally, update the "Output locations" console summary (around line 224-227) to add:
```
console.log(`  Standardized JSON: ${outputDir}`);
console.log('    tokens.json, components.json, patterns.json, content_style.json, evidence_index.json');
```
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no TypeScript errors. Run `npx vitest run tests/cli/cli.test.ts` to verify existing CLI tests still pass. Grep for the 5 output filenames in extract.ts to confirm they are all written.
  </verify>
  <done>
extract.ts writes all 5 standardized JSON files (tokens.json, components.json, patterns.json, content_style.json, evidence_index.json) to the outputDir root after extraction completes. The storedPatterns variable is properly scoped for access outside the if-block. The console summary mentions the standardized output files. TypeScript compiles clean. Existing tests pass.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - no TypeScript compilation errors
2. `npx vitest run tests/cli/cli.test.ts` - existing CLI tests pass
3. Grep `extract.ts` for `tokens.json`, `components.json`, `patterns.json`, `content_style.json`, `evidence_index.json` - all 5 filenames present as write targets
4. Confirm `storedPatterns` is declared outside the `if (pageData.length > 0)` block
</verification>

<success_criteria>
- extract.ts writes tokens.json to outputDir root containing NormalizationResult
- extract.ts writes components.json to outputDir root containing empty array
- extract.ts writes patterns.json to outputDir root containing StoredPattern[]
- extract.ts writes content_style.json to outputDir root containing ContentStyleResult or null
- extract.ts writes evidence_index.json to outputDir root containing EvidenceIndex (loaded from evidence store or empty default)
- All writes happen unconditionally (not gated by pageData availability)
- TypeScript compiles without errors
- Existing tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-the-extract-command-output-file-mism/1-SUMMARY.md`
</output>
