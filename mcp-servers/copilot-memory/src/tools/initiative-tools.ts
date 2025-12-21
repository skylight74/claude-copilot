/**
 * MCP tools for initiative operations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../db/client.js';
import type {
  Initiative,
  InitiativeRow,
  InitiativeStartInput,
  InitiativeUpdateInput,
  InitiativeStatus
} from '../types.js';

/**
 * Convert database row to Initiative object
 */
function rowToInitiative(row: InitiativeRow): Initiative {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal || undefined,
    status: row.status as InitiativeStatus,
    completed: JSON.parse(row.completed),
    inProgress: JSON.parse(row.in_progress),
    blocked: JSON.parse(row.blocked),
    decisions: JSON.parse(row.decisions),
    lessons: JSON.parse(row.lessons),
    keyFiles: JSON.parse(row.key_files),
    resumeInstructions: row.resume_instructions || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Start a new initiative (archives any existing one)
 */
export function initiativeStart(
  db: DatabaseClient,
  input: InitiativeStartInput
): Initiative {
  // Archive existing initiative if any
  db.archiveInitiative();

  const id = uuidv4();
  const now = new Date().toISOString();

  const row: Omit<InitiativeRow, 'project_id'> = {
    id,
    name: input.name,
    goal: input.goal || null,
    status: input.status || 'IN PROGRESS',
    completed: '[]',
    in_progress: '[]',
    blocked: '[]',
    decisions: '[]',
    lessons: '[]',
    key_files: '[]',
    resume_instructions: null,
    created_at: now,
    updated_at: now
  };

  db.upsertInitiative(row);

  return rowToInitiative({
    ...row,
    project_id: db.getProjectId()
  });
}

/**
 * Update the current initiative
 */
export function initiativeUpdate(
  db: DatabaseClient,
  input: InitiativeUpdateInput
): Initiative | null {
  const existing = db.getInitiative();
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();

  // Merge updates with existing data
  const updated: Omit<InitiativeRow, 'project_id'> = {
    id: existing.id,
    name: existing.name,
    goal: existing.goal,
    status: input.status || existing.status,
    completed: input.completed
      ? JSON.stringify([...JSON.parse(existing.completed), ...input.completed])
      : existing.completed,
    in_progress: input.inProgress !== undefined
      ? JSON.stringify(input.inProgress)
      : existing.in_progress,
    blocked: input.blocked !== undefined
      ? JSON.stringify(input.blocked)
      : existing.blocked,
    decisions: input.decisions
      ? JSON.stringify([...JSON.parse(existing.decisions), ...input.decisions])
      : existing.decisions,
    lessons: input.lessons
      ? JSON.stringify([...JSON.parse(existing.lessons), ...input.lessons])
      : existing.lessons,
    key_files: input.keyFiles
      ? JSON.stringify([...new Set([...JSON.parse(existing.key_files), ...input.keyFiles])])
      : existing.key_files,
    resume_instructions: input.resumeInstructions !== undefined
      ? input.resumeInstructions
      : existing.resume_instructions,
    created_at: existing.created_at,
    updated_at: now
  };

  db.upsertInitiative(updated);

  const row = db.getInitiative();
  return row ? rowToInitiative(row) : null;
}

/**
 * Get the current initiative
 */
export function initiativeGet(db: DatabaseClient): Initiative | null {
  const row = db.getInitiative();
  return row ? rowToInitiative(row) : null;
}

/**
 * Complete and archive the current initiative
 */
export function initiativeComplete(
  db: DatabaseClient,
  summary?: string
): Initiative | null {
  const existing = db.getInitiative();
  if (!existing) {
    return null;
  }

  // Update status to complete
  const now = new Date().toISOString();
  const updated: Omit<InitiativeRow, 'project_id'> = {
    ...existing,
    status: 'COMPLETE',
    resume_instructions: summary || existing.resume_instructions,
    updated_at: now
  };

  db.upsertInitiative(updated);

  // Get the completed initiative before archiving
  const completed = db.getInitiative();
  const result = completed ? rowToInitiative(completed) : null;

  // Archive it
  db.archiveInitiative();

  return result;
}

/**
 * Export initiative to markdown format (for compatibility)
 */
export function initiativeToMarkdown(initiative: Initiative): string {
  const lines: string[] = [
    `# Current Initiative: ${initiative.name}`,
    '',
    `## Status: ${initiative.status}`,
    ''
  ];

  if (initiative.goal) {
    lines.push('## Goal', initiative.goal, '');
  }

  if (initiative.completed.length > 0) {
    lines.push('## Completed');
    initiative.completed.forEach(item => lines.push(`- [x] ${item}`));
    lines.push('');
  }

  if (initiative.inProgress.length > 0) {
    lines.push('## In Progress');
    initiative.inProgress.forEach(item => lines.push(`- [ ] ${item}`));
    lines.push('');
  }

  if (initiative.blocked.length > 0) {
    lines.push('## Blocked / Needs Decision');
    initiative.blocked.forEach(item => lines.push(`- ${item}`));
    lines.push('');
  }

  if (initiative.keyFiles.length > 0) {
    lines.push('## Key Files Modified');
    initiative.keyFiles.forEach(item => lines.push(`- \`${item}\``));
    lines.push('');
  }

  if (initiative.decisions.length > 0) {
    lines.push('## Decisions Made');
    initiative.decisions.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    lines.push('');
  }

  if (initiative.lessons.length > 0) {
    lines.push('## Lessons Learned');
    initiative.lessons.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    lines.push('');
  }

  if (initiative.resumeInstructions) {
    lines.push('## Resume Instructions', initiative.resumeInstructions, '');
  }

  return lines.join('\n');
}
