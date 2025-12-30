#!/usr/bin/env node
/**
 * Task Copilot MCP Server
 *
 * Provides PRD and task management for Claude Code.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DatabaseClient } from './database.js';
import { prdCreate, prdGet, prdList } from './tools/prd.js';
import { taskCreate, taskUpdate, taskGet, taskList } from './tools/task.js';
import { workProductStore, workProductGet, workProductList } from './tools/work-product.js';
import { initiativeLink, initiativeArchive, initiativeWipe, progressSummary } from './tools/initiative.js';
import { agentPerformanceGet } from './tools/performance.js';
import { checkpointCreate, checkpointGet, checkpointResume, checkpointList, checkpointCleanup } from './tools/checkpoint.js';
import { getValidator, initValidator } from './validation/index.js';
import type {
  PrdCreateInput,
  PrdGetInput,
  PrdListInput,
  TaskCreateInput,
  TaskUpdateInput,
  TaskGetInput,
  TaskListInput,
  WorkProductStoreInput,
  WorkProductGetInput,
  WorkProductListInput,
  InitiativeLinkInput,
  InitiativeArchiveInput,
  InitiativeWipeInput,
  ProgressSummaryInput,
  AgentPerformanceGetInput,
  CheckpointCreateInput,
  CheckpointGetInput,
  CheckpointResumeInput,
  CheckpointListInput,
  CheckpointCleanupInput,
  ValidationRulesListInput,
  TaskStatus,
  PrdStatus,
  WorkProductType
} from './types.js';

// Get configuration from environment
const PROJECT_PATH = process.cwd();
const TASK_DB_PATH = process.env.TASK_DB_PATH || undefined;
const WORKSPACE_ID = process.env.WORKSPACE_ID || undefined;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Initialize database
const db = new DatabaseClient(PROJECT_PATH, TASK_DB_PATH, WORKSPACE_ID);

// Create MCP server
const server = new Server(
  {
    name: 'task-copilot',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'prd_create',
    description: 'Create a new PRD',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'PRD title' },
        description: { type: 'string', description: 'PRD description' },
        content: { type: 'string', description: 'Full PRD content' },
        metadata: {
          type: 'object',
          description: 'Optional metadata (priority, complexity, tags, etc.)',
          properties: {
            priority: { type: 'string' },
            complexity: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'prd_get',
    description: 'Get PRD by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'PRD ID' },
        includeContent: { type: 'boolean', description: 'Include full content (default false)' }
      },
      required: ['id']
    }
  },
  {
    name: 'prd_list',
    description: 'List PRDs for initiative',
    inputSchema: {
      type: 'object',
      properties: {
        initiativeId: { type: 'string', description: 'Filter by initiative ID' },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'cancelled'],
          description: 'Filter by status'
        }
      }
    }
  },
  {
    name: 'task_create',
    description: 'Create task or subtask',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        prdId: { type: 'string', description: 'Parent PRD ID (optional)' },
        parentId: { type: 'string', description: 'Parent task ID for subtasks (optional)' },
        assignedAgent: { type: 'string', description: 'Assigned agent name' },
        metadata: {
          type: 'object',
          description: 'Optional metadata (complexity, priority, dependencies, acceptanceCriteria, phase)',
          properties: {
            complexity: { type: 'string' },
            priority: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            acceptanceCriteria: { type: 'array', items: { type: 'string' } },
            phase: { type: 'string' }
          }
        }
      },
      required: ['title']
    }
  },
  {
    name: 'task_update',
    description: 'Update task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
          description: 'New status'
        },
        assignedAgent: { type: 'string', description: 'New assigned agent' },
        notes: { type: 'string', description: 'Task notes' },
        blockedReason: { type: 'string', description: 'Reason if blocked' },
        metadata: { type: 'object', description: 'Metadata updates (merged)' }
      },
      required: ['id']
    }
  },
  {
    name: 'task_get',
    description: 'Get task details',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
        includeSubtasks: { type: 'boolean', description: 'Include subtasks (default false)' },
        includeWorkProducts: { type: 'boolean', description: 'Include work products (default false)' }
      },
      required: ['id']
    }
  },
  {
    name: 'task_list',
    description: 'List tasks with filters',
    inputSchema: {
      type: 'object',
      properties: {
        prdId: { type: 'string', description: 'Filter by PRD ID' },
        parentId: { type: 'string', description: 'Filter by parent task ID (null for top-level)' },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
          description: 'Filter by status'
        },
        assignedAgent: { type: 'string', description: 'Filter by assigned agent' }
      }
    }
  },
  {
    name: 'work_product_store',
    description: 'Store agent output',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        type: {
          type: 'string',
          enum: ['technical_design', 'implementation', 'test_plan', 'security_review', 'documentation', 'architecture', 'other'],
          description: 'Work product type'
        },
        title: { type: 'string', description: 'Work product title' },
        content: { type: 'string', description: 'Full content' },
        metadata: { type: 'object', description: 'Optional metadata' }
      },
      required: ['taskId', 'type', 'title', 'content']
    }
  },
  {
    name: 'work_product_get',
    description: 'Get full work product',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Work product ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'work_product_list',
    description: 'List work products for task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'health_check',
    description: 'Get server health and statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'initiative_link',
    description: 'Link current initiative from Memory Copilot to Task Copilot workspace',
    inputSchema: {
      type: 'object',
      properties: {
        initiativeId: { type: 'string', description: 'Initiative ID from Memory Copilot' },
        title: { type: 'string', description: 'Initiative title' },
        description: { type: 'string', description: 'Initiative description (optional)' }
      },
      required: ['initiativeId', 'title']
    }
  },
  {
    name: 'initiative_archive',
    description: 'Archive all task data for an initiative to a JSON file',
    inputSchema: {
      type: 'object',
      properties: {
        initiativeId: { type: 'string', description: 'Initiative ID (default: current initiative)' },
        archivePath: { type: 'string', description: 'Custom archive file path (default: ~/.claude/archives/{id}_{timestamp}.json)' }
      }
    }
  },
  {
    name: 'initiative_wipe',
    description: 'Delete all task data for an initiative (fresh start)',
    inputSchema: {
      type: 'object',
      properties: {
        initiativeId: { type: 'string', description: 'Initiative ID (default: current initiative)' },
        confirm: { type: 'boolean', description: 'Safety flag - must be true to proceed' }
      },
      required: ['confirm']
    }
  },
  {
    name: 'progress_summary',
    description: 'Get high-level progress summary for initiative',
    inputSchema: {
      type: 'object',
      properties: {
        initiativeId: { type: 'string', description: 'Initiative ID (default: current initiative)' }
      }
    }
  },
  // Agent Performance Tracking
  {
    name: 'agent_performance_get',
    description: 'Get agent performance metrics (success rates, completion rates by task type)',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Filter by agent ID (me, ta, qa, sec, doc, do, sd, uxd, uids, uid, cw)' },
        workProductType: {
          type: 'string',
          enum: ['technical_design', 'implementation', 'test_plan', 'security_review', 'documentation', 'architecture', 'other'],
          description: 'Filter by work product type'
        },
        complexity: { type: 'string', description: 'Filter by complexity (low, medium, high, very_high)' },
        sinceDays: { type: 'number', description: 'Only include last N days (default: all)' }
      }
    }
  },
  // Checkpoint Tools
  {
    name: 'checkpoint_create',
    description: 'Create a checkpoint for mid-task recovery. Use before risky operations or after completing significant steps.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to checkpoint' },
        trigger: {
          type: 'string',
          enum: ['auto_status', 'auto_subtask', 'manual', 'error'],
          description: 'Checkpoint trigger type (default: manual)'
        },
        executionPhase: { type: 'string', description: 'Current phase (e.g., analysis, implementation)' },
        executionStep: { type: 'number', description: 'Step number within phase' },
        agentContext: { type: 'object', description: 'Agent-specific state to preserve' },
        draftContent: { type: 'string', description: 'Partial work in progress' },
        draftType: {
          type: 'string',
          enum: ['technical_design', 'implementation', 'test_plan', 'security_review', 'documentation', 'architecture', 'other'],
          description: 'Type of draft content'
        },
        expiresIn: { type: 'number', description: 'Minutes until checkpoint expires (default: 1440 = 24h)' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'checkpoint_get',
    description: 'Get a specific checkpoint by ID with full details',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Checkpoint ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'checkpoint_resume',
    description: 'Resume task from last checkpoint. Returns state and context for continuing work.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to resume' },
        checkpointId: { type: 'string', description: 'Specific checkpoint ID (default: latest)' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'checkpoint_list',
    description: 'List available checkpoints for a task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        limit: { type: 'number', description: 'Max results (default: 5)' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'checkpoint_cleanup',
    description: 'Clean up old or expired checkpoints',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Clean specific task (omit for all)' },
        olderThan: { type: 'number', description: 'Remove checkpoints older than N minutes' },
        keepLatest: { type: 'number', description: 'Keep N most recent per task (default: 3)' }
      }
    }
  },
  // Validation Tools
  {
    name: 'validation_config_get',
    description: 'Get current validation configuration',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'validation_rules_list',
    description: 'List validation rules for a work product type',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['technical_design', 'implementation', 'test_plan', 'security_review', 'documentation', 'architecture', 'other'],
          description: 'Work product type to get rules for (omit for global rules)'
        }
      }
    }
  }
];

// Handle list tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const a = args as Record<string, unknown>;

  try {
    switch (name) {
      case 'prd_create': {
        const result = await prdCreate(db, {
          title: a.title as string,
          description: a.description as string | undefined,
          content: a.content as string,
          metadata: a.metadata as Record<string, unknown> | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'prd_get': {
        const result = prdGet(db, {
          id: a.id as string,
          includeContent: a.includeContent as boolean | undefined
        });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'PRD not found' }] };
      }

      case 'prd_list': {
        const result = prdList(db, {
          initiativeId: a.initiativeId as string | undefined,
          status: a.status as PrdStatus | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'task_create': {
        const result = await taskCreate(db, {
          title: a.title as string,
          description: a.description as string | undefined,
          prdId: a.prdId as string | undefined,
          parentId: a.parentId as string | undefined,
          assignedAgent: a.assignedAgent as string | undefined,
          metadata: a.metadata as Record<string, unknown> | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'task_update': {
        const result = taskUpdate(db, {
          id: a.id as string,
          status: a.status as TaskStatus | undefined,
          assignedAgent: a.assignedAgent as string | undefined,
          notes: a.notes as string | undefined,
          blockedReason: a.blockedReason as string | undefined,
          metadata: a.metadata as Record<string, unknown> | undefined
        });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'Task not found' }] };
      }

      case 'task_get': {
        const result = taskGet(db, {
          id: a.id as string,
          includeSubtasks: a.includeSubtasks as boolean | undefined,
          includeWorkProducts: a.includeWorkProducts as boolean | undefined
        });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'Task not found' }] };
      }

      case 'task_list': {
        const result = taskList(db, {
          prdId: a.prdId as string | undefined,
          parentId: a.parentId as string | undefined,
          status: a.status as TaskStatus | undefined,
          assignedAgent: a.assignedAgent as string | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'work_product_store': {
        const result = await workProductStore(db, {
          taskId: a.taskId as string,
          type: a.type as WorkProductType,
          title: a.title as string,
          content: a.content as string,
          metadata: a.metadata as Record<string, unknown> | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'work_product_get': {
        const result = workProductGet(db, {
          id: a.id as string
        });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'Work product not found' }] };
      }

      case 'work_product_list': {
        const result = workProductList(db, {
          taskId: a.taskId as string
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'health_check': {
        const stats = db.getStats();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'healthy',
              workspaceId: db.getWorkspaceId(),
              ...stats
            }, null, 2)
          }]
        };
      }

      case 'initiative_link': {
        const result = initiativeLink(db, {
          initiativeId: a.initiativeId as string,
          title: a.title as string,
          description: a.description as string | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'initiative_archive': {
        const result = initiativeArchive(db, {
          initiativeId: a.initiativeId as string | undefined,
          archivePath: a.archivePath as string | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'initiative_wipe': {
        const result = initiativeWipe(db, {
          initiativeId: a.initiativeId as string | undefined,
          confirm: a.confirm as boolean
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'progress_summary': {
        const result = progressSummary(db, {
          initiativeId: a.initiativeId as string | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Agent Performance Tracking
      case 'agent_performance_get': {
        const result = agentPerformanceGet(db, {
          agentId: a.agentId as string | undefined,
          workProductType: a.workProductType as string | undefined,
          complexity: a.complexity as string | undefined,
          sinceDays: a.sinceDays as number | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Checkpoint Tools
      case 'checkpoint_create': {
        const result = checkpointCreate(db, {
          taskId: a.taskId as string,
          trigger: a.trigger as 'auto_status' | 'auto_subtask' | 'manual' | 'error' | undefined,
          executionPhase: a.executionPhase as string | undefined,
          executionStep: a.executionStep as number | undefined,
          agentContext: a.agentContext as Record<string, unknown> | undefined,
          draftContent: a.draftContent as string | undefined,
          draftType: a.draftType as WorkProductType | undefined,
          expiresIn: a.expiresIn as number | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'checkpoint_get': {
        const result = checkpointGet(db, {
          id: a.id as string
        });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'Checkpoint not found' }] };
      }

      case 'checkpoint_resume': {
        const result = checkpointResume(db, {
          taskId: a.taskId as string,
          checkpointId: a.checkpointId as string | undefined
        });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'No checkpoint found' }] };
      }

      case 'checkpoint_list': {
        const result = checkpointList(db, {
          taskId: a.taskId as string,
          limit: a.limit as number | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'checkpoint_cleanup': {
        const result = checkpointCleanup(db, {
          taskId: a.taskId as string | undefined,
          olderThan: a.olderThan as number | undefined,
          keepLatest: a.keepLatest as number | undefined
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // Validation Tools
      case 'validation_config_get': {
        const validator = getValidator();
        const config = validator.getConfig();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              version: config.version,
              defaultMode: config.defaultMode,
              globalRulesCount: config.globalRules.length,
              typeRules: Object.fromEntries(
                Object.entries(config.typeRules).map(([k, v]) => [k, v.length])
              )
            }, null, 2)
          }]
        };
      }

      case 'validation_rules_list': {
        const validator = getValidator();
        const type = a.type as WorkProductType | undefined;
        const rules = validator.getRulesForType(type || 'global');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              type: type || 'global',
              rules: rules.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                type: r.type,
                severity: r.severity,
                enabled: r.enabled
              }))
            }, null, 2)
          }]
        };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

// Start server
async function main() {
  if (LOG_LEVEL === 'debug') {
    console.error('Task Copilot server starting...');
    console.error(`Project: ${PROJECT_PATH}`);
    console.error(`Workspace ID: ${WORKSPACE_ID || '(auto-generated)'}`);
    console.error(`Workspace ID (actual): ${db.getWorkspaceId()}`);
  }

  // Initialize validation system
  initValidator();

  // Clean up expired checkpoints on startup
  const expiredCount = db.deleteExpiredCheckpoints();
  if (expiredCount > 0 && LOG_LEVEL === 'debug') {
    console.error(`Cleaned up ${expiredCount} expired checkpoints`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (LOG_LEVEL === 'debug') {
    console.error('Task Copilot server running');
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
