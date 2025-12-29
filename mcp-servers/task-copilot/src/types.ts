/**
 * Type definitions for the Task Copilot MCP Server
 */

// Task and PRD status types
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type PrdStatus = 'active' | 'archived' | 'cancelled';
export type WorkProductType = 'technical_design' | 'implementation' | 'test_plan' | 'security_review' | 'documentation' | 'architecture' | 'other';

// Initiative (lightweight reference)
export interface Initiative {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// PRD
export interface Prd {
  id: string;
  initiativeId: string;
  title: string;
  description?: string;
  content: string;
  metadata: Record<string, unknown>;
  status: PrdStatus;
  createdAt: string;
  updatedAt: string;
}

// Task
export interface Task {
  id: string;
  prdId?: string;
  parentId?: string;
  title: string;
  description?: string;
  assignedAgent?: string;
  status: TaskStatus;
  blockedReason?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Work Product
export interface WorkProduct {
  id: string;
  taskId: string;
  type: WorkProductType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Activity Log
export interface ActivityLog {
  id: string;
  initiativeId: string;
  type: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

// Database row types (snake_case for SQLite)
export interface InitiativeRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrdRow {
  id: string;
  initiative_id: string;
  title: string;
  description: string | null;
  content: string;
  metadata: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
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
}

export interface WorkProductRow {
  id: string;
  task_id: string;
  type: string;
  title: string;
  content: string;
  metadata: string;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  initiative_id: string;
  type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

// Tool input schemas
export interface PrdCreateInput {
  title: string;
  description?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface PrdGetInput {
  id: string;
  includeContent?: boolean;
}

export interface PrdListInput {
  initiativeId?: string;
  status?: PrdStatus;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  prdId?: string;
  parentId?: string;
  assignedAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskUpdateInput {
  id: string;
  status?: TaskStatus;
  assignedAgent?: string;
  notes?: string;
  blockedReason?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskGetInput {
  id: string;
  includeSubtasks?: boolean;
  includeWorkProducts?: boolean;
}

export interface TaskListInput {
  prdId?: string;
  parentId?: string;
  status?: TaskStatus;
  assignedAgent?: string;
}

export interface WorkProductStoreInput {
  taskId: string;
  type: WorkProductType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface WorkProductGetInput {
  id: string;
}

export interface WorkProductListInput {
  taskId: string;
}

// Initiative integration tool inputs/outputs
export interface InitiativeLinkInput {
  initiativeId: string;
  title: string;
  description?: string;
}

export interface InitiativeLinkOutput {
  initiativeId: string;
  workspaceCreated: boolean;
  dbPath: string;
}

export interface InitiativeArchiveInput {
  initiativeId?: string;
  archivePath?: string;
}

export interface InitiativeArchiveOutput {
  initiativeId: string;
  archivePath: string;
  prdCount: number;
  taskCount: number;
  workProductCount: number;
  archivedAt: string;
}

export interface InitiativeWipeInput {
  initiativeId?: string;
  confirm: boolean;
}

export interface InitiativeWipeOutput {
  initiativeId: string;
  deletedPrds: number;
  deletedTasks: number;
  deletedWorkProducts: number;
  deletedActivityLogs: number;
}

export interface ProgressSummaryInput {
  initiativeId?: string;
}

export interface ProgressSummaryOutput {
  initiativeId: string;
  title: string;
  prds: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  workProducts: {
    total: number;
    byType: Record<string, number>;
  };
  recentActivity: Array<{
    timestamp: string;
    type: string;
    summary: string;
  }>;
}
