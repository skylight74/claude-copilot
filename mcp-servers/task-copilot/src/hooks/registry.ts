/**
 * Hook Registry System for Task Copilot
 *
 * Manages registration, unregistration, and execution of lifecycle hooks.
 * Supports priority ordering, async execution, and timeout handling.
 *
 * @see types/hooks.ts for hook type definitions
 * @see PRD-6df7cc11-c4d4-4f48-9e0c-1275cf6fb327
 */

import type {
  LifecycleHook,
  PreToolUseHook,
  PostToolUseHook,
  UserPromptSubmitHook,
  StopHook,
  HookType,
  HookPriority,
  PreToolUseContext,
  PostToolUseContext,
  UserPromptSubmitContext,
  StopContext,
  PreToolUseResult,
  PostToolUseResult,
  UserPromptSubmitResult,
  StopResult,
  HookRegistrationInput,
  HookRegistrationOutput,
  HookExecutionReport,
} from '../types/hooks.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT = 5000; // 5 seconds
const MAX_HOOKS_PER_TYPE = 100;

// ============================================================================
// REGISTRY STATE
// ============================================================================

interface HookEntry<T extends LifecycleHook = LifecycleHook> {
  hook: T;
  scope: 'global' | 'agent' | 'task';
  agentId?: string;
  taskId?: string;
  registeredAt: string;
}

/**
 * Internal registry state
 */
class HookRegistryState {
  private preToolUseHooks: Map<string, HookEntry<PreToolUseHook>> = new Map();
  private postToolUseHooks: Map<string, HookEntry<PostToolUseHook>> = new Map();
  private userPromptSubmitHooks: Map<string, HookEntry<UserPromptSubmitHook>> = new Map();
  private stopHooks: Map<string, HookEntry<StopHook>> = new Map();

  private getMapForType(type: HookType): Map<string, HookEntry> {
    switch (type) {
      case 'pre_tool_use':
        return this.preToolUseHooks as Map<string, HookEntry>;
      case 'post_tool_use':
        return this.postToolUseHooks as Map<string, HookEntry>;
      case 'user_prompt_submit':
        return this.userPromptSubmitHooks as Map<string, HookEntry>;
      case 'stop':
        return this.stopHooks as Map<string, HookEntry>;
    }
  }

  register<T extends LifecycleHook>(entry: HookEntry<T>): void {
    const map = this.getMapForType(entry.hook.type);
    if (map.size >= MAX_HOOKS_PER_TYPE) {
      throw new Error(`Maximum hooks (${MAX_HOOKS_PER_TYPE}) reached for type ${entry.hook.type}`);
    }
    map.set(entry.hook.id, entry as HookEntry);
  }

  unregister(hookId: string, type: HookType): boolean {
    const map = this.getMapForType(type);
    return map.delete(hookId);
  }

  get<T extends LifecycleHook>(hookId: string, type: HookType): HookEntry<T> | undefined {
    const map = this.getMapForType(type);
    return map.get(hookId) as HookEntry<T> | undefined;
  }

  getAll<T extends LifecycleHook>(type: HookType): HookEntry<T>[] {
    const map = this.getMapForType(type);
    return Array.from(map.values()) as HookEntry<T>[];
  }

  clear(type?: HookType): void {
    if (type) {
      const map = this.getMapForType(type);
      map.clear();
    } else {
      this.preToolUseHooks.clear();
      this.postToolUseHooks.clear();
      this.userPromptSubmitHooks.clear();
      this.stopHooks.clear();
    }
  }

  size(type: HookType): number {
    return this.getMapForType(type).size;
  }
}

// Singleton instance
const registryState = new HookRegistryState();

// ============================================================================
// REGISTRATION FUNCTIONS
// ============================================================================

/**
 * Generate a unique hook ID if not provided
 */
