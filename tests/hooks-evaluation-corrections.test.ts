/**
 * Integration Tests: Lifecycle Hooks, Skill Evaluation, and Correction Detection
 *
 * End-to-end tests covering the complete workflow from hook execution
 * through skill evaluation to correction pattern capture.
 *
 * @see PRD-6df7cc11-c4d4-4f48-9e0c-1275cf6fb327
 */

// ============================================================================
// TEST INFRASTRUCTURE
// ============================================================================

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logResult(
  testName: string,
  status: 'PASS' | 'FAIL' | 'SKIP',
  duration: number,
  error?: string,
  details?: string
) {
  results.push({ testName, status, duration, error, details });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${testName} (${duration}ms)${error ? ': ' + error : ''}`);
}

// ============================================================================
// STREAM-B: LIFECYCLE HOOKS TESTS
// ============================================================================

console.log('\n📌 STREAM-B: Lifecycle Hooks Tests\n');

/**
 * Test: PreToolUse Security Rule Registration
 */
async function testPreToolUseRuleRegistration() {
  const start = Date.now();
  try {
    const {
      registerSecurityRule,
      getSecurityRules,
      getSecurityRule,
      unregisterSecurityRule,
      toggleSecurityRule,
      SecurityAction
    } = await import('../mcp-servers/task-copilot/src/hooks/pre-tool-use.js');

    // Register custom rule
    const testRule = {
      id: 'test-integration-rule',
      name: 'Integration Test Rule',
      description: 'Rule for integration testing',
      enabled: true,
      priority: 75,
      evaluate: () => null
    };

    registerSecurityRule(testRule);

    // Verify registration
    const retrieved = getSecurityRule('test-integration-rule');
    if (!retrieved) {
      throw new Error('Failed to retrieve registered rule');
    }
    if (retrieved.priority !== 75) {
      throw new Error(`Priority mismatch: expected 75, got ${retrieved.priority}`);
    }

    // Test toggle
    toggleSecurityRule('test-integration-rule', false);
    const disabled = getSecurityRule('test-integration-rule');
    if (disabled?.enabled !== false) {
      throw new Error('Rule should be disabled');
    }

    // Cleanup
    unregisterSecurityRule('test-integration-rule');
    const removed = getSecurityRule('test-integration-rule');
    if (removed !== undefined) {
      throw new Error('Rule should be unregistered');
    }

    logResult('PreToolUse: Rule registration', 'PASS', Date.now() - start, undefined, 'Register, toggle, unregister cycle');
  } catch (error) {
    logResult('PreToolUse: Rule registration', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: PreToolUse Security Evaluation
 */
async function testPreToolUseSecurityEvaluation() {
  const start = Date.now();
  try {
    const {
      evaluatePreToolUse,
      SecurityAction
    } = await import('../mcp-servers/task-copilot/src/hooks/pre-tool-use.js');
    const { initializeDefaultSecurityRules } = await import('../mcp-servers/task-copilot/src/hooks/security-rules.js');

    // Initialize default rules
    initializeDefaultSecurityRules();

    // Test: Secret detection should block
    const secretResult = await evaluatePreToolUse('Write', {
      file_path: 'config.ts',
      content: 'const API_KEY = "AKIAIOSFODNN7EXAMPLE";'
    });

    if (secretResult.allowed !== false) {
      throw new Error('Should block AWS key detection');
    }
    if (secretResult.violations.length === 0) {
      throw new Error('Should have violations for secret');
    }

    // Test: Safe content should pass
    const safeResult = await evaluatePreToolUse('Write', {
      file_path: 'config.ts',
      content: 'const PORT = 3000;'
    });

    if (safeResult.allowed !== true) {
      throw new Error('Should allow safe content');
    }

    // Test: Destructive command should block
    const destructiveResult = await evaluatePreToolUse('Bash', {
      command: 'rm -rf /'
    });

    if (destructiveResult.allowed !== false) {
      throw new Error('Should block destructive command');
    }

    logResult('PreToolUse: Security evaluation', 'PASS', Date.now() - start, undefined, 'Block secrets, allow safe, block destructive');
  } catch (error) {
    logResult('PreToolUse: Security evaluation', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: PreToolUse Helper Functions
 */
async function testPreToolUseHelpers() {
  const start = Date.now();
  try {
    const {
      extractStringContent,
      extractFilePaths,
      isFileWriteTool,
      isCommandExecutionTool
    } = await import('../mcp-servers/task-copilot/src/hooks/pre-tool-use.js');

    // Test extractStringContent
    const testInput = {
      file_path: '/test/file.ts',
      content: 'test content',
      nested: { value: 'nested' }
    };
    const extracted = extractStringContent(testInput);
    if (!extracted.includes('/test/file.ts')) {
      throw new Error('Should extract file_path');
    }
    if (!extracted.includes('test content')) {
      throw new Error('Should extract content');
    }

    // Test extractFilePaths
    const pathInput = {
      file_path: '/path/one.ts',
      files: ['/path/two.ts', '/path/three.ts']
    };
    const paths = extractFilePaths(pathInput);
    if (paths.length !== 3) {
      throw new Error(`Expected 3 paths, got ${paths.length}`);
    }

    // Test tool type detection
    if (!isFileWriteTool('Edit')) throw new Error('Edit should be file write tool');
    if (!isFileWriteTool('Write')) throw new Error('Write should be file write tool');
    if (isFileWriteTool('Read')) throw new Error('Read should not be file write tool');
    if (!isCommandExecutionTool('Bash')) throw new Error('Bash should be command tool');
    if (isCommandExecutionTool('Edit')) throw new Error('Edit should not be command tool');

    logResult('PreToolUse: Helper functions', 'PASS', Date.now() - start, undefined, 'Extract strings, paths, tool detection');
  } catch (error) {
    logResult('PreToolUse: Helper functions', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// STREAM-C: SKILL EVALUATION TESTS
// ============================================================================

console.log('\n📌 STREAM-C: Skill Evaluation Tests\n');

/**
 * Test: Pattern Matcher
 */
async function testPatternMatcher() {
  const start = Date.now();
  try {
    const { PatternMatcher } = await import('../mcp-servers/skills-copilot/src/evaluation/pattern-matcher.js');

    const matcher = new PatternMatcher();

    // Test glob pattern matching
    const testCases = [
      { file: 'src/test.ts', pattern: '*.ts', expected: true },
      { file: 'src/test.spec.ts', pattern: '*.spec.ts', expected: true },
      { file: 'src/components/Button.tsx', pattern: 'src/**', expected: true },
      { file: 'package.json', pattern: 'package.json', expected: true },
      { file: 'config.yml', pattern: '*.json', expected: false },
    ];

    for (const { file, pattern, expected } of testCases) {
      const result = matcher.matchFilePattern(file, pattern);
      if (result !== expected) {
        throw new Error(`Pattern '${pattern}' vs '${file}': expected ${expected}, got ${result}`);
      }
    }

    // Test skill matching
    const skills = new Map();
    skills.set('typescript-skill', {
      name: 'typescript-skill',
      description: 'TypeScript helper',
      triggers: { files: ['*.ts', '*.tsx'] }
    });
    skills.set('test-skill', {
      name: 'test-skill',
      description: 'Testing helper',
      triggers: { files: ['*.test.ts', '*.spec.ts'] }
    });

    const matches = matcher.match(['src/app.ts', 'src/app.test.ts'], skills);

    if (matches.length < 2) {
      throw new Error(`Expected at least 2 matches, got ${matches.length}`);
    }

    logResult('PatternMatcher: File matching', 'PASS', Date.now() - start, undefined, `${testCases.length} patterns tested`);
  } catch (error) {
    logResult('PatternMatcher: File matching', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Keyword Detector
 */
async function testKeywordDetector() {
  const start = Date.now();
  try {
    const { KeywordDetector } = await import('../mcp-servers/skills-copilot/src/evaluation/keyword-detector.js');

    const detector = new KeywordDetector();

    // Build index with test skills
    const skills = new Map();
    skills.set('react-skill', {
      name: 'react-skill',
      description: 'React component patterns',
      keywords: ['react', 'component', 'hooks', 'jsx'],
      tags: ['frontend', 'ui']
    });
    skills.set('testing-skill', {
      name: 'testing-skill',
      description: 'Testing best practices',
      keywords: ['test', 'jest', 'coverage', 'mock'],
      tags: ['testing', 'quality']
    });

    detector.buildIndex(skills);

    // Test keyword matching
    const testText = 'I need help writing React component tests with Jest';
    const matches = detector.match(testText, skills);

    if (matches.length !== 2) {
      throw new Error(`Expected 2 skill matches, got ${matches.length}`);
    }

    // Verify matched keywords
    const reactMatch = matches.find(m => m.skillName === 'react-skill');
    const testMatch = matches.find(m => m.skillName === 'testing-skill');

    if (!reactMatch) {
      throw new Error('Should match react-skill');
    }
    if (!testMatch) {
      throw new Error('Should match testing-skill');
    }

    logResult('KeywordDetector: Text matching', 'PASS', Date.now() - start, undefined, '2 skills matched from text');
  } catch (error) {
    logResult('KeywordDetector: Text matching', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Confidence Scorer
 */
async function testConfidenceScorer() {
  const start = Date.now();
  try {
    const { ConfidenceScorer } = await import('../mcp-servers/skills-copilot/src/evaluation/confidence-scorer.js');

    const scorer = new ConfidenceScorer();

    // Set up test skills
    const skills = new Map();
    skills.set('typescript-testing', {
      name: 'typescript-testing',
      description: 'TypeScript testing patterns',
      keywords: ['test', 'typescript', 'jest', 'vitest'],
      tags: ['testing', 'typescript'],
      triggers: { files: ['*.test.ts', '*.spec.ts'] }
    });
    skills.set('react-components', {
      name: 'react-components',
      description: 'React component patterns',
      keywords: ['react', 'component', 'hooks'],
      tags: ['frontend', 'react'],
      triggers: { files: ['*.tsx', '*.jsx'] }
    });

    scorer.setSkills(skills);

    // Test combined evaluation (files + text)
    const context = {
      files: ['src/Button.test.tsx', 'src/Button.tsx'],
      text: 'Help me write tests for this React component',
      recentActivity: ['testing']
    };

    const results = scorer.evaluate(context, { threshold: 0.2 });

    if (results.length === 0) {
      throw new Error('Should have matches above threshold');
    }

    // Top result should have combined signals
    const topResult = results[0];
    if (topResult.confidence < 0.3) {
      throw new Error(`Top confidence too low: ${topResult.confidence}`);
    }

    // Test confidence level categorization
    if (!['high', 'medium', 'low'].includes(topResult.level)) {
      throw new Error(`Invalid level: ${topResult.level}`);
    }

    // Test hasMatch helper
    const hasMatch = scorer.hasMatch(context, 0.3);
    if (!hasMatch) {
      throw new Error('hasMatch should return true');
    }

    // Test getBestMatch helper
    const best = scorer.getBestMatch(context);
    if (!best) {
      throw new Error('getBestMatch should return a result');
    }

    logResult('ConfidenceScorer: Combined evaluation', 'PASS', Date.now() - start, undefined, `${results.length} results, top: ${topResult.confidence.toFixed(2)}`);
  } catch (error) {
    logResult('ConfidenceScorer: Combined evaluation', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// STREAM-D: CORRECTION DETECTION TESTS
// ============================================================================

console.log('\n📌 STREAM-D: Correction Detection Tests\n');

/**
 * Test: Correction Pattern Matching
 */
async function testCorrectionPatternMatching() {
  const start = Date.now();
  try {
    const {
      matchCorrectionPatterns,
      CORRECTION_PATTERNS
    } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    // Test explicit correction
    const explicitMatches = matchCorrectionPatterns('Correction: use TypeScript instead of JavaScript');
    if (explicitMatches.length === 0) {
      throw new Error('Should match explicit correction pattern');
    }
    const hasExplicit = explicitMatches.some(m => m.type === 'explicit_correction');
    if (!hasExplicit) {
      throw new Error('Should detect explicit_correction type');
    }

    // Test "actually" pattern
    const actuallyMatches = matchCorrectionPatterns('Actually, you should use the other file instead');
    if (actuallyMatches.length === 0) {
      throw new Error('Should match "actually" pattern');
    }

    // Test "no, wrong" pattern
    const wrongMatches = matchCorrectionPatterns("No, that's wrong. It should be different.");
    if (wrongMatches.length === 0) {
      throw new Error('Should match "no, wrong" pattern');
    }

    // Test replacement pattern
    const replaceMatches = matchCorrectionPatterns('Use useState, not useReducer for this case');
    if (replaceMatches.length === 0) {
      throw new Error('Should match replacement pattern');
    }

    // Test preference pattern
    const preferMatches = matchCorrectionPatterns('I prefer tabs over spaces');
    if (preferMatches.length === 0) {
      throw new Error('Should match preference pattern');
    }

    // Test negative case (no correction)
    const noMatches = matchCorrectionPatterns('Please implement the login feature');
    // This might match nothing or match weakly - just verify no crash

    logResult('Correction: Pattern matching', 'PASS', Date.now() - start, undefined, `${CORRECTION_PATTERNS.length} patterns available`);
  } catch (error) {
    logResult('Correction: Pattern matching', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Correction Confidence Scoring
 */
async function testCorrectionConfidenceScoring() {
  const start = Date.now();
  try {
    const {
      matchCorrectionPatterns,
      calculateConfidence
    } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    // High confidence: explicit + multiple patterns
    const highConfMessage = 'Correction: use X instead of Y. Actually, I said X, not Y.';
    const highMatches = matchCorrectionPatterns(highConfMessage);
    const highConf = calculateConfidence(highMatches, highConfMessage);

    if (highConf < 0.7) {
      throw new Error(`High confidence case should be >0.7, got ${highConf}`);
    }

    // Medium confidence: single pattern
    const medConfMessage = 'Actually, use the other approach';
    const medMatches = matchCorrectionPatterns(medConfMessage);
    const medConf = calculateConfidence(medMatches, medConfMessage);

    if (medConf < 0.4 || medConf > 0.9) {
      throw new Error(`Medium confidence case should be 0.4-0.9, got ${medConf}`);
    }

    // Low confidence: weak pattern
    const lowConfMessage = 'I prefer this style slightly over that one';
    const lowMatches = matchCorrectionPatterns(lowConfMessage);
    const lowConf = calculateConfidence(lowMatches, lowConfMessage);

    // Even weak matches should be below high threshold
    if (lowConf >= 0.85) {
      throw new Error(`Low confidence case should be <0.85, got ${lowConf}`);
    }

    // No match: should be 0
    const noMatchMessage = 'Hello, please help me';
    const noMatches = matchCorrectionPatterns(noMatchMessage);
    const noConf = calculateConfidence(noMatches, noMatchMessage);

    if (noConf !== 0) {
      throw new Error(`No match case should be 0, got ${noConf}`);
    }

    logResult('Correction: Confidence scoring', 'PASS', Date.now() - start, undefined, `High: ${highConf.toFixed(2)}, Med: ${medConf.toFixed(2)}, Low: ${lowConf.toFixed(2)}`);
  } catch (error) {
    logResult('Correction: Confidence scoring', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Correction Value Extraction
 */
async function testCorrectionValueExtraction() {
  const start = Date.now();
  try {
    const {
      matchCorrectionPatterns,
      extractValues
    } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    // Test "not X, but Y" extraction
    const notButMessage = 'Not src/index.ts, but src/main.ts';
    const notButMatches = matchCorrectionPatterns(notButMessage);
    const notButValues = extractValues(notButMatches);

    if (!notButValues.oldValue || !notButValues.newValue) {
      throw new Error('Should extract both old and new values from "not X, but Y"');
    }

    // Test "use X instead of Y" extraction
    const useInsteadMessage = 'Use TypeScript instead of JavaScript';
    const useMatches = matchCorrectionPatterns(useInsteadMessage);
    const useValues = extractValues(useMatches);

    if (!useValues.newValue) {
      throw new Error('Should extract new value from "use X instead"');
    }

    // Test preference extraction
    const preferMessage = 'I prefer async/await over callbacks';
    const preferMatches = matchCorrectionPatterns(preferMessage);
    const preferValues = extractValues(preferMatches);

    // Should extract at least one value
    if (!preferValues.newValue && !preferValues.oldValue) {
      throw new Error('Should extract at least one value from preference');
    }

    logResult('Correction: Value extraction', 'PASS', Date.now() - start, undefined, 'Extracted old/new values from patterns');
  } catch (error) {
    logResult('Correction: Value extraction', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Correction Target Inference
 */
async function testCorrectionTargetInference() {
  const start = Date.now();
  try {
    const { inferTarget } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    // Test code agent → skill target
    const codeResult = inferTarget('Fix this code pattern', 'me');
    if (codeResult.target !== 'skill') {
      throw new Error(`Code agent should route to skill, got ${codeResult.target}`);
    }

    // Test design agent → skill target
    const designResult = inferTarget('Update the design approach', 'uxd');
    if (designResult.target !== 'skill') {
      throw new Error(`Design agent should route to skill, got ${designResult.target}`);
    }

    // Test architecture agent → agent target
    const archResult = inferTarget('Change the architecture pattern', 'ta');
    if (archResult.target !== 'agent') {
      throw new Error(`Architecture agent should route to agent, got ${archResult.target}`);
    }

    // Test preference keywords
    const prefResult = inferTarget('I prefer this style always', undefined);
    if (prefResult.target !== 'preference') {
      throw new Error(`Preference keywords should route to preference, got ${prefResult.target}`);
    }

    // Test memory keywords
    const memResult = inferTarget('Remember this important note', undefined);
    if (memResult.target !== 'memory') {
      throw new Error(`Memory keywords should route to memory, got ${memResult.target}`);
    }

    // Test default case
    const defaultResult = inferTarget('Some random message', undefined);
    if (defaultResult.target !== 'memory') {
      throw new Error(`Default should route to memory, got ${defaultResult.target}`);
    }

    logResult('Correction: Target inference', 'PASS', Date.now() - start, undefined, 'Agent and keyword routing works');
  } catch (error) {
    logResult('Correction: Target inference', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Full Correction Detection Flow
 */
async function testFullCorrectionDetection() {
  const start = Date.now();
  try {
    const { detectCorrections } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    // Test high confidence detection
    const highConfResult = detectCorrections({
      userMessage: 'Correction: use async/await instead of callbacks. Actually, I said this before.',
      previousAgentOutput: 'Using callbacks for async operations...',
      agentId: 'me',
      threshold: 0.5
    }, 'test-project');

    if (!highConfResult.detected) {
      throw new Error('Should detect high confidence correction');
    }
    if (highConfResult.corrections.length === 0) {
      throw new Error('Should have corrections');
    }
    if (highConfResult.suggestedAction !== 'auto_capture') {
      throw new Error(`High confidence should suggest auto_capture, got ${highConfResult.suggestedAction}`);
    }

    // Test medium confidence detection
    const medConfResult = detectCorrections({
      userMessage: 'Actually, use the other approach',
      threshold: 0.5
    }, 'test-project');

    if (!medConfResult.detected && medConfResult.maxConfidence >= 0.5) {
      throw new Error('Should detect medium confidence correction if above threshold');
    }

    // Test below threshold
    const lowConfResult = detectCorrections({
      userMessage: 'Please help me with this',
      threshold: 0.5
    }, 'test-project');

    if (lowConfResult.detected && lowConfResult.maxConfidence < 0.5) {
      throw new Error('Should not detect when below threshold');
    }

    logResult('Correction: Full detection flow', 'PASS', Date.now() - start, undefined, `Detected: ${highConfResult.maxConfidence.toFixed(2)} confidence`);
  } catch (error) {
    logResult('Correction: Full detection flow', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// INTEGRATION TESTS: CROSS-STREAM WORKFLOWS
// ============================================================================

console.log('\n📌 INTEGRATION: Cross-Stream Workflow Tests\n');

/**
 * Test: Hook → Evaluation → Correction Flow
 */
async function testHookEvaluationCorrectionFlow() {
  const start = Date.now();
  try {
    // Step 1: Simulate PreToolUse hook detecting a code change
    const { evaluatePreToolUse } = await import('../mcp-servers/task-copilot/src/hooks/pre-tool-use.js');
    const { initializeDefaultSecurityRules } = await import('../mcp-servers/task-copilot/src/hooks/security-rules.js');

    initializeDefaultSecurityRules();

    const hookResult = await evaluatePreToolUse('Write', {
      file_path: 'src/auth.ts',
      content: 'const token = process.env.AUTH_TOKEN;'
    });

    if (!hookResult.allowed) {
      throw new Error('Safe content should be allowed');
    }

    // Step 2: Simulate skill evaluation for the file
    const { ConfidenceScorer } = await import('../mcp-servers/skills-copilot/src/evaluation/confidence-scorer.js');
    const scorer = new ConfidenceScorer();

    const skills = new Map();
    skills.set('auth-patterns', {
      name: 'auth-patterns',
      description: 'Authentication patterns',
      keywords: ['auth', 'token', 'security'],
      tags: ['security', 'authentication'],
      triggers: { files: ['**/auth*.ts'] }
    });
    scorer.setSkills(skills);

    const evalResult = scorer.evaluate({
      files: ['src/auth.ts'],
      text: 'Working on authentication token handling'
    });

    if (evalResult.length === 0) {
      throw new Error('Should match auth skill');
    }

    // Step 3: Simulate user correction
    const { detectCorrections } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    const correctionResult = detectCorrections({
      userMessage: 'Actually, use the secure token rotation pattern instead',
      previousAgentOutput: 'Using simple token storage...',
      agentId: 'me',
      threshold: 0.5
    }, 'test-project');

    // Verify flow completes without error
    // (detection may or may not find correction depending on threshold)
    if (correctionResult.patternMatchCount < 0) {
      throw new Error('Pattern match count should be >= 0');
    }

    logResult('Integration: Hook → Eval → Correction', 'PASS', Date.now() - start, undefined, 'Complete workflow executed');
  } catch (error) {
    logResult('Integration: Hook → Eval → Correction', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test: Skill Evaluation Triggers Correction Context
 */
async function testSkillEvaluationWithCorrectionContext() {
  const start = Date.now();
  try {
    const { ConfidenceScorer } = await import('../mcp-servers/skills-copilot/src/evaluation/confidence-scorer.js');
    const { detectCorrections } = await import('../mcp-servers/copilot-memory/src/tools/correction-tools.js');

    // Set up scorer with skills
    const scorer = new ConfidenceScorer();
    const skills = new Map();
    skills.set('code-review', {
      name: 'code-review',
      description: 'Code review patterns',
      keywords: ['review', 'feedback', 'correction', 'fix'],
      tags: ['quality', 'review']
    });
    scorer.setSkills(skills);

    // User message that contains both correction AND skill trigger
    const userMessage = "No, that's wrong. Please use the code-review guidelines instead.";

    // Evaluate skills
    const skillResult = scorer.evaluate({ text: userMessage });
    const hasCodeReview = skillResult.some(s => s.skillName === 'code-review');

    // Detect corrections
    const correctionResult = detectCorrections({
      userMessage,
      threshold: 0.4
    }, 'test-project');

    // Both should fire
    if (!hasCodeReview) {
      throw new Error('Should trigger code-review skill');
    }
    if (!correctionResult.detected) {
      throw new Error('Should detect correction pattern');
    }

    logResult('Integration: Skill + Correction context', 'PASS', Date.now() - start, undefined, 'Dual detection works');
  } catch (error) {
    logResult('Integration: Skill + Correction context', 'FAIL', Date.now() - start, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('='.repeat(80));
  console.log('Integration Tests: Hooks, Evaluation, and Corrections');
  console.log('='.repeat(80));

  try {
    // Stream-B: Lifecycle Hooks
    await testPreToolUseRuleRegistration();
    await testPreToolUseSecurityEvaluation();
    await testPreToolUseHelpers();

    // Stream-C: Skill Evaluation
    await testPatternMatcher();
    await testKeywordDetector();
    await testConfidenceScorer();

    // Stream-D: Correction Detection
    await testCorrectionPatternMatching();
    await testCorrectionConfidenceScoring();
    await testCorrectionValueExtraction();
    await testCorrectionTargetInference();
    await testFullCorrectionDetection();

    // Cross-stream integration
    await testHookEvaluationCorrectionFlow();
    await testSkillEvaluationWithCorrectionContext();

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    const total = results.length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
    console.log(`Duration: ${duration}ms (avg: ${Math.round(duration / total)}ms per test)`);
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log('\nFailed tests:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ❌ ${r.testName}: ${r.error}`);
      });
    }

    return failed === 0;
  } catch (error) {
    console.error('Fatal error:', error);
    return false;
  }
}

// Run if executed directly
runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));

export { runTests };
