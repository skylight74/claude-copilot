/**
 * Correction Detection Types for Memory Copilot
 *
 * Defines interfaces for the two-stage correction workflow:
 * 1. Auto-capture: Detect correction patterns in user messages
 * 2. Manual review: User confirms via /reflect command
 *
 * @see PRD-6df7cc11-c4d4-4f48-9e0c-1275cf6fb327
 */

// ============================================================================
// CORRECTION PATTERN TYPES
// ============================================================================

/**
 * Known correction pattern types
 */
export type CorrectionPatternType =
  | 'explicit_correction'    // "Correction: X should be Y"
  | 'negation'               // "No, that's wrong..."
  | 'replacement'            // "Actually, use X instead of Y"
  | 'direct_overwrite'       // User edits/replaces agent output
  | 'clarification'          // "What I meant was..."
  | 'preference'             // "I prefer X over Y"
  | 'factual_error'          // "That's incorrect, the actual..."
  | 'style_preference';      // "Please don't use X, use Y instead"

/**
 * Pattern definition for correction detection
 */
export interface CorrectionPattern {
  /** Unique identifier for this pattern */
  id: string;

  /** Pattern type category */
  type: CorrectionPatternType;

  /** Regex pattern to match (as string) */
  pattern: string;

  /** Human-readable description */
  description: string;

  /** Example matches */
  examples: string[];

  /** Confidence weight (0-1) for this pattern */
  weight: number;

  /** Whether this pattern is enabled */
  enabled: boolean;
}

/**
 * A matched correction pattern
 */
export interface MatchedCorrectionPattern {
  /** Pattern that matched */
  patternId: string;

  /** Pattern type */
  type: CorrectionPatternType;

  /** Matched text */
  matchedText: string;

  /** Position in original text */
  position: {
    start: number;
    end: number;
  };

  /** Groups captured from regex */
  captures?: Record<string, string>;
}

// ============================================================================
// CORRECTION CAPTURE TYPES
// ============================================================================

/**
 * Status of a captured correction
 */
export type CorrectionStatus =
  | 'pending'    // Awaiting user review
  | 'approved'   // User confirmed the correction
  | 'rejected'   // User rejected (false positive)
  | 'applied'    // Correction was applied to skill/agent
  | 'expired';   // Correction expired without review

/**
 * Target for correction application
 */
export type CorrectionTarget =
  | 'skill'           // Update a skill file
  | 'agent'           // Update an agent instruction
  | 'memory'          // Store as lesson/decision
  | 'preference';     // Store as user preference

/**
 * A captured correction
 */
export interface CorrectionCapture {
  /** Unique identifier */
  id: string;

  /** Project ID */
  projectId: string;

  /** Session ID where correction occurred */
  sessionId?: string;

  /** Task ID if correction was task-specific */
  taskId?: string;

  /** Agent that received the correction */
  agentId?: string;

  /** The original content that was corrected */
  originalContent: string;

  /** The corrected/preferred content */
  correctedContent: string;

  /** User's raw message containing the correction */
  rawUserMessage: string;

  /** Patterns that matched */
  matchedPatterns: MatchedCorrectionPattern[];

  /** Auto-extracted what (what was wrong) */
  extractedWhat?: string;

  /** Auto-extracted why (why it's wrong) */
  extractedWhy?: string;

  /** Auto-extracted how (how to fix it) */
  extractedHow?: string;

  /** Where the correction applies */
  target: CorrectionTarget;

  /** Specific target identifier (skill name, agent id, etc.) */
  targetId?: string;

  /** Target section within the resource */
  targetSection?: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Current status */
  status: CorrectionStatus;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  appliedAt?: string;
  expiresAt?: string;

  /** Review metadata */
  reviewMetadata?: {
    reviewedBy?: 'user' | 'system';
    rejectionReason?: string;
    modifiedBefore?: string;
    modifiedAfter?: string;
  };
}

// ============================================================================
// CORRECTION REVIEW TYPES
// ============================================================================

/**
 * Review decision for a correction
 */
export interface CorrectionReviewDecision {
  /** Correction ID being reviewed */
  correctionId: string;

  /** Decision */
  decision: 'approve' | 'reject' | 'modify';

  /** Reason for rejection (if rejecting) */
  rejectionReason?: string;

  /** Modified correction (if modifying) */
  modifiedContent?: string;

  /** Additional notes */
  notes?: string;
}

/**
 * Result from applying a correction
 */
export interface CorrectionApplicationResult {
  /** Correction ID */
  correctionId: string;