function generateHookId(type: HookType): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}-${timestamp}-${random}`;
}

/**
 * Register a lifecycle hook
 */
export function registerHook(input: HookRegistrationInput): HookRegistrationOutput {
  const { hook, scope, agentId, taskId } = input;

  // Ensure hook has an ID
  if (!hook.id) {
    hook.id = generateHookId(hook.type);
  }

  const entry: HookEntry = {
    hook,
    scope,
    agentId,
    taskId,
    registeredAt: new Date().toISOString(),
  };

  registryState.register(entry);

  return {
    hookId: hook.id,
    registeredAt: entry.registeredAt,
    scope,
    active: hook.enabled,
  };
}

/**
 * Unregister a hook by ID
 */
export function unregisterHook(hookId: string, type: HookType): boolean {
  return registryState.unregister(hookId, type);
}

/**
 * Get a specific hook by ID
 */
export function getHook<T extends LifecycleHook>(hookId: string, type: HookType): T | undefined {
  const entry = registryState.get<T>(hookId, type);
  return entry?.hook;
}

/**
 * Get all hooks of a specific type
 */
export function getHooks<T extends LifecycleHook>(type: HookType): T[] {
  return registryState.getAll<T>(type).map((entry) => entry.hook);
}

/**
 * Enable or disable a hook
 */
export function toggleHook(hookId: string, type: HookType, enabled: boolean): boolean {
  const entry = registryState.get(hookId, type);
  if (!entry) return false;

  entry.hook.enabled = enabled;
  return true;
}

/**
 * Clear all hooks (optionally by type)
 */
export function clearHooks(type?: HookType): void {
  registryState.clear(type);
}

/**
 * Get count of registered hooks
 */
export function getHookCount(type: HookType): number {
  return registryState.size(type);
}

// ============================================================================
// FILTERING & SORTING
// ============================================================================

/**
 * Filter hooks by scope
 */
function filterByScope<T extends LifecycleHook>(
  entries: HookEntry<T>[],
  options: { agentId?: string; taskId?: string }
): HookEntry<T>[] {
  return entries.filter((entry) => {
    // Global hooks always apply
    if (entry.scope === 'global') return true;

    // Agent-scoped hooks apply if agentId matches
    if (entry.scope === 'agent' && options.agentId) {
      return entry.agentId === options.agentId;
    }

    // Task-scoped hooks apply if taskId matches
    if (entry.scope === 'task' && options.taskId) {
      return entry.taskId === options.taskId;
    }

    return false;
  });
}

/**
 * Sort hooks by priority (lower number = higher priority)
 */
function sortByPriority<T extends LifecycleHook>(hooks: T[]): T[] {
  return [...hooks].sort((a, b) => (a.priority || 3) - (b.priority || 3));
}

/**
 * Get applicable hooks sorted by priority
 */
function getApplicableHooks<T extends LifecycleHook>(
  type: HookType,
  options: { agentId?: string; taskId?: string }
): T[] {
  const entries = registryState.getAll<T>(type);
  const filtered = filterByScope(entries, options);
  const enabledHooks = filtered.filter((entry) => entry.hook.enabled).map((entry) => entry.hook);
  return sortByPriority(enabledHooks);
}

// ============================================================================
// EXECUTION HELPERS
// ============================================================================

/**
 * Execute a hook with timeout handling
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<{ result: T; timedOut: false } | { result: null; timedOut: true }> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<{ result: null; timedOut: true }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ result: null, timedOut: true });
    }, timeout);
  });

  const resultPromise = fn().then((result) => ({ result, timedOut: false as const }));

  const outcome = await Promise.race([resultPromise, timeoutPromise]);
  clearTimeout(timeoutId!);
  return outcome;
}

/**
 * Match tool name against patterns
 */
function matchesToolPattern(toolName: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;

  return patterns.some((pattern) => {
    // Simple glob support: * matches any characters
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(toolName);
  });
}

/**
 * Match prompt against patterns
 */
function matchesPromptPattern(prompt: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;

  return patterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(prompt);
    } catch {
      return false;
    }
  });
}

// ============================================================================
// EXECUTION FUNCTIONS
// ============================================================================

/**
 * Execute all applicable PreToolUse hooks
 */
export async function executePreToolUseHooks(
  context: PreToolUseContext
): Promise<{
  allowed: boolean;
  results: PreToolUseResult[];
  reports: HookExecutionReport[];
}> {
  const hooks = getApplicableHooks<PreToolUseHook>('pre_tool_use', {
    agentId: context.agentId,
    taskId: context.taskId,
  });

  const results: PreToolUseResult[] = [];
  const reports: HookExecutionReport[] = [];
  let allowed = true;

  for (const hook of hooks) {
    // Check tool pattern match
    if (!matchesToolPattern(context.toolName, hook.toolPatterns)) {
      continue;
    }

    const startTime = Date.now();
    const timeout = hook.timeout || DEFAULT_TIMEOUT;

    try {
      const outcome = await executeWithTimeout(() => hook.handler(context), timeout);

      if (outcome.timedOut) {
        const result: PreToolUseResult = {
          status: 'warn',
          reason: `Hook ${hook.id} timed out after ${timeout}ms`,
          executionTime: timeout,
        };
        results.push(result);
        reports.push({
          hookId: hook.id,
          hookType: 'pre_tool_use',
          success: false,
          duration: timeout,
          result,
          error: 'Timeout',
          timestamp: new Date().toISOString(),
        });
      } else {
        const result = outcome.result;
        result.executionTime = Date.now() - startTime;
        results.push(result);

        if (result.status === 'deny') {
          allowed = false;
        }

        reports.push({
          hookId: hook.id,
          hookType: 'pre_tool_use',
          success: true,
          duration: result.executionTime,
          result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const result: PreToolUseResult = {
        status: 'warn',
        reason: `Hook ${hook.id} error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
      };
      results.push(result);
      reports.push({
        hookId: hook.id,
        hookType: 'pre_tool_use',
        success: false,
        duration: result.executionTime!,
        result,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    // Stop early if denied
    if (!allowed) break;
  }

  return { allowed, results, reports };
}

