# Pitfalls Research: Design System Extraction Tools

**Domain:** Web scraping and design system extraction
**Researched:** 2026-02-15
**Confidence:** MEDIUM

_Note: Research conducted without external source verification due to tool access limitations. Findings based on established web scraping patterns, Playwright capabilities, and design system extraction domain knowledge. Recommendations should be validated against official documentation during implementation._

## Critical Pitfalls

### Pitfall 1: Dynamic Content Race Conditions

**What goes wrong:**
Scraper extracts styles before JavaScript finishes rendering, resulting in incomplete or incorrect style data. CSS-in-JS frameworks inject styles asynchronously, so naive scraping captures pre-hydration states.

**Why it happens:**
Developers assume page load = content ready. Modern frameworks (React, Vue, Svelte) hydrate after initial HTML, and CSS-in-JS libraries (styled-components, emotion, Stitches) inject styles post-mount. Using simple `page.goto()` + immediate extraction misses dynamically injected content.

**How to avoid:**
- Use explicit wait strategies for CSS injection: `page.waitForSelector('[data-styled]')` or framework-specific markers
- Implement idle detection: `page.waitForLoadState('networkidle')` is insufficient; wait for specific style tags
- For CSS-in-JS: Wait for `<style data-styled>`, `<style data-emotion>`, or library-specific markers
- Add configurable delay after page load for custom frameworks
- Verify computed styles stabilize (compare snapshots 100ms apart)

**Warning signs:**
- Extracted design tokens vary between runs on same URL
- Missing styles that are visible in browser
- Empty or minimal style extraction on known CSS-in-JS sites
- Color values showing default browser styles instead of theme colors

**Phase to address:**
Phase 1 (Core Crawling) - Must handle dynamic content from start, or all subsequent extraction is unreliable

---

### Pitfall 2: Hashed Classname Brittleness

**What goes wrong:**
Tools rely on CSS classnames for component identification, but build-time hashing (`Button_3x7k2`, `css-1a2b3c4`) makes cross-page pattern matching impossible. Same component has different classnames across pages or deploys.

**Why it happens:**
Build tools (CSS Modules, CSS-in-JS, Tailwind JIT) hash classnames for scoping. Developers assume classnames are stable identifiers for component types, but hashes change per build or page.

**How to avoid:**
- Use computed styles, not classnames, as primary evidence (project already does this - good)
- Extract visual characteristics: dimensions, colors, typography, spacing patterns
- Use structural patterns: DOM hierarchy, ARIA roles, semantic tags
- Cluster similar styles across pages using threshold-based matching
- Never use hashed classnames as cache keys or primary identifiers

**Warning signs:**
- Component discovery works on single page but not across site
- False positives: unrelated elements grouped as same component
- Cross-page consistency checks fail on identical visual components
- Pattern matching breaks after site redeploy

**Phase to address:**
Phase 1 (Core Extraction) - Architecture decision; retrofitting is expensive

---

### Pitfall 3: Anti-Bot Detection False Positives

**What goes wrong:**
Target sites detect Playwright as bot and serve different content (degraded UI, CAPTCHA, blocks), making extracted design system unrepresentative of real user experience.

**Why it happens:**
Headless browsers have detectable fingerprints: navigator.webdriver flag, missing browser plugins, consistent timing patterns, missing WebGL/Canvas noise. Sites use services like Cloudflare, DataDome, or custom detection.

**How to avoid:**
- Use `page.context({ javaScriptEnabled: true })` with stealth plugins
- Randomize viewport sizes, user agents across requests
- Respect rate limits: add jitter to request intervals (500ms-2s between pages)
- Use `--disable-blink-features=AutomationControlled` Chromium flag
- Consider non-headless mode for high-security sites
- Implement retry with exponential backoff on detection
- Detect anti-bot responses: check for CAPTCHA elements, unusual redirects

**Warning signs:**
- Different content in Playwright vs manual browser inspection
- Frequent CAPTCHA pages during crawling
- Simplified/degraded UI extracted vs. actual site
- High rate of request failures or redirects
- Missing JavaScript-heavy components

**Phase to address:**
Phase 1 (Core Crawling) - Detection avoidance must be built in, not bolted on

---

### Pitfall 4: Computed Style Context Loss

**What goes wrong:**
Extracting `getComputedStyle()` without understanding inheritance and cascade results in bloated, incorrect token sets. Extracted "primary color" is actually `inherit` resolved from parent context that won't exist in consuming project.

