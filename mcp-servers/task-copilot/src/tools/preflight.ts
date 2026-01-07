/**
 * Preflight Check Tool
 *
 * Verifies environment health before agents start substantive work.
 * Part of the Session Boundary Protocol in Long-Running Agent Harness.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { DatabaseClient } from '../database.js';
import { progressSummary } from './initiative.js';
import type {
  PreflightCheckInput,
  PreflightResult,
  PreflightCheckStatus
} from '../types.js';

const execAsync = promisify(exec);

/**
 * Check git repository status
 */
async function checkGitStatus(projectRoot: string): Promise<{
  status: PreflightCheckStatus;
  branch: string;
  clean: boolean;
  uncommittedFiles: number;
  message?: string;
}> {
  try {
    // Check if git is available
    try {
      await execAsync('git --version');
    } catch {
      return {
        status: 'warn',
        branch: 'unknown',
        clean: true,
        uncommittedFiles: 0,
        message: 'Git not available in PATH'
      };
    }

    // Check if it's a git repo
    try {
      await execAsync('git rev-parse --git-dir', { cwd: projectRoot });
    } catch {
      return {
        status: 'warn',
        branch: 'unknown',
        clean: true,
        uncommittedFiles: 0,
        message: 'Not a git repository'
      };
    }

    // Get current branch
    let branch = 'unknown';
    try {
      const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot });
      branch = branchOutput.trim();
    } catch {
      // Ignore branch detection errors
    }

    // Check working directory status
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectRoot });
    const uncommittedFiles = statusOutput.trim().split('\n').filter(line => line.length > 0).length;
    const clean = uncommittedFiles === 0;

    // Determine status
    let status: PreflightCheckStatus = 'pass';
    let message: string | undefined;

    if (!clean) {
      status = 'warn';
      message = `${uncommittedFiles} uncommitted file(s)`;
    }

    return {
      status,
      branch,
      clean,
      uncommittedFiles,
      message
    };
  } catch (error) {
    return {
      status: 'fail',
      branch: 'unknown',
      clean: false,
      uncommittedFiles: 0,
      message: `Git check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check if dev server is running on specified port
 */
async function checkDevServer(port: number): Promise<{
  status: PreflightCheckStatus;
  port?: number;
  message?: string;
}> {
  try {
    // Try to connect to the port using lsof (macOS/Linux)
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      const pids = stdout.trim().split('\n').filter(line => line.length > 0);

      if (pids.length > 0) {
        return {
          status: 'pass',
          port,
          message: `Dev server running on port ${port}`
        };
      }
    } catch {
      // lsof failed, try netstat as fallback
      try {
        const { stdout } = await execAsync(`netstat -an | grep ${port} | grep LISTEN`);
        if (stdout.trim().length > 0) {
          return {
            status: 'pass',
            port,
            message: `Dev server running on port ${port}`
          };
        }
      } catch {
        // Both methods failed
      }
    }

    return {
      status: 'warn',
      port,
      message: `No dev server detected on port ${port}`
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Dev server check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Run test command to verify baseline tests pass
 */
async function checkTests(testCommand: string, projectRoot: string): Promise<{
  status: PreflightCheckStatus;
  passed?: number;
  failed?: number;
  message?: string;
}> {
  try {
    const { stdout, stderr } = await execAsync(testCommand, {
      cwd: projectRoot,
      timeout: 30000 // 30 second timeout
    });

    // Parse output for test results (basic heuristic)
    const output = stdout + stderr;

    // Try to extract test counts (supports common test frameworks)
    const passedMatch = output.match(/(\d+)\s+pass(?:ed|ing)?/i);
    const failedMatch = output.match(/(\d+)\s+fail(?:ed|ing)?/i);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : undefined;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : undefined;

    if (failed && failed > 0) {
      return {
        status: 'fail',
        passed,
        failed,
        message: `${failed} test(s) failing`
      };
    }

    return {
      status: 'pass',
      passed,
      failed: 0,
      message: passed ? `${passed} test(s) passing` : 'Tests passed'
    };
  } catch (error) {
    // Test command failed
    const errorOutput = error instanceof Error ? error.message : String(error);

    // Check if it's a test failure vs command failure
    if (errorOutput.includes('fail')) {
      return {
        status: 'fail',
        message: 'Tests failing (see test output)'
      };
    }

    return {
      status: 'fail',
      message: `Test command failed: ${errorOutput.substring(0, 200)}`
    };
  }
}

/**
 * Run preflight health check
 *
 * Checks:
 * - Current initiative state via progress_summary
 * - Git repository status (branch, clean/dirty, uncommitted files)
 * - Optional: Dev server running (configurable)
 * - Optional: Baseline tests passing (configurable)
 */
export async function preflightCheck(
  db: DatabaseClient,
  input: PreflightCheckInput
): Promise<PreflightResult> {
  const timestamp = new Date().toISOString();
  const recommendations: string[] = [];

  // 1. Check progress summary
  let progressCheck: PreflightResult['checks']['progress'];
  try {
    const summary = progressSummary(db, {
      initiativeId: input.initiativeId
    });

    const hasBlockedTasks = summary.tasks.blocked > 0;
    const hasInProgressTasks = summary.tasks.inProgress > 0;

    progressCheck = {
      status: hasBlockedTasks ? 'warn' : 'pass',
      initiative: summary.initiativeId,
      tasksInProgress: summary.tasks.inProgress,
      blockedTasks: summary.tasks.blocked
    };

    if (hasBlockedTasks) {
      recommendations.push(`Review ${summary.tasks.blocked} blocked task(s) before starting new work`);
    }

    if (summary.tasks.inProgress > 3) {
      recommendations.push(`${summary.tasks.inProgress} tasks in progress - consider completing some before adding more`);
    }
  } catch (error) {
    progressCheck = {
      status: 'fail',
      tasksInProgress: 0,
      blockedTasks: 0,
      message: `Failed to get progress: ${error instanceof Error ? error.message : String(error)}`
    };
    recommendations.push('Could not retrieve initiative state - may need to run /protocol or /continue first');
  }

  // 2. Check git status
  const projectRoot = process.cwd();
  const gitCheck = await checkGitStatus(projectRoot);

  if (gitCheck.status === 'warn' && gitCheck.uncommittedFiles > 0) {
    recommendations.push('Commit or stash uncommitted changes to create a clean checkpoint');
  }

  if (gitCheck.branch === 'main' || gitCheck.branch === 'master') {
    recommendations.push('Consider creating a feature branch for experimental work');
  }

  // 3. Optional: Check dev server
  let devServerCheck: PreflightResult['checks']['devServer'] | undefined;
  const shouldCheckDevServer = input.checkDevServer ||
    (input.taskId && await shouldCheckDevServerForTask(db, input.taskId));

  if (shouldCheckDevServer) {
    const port = input.devServerPort || 3000;
    const serverResult = await checkDevServer(port);
    devServerCheck = serverResult;

    if (serverResult.status === 'warn') {
      recommendations.push(`Start dev server on port ${port} before testing changes`);
    }
  }

  // 4. Optional: Check tests
  let testsCheck: PreflightResult['checks']['tests'] | undefined;
  const testCommand = input.testCommand ||
    (input.taskId && await getTestCommandForTask(db, input.taskId));

  if (testCommand) {
    const testResult = await checkTests(testCommand, projectRoot);
    testsCheck = testResult;

    if (testResult.status === 'fail') {
      recommendations.push('Fix failing tests before starting new work to maintain quality baseline');
    }
  }

  // Determine overall health
  const allChecks = [
    progressCheck,
    gitCheck,
    devServerCheck,
    testsCheck
  ].filter((check): check is NonNullable<typeof check> => check !== undefined);

  const hasFailures = allChecks.some(check => check.status === 'fail');
  const hasWarnings = allChecks.some(check => check.status === 'warn');

  const healthy = !hasFailures;

  // Add success recommendation if all clear
  if (healthy && !hasWarnings) {
    recommendations.push('Environment healthy - ready to start work');
  }

  return {
    healthy,
    timestamp,
    checks: {
      progress: progressCheck,
      git: gitCheck,
      devServer: devServerCheck,
      tests: testsCheck
    },
    recommendations
  };
}

/**
 * Helper: Check if task metadata specifies dev server check
 */
async function shouldCheckDevServerForTask(
  db: DatabaseClient,
  taskId: string
): Promise<boolean> {
  const task = db.getTask(taskId);
  if (!task) return false;

  const metadata = JSON.parse(task.metadata);
  return metadata.preflightConfig?.checkDevServer === true;
}

/**
 * Helper: Get test command from task metadata
 */
async function getTestCommandForTask(
  db: DatabaseClient,
  taskId: string
): Promise<string | undefined> {
  const task = db.getTask(taskId);
  if (!task) return undefined;

  const metadata = JSON.parse(task.metadata);
  return metadata.preflightConfig?.testCommand;
}
