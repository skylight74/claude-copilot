/**
 * Task HTTP Routes
 *
 * Endpoints for querying tasks with filters.
 */

import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '../database.js';
import type { TaskStatus } from '../types.js';

interface TasksRouteOptions {
  db: DatabaseClient;
}

export const tasksRoutes: FastifyPluginAsync<TasksRouteOptions> = async (
  fastify,
  options
) => {
  const { db } = options;

  // GET /api/tasks - Query tasks with filters
  fastify.get<{
    Querystring: {
      status?: TaskStatus;
      streamId?: string;
      assignedAgent?: string;
      prdId?: string;
      limit?: string;
    };
  }>('/', async (request, reply) => {
    const { status, streamId, assignedAgent, prdId, limit } = request.query;

    // Build query
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: unknown[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (assignedAgent) {
      sql += ' AND assigned_agent = ?';
      params.push(assignedAgent);
    }

    if (prdId) {
      sql += ' AND prd_id = ?';
      params.push(prdId);
    }

    if (streamId) {
      sql += ' AND json_extract(metadata, \'$.streamId\') = ?';
      params.push(streamId);
    }

    // Exclude archived tasks by default
    sql += ' AND (archived IS NULL OR archived = 0)';

    sql += ' ORDER BY created_at DESC';

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        sql += ` LIMIT ${limitNum}`;
      }
    }

    const taskRows = db.getDb().prepare(sql).all(...params) as Array<{
      id: string;
      prd_id: string | null;
      parent_id: string | null;
      title: string;
      description: string | null;
      assigned_agent: string | null;
      status: string;
      blocked_reason: string | null;
      notes: string | null;
      metadata: string;
      created_at: string;
      updated_at: string;
    }>;

    // Transform to JSON response format
    const tasks = taskRows.map(row => ({
      id: row.id,
      prdId: row.prd_id || undefined,
      parentId: row.parent_id || undefined,
      title: row.title,
      description: row.description || undefined,
      assignedAgent: row.assigned_agent || undefined,
      status: row.status,
      blockedReason: row.blocked_reason || undefined,
      notes: row.notes || undefined,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return {
      tasks,
      totalTasks: tasks.length
    };
  });
};
