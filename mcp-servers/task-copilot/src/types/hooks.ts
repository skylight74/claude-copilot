/**
 * Lifecycle Hook Types for Task Copilot
 *
 * Defines interfaces for the four lifecycle hook types:
 * - PreToolUseHook: Validate/modify tool calls before execution
 * - PostToolUseHook: Process results after tool execution
 * - UserPromptSubmitHook: Inject context before prompt processing
 * - StopHook: Cleanup on session/task end
 *
 * @see PRD-6df7cc11-c4d4-4f48-9e0c-1275cf6fb327
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Hook priority levels (lower = higher priority)
 */
export type HookPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Hook execution result status
 */
export type HookResultStatus = 'allow' | 'deny' | 'warn' | 'skip';

/**
 * Base interface for all hooks
 */
export interface BaseHook {
  /** Unique identifier for this hook */
  id: string;

  /** Human-readable name */
  name: string;

  /** Optional description */
  description?: string;

  /** Whether the hook is enabled */
  enabled: boolean;

  /** Execution priority (1 = highest, 5 = lowest) */
  priority: HookPriority;

  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;

  /** Tags for grouping/filtering hooks */
  tags?: string[];
}

/**
 * Base execution context shared across all hooks
 */
export interface BaseHookContext {
  /** Task ID if hook is task-scoped */
  taskId?: string;

  /** Initiative ID for the current session */
  initiativeId?: string;

  /** Agent ID executing the hook (me, ta, qa, etc.) */
  agentId?: string;

  /** ISO timestamp when hook was triggered */
  timestamp: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PRE TOOL USE HOOK
// ============================================================================

/**
 * Context provided to PreToolUse hooks
 */
export interface PreToolUseContext extends BaseHookContext {
  /** Name of the tool being called */
  toolName: string;

  /** Arguments being passed to the tool */
  toolArgs: Record<string, unknown>;

  /** File paths involved (extracted from args) */
  filePaths?: string[];

  /** Whether this is a write operation */
  isWriteOperation?: boolean;

  /** Whether this is a command execution */
  isCommandExecution?: boolean;
}

/**
 * Result from PreToolUse hook execution
 */
export interface PreToolUseResult {
  /** Whether to allow the tool call */
  status: HookResultStatus;

  /** Reason for the decision */
  reason?: string;

  /** Modified tool arguments (if transformed) */
  modifiedArgs?: Record<string, unknown>;

  /** Warnings to include in response */
  warnings?: string[];

  /** Severity level for logging */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** Hook execution time in ms */
  executionTime?: number;
}

/**
 * PreToolUse hook - executes before any tool call
 *
 * Use cases:
 * - Permission checks (block write to protected files)
 * - Argument validation/transformation
 * - Secret detection
 * - Rate limiting
 */
export interface PreToolUseHook extends BaseHook {
  type: 'pre_tool_use';

  /**
   * Tool patterns to match (supports glob patterns)
   * Empty array = match all tools
   */
  toolPatterns?: string[];

  /**
   * Handler function for this hook
   */
  handler: (context: PreToolUseContext) => Promise<PreToolUseResult>;
}

// ============================================================================
// POST TOOL USE HOOK
// ============================================================================

/**
 * Context provided to PostToolUse hooks
 */
export interface PostToolUseContext extends BaseHookContext {
  /** Name of the tool that was called */
  toolName: string;

  /** Arguments that were passed */
  toolArgs: Record<string, unknown>;

  /** Result returned by the tool */
  toolResult: unknown;

  /** Whether the tool succeeded */
  success: boolean;

  /** Error if tool failed */
  error?: Error;

  /** Tool execution duration in ms */
  duration: number;
}

/**
 * Result from PostToolUse hook execution
 */
export interface PostToolUseResult {
  /** Whether to continue or halt */
  status: 'continue' | 'halt' | 'retry';

  /** Transformed result (if modifying output) */
  transformedResult?: unknown;

  /** Additional context to inject */
  enrichment?: Record<string, unknown>;

  /** Log entry to record */
  logEntry?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
  };

  /** Hook execution time in ms */
  executionTime?: number;
}

/**
 * PostToolUse hook - executes after any tool call completes
 *
 * Use cases:
 * - Logging tool usage
 * - Result transformation
 * - Error enrichment
 * - Metrics collection
 */
export interface PostToolUseHook extends BaseHook {
  type: 'post_tool_use';

  /**
   * Tool patterns to match (supports glob patterns)
   * Empty array = match all tools
   */
  toolPatterns?: string[];

  /**
   * Whether to trigger only on errors
   */
  onErrorOnly?: boolean;

  /**
   * Handler function for this hook
   */
  handler: (context: PostToolUseContext) => Promise<PostToolUseResult>;
}

// ============================================================================
// USER PROMPT SUBMIT HOOK
// ============================================================================

/**
 * Context provided to UserPromptSubmit hooks
 */
export interface UserPromptSubmitContext extends BaseHookContext {
  /** The raw user prompt text */
  promptText: string;

  /** Detected intent category (if available) */
  detectedIntent?: 'question' | 'command' | 'correction' | 'request' | 'other';

  /** Files mentioned in the prompt */
  mentionedFiles?: string[];

  /** Skills potentially relevant (from auto-detection) */
  suggestedSkills?: Array<{
    name: string;
    confidence: number;
  }>;

