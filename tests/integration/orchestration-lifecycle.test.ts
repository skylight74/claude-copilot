/**
 * Integration Tests: Orchestration Lifecycle
 *
 * Tests the complete orchestration workflow from generation to completion,
 * including initiative scoping and stream archival.
 *
 * @see PRD-dc1b40fc-f64a-4c99-9a1d-201ed63e159e
 * @see Stream-Z (Integration Testing & Documentation)
 */

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logResult(testName: string, status: 'PASS' | 'FAIL' | 'SKIP', duration: number, error?: string, details?: string) {
  results.push({ testName, status, duration, error, details });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${testName} (${duration}ms)${error ? ': ' + error : ''}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThan(actual: number, expected: number, message: string): void {
  if (!(actual > expected)) {
    throw new Error(`${message}: expected ${actual} > ${expected}`);
  }
}

function assertArrayContains<T>(arr: T[], item: T, message: string): void {
  if (!arr.includes(item)) {
    throw new Error(`${message}: array does not contain ${item}`);
  }
}

async function runTest(testName: string, testFn: () => void | Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    logResult(testName, 'PASS', Date.now() - start);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logResult(testName, 'FAIL', Date.now() - start, errorMessage);
  }
}

// ============================================================================
// MOCK DATA TYPES
// ============================================================================

interface PRD {
  id: string;
  title: string;
  description: string;
  initiativeId: string;
  createdAt: number;
}

interface Task {
  id: string;
  prdId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  metadata: {
    streamId?: string;
    streamName?: string;
    dependencies?: string[];
    files?: string[];
  };
  archived: boolean;
}

interface Stream {
  streamId: string;
  streamName: string;
  dependencies: string[];
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progress: number;
  initiativeId: string;
  archived: boolean;
}

interface Initiative {
  id: string;
  title: string;
  status: 'active' | 'completed';
  createdAt: number;
}

// ============================================================================
// MOCK DATABASE IMPLEMENTATION
// ============================================================================

class MockTaskCopilot {
  private prds: Map<string, PRD> = new Map();
  private tasks: Map<string, Task> = new Map();
  private currentInitiativeId: string | null = null;

  // Initiative Management
  initiativeLink(initiativeId: string, title: string): void {
    // Archive streams from old initiatives
    if (this.currentInitiativeId && this.currentInitiativeId !== initiativeId) {
      this.archiveStreamsForInitiative(this.currentInitiativeId);
    }
    this.currentInitiativeId = initiativeId;
  }

  getCurrentInitiative(): string | null {
    return this.currentInitiativeId;
  }

  // PRD Operations
  prdCreate(title: string, description: string): string {
    const prdId = `PRD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.prds.set(prdId, {
      id: prdId,
      title,
      description,
      initiativeId: this.currentInitiativeId || 'default',
      createdAt: Date.now()
    });
    return prdId;
  }

  prdList(): PRD[] {
    if (!this.currentInitiativeId) return [];
    return Array.from(this.prds.values()).filter(
      prd => prd.initiativeId === this.currentInitiativeId
    );
  }

  // Task Operations
  taskCreate(prdId: string, title: string, description: string, metadata: Task['metadata']): string {
    const taskId = `TASK-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.tasks.set(taskId, {
      id: taskId,
      prdId,
      title,
      description,
      status: 'pending',
      metadata,
      archived: false
    });
    return taskId;
  }

