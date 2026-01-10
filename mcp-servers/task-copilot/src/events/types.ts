/**
 * Event type definitions for Task Copilot WebSocket events
 */

import type { TaskStatus } from '../types.js';

// ==================== WebSocket Message Types ====================

export type WebSocketMessageType = 'subscribe' | 'unsubscribe' | 'subscribed' | 'event' | 'error' | 'ping' | 'pong';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  id?: string;
  timestamp: string;
  payload: MessagePayload;
}

export type MessagePayload =
  | SubscribePayload
  | SubscribedPayload
  | EventPayload
  | ErrorPayload
  | PingPongPayload;

export interface SubscribePayload {
  topics: string[];
}

export interface SubscribedPayload {
  topics: string[];
  activeSubscriptions: number;
}

export interface EventPayload {
  topic: string;
  eventType: string;
  data: EventData;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PingPongPayload {
  // Empty payload for ping/pong
}

// ==================== Event Data Types ====================

export type EventData =
  | StreamProgressData
  | StreamCompletedData
  | StreamBlockedData
  | StreamStartedData
  | TaskCreatedData
  | TaskUpdatedData
  | TaskStatusData
  | TaskBlockedData
  | TaskCompletedData
  | CheckpointCreatedData
  | CheckpointResumedData
  | CheckpointExpiredData
  | AgentHandoffData
  | AgentActivityData
  | AgentHeartbeatData
  | AgentCompletedData;

// ==================== Stream Events ====================

export interface StreamProgressData {
  streamId: string;
  streamName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  progressPercentage: number;
  lastUpdated: string;
}

export interface StreamCompletedData {
  streamId: string;
  streamName: string;
  totalTasks: number;
  completedAt: string;
  duration: number; // milliseconds
}

export interface StreamBlockedData {
  streamId: string;
  streamName: string;
  blockedReason: string;
  blockedTaskIds: string[];
}

export interface StreamStartedData {
  streamId: string;
  streamName: string;
  totalTasks: number;
  startedAt: string;
}

// ==================== Task Events ====================

export interface TaskCreatedData {
  taskId: string;
  taskTitle: string;
  assignedAgent?: string;
  streamId?: string;
  createdAt: string;
}

export interface TaskUpdatedData {
  taskId: string;
  taskTitle: string;
  status: TaskStatus;
  assignedAgent?: string;
  streamId?: string;
  changes: TaskChange[];
  updatedAt: string;
}

export interface TaskChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface TaskStatusData {
  taskId: string;
  taskTitle: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  statusChangedAt: string;
}

export interface TaskBlockedData {
  taskId: string;
  taskTitle: string;
  blockedReason: string;
  blockedAt: string;
}

export interface TaskCompletedData {
  taskId: string;
  taskTitle: string;
  completedAt: string;
  duration?: number; // milliseconds if available
}

// ==================== Checkpoint Events ====================

export interface CheckpointCreatedData {
  checkpointId: string;
  taskId: string;
  taskTitle: string;
  sequence: number;
  trigger: string;
  executionPhase?: string;
  executionStep?: number;
  hasDraft: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CheckpointResumedData {
  checkpointId: string;
  taskId: string;
  taskTitle: string;
  sequence: number;
  resumedAt: string;
}

export interface CheckpointExpiredData {
  checkpointId: string;
  taskId: string;
  sequence: number;
  expiredAt: string;
}

// ==================== Agent Events ====================

export interface AgentHandoffData {
  handoffId: string;
  taskId: string;
  fromAgent: string;
  toAgent: string;
  chainPosition: number;
  chainLength: number;
  handoffContext: string;
  workProductId: string;
  handoffAt: string;
}

export interface AgentActivityData {
  streamId: string;
  streamName: string;
  agentId: string;
  agentName: string;
  taskId: string;
  taskTitle: string;
  activityDescription?: string;
  phase?: string;
  startedAt: string;
}

export interface AgentHeartbeatData {
  streamId: string;
  agentId: string;
  taskId: string;
  lastHeartbeat: string;
}

export interface AgentCompletedData {
  streamId: string;
  agentId: string;
  taskId: string;
  completedAt: string;
  duration: number; // milliseconds
}

// ==================== Error Codes ====================

export enum WebSocketErrorCode {
  INVALID_MESSAGE = 'WS_INVALID_MESSAGE',
  UNKNOWN_TYPE = 'WS_UNKNOWN_TYPE',
  INVALID_TOPIC = 'WS_INVALID_TOPIC',
  SUBSCRIPTION_LIMIT = 'WS_SUBSCRIPTION_LIMIT',
  NOT_SUBSCRIBED = 'WS_NOT_SUBSCRIBED',
}
