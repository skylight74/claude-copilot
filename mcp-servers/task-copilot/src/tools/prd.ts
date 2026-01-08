/**
 * PRD tool implementations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database.js';
import type { PrdCreateInput, PrdGetInput, PrdListInput, PrdRow, PrdMetadata } from '../types.js';

/**
 * Detect PRD type from title and description
 */
function detectPrdType(title: string, description?: string): 'FEATURE' | 'EXPERIENCE' | 'DEFECT' | 'QUESTION' | 'TECHNICAL' {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Check for DEFECT keywords
  if (/\b(fix|bug|error|broken|issue|crash|fail)\b/.test(text)) {
    return 'DEFECT';
  }

  // Check for QUESTION keywords
  if (/\b(how|what|why|explain|investigate|research|explore)\b/.test(text)) {
    return 'QUESTION';
  }

  // Check for EXPERIENCE keywords (UI/UX work)
  if (/\b(ui|ux|design|interface|modal|form|screen|page|layout|component|visual|interaction)\b/.test(text)) {
    return 'EXPERIENCE';
  }

  // Check for FEATURE keywords
  if (/\b(add|implement|create|build|develop|introduce|enable)\b/.test(text)) {
    return 'FEATURE';
  }

  // Default to TECHNICAL for other cases
  return 'TECHNICAL';
}

/**
 * Get default scopeLocked value based on PRD type
 */
function getDefaultScopeLocked(prdType: string): boolean {
  const scopeLockedDefaults: Record<string, boolean> = {
    'FEATURE': true,      // Lock scope for features
    'EXPERIENCE': true,   // Lock scope for UX work
    'DEFECT': false,      // Allow flexibility for bug fixes
    'QUESTION': false,    // Questions don't need lock
    'TECHNICAL': false    // Default to unlocked
  };

  return scopeLockedDefaults[prdType] ?? false;
}

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

  // Auto-detect PRD type from title and description
  const prdType = detectPrdType(input.title, input.description);

  // Build metadata with auto-detection and defaults
  const metadata: PrdMetadata = {
    ...(input.metadata || {}),
    prdType
  };

  // Apply default scopeLocked if not explicitly set
  if (metadata.scopeLocked === undefined) {
    metadata.scopeLocked = getDefaultScopeLocked(prdType);
  }

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
    entity_type: 'prd',
    summary: `Created PRD: ${input.title}`,
    metadata: JSON.stringify({
      prdId: id,
      title: input.title,
      contentLength: input.content.length
    }),
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
