/**
 * MCP resource for project context
 */

import type { DatabaseClient } from '../db/client.js';
import { memoryList } from '../tools/memory-tools.js';

/**
 * Get project context as markdown resource
 */
export function getContextResource(db: DatabaseClient): {
  uri: string;
  mimeType: string;
  content: string;
} {
  const stats = db.getStats();

  // Get recent decisions
  const decisions = memoryList(db, { type: 'decision', limit: 5 });

  // Get recent lessons
  const lessons = memoryList(db, { type: 'lesson', limit: 5 });

  const lines = [
    '# Project Memory Context',
    '',
    '## Statistics',
    `- Total memories: ${stats.memoryCount}`,
    `- Active initiative: ${stats.initiativeActive ? 'Yes' : 'No'}`,
    `- Last updated: ${stats.lastUpdated || 'Never'}`,
    ''
  ];

  if (decisions.length > 0) {
    lines.push('## Recent Decisions');
    decisions.forEach(d => {
      lines.push(`- **${d.createdAt.split('T')[0]}**: ${d.content.slice(0, 150)}${d.content.length > 150 ? '...' : ''}`);
    });
    lines.push('');
  }

  if (lessons.length > 0) {
    lines.push('## Recent Lessons');
    lessons.forEach(l => {
      lines.push(`- **${l.createdAt.split('T')[0]}**: ${l.content.slice(0, 150)}${l.content.length > 150 ? '...' : ''}`);
    });
    lines.push('');
  }

  return {
    uri: 'memory://context/project',
    mimeType: 'text/markdown',
    content: lines.join('\n')
  };
}
