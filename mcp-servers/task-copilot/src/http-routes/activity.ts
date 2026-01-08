/**
 * Activity HTTP Routes
 *
 * Endpoints for querying current agent activity.
 * Uses agent_activity table to track real-time agent work.
 */

import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '../database.js';
import type { TaskMetadata } from '../types.js';

interface ActivityRouteOptions {
  db: DatabaseClient;
}

// Agent ID to human-readable name mapping
const AGENT_NAMES: Record<string, string> = {
  me: 'Engineer',
  ta: 'Tech Architect',
  qa: 'QA Engineer',
  sec: 'Security',
  doc: 'Documentation',
  do: 'DevOps',
  sd: 'Service Designer',
  uxd: 'UX Designer',
  uids: 'UI Designer',
  uid: 'UI Developer',
  cw: 'Copywriter'
};

export const activityRoutes: FastifyPluginAsync<ActivityRouteOptions> = async (
  fastify,
  options
) => {
  const { db } = options;

  // GET /api/activity - Get current agent activity
  fastify.get<{
    Querystring: {
      streamId?: string;
      active?: string;
    };
  }>('/', async (request, reply) => {
    const { streamId, active } = request.query;

    // Get activities from database
    const activities = db.getAgentActivities({
      streamId,
      activeOnly: active !== 'false'
    });

    // Transform to response format
    const now = Date.now();
    const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    const transformedActivities = activities.map(activity => {
      // Get task details
      const task = db.getTask(activity.task_id);
      if (!task) {
        return null;
      }

      const metadata = JSON.parse(task.metadata) as TaskMetadata;
      const lastHeartbeatTime = new Date(activity.last_heartbeat).getTime();
      const isActive = now - lastHeartbeatTime < ACTIVE_THRESHOLD_MS;

      return {
        streamId: activity.stream_id,
        streamName: metadata.streamName || activity.stream_id,
        agentId: activity.agent_id,
        agentName: AGENT_NAMES[activity.agent_id] || activity.agent_id,
        taskId: activity.task_id,
        taskTitle: task.title,
        activityDescription: activity.activity_description || undefined,
        phase: activity.phase || undefined,
        startedAt: activity.started_at,
        lastHeartbeat: activity.last_heartbeat,
        isActive
      };
    }).filter((a): a is NonNullable<typeof a> => a !== null);

    // Count active vs idle
    const totalActive = transformedActivities.filter(a => a.isActive).length;
    const totalIdle = transformedActivities.filter(a => !a.isActive).length;

    return {
      activities: transformedActivities,
      totalActive,
      totalIdle
    };
  });
};
