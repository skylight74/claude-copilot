/**
 * MCP resource for current initiative
 */

import type { DatabaseClient } from '../db/client.js';
import { initiativeGet, initiativeToMarkdown } from '../tools/initiative-tools.js';

/**
 * Get current initiative as markdown resource
 */
export function getInitiativeResource(db: DatabaseClient): {
  uri: string;
  mimeType: string;
  content: string;
} | null {
  const initiative = initiativeGet(db);

  if (!initiative) {
    return null;
  }

  return {
    uri: 'memory://initiative/current',
    mimeType: 'text/markdown',
    content: initiativeToMarkdown(initiative)
  };
}

/**
 * Get initiative summary for quick context
 */
export function getInitiativeSummary(db: DatabaseClient): string | null {
  const initiative = initiativeGet(db);

  if (!initiative) {
    return null;
  }

  const lines = [
    `**Initiative:** ${initiative.name}`,
    `**Status:** ${initiative.status}`,
  ];

  if (initiative.inProgress.length > 0) {
    lines.push(`**In Progress:** ${initiative.inProgress.join(', ')}`);
  }

  if (initiative.resumeInstructions) {
    lines.push(`**Resume:** ${initiative.resumeInstructions.slice(0, 200)}...`);
  }

  return lines.join('\n');
}
