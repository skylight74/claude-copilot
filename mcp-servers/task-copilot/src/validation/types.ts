/**
 * Validation type definitions
 */

import type { WorkProductType } from '../types.js';

export type ValidationSeverity = 'warn' | 'reject';

export interface BaseValidationRule {
  id: string;
  name: string;
  description: string;
  severity: ValidationSeverity;
  enabled: boolean;
}

export interface SizeRule extends BaseValidationRule {
  type: 'size';
  maxCharacters?: number;
  maxTokens?: number;
  minCharacters?: number;
}

export interface StructureRule extends BaseValidationRule {
  type: 'structure';
  requiredSections?: string[];
  requiredPatterns?: string[]; // Stored as strings, converted to RegExp at runtime
  forbiddenPatterns?: string[];
}

export interface CompletenessRule extends BaseValidationRule {
  type: 'completeness';
  minSections?: number;
  minCodeBlocks?: number;
  minTables?: number;
  requiresConclusion?: boolean;
}

export type WorkProductValidationRule = SizeRule | StructureRule | CompletenessRule;

export interface ValidationConfig {
  version: string;
  defaultMode: 'warn' | 'reject' | 'skip';
  globalRules: WorkProductValidationRule[];
  typeRules: Record<WorkProductType, WorkProductValidationRule[]>;
  agentRules?: Record<string, WorkProductValidationRule[]>;
}

export interface ValidationFlag {
  ruleId: string;
  ruleName: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  flags: ValidationFlag[];
  rejected: boolean;
  actionableFeedback?: string;
}
