/**
 * Pattern Matching Engine
 *
 * Matches file extensions, paths, and naming conventions against skill metadata.
 * Returns confidence scores for file-based skill triggers.
 */

import type { SkillMeta, SkillTriggers } from '../types.js';

/**
 * Pattern match result with confidence score
 */
export interface PatternMatchResult {
  skillName: string;
  confidence: number;
  matchedPatterns: MatchedPattern[];
}

/**
 * Individual matched pattern with details
 */
export interface MatchedPattern {
  pattern: string;
  matchedFile: string;
  weight: number;
}

/**
 * Pattern weights for scoring
 */
const PATTERN_WEIGHTS = {
  exactExtension: 0.3,      // *.ts matches file.ts
  partialExtension: 0.2,    // *.test.ts matches file.test.ts
  directoryMatch: 0.25,     // src/** matches src/foo/bar
  filenameMatch: 0.35,      // **/config.json matches any config.json
  wildcardMatch: 0.15,      // generic wildcard patterns
};

/**
 * Pattern Matcher class for file-based skill trigger detection
 */
export class PatternMatcher {
  /**
   * Match files against skill trigger patterns
   *
   * @param files - Array of file paths to analyze
   * @param skills - Map of skill name to metadata with triggers
   * @returns Array of pattern match results with confidence scores
   */
  match(
    files: string[],
    skills: Map<string, SkillMeta>
  ): PatternMatchResult[] {
    const results: PatternMatchResult[] = [];

    for (const [skillName, skill] of skills.entries()) {
      if (!skill.triggers?.files || skill.triggers.files.length === 0) {
        continue;
      }

      const matchedPatterns = this.evaluatePatterns(files, skill.triggers.files);

      if (matchedPatterns.length > 0) {
        const confidence = this.calculateConfidence(matchedPatterns, files.length);
        results.push({
          skillName,
          confidence,
          matchedPatterns,
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Evaluate patterns against files
   */
  private evaluatePatterns(files: string[], patterns: string[]): MatchedPattern[] {
    const matched: MatchedPattern[] = [];

    for (const file of files) {
      for (const pattern of patterns) {
        if (this.matchFilePattern(file, pattern)) {
          const weight = this.getPatternWeight(pattern, file);
          matched.push({
            pattern,
            matchedFile: file,
            weight,
          });
        }
      }
    }

    return matched;
  }

  /**
   * Match file path against glob-like pattern
   *
   * Supports:
   * - Wildcards: *.md, test-*.ts
   * - Extensions: .test.ts, .spec.js
   * - Path segments: ** /test/** /, src/** /
   * - Exact filenames: config.json, package.json
   */
  matchFilePattern(filePath: string, pattern: string): boolean {
    // Normalize paths
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Handle exact filename matches
    if (!normalizedPattern.includes('*') && !normalizedPattern.includes('?')) {
      const fileName = normalizedPath.split('/').pop() || '';
      return fileName === normalizedPattern || normalizedPath.endsWith('/' + normalizedPattern);
    }

    // Convert glob pattern to regex
    const regexPattern = this.globToRegex(normalizedPattern);
    const regex = new RegExp(regexPattern, 'i');

    return regex.test(normalizedPath);
  }

  /**
   * Convert glob pattern to regex string
   */
  private globToRegex(pattern: string): string {
    let regex = pattern
      .replace(/\./g, '\\.')           // Escape dots
      .replace(/\*\*/g, '\u0001')      // Temporary placeholder for **
      .replace(/\*/g, '[^/]*')         // * matches within segment
      .replace(/\u0001/g, '.*')        // ** matches any path segment
      .replace(/\?/g, '[^/]');         // ? matches single character

    // If pattern doesn't start with **, allow matching anywhere in path
    if (!pattern.startsWith('**')) {
      regex = '(?:^|/)' + regex;
    }

    // If pattern doesn't end with **, require end of string
    if (!pattern.endsWith('**')) {
      regex = regex + '$';
    }

    return regex;
  }

  /**
   * Get weight for a pattern match based on specificity
   */
  private getPatternWeight(pattern: string, file: string): number {
    const fileName = file.split('/').pop() || '';

    // Exact filename match (most specific)
    if (!pattern.includes('*') && !pattern.includes('?')) {
      return PATTERN_WEIGHTS.filenameMatch;
    }

    // Extension with compound (e.g., *.test.ts, *.spec.js)
    if (pattern.match(/\*\.[a-z]+\.[a-z]+$/i)) {
      return PATTERN_WEIGHTS.partialExtension;
    }

    // Simple extension match (e.g., *.ts, *.md)
    if (pattern.match(/^\*\.[a-z]+$/i)) {
      return PATTERN_WEIGHTS.exactExtension;
    }

    // Directory pattern (e.g., src/**, test/**)
    if (pattern.includes('**') && pattern.includes('/')) {
      return PATTERN_WEIGHTS.directoryMatch;
    }

    // Generic wildcard
    return PATTERN_WEIGHTS.wildcardMatch;
  }

  /**
   * Calculate confidence score from matched patterns
   *
   * Uses a weighted average with diminishing returns for multiple matches
   */
  private calculateConfidence(matches: MatchedPattern[], totalFiles: number): number {
    if (matches.length === 0) return 0;

    // Group matches by file to avoid double-counting
    const fileMatches = new Map<string, MatchedPattern[]>();
    for (const match of matches) {
      const existing = fileMatches.get(match.matchedFile) || [];
      existing.push(match);
      fileMatches.set(match.matchedFile, existing);
    }

    // Calculate score per file (take highest weight pattern per file)
    let totalWeight = 0;
    for (const [, filePatterns] of fileMatches) {
      const maxWeight = Math.max(...filePatterns.map(m => m.weight));
      totalWeight += maxWeight;
    }

    // Base confidence from matches
    const matchRatio = fileMatches.size / Math.max(totalFiles, 1);

    // Combine weight and match ratio
    // - High weight patterns = higher confidence
    // - More files matched = higher confidence (with diminishing returns)
    const weightComponent = Math.min(totalWeight / fileMatches.size, 1) * 0.6;
    const ratioComponent = Math.min(matchRatio * 2, 1) * 0.4; // Cap at 50% of files

    return Math.min(weightComponent + ratioComponent, 1);
  }
}

/**
 * Default singleton instance
 */
export const patternMatcher = new PatternMatcher();
