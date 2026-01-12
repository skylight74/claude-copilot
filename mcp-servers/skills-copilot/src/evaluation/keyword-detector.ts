/**
 * Keyword Detection Engine
 *
 * Extracts keywords from prompts and matches against skill tags.
 * Uses TF-IDF inspired relevance scoring for keyword importance.
 */

import type { SkillMeta } from '../types.js';

/**
 * Keyword match result with confidence score
 */
export interface KeywordMatchResult {
  skillName: string;
  confidence: number;
  matchedKeywords: MatchedKeyword[];
}

/**
 * Individual matched keyword with details
 */
export interface MatchedKeyword {
  keyword: string;
  matchedFrom: 'keywords' | 'description' | 'name' | 'tags';
  weight: number;
  termFrequency: number;
}

/**
 * Match source weights (where the keyword was matched)
 */
const SOURCE_WEIGHTS = {
  name: 0.4,           // Keyword in skill name is highly relevant
  keywords: 0.35,      // Explicit keywords are very relevant
  tags: 0.25,          // Tags are moderately relevant
  description: 0.15,   // Description matches are less specific
};

/**
 * Stop words to filter from input text
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'you', 'your', 'this', 'these',
  'those', 'can', 'could', 'would', 'should', 'may', 'might',
  'i', 'we', 'they', 'she', 'him', 'her', 'them', 'us', 'me',
  'what', 'when', 'where', 'which', 'who', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'then', 'once', 'if', 'or', 'but', 'because', 'until', 'while',
  'do', 'does', 'did', 'have', 'had', 'having', 'been', 'being',
  'get', 'got', 'getting', 'make', 'made', 'making', 'use', 'used',
  'using', 'need', 'needs', 'want', 'wants', 'help', 'helps',
  'let', 'lets', 'please', 'thanks', 'thank', 'hi', 'hello', 'hey'
]);

/**
 * Keyword Detector class for text-based skill trigger detection
 */
export class KeywordDetector {
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments = 0;

  /**
   * Build the IDF (Inverse Document Frequency) index from skills
   *
   * @param skills - Map of skill name to metadata
   */
  buildIndex(skills: Map<string, SkillMeta>): void {
    this.documentFrequency.clear();
    this.totalDocuments = skills.size;

    for (const [, skill] of skills) {
      const terms = new Set<string>();

      // Add name terms
      this.tokenize(skill.name).forEach(t => terms.add(t));

      // Add keyword terms
      skill.keywords?.forEach(k =>
        this.tokenize(k).forEach(t => terms.add(t))
      );

      // Add tag terms
      skill.tags?.forEach(tag =>
        this.tokenize(tag).forEach(t => terms.add(t))
      );

      // Add description terms
      this.tokenize(skill.description || '').forEach(t => terms.add(t));

      // Increment document frequency for each unique term
      for (const term of terms) {
        const count = this.documentFrequency.get(term) || 0;
        this.documentFrequency.set(term, count + 1);
      }
    }
  }

