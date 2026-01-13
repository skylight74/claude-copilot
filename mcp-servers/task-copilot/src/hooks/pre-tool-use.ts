/**
 * PreToolUse Security Hooks
 *
 * Intercepts and validates tool calls before execution to prevent security issues proactively.
 * Supports secret detection, destructive command warnings, and sensitive file protection.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Security action levels
 */
export enum SecurityAction {
  ALLOW = 0,    // Tool call is safe, proceed
  WARN = 1,     // Potential issue, but allow with warning
  BLOCK = 2     // Security violation, prevent execution
}

/**
 * Tool call context provided to security rules
 */
export interface ToolCallContext {
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Security rule evaluation result
 */
export interface SecurityRuleResult {
  action: SecurityAction;
  ruleName: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedPattern?: string;
  recommendation?: string;
}

/**
 * Security rule definition
 */
export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // Higher priority rules evaluated first (1-100)
  evaluate: (context: ToolCallContext) => SecurityRuleResult | null;
}

/**
 * Hook evaluation result
 */
export interface PreToolUseResult {
  allowed: boolean;
  action: SecurityAction;
  violations: SecurityRuleResult[];
  warnings: SecurityRuleResult[];
  executionTime: number; // milliseconds
}

// ============================================================================
// RULE REGISTRY
// ============================================================================

const ruleRegistry: Map<string, SecurityRule> = new Map();

/**
 * Register a security rule
 */
export function registerSecurityRule(rule: SecurityRule): void {
  ruleRegistry.set(rule.id, rule);
}

/**
 * Unregister a security rule
 */
export function unregisterSecurityRule(ruleId: string): boolean {
  return ruleRegistry.delete(ruleId);
}

/**
 * Get all registered rules sorted by priority
 */
export function getSecurityRules(): SecurityRule[] {
  return Array.from(ruleRegistry.values())
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get specific rule by ID
 */
export function getSecurityRule(ruleId: string): SecurityRule | undefined {
  return ruleRegistry.get(ruleId);
}

/**
 * Enable/disable a rule
 */
export function toggleSecurityRule(ruleId: string, enabled: boolean): boolean {
  const rule = ruleRegistry.get(ruleId);
  if (!rule) return false;

  rule.enabled = enabled;
  return true;
}

// ============================================================================
// HOOK EVALUATION
// ============================================================================

/**
 * Evaluate all security rules against a tool call
 */
export async function evaluatePreToolUse(
  toolName: string,
  toolInput: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<PreToolUseResult> {
  const startTime = Date.now();

  const context: ToolCallContext = {
    toolName,
    toolInput,
    timestamp: new Date().toISOString(),
    metadata
  };

  const violations: SecurityRuleResult[] = [];
  const warnings: SecurityRuleResult[] = [];
  const rules = getSecurityRules();

  // Evaluate each rule
  for (const rule of rules) {
    try {
      const result = rule.evaluate(context);

      if (result) {
        if (result.action === SecurityAction.BLOCK) {
          violations.push(result);
        } else if (result.action === SecurityAction.WARN) {
          warnings.push(result);
        }
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      // Don't let rule errors block execution
    }
  }

  const executionTime = Date.now() - startTime;
  const allowed = violations.length === 0;
  const action = violations.length > 0
    ? SecurityAction.BLOCK
    : warnings.length > 0
    ? SecurityAction.WARN
    : SecurityAction.ALLOW;

  return {
    allowed,
    action,
    violations,
    warnings,
    executionTime
  };
}

/**
 * Test a tool call without executing (for dry-run testing)
 */
export async function testSecurityRules(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<PreToolUseResult> {
  return evaluatePreToolUse(toolName, toolInput, { dryRun: true });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract string content from tool input for pattern matching
 */
export function extractStringContent(input: Record<string, unknown>): string[] {
  const content: string[] = [];

  function extract(obj: unknown): void {
    if (typeof obj === 'string') {
      content.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(extract);
    } else if (obj !== null && typeof obj === 'object') {
      Object.values(obj as Record<string, unknown>).forEach(extract);
    }
  }

  extract(input);
  return content;
}

/**
 * Check if tool call involves file writes
 */
export function isFileWriteTool(toolName: string): boolean {
  const writeTools = ['Edit', 'Write', 'work_product_store'];
  return writeTools.includes(toolName);
}

/**
 * Check if tool call involves command execution
 */
export function isCommandExecutionTool(toolName: string): boolean {
  const commandTools = ['Bash', 'Run', 'Execute'];
  return commandTools.includes(toolName);
}

/**
 * Extract file paths from tool input
 */
export function extractFilePaths(input: Record<string, unknown>): string[] {
  const paths: string[] = [];

  if (typeof input.file_path === 'string') {
    paths.push(input.file_path);
  }
  if (typeof input.path === 'string') {
    paths.push(input.path);
  }
  if (Array.isArray(input.files)) {
    paths.push(...input.files.filter((f): f is string => typeof f === 'string'));
  }

  return paths;
}
