/**
 * Trigger Detection System
 *
 * Auto-detects skills based on file patterns and keywords in context.
 */

import type { SkillTriggers } from './types.js';

/**
 * Match score for trigger detection
 */
export interface TriggerMatch {
  skillName: string;
  score: number;
  matchedFiles: string[];
  matchedKeywords: string[];
}

/**
 * Context for trigger detection
 */
export interface TriggerContext {
  files?: string[];
  text?: string;
}

/**
 * Detect triggered skills from context
 *
 * @param context - Files and/or text to analyze
 * @param skillTriggers - Map of skill names to their trigger definitions
 * @returns Array of matched skills sorted by relevance score
 */
export function detectTriggeredSkills(
  context: TriggerContext,
  skillTriggers: Map<string, SkillTriggers>
): TriggerMatch[] {
  const matches: TriggerMatch[] = [];

  // Extract keywords from text
  const keywords = context.text
    ? extractKeywordsFromText(context.text)
    : [];

  // Check each skill's triggers
  for (const [skillName, triggers] of skillTriggers.entries()) {
    const match = evaluateSkillTriggers(skillName, triggers, context.files || [], keywords);

    if (match.score > 0) {
      matches.push(match);
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Evaluate a single skill's triggers against context
 */
function evaluateSkillTriggers(
  skillName: string,
  triggers: SkillTriggers,
  files: string[],
  keywords: string[]
): TriggerMatch {
  let score = 0;
  const matchedFiles: string[] = [];
  const matchedKeywords: string[] = [];

  // Check file patterns
  if (triggers.files && triggers.files.length > 0) {
    for (const file of files) {
      for (const pattern of triggers.files) {
        if (matchFilePattern(file, pattern)) {
          matchedFiles.push(file);
          score += 10; // Base score for file match
          break; // Only count each file once per skill
        }
      }
    }
  }

  // Check keywords
  if (triggers.keywords && triggers.keywords.length > 0) {
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      for (const triggerKeyword of triggers.keywords) {
        if (keywordLower.includes(triggerKeyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          score += 5; // Base score for keyword match
          break; // Only count each keyword once per skill
        }
      }
    }
  }

  return {
    skillName,
    score,
    matchedFiles,
    matchedKeywords
  };
}

/**
 * Match file path against glob-like pattern
 *
 * Supports:
 * - Wildcards: *.md, test-*.ts
 * - Extensions: .test.ts, .spec.js
 * - Path segments: **\/test/**\/, src/**\/
 */
function matchFilePattern(filePath: string, pattern: string): boolean {
  // Normalize paths
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')           // Escape dots
    .replace(/\*\*/g, '.*')          // ** matches any path segment
    .replace(/\*/g, '[^/]*')         // * matches within segment
    .replace(/\?/g, '[^/]');         // ? matches single character

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(normalizedPath);
}

/**
 * Extract keywords from text
 *
 * Extracts meaningful words, filtering out common stop words
 */
function extractKeywordsFromText(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'you', 'your', 'this', 'these',
    'those', 'can', 'could', 'would', 'should', 'may', 'might'
  ]);

  // Extract words (alphanumeric + hyphens)
  const words = text
    .toLowerCase()
    .match(/\b[a-z0-9][a-z0-9-]*[a-z0-9]\b|\b[a-z0-9]\b/g) || [];

  // Filter stop words and short words
  const keywords = words.filter(word =>
    word.length > 2 && !stopWords.has(word)
  );

  // Return unique keywords
  return [...new Set(keywords)];
}

/**
 * Format trigger match results for display
 */
export function formatTriggerMatches(matches: TriggerMatch[], limit = 5): string {
  if (matches.length === 0) {
    return 'No skills triggered by current context.';
  }

  const topMatches = matches.slice(0, limit);

  let output = `## Auto-Detected Skills (${matches.length} matched)\n\n`;
  output += '| Skill | Score | Matched Files | Matched Keywords |\n';
  output += '|-------|-------|---------------|------------------|\n';

  for (const match of topMatches) {
    const files = match.matchedFiles.length > 0
      ? match.matchedFiles.slice(0, 2).join(', ') + (match.matchedFiles.length > 2 ? '...' : '')
      : '-';
    const keywords = match.matchedKeywords.length > 0
      ? match.matchedKeywords.slice(0, 3).join(', ') + (match.matchedKeywords.length > 3 ? '...' : '')
      : '-';

    output += `| ${match.skillName} | ${match.score} | ${files} | ${keywords} |\n`;
  }

  if (matches.length > limit) {
    output += `\n_Showing top ${limit} of ${matches.length} matches_\n`;
  }

  output += '\n\nUse `skill_get(name)` to load a skill.';

  return output;
}
