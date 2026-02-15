/**
 * LLM refiner for nuanced design decisions
 * Uses Claude API with structured outputs for motion timing, edge states, and microcopy
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  StructuralSynthesis,
  DesignDNA,
  LLMRefinement,
  MotionTiming,
  EdgeStates,
  Microcopy,
  SynthesisDecision,
  EvidenceLink
} from '../types/synthesis.js';
import {
  buildSystemPrompt,
  buildMotionPrompt,
  buildEdgeStatePrompt,
  buildMicrocopyPrompt
} from './prompt-builder.js';

// Zod schemas for structured outputs
const MotionTimingSchema = z.object({
  transitions: z.array(z.object({
    property: z.string(),
    duration: z.string(),
    timingFunction: z.string(),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(z.string())
  }))
});

const EdgeStateSchema = z.object({
  loadingState: z.object({
    presentation: z.enum(['spinner', 'skeleton', 'text-change', 'progress-bar']),
    styles: z.record(z.string()),
    ariaAttributes: z.record(z.string()),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1)
  }),
  errorState: z.object({
    presentation: z.enum(['inline-message', 'toast', 'banner', 'icon']),
    styles: z.record(z.string()),
    ariaAttributes: z.record(z.string()),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1)
  })
});

const MicrocopySchema = z.object({
  labels: z.record(z.string()),
  placeholders: z.record(z.string()),
  buttonText: z.string().optional(),
  errorMessages: z.record(z.string()).optional(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1)
});

/**
 * Convert Zod schema to JSON Schema for Anthropic structured outputs
 * Manual conversion to avoid extra dependency
 */
