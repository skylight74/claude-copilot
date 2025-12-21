/**
 * Type definitions for the Copilot Memory MCP Server
 */

// Memory types
export type MemoryType = 'decision' | 'lesson' | 'discussion' | 'file' | 'initiative' | 'context';

export type InitiativeStatus = 'NOT STARTED' | 'IN PROGRESS' | 'BLOCKED' | 'READY FOR REVIEW' | 'COMPLETE';

// Memory record
export interface Memory {
  id: string;
  projectId: string;
  content: string;
  type: MemoryType;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
}

// Memory with search distance
export interface MemorySearchResult extends Memory {
  distance: number;
}

// Initiative record
export interface Initiative {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  status: InitiativeStatus;
  completed: string[];
  inProgress: string[];
  blocked: string[];
  decisions: string[];
  lessons: string[];
  keyFiles: string[];
  resumeInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

// Session record
export interface Session {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt?: string;
  summary?: string;
}

// Tool input schemas
export interface MemoryStoreInput {
  content: string;
  type: MemoryType;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryUpdateInput {
  id: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryListInput {
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface MemorySearchInput {
  query: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
}

export interface InitiativeStartInput {
  name: string;
  goal?: string;
  status?: InitiativeStatus;
}

export interface InitiativeUpdateInput {
  completed?: string[];
  inProgress?: string[];
  blocked?: string[];
  decisions?: string[];
  lessons?: string[];
  keyFiles?: string[];
  resumeInstructions?: string;
  status?: InitiativeStatus;
}

// Database row types (snake_case for SQLite)
export interface MemoryRow {
  id: string;
  project_id: string;
  content: string;
  type: string;
  tags: string;
  metadata: string;
  created_at: string;
  updated_at: string;
  session_id: string | null;
}

export interface InitiativeRow {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: string;
  completed: string;
  in_progress: string;
  blocked: string;
  decisions: string;
  lessons: string;
  key_files: string;
  resume_instructions: string | null;
  created_at: string;
  updated_at: string;
}

// Embedding vector
export type EmbeddingVector = Float32Array;

// Configuration
export interface ServerConfig {
  memoryPath: string;
  embeddingProvider: 'local' | 'voyage' | 'openai';
  embeddingApiKey?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