/**
 * Execute all applicable PostToolUse hooks
 */
export async function executePostToolUseHooks(
  context: PostToolUseContext
): Promise<{
  results: PostToolUseResult[];
  reports: HookExecutionReport[];
}> {
  const hooks = getApplicableHooks<PostToolUseHook>('post_tool_use', {
    agentId: context.agentId,
    taskId: context.taskId,
  });

  const results: PostToolUseResult[] = [];
  const reports: HookExecutionReport[] = [];

  for (const hook of hooks) {
    // Check tool pattern match
    if (!matchesToolPattern(context.toolName, hook.toolPatterns)) {
      continue;
    }

    // Check error-only filter
    if (hook.onErrorOnly && context.success) {
      continue;
    }

    const startTime = Date.now();
    const timeout = hook.timeout || DEFAULT_TIMEOUT;

    try {
      const outcome = await executeWithTimeout(() => hook.handler(context), timeout);

      if (outcome.timedOut) {
        const result: PostToolUseResult = {
          status: 'continue',
          executionTime: timeout,
        };
        results.push(result);
        reports.push({
          hookId: hook.id,
          hookType: 'post_tool_use',
          success: false,
          duration: timeout,
          result,
          error: 'Timeout',
          timestamp: new Date().toISOString(),
        });
      } else {
        const result = outcome.result;
        result.executionTime = Date.now() - startTime;
        results.push(result);
        reports.push({
          hookId: hook.id,
          hookType: 'post_tool_use',
          success: true,
          duration: result.executionTime,
          result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const result: PostToolUseResult = {
        status: 'continue',
        executionTime: Date.now() - startTime,
      };
      results.push(result);
      reports.push({
        hookId: hook.id,
        hookType: 'post_tool_use',
        success: false,
        duration: result.executionTime!,
        result,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { results, reports };
}

/**
 * Execute all applicable UserPromptSubmit hooks
 */
export async function executeUserPromptSubmitHooks(
  context: UserPromptSubmitContext
): Promise<{
  proceed: boolean;
  contextInjections: string[];
  skillsToLoad: string[];
  results: UserPromptSubmitResult[];
  reports: HookExecutionReport[];
}> {
  const hooks = getApplicableHooks<UserPromptSubmitHook>('user_prompt_submit', {
    agentId: context.agentId,
    taskId: context.taskId,
  });

  const results: UserPromptSubmitResult[] = [];
  const reports: HookExecutionReport[] = [];
  const contextInjections: string[] = [];
  const skillsToLoad: Set<string> = new Set();
  let proceed = true;

  for (const hook of hooks) {
    // Check prompt pattern match
    if (!matchesPromptPattern(context.promptText, hook.promptPatterns)) {
      continue;
    }

    // Check command pattern match
    if (hook.commandPatterns && hook.commandPatterns.length > 0) {
      if (!context.command || !hook.commandPatterns.includes(context.command)) {
        continue;
      }
    }

    const startTime = Date.now();
    const timeout = hook.timeout || DEFAULT_TIMEOUT;

    try {
      const outcome = await executeWithTimeout(() => hook.handler(context), timeout);

      if (outcome.timedOut) {
        const result: UserPromptSubmitResult = {
          status: 'proceed',
          executionTime: timeout,
        };
        results.push(result);
        reports.push({
          hookId: hook.id,
          hookType: 'user_prompt_submit',
          success: false,
          duration: timeout,
          result,
          error: 'Timeout',
          timestamp: new Date().toISOString(),
        });
      } else {
        const result = outcome.result;
        result.executionTime = Date.now() - startTime;
        results.push(result);

        // Collect injections and skills
        if (result.contextInjection) {
          contextInjections.push(result.contextInjection);
        }
        if (result.skillsToLoad) {
          result.skillsToLoad.forEach((s) => skillsToLoad.add(s));
        }
        if (result.status === 'block' || result.status === 'redirect') {
          proceed = false;
        }

        reports.push({
          hookId: hook.id,
          hookType: 'user_prompt_submit',
          success: true,
          duration: result.executionTime,
          result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const result: UserPromptSubmitResult = {
        status: 'proceed',
        executionTime: Date.now() - startTime,
      };
      results.push(result);
      reports.push({
        hookId: hook.id,
        hookType: 'user_prompt_submit',
        success: false,
        duration: result.executionTime!,
        result,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return {
    proceed,
    contextInjections,
    skillsToLoad: Array.from(skillsToLoad),
    results,
    reports,
  };
}

/**
 * Execute all applicable Stop hooks
 */
export async function executeStopHooks(
  context: StopContext
): Promise<{
  results: StopResult[];
  reports: HookExecutionReport[];
}> {
  const hooks = getApplicableHooks<StopHook>('stop', {
    agentId: context.agentId,
    taskId: context.taskId,
  });

  const results: StopResult[] = [];
  const reports: HookExecutionReport[] = [];

  // Filter hooks by trigger
  const applicableHooks = hooks.filter(
    (hook) => hook.triggers.includes(context.trigger)
  );

  for (const hook of applicableHooks) {
    const startTime = Date.now();
    const timeout = hook.timeout || DEFAULT_TIMEOUT;

    try {
      const outcome = await executeWithTimeout(() => hook.handler(context), timeout);

      if (outcome.timedOut) {
        const result: StopResult = {
          success: false,
          executionTime: timeout,
        };
        results.push(result);
        reports.push({
          hookId: hook.id,
          hookType: 'stop',
          success: false,
          duration: timeout,
          result,
          error: 'Timeout',
          timestamp: new Date().toISOString(),
        });
      } else {
        const result = outcome.result;
        result.executionTime = Date.now() - startTime;
        results.push(result);
        reports.push({
          hookId: hook.id,
          hookType: 'stop',
          success: result.success,
          duration: result.executionTime,
          result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const result: StopResult = {
        success: false,
        executionTime: Date.now() - startTime,
      };
      results.push(result);
      reports.push({
        hookId: hook.id,
        hookType: 'stop',
        success: false,
        duration: result.executionTime!,
        result,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Only continue on failure if hook specifies runOnFailure
      if (!hook.runOnFailure) {
        continue;
      }
    }
  }

  return { results, reports };
}

// ============================================================================
// REGISTRY INFO
// ============================================================================

/**
 * Get registry statistics
 */
export function getRegistryStats(): {
  preToolUse: number;
  postToolUse: number;
  userPromptSubmit: number;
  stop: number;
  total: number;
} {
  return {
    preToolUse: registryState.size('pre_tool_use'),
    postToolUse: registryState.size('post_tool_use'),
    userPromptSubmit: registryState.size('user_prompt_submit'),
    stop: registryState.size('stop'),
    total:
      registryState.size('pre_tool_use') +
      registryState.size('post_tool_use') +
      registryState.size('user_prompt_submit') +
      registryState.size('stop'),
  };
}

/**
 * List all registered hooks (for debugging)
 */
export function listAllHooks(): {
  type: HookType;
  id: string;
  name: string;
  enabled: boolean;
  priority: HookPriority;
  scope: 'global' | 'agent' | 'task';
}[] {
  const result: {
    type: HookType;
    id: string;
    name: string;
    enabled: boolean;
    priority: HookPriority;
    scope: 'global' | 'agent' | 'task';
  }[] = [];

  const types: HookType[] = ['pre_tool_use', 'post_tool_use', 'user_prompt_submit', 'stop'];

  for (const type of types) {
    const entries = registryState.getAll(type);
    for (const entry of entries) {
      result.push({
        type,
        id: entry.hook.id,
        name: entry.hook.name,
        enabled: entry.hook.enabled,
        priority: entry.hook.priority || 3,
        scope: entry.scope,
      });
    }
  }

  return result;
}