  /**
   * Match text against skill keywords and tags
   *
   * @param text - Input text to analyze (prompt, conversation, etc.)
   * @param skills - Map of skill name to metadata
   * @returns Array of keyword match results with confidence scores
   */
  match(
    text: string,
    skills: Map<string, SkillMeta>
  ): KeywordMatchResult[] {
    const inputTerms = this.tokenize(text);
    const termFrequencies = this.calculateTermFrequencies(inputTerms);
    const results: KeywordMatchResult[] = [];

    for (const [skillName, skill] of skills.entries()) {
      const matchedKeywords = this.findMatches(
        termFrequencies,
        skill
      );

      if (matchedKeywords.length > 0) {
        const confidence = this.calculateConfidence(matchedKeywords, termFrequencies.size);
        results.push({
          skillName,
          confidence,
          matchedKeywords,
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Tokenize text into normalized terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')           // Remove punctuation except hyphens
      .split(/[\s_]+/)                      // Split on whitespace and underscores
      .flatMap(word => {
        // Also split on camelCase and kebab-case
        return word
          .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase
          .split(/[-\s]+/)                       // kebab-case
          .map(t => t.toLowerCase());
      })
      .filter(word =>
        word.length > 2 &&                  // Min length
        !STOP_WORDS.has(word) &&            // Filter stop words
        !/^\d+$/.test(word)                 // Filter pure numbers
      );
  }

  /**
   * Calculate term frequencies in input
   */
  private calculateTermFrequencies(terms: string[]): Map<string, number> {
    const frequencies = new Map<string, number>();
    for (const term of terms) {
      const count = frequencies.get(term) || 0;
      frequencies.set(term, count + 1);
    }
    return frequencies;
  }

  /**
   * Find matching keywords between input and skill
   */
  private findMatches(
    inputFrequencies: Map<string, number>,
    skill: SkillMeta
  ): MatchedKeyword[] {
    const matches: MatchedKeyword[] = [];
    const seenKeywords = new Set<string>();

    // Check skill name
    const nameTerms = this.tokenize(skill.name);
    for (const [inputTerm, freq] of inputFrequencies) {
      for (const nameTerm of nameTerms) {
        if (this.termsMatch(inputTerm, nameTerm) && !seenKeywords.has(inputTerm)) {
          seenKeywords.add(inputTerm);
          matches.push({
            keyword: inputTerm,
            matchedFrom: 'name',
            weight: SOURCE_WEIGHTS.name * this.getIdfWeight(inputTerm),
            termFrequency: freq,
          });
        }
      }
    }

    // Check explicit keywords
    if (skill.keywords) {
      for (const keyword of skill.keywords) {
        const keywordTerms = this.tokenize(keyword);
        for (const [inputTerm, freq] of inputFrequencies) {
          for (const kwTerm of keywordTerms) {
            if (this.termsMatch(inputTerm, kwTerm) && !seenKeywords.has(inputTerm)) {
              seenKeywords.add(inputTerm);
              matches.push({
                keyword: inputTerm,
                matchedFrom: 'keywords',
                weight: SOURCE_WEIGHTS.keywords * this.getIdfWeight(inputTerm),
                termFrequency: freq,
              });
            }
          }
        }
      }
    }

    // Check tags
    if (skill.tags) {
      for (const tag of skill.tags) {
        const tagTerms = this.tokenize(tag);
        for (const [inputTerm, freq] of inputFrequencies) {
          for (const tagTerm of tagTerms) {
            if (this.termsMatch(inputTerm, tagTerm) && !seenKeywords.has(inputTerm)) {
              seenKeywords.add(inputTerm);
              matches.push({
                keyword: inputTerm,
                matchedFrom: 'tags',
                weight: SOURCE_WEIGHTS.tags * this.getIdfWeight(inputTerm),
                termFrequency: freq,
              });
            }
          }
        }
      }
    }

    // Check description (lower priority)
    const descTerms = this.tokenize(skill.description || '');
    for (const [inputTerm, freq] of inputFrequencies) {
      for (const descTerm of descTerms) {
        if (this.termsMatch(inputTerm, descTerm) && !seenKeywords.has(inputTerm)) {
          seenKeywords.add(inputTerm);
          matches.push({
            keyword: inputTerm,
            matchedFrom: 'description',
            weight: SOURCE_WEIGHTS.description * this.getIdfWeight(inputTerm),
            termFrequency: freq,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Check if two terms match (exact or stemmed)
   */
  private termsMatch(term1: string, term2: string): boolean {
    // Exact match
    if (term1 === term2) return true;

    // Stemmed match (simple suffix removal)
    const stem1 = this.simpleStem(term1);
    const stem2 = this.simpleStem(term2);

    return stem1 === stem2 || stem1.startsWith(stem2) || stem2.startsWith(stem1);
  }

  /**
   * Simple stemming (remove common suffixes)
   */
  private simpleStem(word: string): string {
    const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 's', 'es', 'tion', 'ness'];
    for (const suffix of suffixes) {
      if (word.length > suffix.length + 3 && word.endsWith(suffix)) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  /**
   * Get IDF (Inverse Document Frequency) weight for a term
   *
   * Rare terms across skills get higher weight (more discriminative)
   */
  private getIdfWeight(term: string): number {
    const docFreq = this.documentFrequency.get(term) || 1;
    const idf = Math.log((this.totalDocuments + 1) / (docFreq + 1)) + 1;

    // Normalize to 0-1 range (max IDF would be when term appears in 1 doc)
    const maxIdf = Math.log(this.totalDocuments + 1) + 1;
    return Math.min(idf / maxIdf, 1);
  }

  /**
   * Calculate confidence score from matched keywords
   *
   * Combines weighted matches with TF-IDF inspired scoring
   */
  private calculateConfidence(matches: MatchedKeyword[], totalInputTerms: number): number {
    if (matches.length === 0) return 0;

    // Sum of weighted term frequencies
    let totalWeightedScore = 0;
    for (const match of matches) {
      // TF-IDF style: term frequency * weight (which includes IDF)
      const tfWeight = Math.log(1 + match.termFrequency); // Log damping for TF
      totalWeightedScore += tfWeight * match.weight;
    }

    // Normalize by expected score range
    // - High-quality matches: multiple name/keyword matches with rare terms
    // - Low-quality matches: few description matches with common terms
    const matchCoverage = matches.length / Math.max(totalInputTerms, 1);
    const avgWeight = totalWeightedScore / matches.length;

    // Combine components:
    // - 60% from average weight (quality of matches)
    // - 40% from match coverage (quantity of matches, capped)
    const qualityComponent = Math.min(avgWeight, 1) * 0.6;
    const coverageComponent = Math.min(matchCoverage * 3, 1) * 0.4;

    return Math.min(qualityComponent + coverageComponent, 1);
  }
}

/**
 * Default singleton instance
 */
export const keywordDetector = new KeywordDetector();
