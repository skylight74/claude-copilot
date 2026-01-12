/**
 * Protocol Violation Tracking
 *
 * Tracks main session guardrail violations to improve compliance.
 */

import type { DatabaseClient } from '../database.js';

/**
 * Protocol violation types
 */
export type ViolationType =
  | 'files_read_exceeded'      // Read >3 files in main session
  | 'code_written_directly'    // Wrote code in main session instead of delegating
  | 'plan_created_directly'    // Created plan in main session instead of delegating
  | 'generic_agent_used'       // Used Explore, Plan, or general-purpose agent
  | 'response_tokens_exceeded' // Response exceeded token limit
  | 'work_product_not_stored'; // Returned detailed work without storing

/**
 * Protocol violation severity
 */
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Protocol violation input
 */
export interface ProtocolViolationLogInput {
  violationType: ViolationType;
  severity: ViolationSeverity;
  context: {
    filesRead?: number;
    agentUsed?: string;
    responseTokens?: number;
    description?: string;
  };
  suggestion?: string;
}

/**
 * Protocol violations get input
 */
export interface ProtocolViolationsGetInput {
  sessionId?: string;
  initiativeId?: string;
  since?: string; // ISO timestamp
  violationType?: ViolationType;
  severity?: ViolationSeverity;
  limit?: number;
}

/**
 * Protocol violation row
 */
export interface ProtocolViolationRow {
  id: string;
  session_id: string;
  initiative_id: string | null;
  violation_type: ViolationType;
  severity: ViolationSeverity;
  context: string; // JSON
  suggestion: string | null;
  created_at: string;
}

/**
 * Protocol violation summary
 */
export interface ProtocolViolationSummary {
  totalViolations: number;
  bySeverity: Record<ViolationSeverity, number>;
  byType: Record<ViolationType, number>;
  recent: Array<{
    id: string;
    violationType: ViolationType;
    severity: ViolationSeverity;
    description: string;
    createdAt: string;
  }>;
}

/**
 * Log a protocol violation
 */
export function protocolViolationLog(
  db: DatabaseClient,
  input: ProtocolViolationLogInput
): { id: string; logged: boolean } {
  const id = `VIOL-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const sessionId = getSessionId();
  const currentInitiative = db.getCurrentInitiative();
  const initiativeId = currentInitiative?.id || null;

  const violation: ProtocolViolationRow = {
    id,
    session_id: sessionId,
    initiative_id: initiativeId,
    violation_type: input.violationType,
    severity: input.severity,
    context: JSON.stringify(input.context),
    suggestion: input.suggestion || null,
    created_at: new Date().toISOString()
  };

  db.insertProtocolViolation(violation);

  return { id, logged: true };
}

/**
 * Get protocol violations
 */
export function protocolViolationsGet(
  db: DatabaseClient,
  input: ProtocolViolationsGetInput = {}
): ProtocolViolationSummary {
  const sessionId = input.sessionId || getSessionId();
  const violations = db.getProtocolViolations({
    sessionId,
    initiativeId: input.initiativeId,
    since: input.since,
    violationType: input.violationType,
    severity: input.severity,
    limit: input.limit || 100
  });

  // Aggregate by severity
  const bySeverity: Record<ViolationSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  // Aggregate by type
  const byType: Record<ViolationType, number> = {
    files_read_exceeded: 0,
    code_written_directly: 0,
    plan_created_directly: 0,
    generic_agent_used: 0,
    response_tokens_exceeded: 0,
    work_product_not_stored: 0
  };

  violations.forEach(v => {
    const severity = v.severity as ViolationSeverity;
    const violationType = v.violation_type as ViolationType;
    bySeverity[severity]++;
    byType[violationType]++;
  });

  // Recent violations (last 10)
  const recent = violations.slice(0, 10).map(v => {
    const context = JSON.parse(v.context);
    return {
      id: v.id,
      violationType: v.violation_type as ViolationType,
      severity: v.severity as ViolationSeverity,
      description: context.description || getViolationDescription(v.violation_type as ViolationType, context),
      createdAt: v.created_at
    };
  });

  return {
    totalViolations: violations.length,
    bySeverity,
    byType,
    recent
  };
}

/**
 * Get session ID (generate if needed)
 */
function getSessionId(): string {
  // In a real implementation, this would be tracked per Claude Code session
  // For now, use a process-level session ID
  if (!(global as any).__TASK_COPILOT_SESSION_ID) {
    (global as any).__TASK_COPILOT_SESSION_ID = `SESSION-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return (global as any).__TASK_COPILOT_SESSION_ID;
}

/**
 * Generate human-readable violation description
 */
function getViolationDescription(type: ViolationType, context: any): string {
  switch (type) {
    case 'files_read_exceeded':
      return `Read ${context.filesRead || 'multiple'} files (limit: 3)`;
    case 'code_written_directly':
      return 'Wrote code in main session instead of delegating to @agent-me';
    case 'plan_created_directly':
      return 'Created plan in main session instead of delegating to @agent-ta';
    case 'generic_agent_used':
      return `Used generic agent "${context.agentUsed}" (should use framework agent)`;
    case 'response_tokens_exceeded':
      return `Response exceeded ${context.responseTokens || 'limit'} tokens`;
    case 'work_product_not_stored':
      return 'Returned detailed work without storing in work product';
    default:
      return `Violation: ${type}`;
  }
}
