/**
 * MCP tools for initiative operations
 */

import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { DatabaseClient } from '../db/client.js';
import type {
  Initiative,
  InitiativeRow,
  InitiativeStartInput,
  InitiativeUpdateInput,
  InitiativeSlimInput,
  InitiativeSlimOutput,
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

    // NEW: Task Copilot integration
    taskCopilotLinked: row.task_copilot_linked === 1,
    activePrdIds: JSON.parse(row.active_prd_ids || '[]'),

    // KEEP: Permanent knowledge
    decisions: JSON.parse(row.decisions),
    lessons: JSON.parse(row.lessons),
    keyFiles: JSON.parse(row.key_files),

    // NEW: Slim resume context
    currentFocus: row.current_focus || undefined,
    nextAction: row.next_action || undefined,

    // DEPRECATED but kept for backward compatibility
    completed: JSON.parse(row.completed),
    inProgress: JSON.parse(row.in_progress),
    blocked: JSON.parse(row.blocked),
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

    // NEW: Task Copilot integration
    task_copilot_linked: 0,
    active_prd_ids: '[]',

    // KEEP: Permanent knowledge
    decisions: '[]',
    lessons: '[]',
    key_files: '[]',

    // NEW: Slim resume context
    current_focus: null,
    next_action: null,

    // DEPRECATED but initialized for backward compatibility
    completed: '[]',
    in_progress: '[]',
    blocked: '[]',
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

  // Warn if deprecated fields are getting bloated
  if (input.completed) {
    const totalCompleted = JSON.parse(existing.completed).length + input.completed.length;
    if (totalCompleted > 10) {
      console.warn(`Initiative has ${totalCompleted} completed items. Consider using initiative_slim to reduce context usage.`);
    }
  }

  // Truncate slim fields to max length
  const truncate = (str: string | undefined, maxLen: number) =>
    str && str.length > maxLen ? str.substring(0, maxLen) : str;

  // Merge updates with existing data
  const updated: Omit<InitiativeRow, 'project_id'> = {
    id: existing.id,
    name: existing.name,
    goal: existing.goal,
    status: input.status || existing.status,

    // NEW: Task Copilot integration
    task_copilot_linked: input.taskCopilotLinked !== undefined
      ? (input.taskCopilotLinked ? 1 : 0)
      : existing.task_copilot_linked,
    active_prd_ids: input.activePrdIds !== undefined
      ? JSON.stringify(input.activePrdIds)
      : existing.active_prd_ids,

    // KEEP: Permanent knowledge
    decisions: input.decisions
      ? JSON.stringify([...JSON.parse(existing.decisions), ...input.decisions])
      : existing.decisions,
    lessons: input.lessons
      ? JSON.stringify([...JSON.parse(existing.lessons), ...input.lessons])
      : existing.lessons,
    key_files: input.keyFiles
      ? JSON.stringify([...new Set([...JSON.parse(existing.key_files), ...input.keyFiles])])
      : existing.key_files,

    // NEW: Slim resume context
    current_focus: input.currentFocus !== undefined
      ? (truncate(input.currentFocus, 100) || null)
      : existing.current_focus,
    next_action: input.nextAction !== undefined
      ? (truncate(input.nextAction, 100) || null)
      : existing.next_action,

    // DEPRECATED but supported for backward compatibility
    completed: input.completed
      ? JSON.stringify([...JSON.parse(existing.completed), ...input.completed])
      : existing.completed,
    in_progress: input.inProgress !== undefined
      ? JSON.stringify(input.inProgress)
      : existing.in_progress,
    blocked: input.blocked !== undefined
      ? JSON.stringify(input.blocked)
      : existing.blocked,
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
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(obj: unknown): number {
  const json = JSON.stringify(obj);
  return Math.ceil(json.length / 4);
}

/**
 * Slim down initiative by removing bloated task lists
 * Keeps decisions, lessons, keyFiles (permanent knowledge)
 * Archives removed data to file
 */
export function initiativeSlim(
  db: DatabaseClient,
  input: InitiativeSlimInput
): InitiativeSlimOutput | null {
  const existing = db.getInitiative();
  if (!existing) {
    return null;
  }

  const archiveDetails = input.archiveDetails !== undefined ? input.archiveDetails : true;
  const initiative = rowToInitiative(existing);

  // Calculate before size
  const beforeSize = estimateTokens(initiative);

  // Archive to file if requested
  let archivePath: string | undefined;
  if (archiveDetails) {
    const archiveDir = join(homedir(), '.claude', 'memory', 'archives');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    archivePath = join(archiveDir, `${initiative.id}_${timestamp}_pre_slim.json`);

    try {
      const archiveData = {
        id: initiative.id,
        name: initiative.name,
        completed: initiative.completed,
        inProgress: initiative.inProgress,
        blocked: initiative.blocked,
        resumeInstructions: initiative.resumeInstructions,
        archivedAt: new Date().toISOString()
      };

      // Create directory if it doesn't exist
      if (!existsSync(archiveDir)) {
        mkdirSync(archiveDir, { recursive: true });
      }

      writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));
    } catch (err) {
      console.warn('Failed to archive initiative data:', err);
      archivePath = undefined;
    }
  }

  // Create slimmed version
  const now = new Date().toISOString();
  const updated: Omit<InitiativeRow, 'project_id'> = {
    id: existing.id,
    name: existing.name,
    goal: existing.goal,
    status: existing.status,

    // NEW: Task Copilot integration (not linked yet)
    task_copilot_linked: 0,
    active_prd_ids: '[]',

    // KEEP: Permanent knowledge (unchanged)
    decisions: existing.decisions,
    lessons: existing.lessons,
    key_files: existing.key_files,

    // NEW: Slim resume context (empty)
    current_focus: null,
    next_action: null,

    // REMOVED: Clear bloated fields
    completed: '[]',
    in_progress: '[]',
    blocked: '[]',
    resume_instructions: null,

    created_at: existing.created_at,
    updated_at: now
  };

  db.upsertInitiative(updated);

  const slimmed = rowToInitiative({
    ...updated,
    project_id: db.getProjectId()
  });

  const afterSize = estimateTokens(slimmed);
  const reduction = ((beforeSize - afterSize) / beforeSize * 100).toFixed(0);

  return {
    initiativeId: initiative.id,
    archived: archiveDetails && !!archivePath,
    archivePath,
    removedFields: ['completed', 'inProgress', 'blocked', 'resumeInstructions'],
    beforeSize,
    afterSize,
    savings: `${reduction}% reduction`
  };
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
