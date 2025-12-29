/**
 * PRD tool implementations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database.js';
import type { PrdCreateInput, PrdGetInput, PrdListInput, PrdRow } from '../types.js';

export async function prdCreate(
  db: DatabaseClient,
  input: PrdCreateInput
): Promise<{ id: string; initiativeId: string; createdAt: string; summary: string }> {
  const now = new Date().toISOString();
  const id = `PRD-${uuidv4()}`;

  // Get or create initiative
  let initiative = db.getCurrentInitiative();
  if (!initiative) {
    // Auto-create a default initiative
    const initiativeId = `INIT-${uuidv4()}`;
    initiative = {
      id: initiativeId,
      title: 'Default Initiative',
      description: 'Auto-created initiative for PRDs',
      created_at: now,
      updated_at: now
    };
    db.upsertInitiative(initiative);
  }

  const metadata = input.metadata || {};
  const prd: PrdRow = {
    id,
    initiative_id: initiative.id,
    title: input.title,
    description: input.description || null,
    content: input.content,
    metadata: JSON.stringify(metadata),
    status: 'active',
    created_at: now,
    updated_at: now
  };

  db.insertPrd(prd);

  // Log activity
  db.insertActivity({
    id: uuidv4(),
    initiative_id: initiative.id,
    type: 'prd_created',
    entity_id: id,
    summary: `Created PRD: ${input.title}`,
    created_at: now
  });

  // Return summary (first 200 chars of content)
  const summary = input.content.substring(0, 200) + (input.content.length > 200 ? '...' : '');

  return {
    id,
    initiativeId: initiative.id,
    createdAt: now,
    summary
  };
}

export function prdGet(
  db: DatabaseClient,
  input: PrdGetInput
): {
  id: string;
  initiativeId: string;
  title: string;
  description?: string;
  content?: string;
  metadata: Record<string, unknown>;
  taskCount: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
} | null {
  const prd = db.getPrd(input.id);
  if (!prd) return null;

  const taskCounts = db.getPrdTaskCount(input.id);

  return {
    id: prd.id,
    initiativeId: prd.initiative_id,
    title: prd.title,
    description: prd.description || undefined,
    content: input.includeContent ? prd.content : undefined,
    metadata: JSON.parse(prd.metadata),
    taskCount: taskCounts.total,
    completedTasks: taskCounts.completed,
    createdAt: prd.created_at,
    updatedAt: prd.updated_at
  };
}

export function prdList(
  db: DatabaseClient,
  input: PrdListInput
): Array<{
  id: string;
  title: string;
  description?: string;
  taskCount: number;
  completedTasks: number;
  progress: string;
}> {
  const prds = db.listPrds({
    initiativeId: input.initiativeId,
    status: input.status
  });

  return prds.map(prd => {
    const taskCounts = db.getPrdTaskCount(prd.id);
    const progress = taskCounts.total > 0
      ? `${taskCounts.completed}/${taskCounts.total} (${Math.round((taskCounts.completed / taskCounts.total) * 100)}%)`
      : '0/0';

    return {
      id: prd.id,
      title: prd.title,
      description: prd.description || undefined,
      taskCount: taskCounts.total,
      completedTasks: taskCounts.completed,
      progress
    };
  });
}
