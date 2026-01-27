/**
 * Model Router for Ecomode
 *
 * Routes tasks to appropriate model (haiku/sonnet/opus) based on complexity score.
 * Supports modifier keywords for explicit model overrides.
 *
 * @see PRD-omc-learnings (OMC Learnings Integration)
 */

import { calculateComplexityScore, type ComplexityScoringInput } from './complexity-scorer.js';
import type { ComplexityScore, ModelRoute, ModifierKeyword } from '../types/omc-features.js';

// ============================================================================
// ROUTING THRESHOLDS
// ============================================================================

/**
 * Default thresholds for model routing
 */
export const DEFAULT_THRESHOLDS = {
  /** Below this = haiku (low complexity) */
  low: 0.3,

  /** Below this = sonnet (medium complexity) */
  medium: 0.7,

  /** Above medium = opus (high complexity) */
} as const;

/**
 * Configurable thresholds
 */
export interface RoutingThresholds {
  /** Below this = haiku */
  low: number;

  /** Below this = sonnet */
  medium: number;
}

// ============================================================================
// MODIFIER KEYWORD DETECTION
// ============================================================================

/**
 * Detect modifier keywords in task text
 *
 * Supported keywords: eco:, opus:, fast:, sonnet:, haiku:, auto:, ralph:
 */
export function detectModifierKeyword(text: string): ModifierKeyword | null {
  const patterns: Array<{
    regex: RegExp;
    keyword: ModifierKeyword['keyword'];
    targetModel: ModifierKeyword['targetModel'];
  }> = [
    { regex: /\beco:/i, keyword: 'eco', targetModel: null },
    { regex: /\bopus:/i, keyword: 'opus', targetModel: 'opus' },
    { regex: /\bfast:/i, keyword: 'fast', targetModel: 'haiku' },
    { regex: /\bsonnet:/i, keyword: 'sonnet', targetModel: 'sonnet' },
    { regex: /\bhaiku:/i, keyword: 'haiku', targetModel: 'haiku' },
    { regex: /\bauto:/i, keyword: 'auto', targetModel: null },
    { regex: /\bralph:/i, keyword: 'ralph', targetModel: 'opus' }, // ralph = opus override
  ];

  for (const { regex, keyword, targetModel } of patterns) {
    const match = regex.exec(text);
    if (match) {
      return {
        keyword,
        position: match.index,
        raw: match[0],
        targetModel,
      };
    }
  }

  return null;
}

/**
 * Strip modifier keywords from text
 */
export function stripModifierKeywords(text: string): string {
  // Remove all known modifier keywords
  return text.replace(/\b(eco|opus|fast|sonnet|haiku|auto|ralph):/gi, '').trim();
}

// ============================================================================
// MODEL ROUTING LOGIC
// ============================================================================

/**
 * Determine cost tier based on model
 */
function getCostTier(model: ModelRoute['model']): ModelRoute['costTier'] {
  switch (model) {
    case 'haiku':
      return 'low';
    case 'sonnet':
      return 'medium';
    case 'opus':
      return 'high';
  }
}

/**
 * Route to model based on complexity score
 */
function routeByComplexity(score: ComplexityScore, thresholds: RoutingThresholds): ModelRoute {
  let model: ModelRoute['model'];
  let reason: string;

  if (score.score < thresholds.low) {
    model = 'haiku';
    reason = `Low complexity (${score.score.toFixed(2)}) → haiku. ${score.reasoning}`;
  } else if (score.score < thresholds.medium) {
    model = 'sonnet';
    reason = `Medium complexity (${score.score.toFixed(2)}) → sonnet. ${score.reasoning}`;
  } else {
    model = 'opus';
    reason = `High complexity (${score.score.toFixed(2)}) → opus. ${score.reasoning}`;
  }

  return {
    model,
    confidence: 0.85, // High confidence in complexity-based routing
    reason,
    isOverride: false,
    costTier: getCostTier(model),
  };
}

/**
 * Route to model based on modifier keyword override
 */
