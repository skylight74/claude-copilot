/**
 * Agent Performance Tracking tool implementations
 */

import type { DatabaseClient } from '../database.js';
import type {
  AgentPerformanceGetInput,
  AgentPerformanceGetOutput,
  AgentPerformanceResult,
  AgentMetrics,
  PerformanceRow,
} from '../types.js';

/**
 * Get aggregated performance metrics for agents
 */
export function agentPerformanceGet(
  db: DatabaseClient,
  input: AgentPerformanceGetInput
): AgentPerformanceGetOutput {
  // Get raw performance records
  const records = db.getPerformanceRecords({
    agentId: input.agentId,
    workProductType: input.workProductType,
    complexity: input.complexity,
    sinceDays: input.sinceDays,
  });

  // Group by agent
  const agentMap = new Map<string, PerformanceRow[]>();
  for (const record of records) {
    const existing = agentMap.get(record.agent_id) || [];
    existing.push(record);
    agentMap.set(record.agent_id, existing);
  }

  // Calculate metrics for each agent
  const agents: AgentPerformanceResult[] = [];
  for (const [agentId, agentRecords] of agentMap) {
    agents.push(calculateAgentMetrics(agentId, agentRecords));
  }

  // Sort by success rate descending
  agents.sort((a, b) => b.metrics.successRate - a.metrics.successRate);

  // Get summary stats
  const stats = db.getPerformanceStats();

  return {
    agents,
    summary: {
      totalRecords: stats.totalRecords,
      periodStart: stats.oldestRecord,
      periodEnd: stats.newestRecord,
    },
  };
}

/**
 * Calculate aggregated metrics for a single agent
 */
function calculateAgentMetrics(
  agentId: string,
  records: PerformanceRow[]
): AgentPerformanceResult {
  // Count outcomes
  const outcomes = {
    success: 0,
    failure: 0,
    blocked: 0,
    reassigned: 0,
  };

  for (const record of records) {
    const outcome = record.outcome as keyof typeof outcomes;
    if (outcome in outcomes) {
      outcomes[outcome]++;
    }
  }

  const total = records.length;
  const successRate = total > 0 ? outcomes.success / total : 0;
  const completionRate = total > 0
    ? outcomes.success / (outcomes.success + outcomes.failure + outcomes.blocked)
    : 0;

  const metrics: AgentMetrics = {
    total,
    success: outcomes.success,
    failure: outcomes.failure,
    blocked: outcomes.blocked,
    reassigned: outcomes.reassigned,
    successRate: Math.round(successRate * 100) / 100,
    completionRate: Math.round(completionRate * 100) / 100,
  };

  // Group by work product type
  const byType: Record<string, { total: number; successRate: number }> = {};
  const typeGroups = groupBy(records, r => r.work_product_type || 'unknown');
  for (const [type, typeRecords] of Object.entries(typeGroups)) {
    const typeSuccess = typeRecords.filter(r => r.outcome === 'success').length;
    byType[type] = {
      total: typeRecords.length,
      successRate: Math.round((typeSuccess / typeRecords.length) * 100) / 100,
    };
  }

  // Group by complexity
  const byComplexity: Record<string, { total: number; successRate: number }> = {};
  const complexityGroups = groupBy(records, r => r.complexity || 'unknown');
  for (const [complexity, complexityRecords] of Object.entries(complexityGroups)) {
    const complexitySuccess = complexityRecords.filter(r => r.outcome === 'success').length;
    byComplexity[complexity] = {
      total: complexityRecords.length,
      successRate: Math.round((complexitySuccess / complexityRecords.length) * 100) / 100,
    };
  }

  // Calculate trend (compare last 5 vs previous 5)
  const recentTrend = calculateTrend(records);

  return {
    agentId,
    metrics,
    byType,
    byComplexity,
    recentTrend,
  };
}

/**
 * Calculate performance trend based on recent records
 */
function calculateTrend(
  records: PerformanceRow[]
): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  if (records.length < 10) {
    return 'insufficient_data';
  }

  // Sort by date (newest first - they should already be sorted but ensure)
  const sorted = [...records].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Take last 5 and previous 5
  const recent = sorted.slice(0, 5);
  const previous = sorted.slice(5, 10);

  const recentSuccessRate = recent.filter(r => r.outcome === 'success').length / recent.length;
  const previousSuccessRate = previous.filter(r => r.outcome === 'success').length / previous.length;

  const diff = recentSuccessRate - previousSuccessRate;

  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

/**
 * Group array elements by a key function
 */
function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  return groups;
}