  /** Whether application succeeded */
  success: boolean;

  /** What was modified */
  modifiedResource?: {
    type: CorrectionTarget;
    id: string;
    section?: string;
    diff?: string;
  };

  /** Error if application failed */
  error?: string;

  /** Backup of original content */
  backup?: {
    content: string;
    createdAt: string;
  };
}

// ============================================================================
// CORRECTION DETECTION INPUT/OUTPUT
// ============================================================================

/**
 * Input for correction detection
 */
export interface CorrectionDetectInput {
  /** User message to analyze */
  userMessage: string;

  /** Previous agent output (for context) */
  previousAgentOutput?: string;

  /** Current task context */
  taskId?: string;

  /** Current agent context */
  agentId?: string;

  /** Minimum confidence threshold (default: 0.5) */
  threshold?: number;
}

/**
 * Output from correction detection
 */
export interface CorrectionDetectOutput {
  /** Whether a correction was detected */
  detected: boolean;

  /** Detected corrections (if any) */
  corrections: CorrectionCapture[];

  /** Total patterns matched */
  patternMatchCount: number;

  /** Highest confidence score */
  maxConfidence: number;

  /** Suggested action */
  suggestedAction?: 'auto_capture' | 'prompt_user' | 'ignore';
}

// ============================================================================
// CORRECTION ROUTING TYPES
// ============================================================================

/**
 * Input for correction routing
 */
export interface CorrectionRouteInput {
  /** Correction ID to route */
  correctionId: string;

  /** Force specific target (override auto-detection) */
  forceTarget?: CorrectionTarget;

  /** Force specific target ID */
  forceTargetId?: string;

  /** Whether to apply immediately (skip review) */
  skipReview?: boolean;
}

/**
 * Output from correction routing
 */
export interface CorrectionRouteOutput {
  /** Correction ID */
  correctionId: string;

  /** Determined target */
  target: CorrectionTarget;

  /** Determined target ID */
  targetId: string;

  /** Target section (if applicable) */
  targetSection?: string;

  /** Routing confidence */
  confidence: number;

  /** Status after routing */
  status: CorrectionStatus;

  /** Next step instructions */
  nextStep: string;
}

// ============================================================================
// /REFLECT COMMAND TYPES
// ============================================================================

/**
 * Options for /reflect command
 */
export interface ReflectCommandOptions {
  /** Show only corrections with status */
  status?: CorrectionStatus;

  /** Show corrections for specific agent */
  agentId?: string;

  /** Limit number of corrections shown */
  limit?: number;

  /** Include applied corrections in history */
  includeApplied?: boolean;
}

/**
 * Summary for /reflect command output
 */
export interface ReflectSummary {
  /** Total corrections captured */
  totalCaptured: number;

  /** Corrections by status */
  byStatus: Record<CorrectionStatus, number>;

  /** Corrections by target */
  byTarget: Record<CorrectionTarget, number>;

  /** Corrections by agent */
  byAgent: Record<string, number>;

  /** Recent corrections awaiting review */
  pendingReview: CorrectionCapture[];

  /** Recently applied corrections */
  recentlyApplied: CorrectionCapture[];
}

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

/**
 * Database row for corrections table
 */
export interface CorrectionRow {
  id: string;
  project_id: string;
  session_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  original_content: string;
  corrected_content: string;
  raw_user_message: string;
  matched_patterns: string; // JSON
  extracted_what: string | null;
  extracted_why: string | null;
  extracted_how: string | null;
  target: string;
  target_id: string | null;
  target_section: string | null;
  confidence: number;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
  expires_at: string | null;
  review_metadata: string | null; // JSON
}

// ============================================================================
// CORRECTION STATISTICS
// ============================================================================

/**
 * Statistics about corrections
 */
export interface CorrectionStats {
  /** Total corrections captured */
  total: number;

  /** Corrections by status */
  byStatus: Record<CorrectionStatus, number>;

  /** Corrections by target type */
  byTarget: Record<CorrectionTarget, number>;

  /** Corrections by agent */
  byAgent: Record<string, number>;

  /** Average confidence of approved corrections */
  avgApprovedConfidence: number;

  /** False positive rate (rejected / total reviewed) */
  falsePositiveRate: number;

  /** Application success rate */
  applicationSuccessRate: number;

  /** Most common correction patterns */
  topPatterns: Array<{
    patternId: string;
    patternType: CorrectionPatternType;
    count: number;
  }>;
}
