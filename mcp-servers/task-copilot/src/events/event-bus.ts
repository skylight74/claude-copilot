/**
 * Central Event Bus for Task Copilot
 *
 * Singleton EventEmitter that tools use to emit events when database changes occur.
 * WebSocket server subscribes to these events and broadcasts to connected clients.
 */

import { EventEmitter } from 'events';
import type {
  StreamProgressData,
  StreamCompletedData,
  StreamBlockedData,
  StreamStartedData,
  TaskCreatedData,
  TaskUpdatedData,
  TaskStatusData,
  TaskBlockedData,
  TaskCompletedData,
  CheckpointCreatedData,
  CheckpointResumedData,
  CheckpointExpiredData,
  AgentHandoffData,
  AgentActivityData,
  AgentHeartbeatData,
  AgentCompletedData,
} from './types.js';

/**
 * Event bus for Task Copilot real-time events
 */
export class TaskCopilotEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners for high-volume events
    this.setMaxListeners(100);
  }

  // ==================== Stream Events ====================

  emitStreamProgress(streamId: string, data: StreamProgressData): void {
    this.emit('stream.progress', { topic: `stream:${streamId}`, data });
  }

  emitStreamCompleted(streamId: string, data: StreamCompletedData): void {
    this.emit('stream.completed', { topic: `stream:${streamId}`, data });
  }

  emitStreamBlocked(streamId: string, data: StreamBlockedData): void {
    this.emit('stream.blocked', { topic: `stream:${streamId}`, data });
  }

  emitStreamStarted(streamId: string, data: StreamStartedData): void {
    this.emit('stream.started', { topic: `stream:${streamId}`, data });
  }

  // ==================== Task Events ====================

  emitTaskCreated(taskId: string, data: TaskCreatedData): void {
    this.emit('task.created', { topic: `task:${taskId}`, data });
  }

  emitTaskUpdated(taskId: string, data: TaskUpdatedData): void {
    this.emit('task.updated', { topic: `task:${taskId}`, data });
  }

  emitTaskStatusChanged(taskId: string, data: TaskStatusData): void {
    this.emit('task.status_changed', { topic: `task:${taskId}`, data });
  }

  emitTaskBlocked(taskId: string, data: TaskBlockedData): void {
    this.emit('task.blocked', { topic: `task:${taskId}`, data });
  }

  emitTaskCompleted(taskId: string, data: TaskCompletedData): void {
    this.emit('task.completed', { topic: `task:${taskId}`, data });
  }

  // ==================== Checkpoint Events ====================

  emitCheckpointCreated(taskId: string, data: CheckpointCreatedData): void {
    this.emit('checkpoint.created', { topic: `checkpoint:${taskId}`, data });
  }

  emitCheckpointResumed(taskId: string, data: CheckpointResumedData): void {
    this.emit('checkpoint.resumed', { topic: `checkpoint:${taskId}`, data });
  }

  emitCheckpointExpired(checkpointId: string, data: CheckpointExpiredData): void {
    this.emit('checkpoint.expired', { topic: `checkpoint:${checkpointId}`, data });
  }

  // ==================== Agent Events ====================

  emitAgentHandoff(fromAgent: string, data: AgentHandoffData): void {
    this.emit('agent.handoff', { topic: `agent:${fromAgent}`, data });
  }

  emitAgentActivity(agentId: string, data: AgentActivityData): void {
    this.emit('agent.started', { topic: `agent:${agentId}`, data });
  }

  emitAgentHeartbeat(agentId: string, data: AgentHeartbeatData): void {
    this.emit('agent.heartbeat', { topic: `agent:${agentId}`, data });
  }

  emitAgentCompleted(agentId: string, data: AgentCompletedData): void {
    this.emit('agent.completed', { topic: `agent:${agentId}`, data });
  }
}

// Singleton instance
export const eventBus = new TaskCopilotEventBus();