**Why it happens:**
Computed styles include inherited values, browser defaults, and context-specific resolutions. Naive extraction captures final computed values without understanding which are intentional design tokens vs. inherited/defaulted properties.

**How to avoid:**
- Compare computed styles to inline/stylesheet source to identify intentional values
- Filter out browser defaults: maintain known default value list per property
- Track value frequency across elements: if `font-family: system-ui` appears 95% of time, it's likely a token
- Distinguish explicit vs. inherited: check if value exists in element's own styles
- Build semantic clustering: group similar values (colors within 5% threshold)

**Warning signs:**
- Extracted token sets include browser defaults (16px, Times New Roman, black)
- Huge number of "unique" tokens that are slight variations
- Colors include one-off inheritance artifacts
- Typography tokens include unintentional size variations

**Phase to address:**
Phase 2 (Token Extraction) - Core to token quality; affects all downstream features

---

### Pitfall 5: LLM Hallucination in Component Naming

**What goes wrong:**
Claude API invoked to name extracted components hallucinates relationships or purposes not supported by evidence. Names components "LoginButton" when evidence only shows "blue rounded rectangle with text" - no login context exists.

**Why it happens:**
LLMs fill gaps with plausible guesses. Without strict evidence grounding, Claude infers purpose from partial signals (color, position, size) rather than just visual patterns. Developers trust LLM confidence without verification.

**How to avoid:**
- Provide visual evidence only in prompts: dimensions, colors, typography, spacing
- Explicitly instruct: "Name based ONLY on visual characteristics, not inferred purpose"
- Include multiple examples per component from different contexts to show variation
- Implement confidence thresholds: reject names with <80% certainty
- Use structured output: require LLM to cite which evidence supports each naming decision
- Prefer descriptive names over semantic: "large-blue-button" not "primary-action"
- Human review queue for low-confidence classifications

**Warning signs:**
- Component names reference functionality not visible in captured evidence
- Same visual pattern gets different semantic names across pages
- Names too specific for generic patterns
- Inability to map names back to visual evidence

**Phase to address:**
Phase 3 (Inference) - Inference quality determines tool credibility; poor naming = distrust

---

### Pitfall 6: Cross-Page Consistency Threshold Tuning

**What goes wrong:**
Evidence threshold too low: false positives flood results with one-off elements labeled as "components". Threshold too high: legitimate pattern variations missed, incomplete design system.

**Why it happens:**
Real design systems have intentional variation (primary/secondary button colors, heading size scales). Setting single threshold trades false positives for false negatives. No universal threshold works across all sites.

**How to avoid:**
- Implement adaptive thresholds based on site size: more pages = higher confidence needed
- Per-property tolerances: color exact match, size ±2px, spacing ±4px
- Minimum occurrence counts: require 3+ instances before declaring pattern
- Cluster analysis before thresholding: identify natural groupings in data
- Provide threshold tuning UI: let users adjust sensitivity and preview results
- Report confidence scores: show "80% match across 5 pages" not binary yes/no

**Warning signs:**
- Extracted components include obvious one-off elements
- Missing known repeated patterns (like site header/footer)
- Drastically different results on same site with minor threshold tweaks
- No variation captured in tokens (all buttons identical = threshold too strict)

**Phase to address:**
Phase 2 (Token Extraction) & Phase 3 (Inference) - Threshold tuning affects both extraction and classification

---

### Pitfall 7: Robots.txt Parsing Edge Cases

**What goes wrong:**
Tool respects robots.txt but misparses directives, causing either over-blocking (misses allowed content) or under-blocking (violates restrictions). Complex User-agent rules, wildcards, and Sitemap directives cause failures.

**Why it happens:**
Robots.txt has subtle parsing rules: case sensitivity, wildcard matching, precedence order, User-agent grouping. Developers implement naive parsing that handles simple cases but breaks on real-world complexity.

**How to avoid:**
- Use established robots.txt parser library: `robots-parser` (npm), don't roll your own
- Handle multiple User-agent directives: most specific match wins
- Support wildcards: `*` and `$` anchors in paths
- Respect Crawl-delay if present
- Default to block if robots.txt unreachable (network error) vs. 404 (no restrictions)
- Provide override mode for user-owned sites with clear legal warnings
- Cache robots.txt per domain with TTL

**Warning signs:**
- Crawling blocked on sites with no robots.txt file
- Crawling allowed paths explicitly disallowed in robots.txt
- Errors on sites with complex User-agent rules
- Ignoring Crawl-delay causing rate limit issues

