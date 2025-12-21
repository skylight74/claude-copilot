/**
 * SQLite schema definitions for the Copilot Memory server
 * Uses sqlite-vec for vector similarity search
 */

export const SCHEMA_SQL = `
-- Core memory table
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('decision', 'lesson', 'discussion', 'file', 'initiative', 'context')),
  tags TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  session_id TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(project_id, type);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(project_id, created_at DESC);

-- Current initiative state (one per project)
CREATE TABLE IF NOT EXISTS initiatives (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT DEFAULT 'IN PROGRESS' CHECK(status IN ('NOT STARTED', 'IN PROGRESS', 'BLOCKED', 'READY FOR REVIEW', 'COMPLETE')),
  completed TEXT DEFAULT '[]',
  in_progress TEXT DEFAULT '[]',
  blocked TEXT DEFAULT '[]',
  decisions TEXT DEFAULT '[]',
  lessons TEXT DEFAULT '[]',
  key_files TEXT DEFAULT '[]',
  resume_instructions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Session tracking
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, started_at DESC);

-- Archived initiatives
CREATE TABLE IF NOT EXISTS initiatives_archive (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT,
  completed TEXT,
  in_progress TEXT,
  blocked TEXT,
  decisions TEXT,
  lessons TEXT,
  key_files TEXT,
  resume_instructions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NOT NULL
);

-- Full-text search on memory content
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content,
  tags,
  content=memories,
  content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES('delete', old.rowid, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES('delete', old.rowid, old.content, old.tags);
  INSERT INTO memories_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
END;
`;

// Vector table creation (separate because sqlite-vec uses different syntax)
export const VECTOR_SCHEMA_SQL = `
-- Vector embeddings for semantic search
-- sqlite-vec virtual table with 384-dimension vectors (all-MiniLM-L6-v2)
CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
  memory_id TEXT PRIMARY KEY,
  embedding FLOAT[384]
);
`;

// Migration version tracking
export const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

export const CURRENT_VERSION = 1;
