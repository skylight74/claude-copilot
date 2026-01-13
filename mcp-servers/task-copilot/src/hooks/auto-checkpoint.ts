/**
 * Auto-checkpoint hook system
 *
 * Automatically creates checkpoints at strategic moments without requiring
 * manual checkpoint_create() calls from agents.
 */

import type { DatabaseClient } from '../database.js';
import { checkpointCreate } from '../tools/checkpoint.js';
import type { CheckpointTrigger } from '../types.js';

export interface AutoCheckpointConfig {
  enabled: boolean;
  triggers: {
    iterationStart: boolean;
    iterationFailure: boolean;
    taskStatusChange: boolean;
    workProductStore: boolean;
  };
}

/**
 * Default auto-checkpoint configuration
 */
export const DEFAULT_AUTO_CHECKPOINT_CONFIG: AutoCheckpointConfig = {
  enabled: true,
  triggers: {
    iterationStart: true,
    iterationFailure: true,
    taskStatusChange: false, // Too noisy
    workProductStore: false, // Work product itself is the checkpoint
  },
};

/**
 * Auto-checkpoint hook manager
 */
export class AutoCheckpointHooks {
  private config: AutoCheckpointConfig;
  private db: DatabaseClient;

  constructor(db: DatabaseClient, config?: Partial<AutoCheckpointConfig>) {
    this.db = db;
    this.config = {
      ...DEFAULT_AUTO_CHECKPOINT_CONFIG,
      ...config,
    };
  }

  /**
   * Hook: Before iteration starts
   * Creates checkpoint to allow recovery if iteration fails
   */
  onIterationStart(taskId: string, iterationNumber: number): void {
    if (!this.config.enabled || !this.config.triggers.iterationStart) {
      return;
    }

    try {
      checkpointCreate(this.db, {
        taskId,
        trigger: 'auto_iteration',
        executionPhase: 'iteration',
        executionStep: iterationNumber,
        agentContext: {
          iterationStarted: new Date().toISOString(),
          autoCreated: true,
        },
      });
    } catch (error) {
      // Don't throw - checkpoint failure shouldn't break iteration
      console.warn(`Auto-checkpoint failed for iteration ${iterationNumber}:`, error);
    }
  }

  /**
   * Hook: After iteration validation fails
   * Creates checkpoint with validation state for debugging
   */
  onIterationFailure(
    taskId: string,
    iterationNumber: number,
    validationResult: unknown,
    agentOutput?: string
  ): void {
    if (!this.config.enabled || !this.config.triggers.iterationFailure) {
      return;
    }

    try {
      checkpointCreate(this.db, {
        taskId,
        trigger: 'auto_iteration',
        executionPhase: 'iteration_failed',
        executionStep: iterationNumber,
        agentContext: {
          validationResult,
          iterationFailed: new Date().toISOString(),
          autoCreated: true,
        },
        draftContent: agentOutput,
        draftType: 'implementation',
      });
    } catch (error) {
      console.warn(`Auto-checkpoint failed for iteration failure:`, error);
    }
  }

  /**
   * Hook: When task status changes
   * Creates checkpoint to capture state transitions
   */
  onTaskStatusChange(
    taskId: string,
    oldStatus: string,
    newStatus: string
  ): void {
    if (!this.config.enabled || !this.config.triggers.taskStatusChange) {
      return;
    }

    // Only checkpoint significant transitions
    const significantTransitions = [
      'pending->in_progress',
      'in_progress->blocked',
      'blocked->in_progress',
    ];

    const transition = `${oldStatus}->${newStatus}`;
    if (!significantTransitions.includes(transition)) {
      return;
    }

    try {
      checkpointCreate(this.db, {
        taskId,
        trigger: 'manual', // Status changes are typically manual
        executionPhase: 'status_change',
        agentContext: {
          oldStatus,
          newStatus,
          statusChangedAt: new Date().toISOString(),
          autoCreated: true,
        },
      });
    } catch (error) {
      console.warn(`Auto-checkpoint failed for status change:`, error);
    }
  }

  /**
   * Hook: After work product stored
   * Work products themselves serve as checkpoints, but we can link them
   */
  onWorkProductStore(
    taskId: string,
    workProductId: string,
    workProductType: string
  ): void {
    if (!this.config.enabled || !this.config.triggers.workProductStore) {
      return;
    }

    try {
      checkpointCreate(this.db, {
        taskId,
        trigger: 'auto_work_product',
        executionPhase: 'work_product_stored',
        agentContext: {
          workProductId,
          workProductType,
          workProductStoredAt: new Date().toISOString(),
          autoCreated: true,
        },
      });
    } catch (error) {
      console.warn(`Auto-checkpoint failed for work product store:`, error);
    }
  }

  /**
   * Update hook configuration
   */
  updateConfig(config: Partial<AutoCheckpointConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoCheckpointConfig {
    return { ...this.config };
  }
}

/**
 * Global auto-checkpoint hook instance
 * Initialized by the MCP server
 */
let globalHooks: AutoCheckpointHooks | null = null;

export function initializeAutoCheckpointHooks(
  db: DatabaseClient,
  config?: Partial<AutoCheckpointConfig>
): AutoCheckpointHooks {
  globalHooks = new AutoCheckpointHooks(db, config);
  return globalHooks;
}

export function getAutoCheckpointHooks(): AutoCheckpointHooks | null {
  return globalHooks;
}