**Phase to address:**
Phase 1 (Core Crawling) - Legal compliance from start; retrofitting is risky

---

### Pitfall 8: Memory Leaks in Long Crawls

**What goes wrong:**
Memory usage grows unbounded during multi-page crawls. After 50+ pages, process crashes or becomes extremely slow. DOM nodes, page contexts, or extracted data accumulate without cleanup.

**Why it happens:**
Playwright page/context objects hold references to browser resources. Extracted style data stored in memory without streaming to disk. Event listeners not cleaned up. Developers test with small sites (5-10 pages) but production crawls 100s.

**How to avoid:**
- Close page/context after extraction: `await page.close()`, not just navigate away
- Stream results to disk incrementally, don't hold all in memory
- Use fixed-size page pool: limit concurrent browser contexts (3-5 max)
- Implement memory monitoring: warn/stop if process exceeds threshold
- Clear caches periodically: every 25 pages, flush and restart
- Use generators/streams for result iteration instead of loading all
- Profile memory on 100+ page test sites before shipping

**Warning signs:**
- Memory usage grows linearly with page count
- Slower performance on later pages in crawl
- Crashes on large sites but works on small test cases
- Garbage collection pauses increase over time

**Phase to address:**
Phase 1 (Core Crawling) - Performance issues multiply with scale; fix early

---

### Pitfall 9: Evidence Quality vs. Quantity Tradeoff

**What goes wrong:**
Crawler captures screenshots, DOM snapshots, all computed styles, network requests - huge data volume, slow processing, but doesn't improve accuracy. Or opposite: minimal evidence, fast but inaccurate inference.

**Why it happens:**
Unclear ROI on evidence types. Developers capture "everything just in case" or minimize to optimize performance without measuring impact on inference quality.

**How to avoid:**
- Benchmark evidence types: measure inference accuracy with/without each evidence type
- Capture only what inference uses: if screenshots unused, don't generate them
- Implement evidence sampling: for 100-element patterns, 10 representative examples sufficient
- Tiered evidence: minimal for initial scan, detailed for confirmed patterns
- Compress/deduplicate: similar computed styles stored once with references
- Measure evidence-to-accuracy ratio: if 10x data = 2% better accuracy, not worth it

**Warning signs:**
- Evidence storage grows faster than number of pages crawled
- Inference doesn't reference large portions of captured evidence
- Processing time dominated by evidence serialization, not extraction
- Same information captured in multiple formats

**Phase to address:**
Phase 2 (Token Extraction) & Phase 3 (Inference) - Evidence strategy affects performance and quality

---

### Pitfall 10: Shadow DOM Blind Spots

**What goes wrong:**
Web components using Shadow DOM hide styles from standard extraction. Tool reports "no styles found" or misses component libraries built with Web Components (Shoelace, Lion, Lit).

**Why it happens:**
Shadow DOM encapsulates styles; `getComputedStyle()` on host element doesn't reveal internal styles. Developers test on non-Shadow DOM sites, miss this entire category.

**How to avoid:**
- Detect shadow roots: traverse `element.shadowRoot` recursively
- Extract styles from within shadow context: `shadowRoot.adoptedStyleSheets`
- Handle constructable stylesheets: `CSSStyleSheet` API usage in modern components
- Check for `::part()` and `::slotted()` pseudo-elements
- Test against Web Component-heavy sites during development
- Document limitations if full Shadow DOM support not feasible

**Warning signs:**
- Extraction works on React/Vue sites but fails on Lit/Stencil sites
- Missing styles on sites using design system web components
- Empty extraction on modern component libraries
- Computed styles differ from visual appearance