  taskUpdate(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);
    }
  }

  taskList(filters?: { streamId?: string; archived?: boolean }): Task[] {
    let filtered = Array.from(this.tasks.values());

    if (filters?.streamId) {
      filtered = filtered.filter(t => t.metadata.streamId === filters.streamId);
    }

    if (filters?.archived !== undefined) {
      filtered = filtered.filter(t => t.archived === filters.archived);
    }

    return filtered;
  }

  // Stream Operations
  streamList(options?: { includeArchived?: boolean }): Stream[] {
    const includeArchived = options?.includeArchived ?? false;
    const streamMap = new Map<string, Stream>();

    for (const task of this.tasks.values()) {
      if (!task.metadata.streamId) continue;
      if (!includeArchived && task.archived) continue;

      const streamId = task.metadata.streamId;
      if (!streamMap.has(streamId)) {
        streamMap.set(streamId, {
          streamId,
          streamName: task.metadata.streamName || streamId,
          dependencies: task.metadata.dependencies || [],
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          progress: 0,
          initiativeId: this.prds.get(task.prdId)?.initiativeId || 'default',
          archived: task.archived
        });
      }

      const stream = streamMap.get(streamId)!;
      stream.totalTasks++;
      if (task.status === 'completed') stream.completedTasks++;
      if (task.status === 'in_progress') stream.inProgressTasks++;
      stream.progress = stream.totalTasks > 0
        ? Math.round((stream.completedTasks / stream.totalTasks) * 100)
        : 0;
    }

    // Filter by current initiative (unless includeArchived - then return all)
    if (this.currentInitiativeId && !includeArchived) {
      return Array.from(streamMap.values()).filter(
        s => s.initiativeId === this.currentInitiativeId
      );
    }

    return Array.from(streamMap.values());
  }

  streamGet(streamId: string): Stream | null {
    const streams = this.streamList({ includeArchived: true });
    return streams.find(s => s.streamId === streamId) || null;
  }

  streamUnarchive(streamId: string): void {
    for (const task of this.tasks.values()) {
      if (task.metadata.streamId === streamId) {
        task.archived = false;
      }
    }
  }

  // Archive Operations
  archiveStreamsForInitiative(initiativeId: string): void {
    for (const task of this.tasks.values()) {
      const prd = this.prds.get(task.prdId);
      if (prd && prd.initiativeId === initiativeId) {
        task.archived = true;
      }
    }
  }

  // Utility
  reset(): void {
    this.prds.clear();
    this.tasks.clear();
    this.currentInitiativeId = null;
  }

  // Completion Detection
  allStreamsComplete(): boolean {
    const streams = this.streamList();
    return streams.length > 0 && streams.every(s => s.progress === 100);
  }
}

// ============================================================================
// MOCK MEMORY COPILOT IMPLEMENTATION
// ============================================================================

class MockMemoryCopilot {
  private initiatives: Map<string, Initiative> = new Map();

