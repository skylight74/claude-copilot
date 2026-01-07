/**
 * Maps database activity_log rows to WebSocket events
 */

import type { WebSocketEvent, WebSocketEventType } from './types.js';

interface ActivityLogRow {
  id: string;
  initiative_id: string;
  type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  assigned_agent: string | null;
  prd_id: string | null;
}

interface WorkProductRow {
  id: string;
  task_id: string;
  type: string;
  title: string;
}

interface PrdRow {
  id: string;
  title: string;
  status: string;
}

/**
 * Map activity_log type to WebSocket event type
 */
export function mapActivityType(activityType: string): WebSocketEventType | null {
  const mapping: Record<string, WebSocketEventType> = {
    'task.created': 'task.create',
    'task.updated': 'task.update',
    'task.completed': 'task.complete',
    'work_product.created': 'work_product.store',
    'prd.created': 'prd.create',
    'prd.updated': 'prd.update',
  };

  return mapping[activityType] || null;
}

/**
 * Enrich activity log with entity details from database
 */
export function enrichEvent(
  activity: ActivityLogRow,
  entity: TaskRow | WorkProductRow | PrdRow | null
): WebSocketEvent | null {
  const eventType = mapActivityType(activity.type);
  if (!eventType) {
    return null;
  }

  const baseEvent = {
    id: activity.id,
    type: eventType,
    initiativeId: activity.initiative_id,
    timestamp: activity.created_at,
  };

  // Task events
  if (eventType.startsWith('task.') && entity && 'status' in entity) {
    return {
      ...baseEvent,
      type: eventType as 'task.create' | 'task.update' | 'task.complete',
      data: {
        taskId: entity.id,
        title: entity.title,
        status: entity.status,
        assignedAgent: 'assigned_agent' in entity ? entity.assigned_agent : undefined,
        prdId: 'prd_id' in entity ? entity.prd_id : undefined,
      },
    };
  }

  // Work product events
  if (eventType === 'work_product.store' && entity && 'task_id' in entity) {
    return {
      ...baseEvent,
      type: eventType,
      data: {
        workProductId: entity.id,
        taskId: entity.task_id,
        type: entity.type,
        title: entity.title,
      },
    };
  }

  // PRD events
  if (eventType.startsWith('prd.') && entity && 'status' in entity && !('assigned_agent' in entity)) {
    return {
      ...baseEvent,
      type: eventType as 'prd.create' | 'prd.update',
      data: {
        prdId: entity.id,
        title: entity.title,
        status: entity.status,
      },
    };
  }

  // Fallback: return basic event without enrichment
  return {
    ...baseEvent,
    type: eventType,
    data: {
      entityId: activity.entity_id,
      summary: activity.summary,
    },
  } as WebSocketEvent;
}