**Phase to address:**
Phase 2 (Token Extraction) - Architectural decision; Shadow DOM support is complex

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip robots.txt for user-owned sites | Faster to ship, users don't care | Legal liability, bad reputation if misused | Never - implement with override flag |
| Single threshold for all style properties | Simpler code, fewer config options | Poor accuracy: colors need exact match, sizes need tolerance | Never - per-property critical |
| Store all evidence in memory | Faster access, simpler code | Memory limits crawl size, crashes | MVP only - max 10 pages |
| Use classnames for component identity | Easy to implement, obvious approach | Breaks on CSS Modules, CSS-in-JS, Tailwind | Never - computed styles required |
| Synchronous crawling (one page at time) | Simpler code, easier debugging | 10x slower on multi-page sites | MVP only - concurrency needed for production |
| Hardcode wait times (e.g., always wait 2s) | Reliable for tested sites | Too slow for static sites, too fast for slow sites | Early prototyping only |
| Trust LLM output without validation | Faster inference, less code | Hallucinations damage credibility | Never - always validate against evidence |
| Skip anti-bot detection measures | Works on simple sites | Blocked on production sites, unreliable data | Local testing only |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude API | Sending entire DOM as context, hitting token limits | Send only computed styles summary, visual patterns, element counts |
| Playwright | Not handling browser launch failures (missing dependencies) | Wrap in try/catch, detect missing deps, provide install instructions |
| File storage | Writing all results to single JSON file, corruption on crash | Stream to separate files per page, atomic writes, validation |
| robots.txt | Fetching robots.txt synchronously per page | Cache per domain with 24hr TTL, parallel fetch |
| CSS parsing | Using regex to extract CSS values | Use CSSOM APIs or proper CSS parser library |
| Screenshot capture | Full page screenshots for every element | Selective screenshots: only for user-requested evidence or debugging |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all pages before processing | Works fine on 5-page test sites | Streaming architecture: process pages as crawled | 50+ pages: memory/time explosion |
| Serial page processing | Test site (3 pages) completes in 10s | Concurrent crawling: 3-5 parallel contexts | 20+ pages: users notice slowness |
| Storing raw DOM snapshots | Small sites = 10MB total | Store computed styles only, compress | 100+ pages: multi-GB storage |
| No deduplication of styles | Not noticeable on simple sites | Hash styles, store once, reference by ID | Complex sites: 10x data bloat |
| Retrying failed pages indefinitely | Seems thorough | Max 3 retries, exponential backoff, then skip | One broken page hangs entire crawl |
| Computing all possible style combinations | Complete token coverage | Extract only explicitly used values | Sites with dynamic themes: combinatorial explosion |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing scraped JavaScript | Malicious site code runs in tool context | Never eval/execute scraped code; only read computed results |
| Following redirects blindly | Open redirect to malicious domains | Validate redirect domains, limit redirect depth (3 max) |
| No URL validation | Crawl local files, internal IPs, SSRF attacks | Validate HTTP/HTTPS only, block private IP ranges, require domain |
| Storing scraped content without sanitization | XSS if results displayed in UI | Sanitize all scraped content before storage/display |
| Ignoring CSP/CORS | False sense of access | Respect headers: CSP violations = can't extract scripts; note in results |
| No rate limiting | Accidental DOS of target site | Implement default 1req/sec max, user-configurable with warnings |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication for long crawls | User thinks tool froze, force-quits | Real-time progress: "Page 5/20, 2 components found" |
| Dumping raw style objects as output | Overwhelming, unusable data | Organized hierarchy: tokens → components → pages |
| No explanation for skipped pages | User confused why count differs from expected | Report: "Skipped 3 pages: robots.txt (2), error (1)" |
| Binary success/failure | Tool "failed" but actually extracted 80% successfully | Partial success: show what worked, what didn't |
| Technical error messages | "Failed to evaluate getComputedStyle" unhelpful to non-devs | User-friendly: "Couldn't extract styles from [URL]. Site may block automated tools." |
| No preview of results | Extract 100 tokens, user finds they're all junk | Confidence scores, sample preview, validation before full processing |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **robots.txt compliance:** Often missing Crawl-delay handling - verify respects all directives, not just Disallow
- [ ] **Dynamic content waiting:** Often missing framework-specific markers - verify waits for CSS-in-JS injection, not just page load
- [ ] **Error handling:** Often missing partial success paths - verify reports which pages worked vs. failed
- [ ] **Memory management:** Often missing cleanup in error paths - verify page.close() in finally blocks
- [ ] **Anti-bot detection:** Often missing User-agent randomization - verify stealth config beyond basic headless flags
- [ ] **Token deduplication:** Often missing semantic grouping - verify #FF0000 and #FF0001 cluster as same red
- [ ] **Cross-page validation:** Often missing threshold configuration - verify users can tune sensitivity
- [ ] **Shadow DOM support:** Often missing entirely - verify web component detection and extraction
- [ ] **LLM validation:** Often missing confidence scoring - verify inference provides evidence citations
- [ ] **Rate limiting:** Often missing per-domain tracking - verify respects different limits for different sites

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Anti-bot detection mid-crawl | LOW | Enable stealth mode, wait 5 min, retry from failed page |
| Memory leak crashes process | MEDIUM | Implement checkpoint/resume: save progress every 10 pages, restart from last checkpoint |
| Wrong threshold settings | LOW | Reprocess evidence with new thresholds (evidence already captured) |
| Hashed classnames used as IDs | HIGH | Re-crawl entire site with computed style approach; no shortcut |
| Missing robots.txt compliance | HIGH | Audit all stored data for violations, delete, re-crawl with compliance |
| LLM hallucinated names | LOW | Re-run inference with stricter prompts; evidence unchanged |
| Dynamic content timing issues | MEDIUM | Add configurable wait multiplier, re-crawl affected pages |
| Shadow DOM not extracted | MEDIUM | Add Shadow DOM traversal, re-crawl affected sites |
| Evidence bloat causing performance issues | MEDIUM | Implement compression/deduplication, reprocess existing evidence |
| Cross-page consistency false positives | LOW | Raise thresholds, reprocess evidence (no re-crawl needed) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dynamic content race conditions | Phase 1: Core Crawling | Test on React + styled-components site, verify CSS-in-JS extraction |
| Hashed classname brittleness | Phase 1: Core Extraction | Test on CSS Modules site, verify cross-page matching works |
| Anti-bot detection | Phase 1: Core Crawling | Test on Cloudflare-protected site, verify extraction succeeds |
| Computed style context loss | Phase 2: Token Extraction | Verify extracted tokens exclude browser defaults |
| LLM hallucination | Phase 3: Inference | Verify component names cite visual evidence only |
| Cross-page consistency thresholds | Phase 2: Token Extraction | Verify no one-off elements in components, no missing repeated patterns |
| Robots.txt parsing | Phase 1: Core Crawling | Test against complex robots.txt examples, verify correct allow/deny |
| Memory leaks | Phase 1: Core Crawling | Test 100+ page crawl, verify linear memory usage |
| Evidence quality vs. quantity | Phase 2: Token Extraction | Measure inference accuracy per evidence type, optimize storage |
| Shadow DOM blind spots | Phase 2: Token Extraction | Test on Lit/Shoelace site, verify component extraction |

