/**
 * Flow detector for UIUX-Mirror
 * Phase 4: Detects multi-page interaction patterns from crawled data
 */

import type Graph from 'graphology';
import type { PageData } from '../types/crawl-config.js';
import type { PageState, DetectedFlow, Transition } from '../types/patterns.js';
import { buildStateFlowGraph } from './state-graph-builder.js';
import { classifyFlow, calculateFlowConfidence, analyzeFlowCharacteristics } from './flow-classifier.js';

/**
 * Detect multi-page interaction flows from crawled pages
 *
 * Algorithm:
 * 1. Build state-flow graph from PageData
 * 2. Identify flow entry points (forms with low in-degree, flow-start keywords)
 * 3. BFS traversal from each entry point to find connected sequences
 * 4. Filter out non-flow sequences (require form submission or state change)
 * 5. Classify flows and calculate confidence
 * 6. Deduplicate overlapping flows
 *
 * Returns DetectedFlow[] sorted by confidence descending
 */
export function detectFlows(
  pages: PageData[],
  htmlContents: Map<string, string>
): DetectedFlow[] {
  // Handle empty input
  if (pages.length === 0) {
    return [];
  }

  // Build state-flow graph
  const graph = buildStateFlowGraph(pages, htmlContents);

  // Handle empty graph (no nodes)
  if (graph.order === 0) {
    return [];
  }

  const flows: DetectedFlow[] = [];
  const visited = new Set<string>();

  // Identify flow entry points
  const entryPoints = identifyEntryPoints(graph);

  for (const entryPoint of entryPoints) {
    if (visited.has(entryPoint)) continue;

    // BFS traversal to find connected page sequences
    const pathSequences = findPathSequences(graph, entryPoint, visited);

    for (const path of pathSequences) {
      // Filter out non-flow sequences
      if (!isValidFlow(graph, path)) {
        continue;
      }

      // Classify and build DetectedFlow
      const flowType = classifyFlow(graph, path);
      const confidence = calculateFlowConfidence(flowType, path, graph);
      const transitions = extractTransitions(graph, path);
      const characteristics = analyzeFlowCharacteristics(path, graph);
      const evidence = path.map(pageId => {
        const attrs = graph.getNodeAttributes(pageId);
        return attrs.evidenceId;
      });

      // Check for dead-end flows (lower confidence)
      const exitPoint = path[path.length - 1];
      const isDeadEnd = graph.outDegree(exitPoint) === 0 &&
                        graph.getNodeAttributes(exitPoint).formElements.length > 0;
      const adjustedConfidence = isDeadEnd ? confidence - 0.2 : confidence;

      flows.push({
        type: flowType,
        entryPoint: path[0],
        exitPoint: path[path.length - 1],
        path,
        transitions,
        confidence: Math.max(0, Math.min(1, adjustedConfidence)),
        evidence,
        characteristics,
      });
    }
  }

  // Deduplicate overlapping flows (>70% shared nodes)
  const deduplicatedFlows = deduplicateFlows(flows);

  // Sort by confidence descending
  return deduplicatedFlows.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Identify flow entry points
 *
 * Entry points are:
 * - Pages with forms that have low in-degree (few pages link to them)
 * - Pages matching flow-start keywords (login, register, checkout, search)
 */
function identifyEntryPoints(graph: Graph<PageState, Transition>): string[] {
  const entryPoints: string[] = [];
  const nodes = graph.nodes();

  for (const nodeId of nodes) {
    const attrs = graph.getNodeAttributes(nodeId);
    const inDegree = graph.inDegree(nodeId);

    // Entry point criteria
    const hasForm = attrs.formElements.length > 0;
    const lowInDegree = inDegree <= 2; // Few pages link here
    const hasEntryKeywords =
      /login|sign-?in|register|sign-?up|checkout|search|start|welcome/i.test(attrs.title) ||
      /login|register|checkout|search/i.test(attrs.url);

    if ((hasForm && lowInDegree) || hasEntryKeywords) {
      entryPoints.push(nodeId);
    }
  }

  return entryPoints;
}

/**
 * Find path sequences from entry point using BFS
 *
 * Returns array of paths (each path is array of page IDs)
 */
function findPathSequences(
  graph: Graph<PageState, Transition>,
  entryPoint: string,
  globalVisited: Set<string>
): string[][] {
  const paths: string[][] = [];
  const localVisited = new Set<string>();

  // BFS with path tracking
  const queue: Array<{ node: string; path: string[] }> = [
    { node: entryPoint, path: [entryPoint] }
  ];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    if (localVisited.has(node)) {
      continue;
    }

    localVisited.add(node);
    globalVisited.add(node);

    // Check if this path is complete (no more form-related edges)
    const outEdges = graph.outEdges(node);
    let hasFormRelatedEdge = false;

    for (const edge of outEdges) {
      const edgeAttrs = graph.getEdgeAttributes(edge) as any;
      const target = graph.target(edge);

      // Skip navigation edges
      if (edgeAttrs.isNavigation) {
        continue;
      }

      hasFormRelatedEdge = true;

      // Only continue if not already in path (avoid cycles)
      if (!path.includes(target)) {
        queue.push({
          node: target,
          path: [...path, target],
        });
      }
    }

    // If path has at least 2 nodes and no more form-related edges, it's complete
    if (path.length >= 2 && !hasFormRelatedEdge) {
      paths.push(path);
    }
  }

  // If no complete paths found but entry point exists, return single-node path
  if (paths.length === 0 && graph.hasNode(entryPoint)) {
    paths.push([entryPoint]);
  }

  return paths;
}