function zodToJsonSchema(schema: z.ZodTypeAny, name: string): Record<string, unknown> {
  if (schema === MotionTimingSchema) {
    return {
      name,
      strict: true,
      schema: {
        type: 'object',
        properties: {
          transitions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                property: { type: 'string' },
                duration: { type: 'string' },
                timingFunction: { type: 'string' },
                reasoning: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                evidenceIds: { type: 'array', items: { type: 'string' } }
              },
              required: ['property', 'duration', 'timingFunction', 'reasoning', 'confidence', 'evidenceIds']
            }
          }
        },
        required: ['transitions']
      }
    };
  }

  if (schema === EdgeStateSchema) {
    return {
      name,
      strict: true,
      schema: {
        type: 'object',
        properties: {
          loadingState: {
            type: 'object',
            properties: {
              presentation: { type: 'string', enum: ['spinner', 'skeleton', 'text-change', 'progress-bar'] },
              styles: { type: 'object', additionalProperties: { type: 'string' } },
              ariaAttributes: { type: 'object', additionalProperties: { type: 'string' } },
              reasoning: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['presentation', 'styles', 'ariaAttributes', 'reasoning', 'confidence']
          },
          errorState: {
            type: 'object',
            properties: {
              presentation: { type: 'string', enum: ['inline-message', 'toast', 'banner', 'icon'] },
              styles: { type: 'object', additionalProperties: { type: 'string' } },
              ariaAttributes: { type: 'object', additionalProperties: { type: 'string' } },
              reasoning: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['presentation', 'styles', 'ariaAttributes', 'reasoning', 'confidence']
          }
        },
        required: ['loadingState', 'errorState']
      }
    };
  }

  if (schema === MicrocopySchema) {
    return {
      name,
      strict: true,
      schema: {
        type: 'object',
        properties: {
          labels: { type: 'object', additionalProperties: { type: 'string' } },
          placeholders: { type: 'object', additionalProperties: { type: 'string' } },
          buttonText: { type: 'string' },
          errorMessages: { type: 'object', additionalProperties: { type: 'string' } },
          reasoning: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['labels', 'placeholders', 'reasoning', 'confidence']
      }
    };
  }

  throw new Error(`Unknown schema for conversion: ${name}`);
}

/**
 * Convert LLM decision to SynthesisDecision and EvidenceLink
 */
function convertToDecision(
  type: 'motion' | 'edge_state' | 'microcopy',
  data: MotionTiming | EdgeStates | Microcopy
): { decisions: SynthesisDecision[]; evidence: EvidenceLink[] } {
  const decisions: SynthesisDecision[] = [];
  const evidence: EvidenceLink[] = [];

  if (type === 'motion' && 'transitions' in data) {
    data.transitions.forEach(transition => {
      decisions.push({
        type: 'llm_refinement',
        property: transition.property,
        value: `${transition.duration} ${transition.timingFunction}`,
        confidence: transition.confidence,
        evidence: transition.evidenceIds.map(id => ({
          sourceType: 'llm_decision',
          reference: id,
          llmReasoning: transition.reasoning
        })),
        reasoning: transition.reasoning
      });

      transition.evidenceIds.forEach(id => {
        evidence.push({
          sourceType: 'llm_decision',
          reference: id,
          llmReasoning: transition.reasoning
        });
      });
    });
  }

  if (type === 'edge_state' && 'loadingState' in data) {
    decisions.push({
      type: 'llm_refinement',
      property: 'loading-state',
      value: data.loadingState.presentation,
      confidence: data.loadingState.confidence,
      evidence: [{
        sourceType: 'llm_decision',
        reference: 'loading-state',
        llmReasoning: data.loadingState.reasoning
      }],
      reasoning: data.loadingState.reasoning
    });

    decisions.push({
      type: 'llm_refinement',
      property: 'error-state',
      value: data.errorState.presentation,
      confidence: data.errorState.confidence,
      evidence: [{
        sourceType: 'llm_decision',
        reference: 'error-state',
        llmReasoning: data.errorState.reasoning
      }],
      reasoning: data.errorState.reasoning
    });

    evidence.push(
      {
        sourceType: 'llm_decision',
        reference: 'loading-state',
        llmReasoning: data.loadingState.reasoning
      },
      {
        sourceType: 'llm_decision',
        reference: 'error-state',
        llmReasoning: data.errorState.reasoning
      }
    );
  }

  if (type === 'microcopy' && 'labels' in data) {
    decisions.push({
      type: 'llm_refinement',
      property: 'microcopy',
      value: JSON.stringify({
        labels: data.labels,
        placeholders: data.placeholders,
        buttonText: data.buttonText
      }),
      confidence: data.confidence,
      evidence: [{
        sourceType: 'llm_decision',
        reference: 'microcopy',
        llmReasoning: data.reasoning
      }],
      reasoning: data.reasoning
    });

    evidence.push({
      sourceType: 'llm_decision',
      reference: 'microcopy',
      llmReasoning: data.reasoning
    });
  }

  return { decisions, evidence };
}

/**
 * Main LLM refinement function
 * Calls Claude API for motion timing, edge states, and microcopy decisions
 *
 * Gracefully degrades when ANTHROPIC_API_KEY is not set or API is unavailable
 */
export async function llmRefine(
  structure: StructuralSynthesis,
  designDNA: DesignDNA
): Promise<LLMRefinement> {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[LLM Refiner] ANTHROPIC_API_KEY not set - skipping LLM refinement');
    return {
      motionTimings: null,
      edgeStates: null,
      microcopy: null,
      decisions: [],
      evidence: []
    };
  }

  // Initialize Anthropic client
  const client = new Anthropic({ apiKey });

  // Build system prompt (cached)
  const systemPrompt = buildSystemPrompt(designDNA);

  const allDecisions: SynthesisDecision[] = [];
  const allEvidence: EvidenceLink[] = [];

  // 1. Motion timing decision
  let motionTimings: MotionTiming | null = null;
  try {
    const motionPrompt = buildMotionPrompt(structure.templateName, structure.html, designDNA);
    const motionSchema = zodToJsonSchema(MotionTimingSchema, 'motion_timing');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: motionPrompt }],
      // @ts-expect-error - Anthropic SDK types may not include latest structured output features
      response_format: {
        type: 'json_schema',
        json_schema: motionSchema
      }
    }, {
      headers: {
        'anthropic-beta': 'structured-outputs-2025-11-13'
      }
    });

    const content = response.content[0];
    if (content.type === 'text') {
      motionTimings = JSON.parse(content.text) as MotionTiming;
      const { decisions, evidence } = convertToDecision('motion', motionTimings);
      allDecisions.push(...decisions);
      allEvidence.push(...evidence);
    }
  } catch (error) {
    console.warn('[LLM Refiner] Motion timing decision failed:', error);
  }

  // 2. Edge states decision
  let edgeStates: EdgeStates | null = null;
  try {
    const edgePrompt = buildEdgeStatePrompt(structure.templateName, structure.html, designDNA);
    const edgeSchema = zodToJsonSchema(EdgeStateSchema, 'edge_states');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: edgePrompt }],
      // @ts-expect-error - Anthropic SDK types may not include latest structured output features
      response_format: {
        type: 'json_schema',
        json_schema: edgeSchema
      }
    }, {
      headers: {
        'anthropic-beta': 'structured-outputs-2025-11-13'
      }
    });

    const content = response.content[0];
    if (content.type === 'text') {
      edgeStates = JSON.parse(content.text) as EdgeStates;
      const { decisions, evidence } = convertToDecision('edge_state', edgeStates);
      allDecisions.push(...decisions);
      allEvidence.push(...evidence);
    }
  } catch (error) {
    console.warn('[LLM Refiner] Edge state decision failed:', error);
  }

  // 3. Microcopy decision
  let microcopy: Microcopy | null = null;
  try {
    const microcopyPrompt = buildMicrocopyPrompt(structure.templateName, designDNA);
    const microcopySchema = zodToJsonSchema(MicrocopySchema, 'microcopy');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: microcopyPrompt }],
      // @ts-expect-error - Anthropic SDK types may not include latest structured output features
      response_format: {
        type: 'json_schema',
        json_schema: microcopySchema
      }
    }, {
      headers: {
        'anthropic-beta': 'structured-outputs-2025-11-13'
      }
    });

    const content = response.content[0];
    if (content.type === 'text') {
      microcopy = JSON.parse(content.text) as Microcopy;
      const { decisions, evidence } = convertToDecision('microcopy', microcopy);
      allDecisions.push(...decisions);
      allEvidence.push(...evidence);
    }
  } catch (error) {
    console.warn('[LLM Refiner] Microcopy decision failed:', error);
  }

  return {
    motionTimings,
    edgeStates,
    microcopy,
    decisions: allDecisions,
    evidence: allEvidence
  };
}

