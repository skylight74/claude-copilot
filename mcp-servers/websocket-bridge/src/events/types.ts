/**
 * WebSocket event types and interfaces
 */

export type WebSocketEventType =
  | 'task.create'
  | 'task.update'
  | 'task.complete'
  | 'work_product.store'
  | 'progress.update'
  | 'prd.create'
  | 'prd.update';

export interface WebSocketEvent {
  id: string;
  type: WebSocketEventType;
  initiativeId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface TaskEvent extends WebSocketEvent {
  type: 'task.create' | 'task.update' | 'task.complete';
  data: {
    taskId: string;
    title: string;
    status: string;
    assignedAgent?: string;
    prdId?: string;
  };
}

export interface WorkProductEvent extends WebSocketEvent {
  type: 'work_product.store';
  data: {
    workProductId: string;
    taskId: string;
    type: string;
    title: string;
  };
}

export interface ProgressUpdateEvent extends WebSocketEvent {
  type: 'progress.update';
  data: {
    prdId?: string;
    taskId?: string;
    completedCount: number;
    totalCount: number;
    percentage: number;
  };
}

export interface PrdEvent extends WebSocketEvent {
  type: 'prd.create' | 'prd.update';
  data: {
    prdId: string;
    title: string;
    status: string;
  };
}

/**
 * Client message types
 */
export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  initiativeId?: string;
}

/**
 * Server message types
 */
export type ServerMessage = WebSocketEvent | PongMessage | ErrorMessage;

export interface PongMessage {
  type: 'pong';
  timestamp: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}
