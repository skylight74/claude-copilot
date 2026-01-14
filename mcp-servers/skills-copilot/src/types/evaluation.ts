/**
 * Skill Evaluation Types for Skills Copilot
 *
 * Defines interfaces for skill auto-detection and evaluation:
 * - PatternMatcher: File pattern-based triggers
 * - KeywordDetector: TF-IDF keyword extraction
 * - ConfidenceScorer: Unified scoring system
 *
 * @see PRD-6df7cc11-c4d4-4f48-9e0c-1275cf6fb327
 */

// ============================================================================
// PATTERN MATCHING TYPES
// ============================================================================

/**
 * A pattern that can trigger a skill
 */
export interface TriggerPattern {
  /** Glob-like pattern (e.g., "*.test.ts", "**\/spec.js") */
  pattern: string;

  /** Pattern type for categorization */
  type: 'glob' | 'regex' | 'extension' | 'directory';

  /** Relative weight for this pattern (default: 1.0) */
  weight?: number;
}

/**
 * A matched pattern instance
 */
export interface MatchedPattern {
  /** The pattern that matched */
  pattern: string;

  /** File path(s) that matched this pattern */
  matchedFiles: string[];

  /** Match score (0-1) */
  score: number;

  /** Pattern type */
  type: TriggerPattern['type'];
}

/**
 * Result from pattern matching
 */
export interface PatternMatchResult {
  /** Skill that matched */
  skillName: string;

  /** Overall confidence from pattern matching (0-1) */
  confidence: number;

  /** Individual patterns that matched */
  matchedPatterns: MatchedPattern[];

  /** Total files that matched */
  fileCount: number;
}

/**
 * Options for pattern matcher
 */
export interface PatternMatcherOptions {
  /** Whether to use case-insensitive matching (default: true) */
  caseInsensitive?: boolean;

  /** Maximum patterns to consider per skill (default: 50) */
  maxPatternsPerSkill?: number;

  /** Minimum score threshold (default: 0.1) */
  minScore?: number;
}

// ============================================================================
// KEYWORD DETECTION TYPES
// ============================================================================

/**
 * A keyword with its detection metadata
 */
export interface MatchedKeyword {
  /** The keyword that matched */
  keyword: string;

  /** TF-IDF score for this keyword */
  tfidfScore: number;

  /** Occurrences in the text */
  frequency: number;

  /** Position(s) in text where keyword was found */
  positions?: number[];
}

/**
 * Result from keyword detection
 */
export interface KeywordMatchResult {
  /** Skill that matched */
  skillName: string;

  /** Overall confidence from keyword matching (0-1) */
  confidence: number;

  /** Keywords that matched */
  matchedKeywords: MatchedKeyword[];

  /** Total keyword matches */
  matchCount: number;
}

/**
 * Options for keyword detector
 */
export interface KeywordDetectorOptions {
  /** Minimum TF-IDF score to consider (default: 0.1) */
  minTfidfScore?: number;

  /** Maximum keywords to return per skill (default: 20) */
  maxKeywordsPerSkill?: number;

  /** Whether to apply stemming (default: true) */
  applyStemming?: boolean;

  /** Stop words to filter out */
  stopWords?: string[];

  /** Minimum keyword length (default: 2) */
  minKeywordLength?: number;
}

// ============================================================================
// CONFIDENCE SCORING TYPES
// ============================================================================

/**
 * Confidence level categories
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Unified skill evaluation result
 */
export interface SkillEvaluationResult {
  /** Skill name */
  skillName: string;

  /** Combined confidence score (0-1) */
  confidence: number;

  /** Confidence level category */
  level: ConfidenceLevel;

  /** Pattern matching results (if any) */
  patternMatch?: PatternMatchResult;

  /** Keyword matching results (if any) */
  keywordMatch?: KeywordMatchResult;

  /** Human-readable explanation */
  reason: string;

  /** Metadata about the evaluation */
  metadata?: {
    /** Time taken to evaluate (ms) */
    evaluationTime?: number;
    /** Whether activity boost was applied */
    activityBoosted?: boolean;
    /** Original confidence before boosting */
    rawConfidence?: number;
  };
}