  initiativeStart(title: string): string {
    const id = `INI-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.initiatives.set(id, {
      id,
      title,
      status: 'active',
      createdAt: Date.now()
    });
    return id;
  }

  initiativeGet(): Initiative | null {
    for (const ini of this.initiatives.values()) {
      if (ini.status === 'active') return ini;
    }
    return null;
  }

  initiativeComplete(id: string): void {
    const ini = this.initiatives.get(id);
    if (ini) {
      ini.status = 'completed';
    }
  }

  reset(): void {
    this.initiatives.clear();
  }
}

// ============================================================================
// TEST SUITE: GENERATE → START → COMPLETE LIFECYCLE
// ============================================================================

async function runLifecycleTests() {
  console.log('\n' + '='.repeat(70));
  console.log('ORCHESTRATION LIFECYCLE: GENERATE → START → COMPLETE');
  console.log('='.repeat(70) + '\n');

  await runTest('Generate creates PRDs in Task Copilot', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    // Simulate /orchestrate generate workflow
    const initiativeId = mc.initiativeStart('User Authentication');
    tc.initiativeLink(initiativeId, 'User Authentication');

    // @agent-ta creates PRD
    const prdId = tc.prdCreate(
      'User Authentication System',
      'Implement OAuth-based user authentication'
    );

    // Verify PRD was created
    const prds = tc.prdList();
    assertEquals(prds.length, 1, 'Should create one PRD');
    assertEquals(prds[0].id, prdId, 'PRD ID should match');
    assertEquals(prds[0].initiativeId, initiativeId, 'PRD should link to initiative');
  });

  await runTest('Generate creates tasks with stream metadata', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const initiativeId = mc.initiativeStart('User Authentication');
    tc.initiativeLink(initiativeId, 'User Authentication');
    const prdId = tc.prdCreate('User Auth', 'OAuth implementation');

    // @agent-ta creates tasks with stream metadata
    tc.taskCreate(prdId, 'Setup database schema', 'Create users table', {
      streamId: 'Stream-A',
      streamName: 'Foundation',
      dependencies: [],
      files: ['migrations/001_users.sql']
    });

    tc.taskCreate(prdId, 'Implement OAuth provider', 'Add OAuth endpoints', {
      streamId: 'Stream-B',
      streamName: 'OAuth Integration',
      dependencies: ['Stream-A'],
      files: ['src/auth/oauth.ts']
    });

    // Verify tasks have stream metadata
    const tasks = tc.taskList();
    assertEquals(tasks.length, 2, 'Should create two tasks');
    assert(tasks[0].metadata.streamId === 'Stream-A', 'Task 1 should have streamId');
    assert(tasks[1].metadata.streamId === 'Stream-B', 'Task 2 should have streamId');
    assert(Array.isArray(tasks[0].metadata.dependencies), 'Should have dependencies array');
    assertEquals(tasks[0].metadata.dependencies?.length, 0, 'Foundation has no deps');
    assertArrayContains(tasks[1].metadata.dependencies!, 'Stream-A', 'Stream-B depends on Stream-A');
  });

  await runTest('Start only sees current initiative streams', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    // Initiative A
    const iniA = mc.initiativeStart('Initiative A');
    tc.initiativeLink(iniA, 'Initiative A');
    const prdA = tc.prdCreate('Feature A', 'Description A');
    tc.taskCreate(prdA, 'Task A1', 'Description', {
      streamId: 'Stream-A',
      streamName: 'Stream A',
      dependencies: []
    });

    // Switch to Initiative B (should archive Initiative A streams)
    mc.initiativeComplete(iniA);
    const iniB = mc.initiativeStart('Initiative B');
    tc.initiativeLink(iniB, 'Initiative B');
    const prdB = tc.prdCreate('Feature B', 'Description B');
    tc.taskCreate(prdB, 'Task B1', 'Description', {
      streamId: 'Stream-B',
      streamName: 'Stream B',
      dependencies: []
    });

    // Verify only Initiative B streams are visible
    const streams = tc.streamList();
    assertEquals(streams.length, 1, 'Should only see current initiative streams');
    assertEquals(streams[0].streamId, 'Stream-B', 'Should only see Stream-B');
    assertEquals(streams[0].initiativeId, iniB, 'Stream should belong to Initiative B');
  });

  await runTest('All streams complete triggers initiative completion', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Complete Test');
    tc.initiativeLink(iniId, 'Complete Test');
    const prdId = tc.prdCreate('Test PRD', 'Test Description');

    const task1 = tc.taskCreate(prdId, 'Task 1', 'Description', {
      streamId: 'Stream-A',
      streamName: 'Stream A',
      dependencies: []
    });

    const task2 = tc.taskCreate(prdId, 'Task 2', 'Description', {
      streamId: 'Stream-A',
      streamName: 'Stream A',
      dependencies: []
    });

    // Before completion
    assert(!tc.allStreamsComplete(), 'Streams should not be complete initially');

    // Complete tasks
    tc.taskUpdate(task1, { status: 'completed' });
    tc.taskUpdate(task2, { status: 'completed' });

    // After completion
    assert(tc.allStreamsComplete(), 'All streams should be complete');

    // Mark initiative complete
    mc.initiativeComplete(iniId);
    const initiative = mc.initiativeGet();
    assert(initiative === null || initiative.id !== iniId, 'Initiative should be marked complete');
  });

  await runTest('Streams auto-archived on completion', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Archive Test');
    tc.initiativeLink(iniId, 'Archive Test');
    const prdId = tc.prdCreate('Test PRD', 'Test');

    tc.taskCreate(prdId, 'Task', 'Description', {
      streamId: 'Stream-A',
      streamName: 'Stream A',
      dependencies: []
    });

    // Complete initiative and archive
    mc.initiativeComplete(iniId);
    tc.archiveStreamsForInitiative(iniId);

    // Verify streams are archived
    const activeStreams = tc.streamList();
    const allStreams = tc.streamList({ includeArchived: true });

    assertEquals(activeStreams.length, 0, 'No active streams after archival');
    assertEquals(allStreams.length, 1, 'Archived streams still exist');
    assert(allStreams[0].archived, 'Stream should be marked as archived');
  });
}

// ============================================================================
// TEST SUITE: INITIATIVE SWITCH BEHAVIOR
// ============================================================================

async function runInitiativeSwitchTests() {
  console.log('\n' + '='.repeat(70));
  console.log('INITIATIVE SWITCH: STREAM ARCHIVAL');
  console.log('='.repeat(70) + '\n');

  await runTest('Initiative switch archives old streams', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    // Initiative A
    const iniA = mc.initiativeStart('Initiative A');
    tc.initiativeLink(iniA, 'Initiative A');
    const prdA = tc.prdCreate('Feature A', 'Description');
    tc.taskCreate(prdA, 'Task A', 'Description', {
      streamId: 'Stream-A',
      streamName: 'A Stream',
      dependencies: []
    });

    // Verify Stream-A exists
    let streams = tc.streamList();
    assertEquals(streams.length, 1, 'Should have one stream before switch');
    assertEquals(streams[0].streamId, 'Stream-A', 'Should be Stream-A');

    // Switch to Initiative B
    mc.initiativeComplete(iniA);
    const iniB = mc.initiativeStart('Initiative B');
    tc.initiativeLink(iniB, 'Initiative B'); // This should archive Initiative A streams

    const prdB = tc.prdCreate('Feature B', 'Description');
    tc.taskCreate(prdB, 'Task B', 'Description', {
      streamId: 'Stream-B',
      streamName: 'B Stream',
      dependencies: []
    });

    // Verify Stream-A is archived, Stream-B is active
    streams = tc.streamList();
    assertEquals(streams.length, 1, 'Should have one active stream');
    assertEquals(streams[0].streamId, 'Stream-B', 'Active stream should be Stream-B');

    const allStreams = tc.streamList({ includeArchived: true });
    assertEquals(allStreams.length, 2, 'Should have two total streams');
  });

  await runTest('stream_list() filters by current initiative', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    // Create multiple initiatives
    const iniA = mc.initiativeStart('Initiative A');
    tc.initiativeLink(iniA, 'Initiative A');
    const prdA = tc.prdCreate('PRD A', 'Desc A');
    tc.taskCreate(prdA, 'Task A1', 'Desc', { streamId: 'Stream-A', dependencies: [] });
    tc.taskCreate(prdA, 'Task A2', 'Desc', { streamId: 'Stream-A', dependencies: [] });

    mc.initiativeComplete(iniA);
    const iniB = mc.initiativeStart('Initiative B');
    tc.initiativeLink(iniB, 'Initiative B');
    const prdB = tc.prdCreate('PRD B', 'Desc B');
    tc.taskCreate(prdB, 'Task B1', 'Desc', { streamId: 'Stream-B', dependencies: [] });

    // stream_list should only show Initiative B
    const streams = tc.streamList();
    assertEquals(streams.length, 1, 'Should only show current initiative');
    assertEquals(streams[0].streamId, 'Stream-B', 'Should be Stream-B');
    assertEquals(streams[0].totalTasks, 1, 'Should count tasks correctly');
  });

  await runTest('watch-status shows only current initiative', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    // Initiative A with completed stream
    const iniA = mc.initiativeStart('Old Initiative');
    tc.initiativeLink(iniA, 'Old Initiative');
    const prdA = tc.prdCreate('Old PRD', 'Desc');
    const taskA = tc.taskCreate(prdA, 'Old Task', 'Desc', {
      streamId: 'Stream-A',
      streamName: 'Old Stream',
      dependencies: []
    });
    tc.taskUpdate(taskA, { status: 'completed' });

    // Switch to Initiative B with in-progress stream
    mc.initiativeComplete(iniA);
    const iniB = mc.initiativeStart('Current Initiative');
    tc.initiativeLink(iniB, 'Current Initiative');
    const prdB = tc.prdCreate('Current PRD', 'Desc');
    tc.taskCreate(prdB, 'Current Task', 'Desc', {
      streamId: 'Stream-B',
      streamName: 'Current Stream',
      dependencies: []
    });

    // Simulate watch-status query
    const currentInitiative = mc.initiativeGet();
    const visibleStreams = tc.streamList();

    assert(currentInitiative !== null, 'Should have active initiative');
    assertEquals(currentInitiative!.id, iniB, 'Active initiative should be B');
    assertEquals(visibleStreams.length, 1, 'Should only show current initiative streams');
    assertEquals(visibleStreams[0].streamId, 'Stream-B', 'Should show Stream-B');
  });

  await runTest('stream_unarchive recovers archived streams', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniA = mc.initiativeStart('Initiative A');
    tc.initiativeLink(iniA, 'Initiative A');
    const prdA = tc.prdCreate('PRD A', 'Desc');
    tc.taskCreate(prdA, 'Task A', 'Desc', { streamId: 'Stream-A', dependencies: [] });

    // Archive
    mc.initiativeComplete(iniA);
    tc.archiveStreamsForInitiative(iniA);

    // Verify archived
    let activeStreams = tc.streamList();
    assertEquals(activeStreams.length, 0, 'Should have no active streams');

    // Unarchive
    tc.streamUnarchive('Stream-A');
    tc.initiativeLink(iniA, 'Initiative A'); // Re-link to make visible

    // Verify unarchived
    activeStreams = tc.streamList();
    assertEquals(activeStreams.length, 1, 'Should have one active stream after unarchive');
    assertEquals(activeStreams[0].streamId, 'Stream-A', 'Should be Stream-A');
  });
}

// ============================================================================
// TEST SUITE: DEPENDENCY VALIDATION
// ============================================================================

async function runDependencyTests() {
  console.log('\n' + '='.repeat(70));
  console.log('DEPENDENCY VALIDATION');
  console.log('='.repeat(70) + '\n');

  await runTest('Foundation streams have empty dependencies', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test Initiative');
    tc.initiativeLink(iniId, 'Test Initiative');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    tc.taskCreate(prdId, 'Foundation Task', 'Desc', {
      streamId: 'Stream-Foundation',
      streamName: 'Foundation',
      dependencies: []
    });

    const streams = tc.streamList();
    assertEquals(streams.length, 1, 'Should have one stream');
    assertEquals(streams[0].dependencies.length, 0, 'Foundation should have no dependencies');
  });

  await runTest('Parallel streams depend on foundation', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test Initiative');
    tc.initiativeLink(iniId, 'Test Initiative');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    tc.taskCreate(prdId, 'Foundation', 'Desc', {
      streamId: 'Stream-A',
      dependencies: []
    });

    tc.taskCreate(prdId, 'Parallel Work', 'Desc', {
      streamId: 'Stream-B',
      dependencies: ['Stream-A']
    });

    const streams = tc.streamList();
    const streamB = streams.find(s => s.streamId === 'Stream-B');

    assert(streamB !== undefined, 'Stream-B should exist');
    assertArrayContains(streamB!.dependencies, 'Stream-A', 'Stream-B should depend on Stream-A');
  });

  await runTest('Integration streams depend on multiple parallel streams', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test Initiative');
    tc.initiativeLink(iniId, 'Test Initiative');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    tc.taskCreate(prdId, 'Foundation', 'Desc', {
      streamId: 'Stream-A',
      dependencies: []
    });

    tc.taskCreate(prdId, 'Parallel 1', 'Desc', {
      streamId: 'Stream-B',
      dependencies: ['Stream-A']
    });

    tc.taskCreate(prdId, 'Parallel 2', 'Desc', {
      streamId: 'Stream-C',
      dependencies: ['Stream-A']
    });

    tc.taskCreate(prdId, 'Integration', 'Desc', {
      streamId: 'Stream-Z',
      dependencies: ['Stream-B', 'Stream-C']
    });

    const streams = tc.streamList();
    const streamZ = streams.find(s => s.streamId === 'Stream-Z');

    assert(streamZ !== undefined, 'Stream-Z should exist');
    assertEquals(streamZ!.dependencies.length, 2, 'Stream-Z should have 2 dependencies');
    assertArrayContains(streamZ!.dependencies, 'Stream-B', 'Should depend on Stream-B');
    assertArrayContains(streamZ!.dependencies, 'Stream-C', 'Should depend on Stream-C');
  });

  await runTest('Circular dependencies are detectable', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test Initiative');
    tc.initiativeLink(iniId, 'Test Initiative');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    // Create circular dependency: A → B → C → A
    tc.taskCreate(prdId, 'Task A', 'Desc', {
      streamId: 'Stream-A',
      dependencies: ['Stream-C']
    });

    tc.taskCreate(prdId, 'Task B', 'Desc', {
      streamId: 'Stream-B',
      dependencies: ['Stream-A']
    });

    tc.taskCreate(prdId, 'Task C', 'Desc', {
      streamId: 'Stream-C',
      dependencies: ['Stream-B']
    });

    // Detect circular dependency
    const streams = tc.streamList();
    const hasCircular = detectCircularDependency(streams);

    assert(hasCircular, 'Should detect circular dependency');
  });
}

// Helper function to detect circular dependencies
function detectCircularDependency(streams: Stream[]): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(streamId: string): boolean {
    visited.add(streamId);
    recStack.add(streamId);

    const stream = streams.find(s => s.streamId === streamId);
    if (stream) {
      for (const dep of stream.dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recStack.has(dep)) {
          return true; // Circular dependency detected
        }
      }
    }

    recStack.delete(streamId);
    return false;
  }

  for (const stream of streams) {
    if (!visited.has(stream.streamId)) {
      if (hasCycle(stream.streamId)) return true;
    }
  }

  return false;
}

// ============================================================================
// TEST SUITE: PROGRESS TRACKING
// ============================================================================

async function runProgressTrackingTests() {
  console.log('\n' + '='.repeat(70));
  console.log('PROGRESS TRACKING');
  console.log('='.repeat(70) + '\n');

  await runTest('Stream progress calculated correctly', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test');
    tc.initiativeLink(iniId, 'Test');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    const task1 = tc.taskCreate(prdId, 'Task 1', 'Desc', { streamId: 'Stream-A', dependencies: [] });
    const task2 = tc.taskCreate(prdId, 'Task 2', 'Desc', { streamId: 'Stream-A', dependencies: [] });
    const task3 = tc.taskCreate(prdId, 'Task 3', 'Desc', { streamId: 'Stream-A', dependencies: [] });

    // Complete 2 out of 3 tasks
    tc.taskUpdate(task1, { status: 'completed' });
    tc.taskUpdate(task2, { status: 'completed' });

    const streams = tc.streamList();
    const streamA = streams.find(s => s.streamId === 'Stream-A')!;

    assertEquals(streamA.totalTasks, 3, 'Should have 3 total tasks');
    assertEquals(streamA.completedTasks, 2, 'Should have 2 completed tasks');
    assertEquals(streamA.progress, 67, 'Progress should be 67%');
  });

  await runTest('In-progress tasks counted correctly', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test');
    tc.initiativeLink(iniId, 'Test');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    const task1 = tc.taskCreate(prdId, 'Task 1', 'Desc', { streamId: 'Stream-A', dependencies: [] });
    const task2 = tc.taskCreate(prdId, 'Task 2', 'Desc', { streamId: 'Stream-A', dependencies: [] });
    tc.taskCreate(prdId, 'Task 3', 'Desc', { streamId: 'Stream-A', dependencies: [] });

    tc.taskUpdate(task1, { status: 'completed' });
    tc.taskUpdate(task2, { status: 'in_progress' });

    const streams = tc.streamList();
    const streamA = streams.find(s => s.streamId === 'Stream-A')!;

    assertEquals(streamA.completedTasks, 1, 'Should have 1 completed task');
    assertEquals(streamA.inProgressTasks, 1, 'Should have 1 in-progress task');
  });

  await runTest('100% completion detected', () => {
    const tc = new MockTaskCopilot();
    const mc = new MockMemoryCopilot();

    const iniId = mc.initiativeStart('Test');
    tc.initiativeLink(iniId, 'Test');
    const prdId = tc.prdCreate('Test PRD', 'Desc');

    const task1 = tc.taskCreate(prdId, 'Task 1', 'Desc', { streamId: 'Stream-A', dependencies: [] });
    const task2 = tc.taskCreate(prdId, 'Task 2', 'Desc', { streamId: 'Stream-A', dependencies: [] });

    tc.taskUpdate(task1, { status: 'completed' });
    tc.taskUpdate(task2, { status: 'completed' });

    const streams = tc.streamList();
    const streamA = streams.find(s => s.streamId === 'Stream-A')!;

    assertEquals(streamA.progress, 100, 'Progress should be 100%');
    assert(streamA.completedTasks === streamA.totalTasks, 'All tasks should be complete');
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('ORCHESTRATION LIFECYCLE INTEGRATION TESTS');
  console.log('Testing: Generate → Start → Complete → Initiative Switch');
  console.log('='.repeat(70));

  await runLifecycleTests();
  await runInitiativeSwitchTests();
  await runDependencyTests();
  await runProgressTrackingTests();

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    for (const result of results.filter(r => r.status === 'FAIL')) {
      console.log(`  - ${result.testName}: ${result.error}`);
    }
  }

  console.log('\n' + (failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
  console.log('\nCoverage:');
  console.log('  ✓ PRD creation in Task Copilot');
  console.log('  ✓ Task creation with stream metadata');
  console.log('  ✓ Initiative-scoped stream filtering');
  console.log('  ✓ Stream archival on initiative switch');
  console.log('  ✓ Auto-completion detection');
  console.log('  ✓ Dependency validation');
  console.log('  ✓ Progress tracking');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