// Named exports for specific refinement functions
export async function llmDecideMotionTiming(
  componentType: string,
  html: string,
  designDNA: DesignDNA
): Promise<MotionTiming | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[LLM Refiner] ANTHROPIC_API_KEY not set - skipping motion timing decision');
    return null;
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(designDNA);
  const motionPrompt = buildMotionPrompt(componentType, html, designDNA);
  const motionSchema = zodToJsonSchema(MotionTimingSchema, 'motion_timing');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: motionPrompt }],
      // @ts-expect-error - Anthropic SDK types may not include latest structured output features
      response_format: {
        type: 'json_schema',
        json_schema: motionSchema
      }
    }, {
      headers: {
        'anthropic-beta': 'structured-outputs-2025-11-13'
      }
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text) as MotionTiming;
    }
  } catch (error) {
    console.warn('[LLM Refiner] Motion timing decision failed:', error);
  }

  return null;
}

export async function llmDecideEdgeStates(
  componentType: string,
  html: string,
  designDNA: DesignDNA
): Promise<EdgeStates | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[LLM Refiner] ANTHROPIC_API_KEY not set - skipping edge state decision');
    return null;
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(designDNA);
  const edgePrompt = buildEdgeStatePrompt(componentType, html, designDNA);
  const edgeSchema = zodToJsonSchema(EdgeStateSchema, 'edge_states');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: edgePrompt }],
      // @ts-expect-error - Anthropic SDK types may not include latest structured output features
      response_format: {
        type: 'json_schema',
        json_schema: edgeSchema
      }
    }, {
      headers: {
        'anthropic-beta': 'structured-outputs-2025-11-13'
      }
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text) as EdgeStates;
    }
  } catch (error) {
    console.warn('[LLM Refiner] Edge state decision failed:', error);
  }

  return null;
}