/**
 * Input context for evaluation
 */
export interface EvaluationContext {
  /** File paths to analyze for pattern matching */
  files?: string[];

  /** Text content to analyze for keyword matching */
  text?: string;

  /** Recent activity context for boosting */
  recentActivity?: string[];

  /** Current task context (if available) */
  taskContext?: {
    taskId?: string;
    taskTitle?: string;
    assignedAgent?: string;
  };
}

/**
 * Options for confidence scorer
 */
export interface ConfidenceScorerOptions {
  /** Minimum confidence threshold (default: 0.3) */
  threshold?: number;

  /** Weight for pattern matching signal (default: 0.5) */
  patternWeight?: number;

  /** Weight for keyword matching signal (default: 0.5) */
  keywordWeight?: number;

  /** Maximum results to return (default: 10) */
  limit?: number;

  /** Boost multiplier for recent activity matches (default: 1.2) */
  activityBoost?: number;
}

// ============================================================================
// SKILL EVALUATION TOOL TYPES
// ============================================================================

/**
 * Input for skill_evaluate tool
 */
export interface SkillEvaluateInput {
  /** File paths to analyze (optional) */
  files?: string[];

  /** Text content to analyze (optional) */
  text?: string;

  /** Maximum skills to return (default: 5) */
  limit?: number;

  /** Minimum confidence threshold (default: 0.3) */
  threshold?: number;
}

/**
 * Output from skill_evaluate tool
 */
export interface SkillEvaluateOutput {
  /** Evaluated skills above threshold */
  skills: SkillEvaluationResult[];

  /** Whether any skills matched */
  hasMatches: boolean;

  /** Highest confidence skill (if any) */
  bestMatch?: SkillEvaluationResult;

  /** Total skills evaluated */
  totalEvaluated: number;

  /** Evaluation metadata */
  metadata: {
    /** Time taken (ms) */
    evaluationTime: number;
    /** Whether files were analyzed */
    filesAnalyzed: boolean;
    /** Whether text was analyzed */
    textAnalyzed: boolean;
  };
}

// ============================================================================
// AUTO-DETECTION TRIGGER TYPES
// ============================================================================

/**
 * Trigger configuration for auto-detection
 */
export interface AutoDetectTrigger {
  /** File patterns that activate this skill */
  files?: string[];

  /** Keywords that activate this skill */
  keywords?: string[];

  /** Commands that activate this skill (e.g., /deploy, /test) */
  commands?: string[];

  /** Agent contexts that activate this skill (e.g., qa, sec) */
  agentContexts?: string[];
}

/**
 * Result from auto-detection check
 */
export interface AutoDetectResult {
  /** Skills that should be loaded */
  skillsToLoad: string[];

  /** Why each skill was triggered */
  triggers: Array<{
    skillName: string;
    triggerType: 'file' | 'keyword' | 'command' | 'agent';
    triggerValue: string;
    confidence: number;
  }>;

  /** Whether any skills were auto-detected */
  hasDetectedSkills: boolean;
}

/**
 * Options for auto-detection
 */
export interface AutoDetectOptions {
  /** Maximum skills to auto-load (default: 3) */
  maxSkills?: number;

  /** Minimum confidence to auto-load (default: 0.6) */
  minConfidence?: number;

  /** Whether to include low-confidence skills in suggestions (default: true) */
  includeSuggestions?: boolean;
}

// ============================================================================
// EVALUATION STATISTICS TYPES
// ============================================================================

/**
 * Statistics about skill evaluation usage
 */
export interface EvaluationStats {
  /** Total evaluations performed */
  totalEvaluations: number;

  /** Evaluations with at least one match */
  successfulMatches: number;

  /** Average confidence of matches */
  averageConfidence: number;

  /** Most frequently matched skills */
  topSkills: Array<{
    skillName: string;
    matchCount: number;
    averageConfidence: number;
  }>;

  /** Pattern vs keyword match distribution */
  matchDistribution: {
    patternOnly: number;
    keywordOnly: number;
    both: number;
  };
}
