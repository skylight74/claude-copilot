/**
 * Work Product Validator
 *
 * Validates agent outputs before storage to prevent bad outputs from propagating.
 */

import type {
  ValidationConfig,
  ValidationResult,
  ValidationFlag,
  WorkProductValidationRule,
  SizeRule,
  StructureRule,
  CompletenessRule,
} from './types.js';
import type { WorkProductType } from '../types.js';
import { DEFAULT_VALIDATION_CONFIG } from './default-rules.js';

export class WorkProductValidator {
  private config: ValidationConfig;

  constructor(customConfig?: Partial<ValidationConfig>) {
    this.config = this.mergeConfig(DEFAULT_VALIDATION_CONFIG, customConfig);
  }

  private mergeConfig(
    base: ValidationConfig,
    custom?: Partial<ValidationConfig>
  ): ValidationConfig {
    if (!custom) return base;

    return {
      ...base,
      ...custom,
      version: custom.version || base.version,
      defaultMode: custom.defaultMode || base.defaultMode,
      globalRules: [...base.globalRules, ...(custom.globalRules || [])],
      typeRules: {
        ...base.typeRules,
        ...custom.typeRules,
      },
      agentRules: {
        ...base.agentRules,
        ...custom.agentRules,
      },
    };
  }

  /**
   * Validate work product content
   */
  validate(
    content: string,
    type: WorkProductType,
    assignedAgent?: string
  ): ValidationResult {
    // Skip validation if mode is 'skip'
    if (this.config.defaultMode === 'skip') {
      return { valid: true, flags: [], rejected: false };
    }

    const flags: ValidationFlag[] = [];

    // Collect applicable rules
    const rules: WorkProductValidationRule[] = [
      ...this.config.globalRules,
      ...(this.config.typeRules[type] || []),
      ...(assignedAgent && this.config.agentRules?.[assignedAgent] || []),
    ];

    // Run each enabled rule
    for (const rule of rules.filter(r => r.enabled)) {
      const flag = this.runRule(rule, content);
      if (flag) {
        flags.push(flag);
      }
    }

    // Determine overall result
    const rejected = flags.some(f => f.severity === 'reject');
    const valid = flags.length === 0;

    return {
      valid,
      flags,
      rejected,
      actionableFeedback: this.generateFeedback(flags),
    };
  }

  private runRule(
    rule: WorkProductValidationRule,
    content: string
  ): ValidationFlag | null {
    switch (rule.type) {
      case 'size':
        return this.checkSizeRule(rule, content);
      case 'structure':
        return this.checkStructureRule(rule, content);
      case 'completeness':
        return this.checkCompletenessRule(rule, content);
      default:
        return null;
    }
  }

