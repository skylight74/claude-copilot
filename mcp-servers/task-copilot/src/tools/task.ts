/**
 * Task tool implementations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database.js';
import type {
  TaskCreateInput,
  TaskUpdateInput,
  TaskGetInput,
  TaskListInput,
  TaskRow,
  TaskStatus
} from '../types.js';

export async function taskCreate(
  db: DatabaseClient,
  input: TaskCreateInput
): Promise<{ id: string; prdId?: string; parentId?: string; status: TaskStatus; createdAt: string }> {
  const now = new Date().toISOString();
  const id = `TASK-${uuidv4()}`;

  const metadata = input.metadata || {};
  const task: TaskRow = {
    id,
    prd_id: input.prdId || null,
    parent_id: input.parentId || null,
    title: input.title,
    description: input.description || null,
    assigned_agent: input.assignedAgent || null,
    status: 'pending',
    blocked_reason: null,
    notes: null,
    metadata: JSON.stringify(metadata),
    created_at: now,
    updated_at: now
  };

  db.insertTask(task);

  // Log activity (need initiative ID - get from PRD or parent)
  let initiativeId: string | undefined;
  if (input.prdId) {
    const prd = db.getPrd(input.prdId);
    if (prd) initiativeId = prd.initiative_id;
  } else if (input.parentId) {
    const parent = db.getTask(input.parentId);
    if (parent?.prd_id) {
      const prd = db.getPrd(parent.prd_id);
      if (prd) initiativeId = prd.initiative_id;
    }
  }

  if (initiativeId) {
    db.insertActivity({
      id: uuidv4(),
      initiative_id: initiativeId,
      type: 'task_created',
      entity_id: id,
      summary: `Created task: ${input.title}`,
      created_at: now
    });
  }

  return {
    id,
    prdId: input.prdId,
    parentId: input.parentId,
    status: 'pending',
    createdAt: now
  };
}

export function taskUpdate(
  db: DatabaseClient,
  input: TaskUpdateInput
): { id: string; status: TaskStatus; updatedAt: string } | null {
  const task = db.getTask(input.id);
  if (!task) return null;

  const now = new Date().toISOString();
  const updates: Partial<TaskRow> = {
    updated_at: now
  };

  if (input.status !== undefined) {
    updates.status = input.status;
  }
  if (input.assignedAgent !== undefined) {
    updates.assigned_agent = input.assignedAgent;
  }
  if (input.notes !== undefined) {
    updates.notes = input.notes;
  }
  if (input.blockedReason !== undefined) {
    updates.blocked_reason = input.blockedReason;
  }
  if (input.metadata !== undefined) {
    const existingMetadata = JSON.parse(task.metadata);
    const mergedMetadata = { ...existingMetadata, ...input.metadata };
    updates.metadata = JSON.stringify(mergedMetadata);
  }

  db.updateTask(input.id, updates);

  // Log activity if status changed
  if (input.status && input.status !== task.status) {
    // Get initiative ID from PRD
    if (task.prd_id) {
      const prd = db.getPrd(task.prd_id);
      if (prd) {
        db.insertActivity({
          id: uuidv4(),
          initiative_id: prd.initiative_id,
          type: 'task_updated',
          entity_id: input.id,
          summary: `Task ${task.title}: ${task.status} → ${input.status}`,
          created_at: now
        });
      }
    }
  }

  return {
    id: input.id,
    status: (input.status || task.status) as TaskStatus,
    updatedAt: now
  };
}

export function taskGet(
  db: DatabaseClient,
  input: TaskGetInput
): any | null {
  const task = db.getTask(input.id);
  if (!task) return null;

  const result: any = {
    id: task.id,
    prdId: task.prd_id || undefined,
    parentId: task.parent_id || undefined,
    title: task.title,
    description: task.description || undefined,
    assignedAgent: task.assigned_agent || undefined,
    status: task.status,
    blockedReason: task.blocked_reason || undefined,
    notes: task.notes || undefined,
    metadata: JSON.parse(task.metadata),
    createdAt: task.created_at,
    updatedAt: task.updated_at
  };

  if (input.includeSubtasks) {
    const subtasks = db.listTasks({ parentId: task.id });
    result.subtasks = subtasks.map(st => ({
      id: st.id,
      title: st.title,
      status: st.status,
      assignedAgent: st.assigned_agent || undefined
    }));
  }

  if (input.includeWorkProducts) {
    const workProducts = db.listWorkProducts(task.id);
    result.workProducts = workProducts.map(wp => ({
      id: wp.id,
      type: wp.type,
      title: wp.title,
      createdAt: wp.created_at
    }));
  }

  return result;
}

export function taskList(
  db: DatabaseClient,
  input: TaskListInput
): Array<{
  id: string;
  title: string;
  status: TaskStatus;
  assignedAgent?: string;
  subtaskCount: number;
  completedSubtasks: number;
  hasWorkProducts: boolean;
}> {
  const tasks = db.listTasks({
    prdId: input.prdId,
    parentId: input.parentId,
    status: input.status,
    assignedAgent: input.assignedAgent
  });

  return tasks.map(task => {
    const subtaskCounts = db.getTaskSubtaskCount(task.id);
    const hasWorkProducts = db.hasWorkProducts(task.id);

    return {
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      assignedAgent: task.assigned_agent || undefined,
      subtaskCount: subtaskCounts.total,
      completedSubtasks: subtaskCounts.completed,
      hasWorkProducts
    };
  });
}