/**
 * Check if path is a valid flow
 *
 * Valid flows require:
 * - At least 2 pages OR
 * - At least one form submission edge OR
 * - State-change indicator (form elements present)
 *
 * Pure link navigation is not a flow
 */
function isValidFlow(graph: Graph<PageState, Transition>, path: string[]): boolean {
  if (path.length < 2) {
    return false; // Single page is not a flow
  }

  // Check for form submission edge
  for (let i = 0; i < path.length - 1; i++) {
    const fromPageId = path[i];
    const toPageId = path[i + 1];

    if (graph.hasEdge(fromPageId, toPageId)) {
      const edgeAttrs = graph.getEdgeAttributes(fromPageId, toPageId) as any;
      if (edgeAttrs.action?.type === 'submit') {
        return true; // Has form submission
      }
    }
  }

  // Check for state-change indicator (at least one page with forms)
  const hasFormPage = path.some(pageId => {
    const attrs = graph.getNodeAttributes(pageId);
    return attrs.formElements.length > 0;
  });

  return hasFormPage;
}

/**
 * Extract transitions from graph along path
 */
function extractTransitions(
  graph: Graph<PageState, Transition>,
  path: string[]
): Transition[] {
  const transitions: Transition[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fromPageId = path[i];
    const toPageId = path[i + 1];

    if (graph.hasEdge(fromPageId, toPageId)) {
      const edgeAttrs = graph.getEdgeAttributes(fromPageId, toPageId) as any;
      const transition: Transition = {
        fromState: edgeAttrs.fromState,
        toState: edgeAttrs.toState,
        action: edgeAttrs.action,
        evidence: edgeAttrs.evidence,
      };
      transitions.push(transition);
    }
  }

  return transitions;
}

/**
 * Deduplicate flows that share >70% of their path nodes
 * Keep only the flow with higher confidence
 */
function deduplicateFlows(flows: DetectedFlow[]): DetectedFlow[] {
  const deduplicated: DetectedFlow[] = [];

  for (const flow of flows) {
    let isDuplicate = false;

    for (const existing of deduplicated) {
      const overlap = calculatePathOverlap(flow.path, existing.path);

      if (overlap > 0.7) {
        // Duplicate found
        isDuplicate = true;

        // If new flow has higher confidence, replace existing
        if (flow.confidence > existing.confidence) {
          const index = deduplicated.indexOf(existing);
          deduplicated[index] = flow;
        }
        break;
      }
    }

    if (!isDuplicate) {
      deduplicated.push(flow);
    }
  }

  return deduplicated;
}

/**
 * Calculate path overlap as percentage of shared nodes
 */
function calculatePathOverlap(path1: string[], path2: string[]): number {
  const set1 = new Set(path1);
  const set2 = new Set(path2);

  let sharedCount = 0;
  for (const node of set1) {
    if (set2.has(node)) {
      sharedCount++;
    }
  }

  const maxLength = Math.max(path1.length, path2.length);
  return sharedCount / maxLength;
}
