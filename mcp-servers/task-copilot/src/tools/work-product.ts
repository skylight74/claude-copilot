/**
 * Work Product tool implementations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database.js';
import type {
  WorkProductStoreInput,
  WorkProductGetInput,
  WorkProductListInput,
  WorkProductRow
} from '../types.js';

export async function workProductStore(
  db: DatabaseClient,
  input: WorkProductStoreInput
): Promise<{ id: string; taskId: string; summary: string; wordCount: number; createdAt: string }> {
  const now = new Date().toISOString();
  const id = `WP-${uuidv4()}`;

  const metadata = input.metadata || {};
  const wp: WorkProductRow = {
    id,
    task_id: input.taskId,
    type: input.type,
    title: input.title,
    content: input.content,
    metadata: JSON.stringify(metadata),
    created_at: now
  };

  db.insertWorkProduct(wp);

  // Log activity (need initiative ID from task -> PRD)
  const task = db.getTask(input.taskId);
  if (task?.prd_id) {
    const prd = db.getPrd(task.prd_id);
    if (prd) {
      db.insertActivity({
        id: uuidv4(),
        initiative_id: prd.initiative_id,
        type: 'work_product_created',
        entity_id: id,
        summary: `Created ${input.type}: ${input.title}`,
        created_at: now
      });
    }
  }

  // Return summary (first 300 chars of content)
  const summary = input.content.substring(0, 300) + (input.content.length > 300 ? '...' : '');
  const wordCount = input.content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    id,
    taskId: input.taskId,
    summary,
    wordCount,
    createdAt: now
  };
}

export function workProductGet(
  db: DatabaseClient,
  input: WorkProductGetInput
): {
  id: string;
  taskId: string;
  type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
} | null {
  const wp = db.getWorkProduct(input.id);
  if (!wp) return null;

  return {
    id: wp.id,
    taskId: wp.task_id,
    type: wp.type,
    title: wp.title,
    content: wp.content,
    metadata: JSON.parse(wp.metadata),
    createdAt: wp.created_at
  };
}

export function workProductList(
  db: DatabaseClient,
  input: WorkProductListInput
): Array<{
  id: string;
  type: string;
  title: string;
  summary: string;
  wordCount: number;
  createdAt: string;
}> {
  const workProducts = db.listWorkProducts(input.taskId);

  return workProducts.map(wp => {
    const summary = wp.content.substring(0, 300) + (wp.content.length > 300 ? '...' : '');
    const wordCount = wp.content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      id: wp.id,
      type: wp.type,
      title: wp.title,
      summary,
      wordCount,
      createdAt: wp.created_at
    };
  });
}
