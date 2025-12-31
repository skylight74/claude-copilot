/**
 * Agent handoff tool implementations
 *
 * Enables hierarchical agent collaboration without context bloat.
 * Intermediate agents store work in Task Copilot and pass minimal handoff context.
 * Only the final agent returns consolidated summary to main session.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database.js';
import type {
  AgentHandoffInput,
  AgentHandoffOutput,
  AgentChainGetInput,
  AgentChainGetOutput,
  HandoffRecord,
} from '../types.js';

/**
 * Record agent handoff in a multi-agent collaboration chain
 */
export function agentHandoff(
  db: DatabaseClient,
  input: AgentHandoffInput
): AgentHandoffOutput {
  const now = new Date().toISOString();
  const id = `HO-${uuidv4()}`;

  // Validate handoff context length (max 50 chars)
  if (input.handoffContext.length > 50) {
    throw new Error(`Handoff context exceeds 50 characters (${input.handoffContext.length})`);
  }

  // Validate chain position and length
  if (input.chainPosition < 1 || input.chainPosition > input.chainLength) {
    throw new Error(`Invalid chain position ${input.chainPosition} for chain length ${input.chainLength}`);
  }

  // Validate work product exists
  const workProduct = db.getWorkProduct(input.workProductId);
  if (!workProduct) {
    throw new Error(`Work product ${input.workProductId} not found`);
  }

  // Validate task exists
  const task = db.getTask(input.taskId);
  if (!task) {
    throw new Error(`Task ${input.taskId} not found`);
  }

  // Insert handoff record
  db.insertHandoff({
    id,
    task_id: input.taskId,
    from_agent: input.fromAgent,
    to_agent: input.toAgent,
    work_product_id: input.workProductId,
    handoff_context: input.handoffContext,
    chain_position: input.chainPosition,
    chain_length: input.chainLength,
    created_at: now
  });

  // Log activity
  if (task.prd_id) {
    const prd = db.getPrd(task.prd_id);
    if (prd) {
      db.insertActivity({
        id: uuidv4(),
        initiative_id: prd.initiative_id,
        type: 'agent_handoff',
        entity_id: id,
        summary: `${input.fromAgent} → ${input.toAgent} (${input.chainPosition}/${input.chainLength})`,
        created_at: now
      });
    }
  }

  return {
    id,
    taskId: input.taskId,
    fromAgent: input.fromAgent,
    toAgent: input.toAgent,
    chainPosition: input.chainPosition,
    chainLength: input.chainLength,
    createdAt: now
  };
}

/**
 * Get full agent collaboration chain for a task
 */
export function agentChainGet(
  db: DatabaseClient,
  input: AgentChainGetInput
): AgentChainGetOutput | null {
  const task = db.getTask(input.taskId);
  if (!task) return null;

  // Get all handoffs for this task
  const handoffs = db.getHandoffChain(input.taskId);

  // Get all work products for this task
  const workProducts = db.listWorkProducts(input.taskId);

  // Map handoffs to output format
  const handoffRecords: HandoffRecord[] = handoffs.map(h => ({
    id: h.id,
    fromAgent: h.from_agent,
    toAgent: h.to_agent,
    workProductId: h.work_product_id,
    handoffContext: h.handoff_context,
    chainPosition: h.chain_position,
    chainLength: h.chain_length,
    createdAt: h.created_at
  }));

  // Build work product summary with agent mapping
  const wpSummary = workProducts.map(wp => {
    // Find which agent created this work product by checking handoffs
    const handoff = handoffs.find(h => h.work_product_id === wp.id);
    const agent = handoff ? handoff.from_agent : 'unknown';

    return {
      id: wp.id,
      type: wp.type as any,
      title: wp.title,
      agent
    };
  });

  // Determine chain length (from first handoff if exists, else 1)
  const chainLength = handoffs.length > 0 ? handoffs[0].chain_length : 1;

  return {
    taskId: input.taskId,
    chainLength,
    handoffs: handoffRecords,
    workProducts: wpSummary
  };
}