## Domain-Specific Research Flags

Areas requiring deeper investigation during specific phases.

| Phase | Research Need | Why |
|-------|--------------|-----|
| Phase 1 | Playwright stealth best practices 2026 | Anti-bot techniques evolve rapidly; verify current methods |
| Phase 2 | CSS-in-JS library detection patterns | Each library (emotion, styled-components, Stitches) has different markers |
| Phase 2 | Design token semantic clustering algorithms | Threshold tuning needs mathematical foundation (not guesswork) |
| Phase 3 | LLM prompt engineering for grounded inference | Claude capabilities change; verify structured output options |
| Phase 3 | Component classification confidence scoring | Need statistical approach to confidence, not arbitrary thresholds |

## Known Unknowns

Areas where current knowledge has gaps.

1. **Optimal evidence-to-accuracy ratio:** Unknown if screenshots improve LLM inference quality enough to justify storage cost - needs empirical testing
2. **Cross-framework compatibility:** Unknown how well computed styles approach works on Svelte, SolidJS, Qwik - limited test coverage
3. **Legal compliance beyond robots.txt:** Unknown if design system extraction constitutes fair use, derivative work - needs legal review
4. **Threshold tuning automation:** Unknown if unsupervised clustering can auto-determine thresholds - may need manual tuning
5. **Scale limits:** Unknown at what page count (500? 1000?) architecture breaks - needs load testing

## Sources

**Confidence Assessment:** MEDIUM

This research draws from:
- Established web scraping patterns and challenges (general domain knowledge)
- Playwright architecture and capabilities (from training data, needs official docs verification)
- CSS-in-JS ecosystem characteristics (from training data)
- Design system extraction domain patterns (from training data)
- Project context provided (UIUX-Mirror requirements)

**Verification needed:**
- Playwright anti-bot detection best practices (check official docs)
- Current CSS-in-JS library markers (check styled-components, emotion, Stitches docs)
- robots.txt parser library recommendations (verify npm package quality)
- Claude API structured output capabilities (check Anthropic docs)

**Limitations:**
- No external source verification due to tool access restrictions
- No post-mortem analysis of real design extraction tool failures
- No community discussions or issue tracker analysis
- Recommendations based on general principles, not specific validated case studies

---
_Pitfalls research for: UIUX-Mirror design system extraction tool_
_Researched: 2026-02-15_
_Mode: Pitfalls dimension only (part of broader project research)_