  /** Whether this is a continuation prompt */
  isContinuation?: boolean;

  /** Command being invoked (if /command syntax) */
  command?: string;
}

/**
 * Result from UserPromptSubmit hook execution
 */
export interface UserPromptSubmitResult {
  /** Whether to proceed with prompt processing */
  status: 'proceed' | 'block' | 'redirect';

  /** Context to inject before prompt */
  contextInjection?: string;

  /** Skills to load for this prompt */
  skillsToLoad?: string[];

  /** Redirect target (if status = redirect) */
  redirectTo?: string;

  /** Message to user (if blocking or redirecting) */
  userMessage?: string;

  /** Hook execution time in ms */
  executionTime?: number;
}

/**
 * UserPromptSubmit hook - executes before prompt processing begins
 *
 * Use cases:
 * - Context injection from skills
 * - Skill auto-loading triggers
 * - Correction pattern detection
 * - Command preprocessing
 */
export interface UserPromptSubmitHook extends BaseHook {
  type: 'user_prompt_submit';

  /**
   * Patterns to match in prompt text (regex)
   * Empty array = match all prompts
   */
  promptPatterns?: string[];

  /**
   * Commands to match (e.g., ['/protocol', '/continue'])
   */
  commandPatterns?: string[];

  /**
   * Handler function for this hook
   */
  handler: (context: UserPromptSubmitContext) => Promise<UserPromptSubmitResult>;
}

// ============================================================================
// STOP HOOK
// ============================================================================

/**
 * Trigger conditions for stop hook
 */
export type StopTrigger =
  | 'session_end'      // User ends session
  | 'task_complete'    // Task marked complete
  | 'task_blocked'     // Task blocked
  | 'error'            // Unhandled error
  | 'timeout'          // Session timeout
  | 'user_interrupt'   // User Ctrl+C
  | 'context_limit';   // Context approaching limit

/**
 * Context provided to Stop hooks
 */
export interface StopContext extends BaseHookContext {
  /** What triggered the stop */
  trigger: StopTrigger;

  /** Task state at stop (if task-scoped) */
  taskState?: {
    id: string;
    status: string;
    notes?: string;
  };

  /** Files modified during session */
  modifiedFiles?: string[];

  /** Work products created */
  workProductIds?: string[];

  /** Error details (if error triggered stop) */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  /** Session duration in ms */
  sessionDuration?: number;
}

/**
 * Result from Stop hook execution
 */
export interface StopResult {
  /** Whether cleanup succeeded */
  success: boolean;

  /** Actions performed */
  actionsPerformed?: Array<{
    action: string;
    success: boolean;
    message?: string;
  }>;

  /** State to persist for resume */
  persistedState?: Record<string, unknown>;

  /** Audit log entry */
  auditEntry?: {
    summary: string;
    details?: Record<string, unknown>;
  };

  /** Hook execution time in ms */
  executionTime?: number;
}

/**
 * Stop hook - executes on session or task end
 *
 * Use cases:
 * - State persistence for resume
 * - Cleanup temporary resources
 * - Audit logging
 * - Checkpoint creation
 */
export interface StopHook extends BaseHook {
  type: 'stop';

  /**
   * Triggers that activate this hook
   */
  triggers: StopTrigger[];

  /**
   * Whether to run even if other hooks fail
   */
  runOnFailure?: boolean;

  /**
   * Handler function for this hook
   */
  handler: (context: StopContext) => Promise<StopResult>;
}

// ============================================================================
// UNION TYPES
// ============================================================================

/**
 * Union type for all hook types
 */
export type LifecycleHook =
  | PreToolUseHook
  | PostToolUseHook
  | UserPromptSubmitHook
  | StopHook;

/**
 * Union type for all hook contexts
 */
export type HookContext =
  | PreToolUseContext
  | PostToolUseContext
  | UserPromptSubmitContext
  | StopContext;

/**
 * Union type for all hook results
 */
export type HookResult =
  | PreToolUseResult
  | PostToolUseResult
  | UserPromptSubmitResult
  | StopResult;

/**
 * Hook type discriminator
 */
export type HookType = 'pre_tool_use' | 'post_tool_use' | 'user_prompt_submit' | 'stop';

// ============================================================================
// REGISTRATION TYPES
// ============================================================================

/**
 * Input for registering a hook
 */
export interface HookRegistrationInput {
  /** Hook configuration */
  hook: LifecycleHook;

  /** Scope of the hook */
  scope: 'global' | 'agent' | 'task';

  /** Agent ID (if agent-scoped) */
  agentId?: string;

  /** Task ID (if task-scoped) */
  taskId?: string;
}

/**
 * Output from hook registration
 */
export interface HookRegistrationOutput {
  /** Generated or provided hook ID */
  hookId: string;

  /** Registration timestamp */
  registeredAt: string;

  /** Scope applied */
  scope: 'global' | 'agent' | 'task';

  /** Whether hook is active */
  active: boolean;
}

/**
 * Hook execution report (for debugging/metrics)
 */
export interface HookExecutionReport {
  /** Hook that was executed */
  hookId: string;

  /** Hook type */
  hookType: HookType;

  /** Whether execution succeeded */
  success: boolean;

  /** Execution duration in ms */
  duration: number;

  /** Result returned */
  result: HookResult;

  /** Error if failed */
  error?: string;

  /** Timestamp */
  timestamp: string;
}