function routeByModifier(modifier: ModifierKeyword): ModelRoute {
  if (modifier.targetModel) {
    // Explicit model override (opus:, fast:, sonnet:, haiku:, ralph:)
    return {
      model: modifier.targetModel,
      confidence: 1.0, // Maximum confidence for explicit overrides
      reason: `User override: ${modifier.keyword}: → ${modifier.targetModel}`,
      isOverride: true,
      costTier: getCostTier(modifier.targetModel),
    };
  }

  // eco: or auto: means defer to complexity
  // Return null to signal fallback to complexity
  return {
    model: 'haiku', // Will be overridden by complexity
    confidence: 0.0,
    reason: `Auto-routing enabled (${modifier.keyword}:)`,
    isOverride: false,
    costTier: 'low',
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Input for model routing
 */
export interface ModelRoutingInput extends ComplexityScoringInput {
  /** Optional routing thresholds (defaults to DEFAULT_THRESHOLDS) */
  thresholds?: RoutingThresholds;
}

/**
 * Result of model routing with complexity breakdown
 */
export interface ModelRoutingResult {
  /** Final routing decision */
  route: ModelRoute;

  /** Complexity score used for routing */
  complexityScore: ComplexityScore;

  /** Detected modifier keyword if any */
  modifier: ModifierKeyword | null;
}

/**
 * Route task to appropriate model based on complexity and modifiers
 *
 * @param input - Task information with optional thresholds
 * @returns ModelRoutingResult with route decision and complexity breakdown
 *
 * @example
 * ```typescript
 * const result = routeToModel({
 *   title: 'Fix login bug',
 *   fileCount: 1,
 *   agentId: 'qa'
 * });
 * // result.route.model = 'haiku'
 * // result.complexityScore.score = 0.23
 * ```
 *
 * @example
 * ```typescript
 * const result = routeToModel({
 *   title: 'opus: Design authentication architecture',
 *   fileCount: 10,
 *   agentId: 'ta'
 * });
 * // result.route.model = 'opus' (override)
 * // result.route.isOverride = true
 * ```
 */
export function routeToModel(input: ModelRoutingInput): ModelRoutingResult {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;

  // Detect modifier keywords
  const combinedText = [input.title, input.description, input.context].filter(Boolean).join(' ');
  const modifier = detectModifierKeyword(combinedText);

  // Calculate complexity score (strip modifiers first for accurate scoring)
  const cleanTitle = modifier ? stripModifierKeywords(input.title) : input.title;
  const cleanDescription = modifier && input.description ? stripModifierKeywords(input.description) : input.description;

  const complexityScore = calculateComplexityScore({
    ...input,
    title: cleanTitle,
    description: cleanDescription,
  });

  // Route based on modifier or complexity
  let route: ModelRoute;

  if (modifier && modifier.targetModel) {
    // Explicit model override
    route = routeByModifier(modifier);
  } else if (modifier && (modifier.keyword === 'eco' || modifier.keyword === 'auto')) {
    // eco: or auto: means use complexity-based routing
    route = routeByComplexity(complexityScore, thresholds);
    route.reason = `Auto-routing (${modifier.keyword}:): ${route.reason}`;
  } else {
    // No modifier, use complexity
    route = routeByComplexity(complexityScore, thresholds);
  }

  return {
    route,
    complexityScore,
    modifier,
  };
}

/**
 * Batch route multiple tasks
 *
 * More efficient than calling routeToModel multiple times.
 */
export function routeToModelBatch(inputs: ModelRoutingInput[]): ModelRoutingResult[] {
  return inputs.map((input) => routeToModel(input));
}

/**
 * Get recommended model for a task (simple API without full routing result)
 */
export function getRecommendedModel(
  title: string,
  options?: {
    description?: string;
    fileCount?: number;
    agentId?: string;
    thresholds?: RoutingThresholds;
  }
): ModelRoute['model'] {
  const result = routeToModel({
    title,
    description: options?.description,
    fileCount: options?.fileCount,
    agentId: options?.agentId,
    thresholds: options?.thresholds,
  });

  return result.route.model;
}