  private checkSizeRule(rule: SizeRule, content: string): ValidationFlag | null {
    const charCount = content.length;
    const tokenEstimate = Math.ceil(charCount / 4);

    if (rule.maxCharacters && charCount > rule.maxCharacters) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `Content exceeds ${rule.maxCharacters} characters (${charCount} chars, ~${tokenEstimate} tokens)`,
        suggestion: 'Consider breaking into smaller sections or removing non-essential content',
      };
    }

    if (rule.maxTokens && tokenEstimate > rule.maxTokens) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `Content exceeds ${rule.maxTokens} tokens (~${tokenEstimate} tokens)`,
        suggestion: 'Reduce verbosity or split into multiple work products',
      };
    }

    if (rule.minCharacters && charCount < rule.minCharacters) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `Content below minimum (${charCount}/${rule.minCharacters} chars)`,
        suggestion: 'Output appears incomplete - add more detail',
      };
    }

    return null;
  }

  private checkStructureRule(
    rule: StructureRule,
    content: string
  ): ValidationFlag | null {
    // Check required sections (case-insensitive heading match)
    if (rule.requiredSections) {
      const headingPattern = /^#{1,3}\s+(.+)$/gm;
      const headings = [...content.matchAll(headingPattern)]
        .map(m => m[1].toLowerCase().trim());

      for (const required of rule.requiredSections) {
        const found = headings.some(h =>
          h.includes(required.toLowerCase())
        );
        if (!found) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Missing required section: "${required}"`,
            suggestion: `Add a section with heading containing "${required}"`,
          };
        }
      }
    }

    // Check required patterns
    if (rule.requiredPatterns) {
      for (const patternStr of rule.requiredPatterns) {
        try {
          const pattern = new RegExp(patternStr, 'm');
          if (!pattern.test(content)) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `Content missing required pattern`,
              suggestion: 'Ensure content follows expected format',
            };
          }
        } catch {
          // Invalid regex, skip
        }
      }
    }

    // Check forbidden patterns
    if (rule.forbiddenPatterns) {
      for (const patternStr of rule.forbiddenPatterns) {
        try {
          const pattern = new RegExp(patternStr, 'm');
          if (pattern.test(content)) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `Content contains forbidden pattern`,
              suggestion: 'Remove or rephrase flagged content',
            };
          }
        } catch {
          // Invalid regex, skip
        }
      }
    }

    return null;
  }

  private checkCompletenessRule(
    rule: CompletenessRule,
    content: string
  ): ValidationFlag | null {
    // Count sections (## headings)
    if (rule.minSections) {
      const sectionCount = (content.match(/^##\s+/gm) || []).length;
      if (sectionCount < rule.minSections) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Only ${sectionCount} sections found (minimum: ${rule.minSections})`,
          suggestion: 'Add more sections to fully cover the topic',
        };
      }
    }

    // Count code blocks
    if (rule.minCodeBlocks) {
      const codeBlockCount = (content.match(/```/g) || []).length / 2;
      if (codeBlockCount < rule.minCodeBlocks) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Only ${Math.floor(codeBlockCount)} code blocks (minimum: ${rule.minCodeBlocks})`,
          suggestion: 'Include code examples or implementation snippets',
        };
      }
    }

    // Count tables (lines with | that aren't code blocks)
    if (rule.minTables) {
      // Simple heuristic: count lines with multiple | characters
      const tableLineCount = (content.match(/\|.+\|/g) || []).length;
      // Each table has at least header + separator + 1 row = 3 lines with |
      const estimatedTables = Math.floor(tableLineCount / 3);
      if (estimatedTables < rule.minTables) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Tables found: ${estimatedTables} (minimum: ${rule.minTables})`,
          suggestion: 'Add tabular data to improve scannability',
        };
      }
    }

    // Check for conclusion
    if (rule.requiresConclusion) {
      const hasConclusion = /^#{1,3}\s+(summary|conclusion|next steps)/im.test(content);
      if (!hasConclusion) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: 'Missing Summary/Conclusion section',
          suggestion: 'Add a Summary or Conclusion section at the end',
        };
      }
    }

    return null;
  }

  private generateFeedback(flags: ValidationFlag[]): string | undefined {
    if (flags.length === 0) return undefined;

    const lines = ['Validation issues detected:'];
    for (const flag of flags) {
      lines.push(`- [${flag.severity.toUpperCase()}] ${flag.message}`);
      if (flag.suggestion) {
        lines.push(`  Suggestion: ${flag.suggestion}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<ValidationConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return this.config;
  }

  /**
   * Get rules for a specific type
   */
  getRulesForType(type: WorkProductType | 'global'): WorkProductValidationRule[] {
    if (type === 'global') {
      return this.config.globalRules;
    }
    return [
      ...this.config.globalRules,
      ...(this.config.typeRules[type] || []),
    ];
  }
}

// Singleton instance
let validatorInstance: WorkProductValidator | null = null;

export function getValidator(): WorkProductValidator {
  if (!validatorInstance) {
    validatorInstance = new WorkProductValidator();
  }
  return validatorInstance;
}

export function initValidator(customConfig?: Partial<ValidationConfig>): void {
  validatorInstance = new WorkProductValidator(customConfig);
}
