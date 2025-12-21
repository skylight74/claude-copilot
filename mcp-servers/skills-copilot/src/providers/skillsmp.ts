/**
 * SkillsMP Provider
 *
 * Fetches public skills from the SkillsMP API (25,000+ skills)
 */

import type { SkillMeta, SkillMatch, SkillsMPSearchResponse, SkillsMPSkill, ProviderResult } from '../types.js';

const SKILLSMP_API = 'https://skillsmp.com/api/v1';

export class SkillsMPProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for skills by query
   */
  async searchSkills(query: string, limit = 10): Promise<ProviderResult<SkillMatch[]>> {
    try {
      const response = await fetch(
        `${SKILLSMP_API}/skills/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `SkillsMP API error: ${response.status}`,
          source: 'skillsmp'
        };
      }

      const data = await response.json() as SkillsMPSearchResponse;

      const matches: SkillMatch[] = data.data.skills
        .slice(0, limit)
        .map((skill, index) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          author: skill.author,
          keywords: this.extractKeywords(skill.description),
          source: 'skillsmp' as const,
          stars: skill.stars,
          relevance: 1 - (index * 0.1), // Simple relevance based on position
          githubUrl: skill.githubUrl  // Include GitHub URL for content fetching
        }));

      return {
        success: true,
        data: matches,
        source: 'skillsmp'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'skillsmp'
      };
    }
  }

  /**
   * Fetch full skill content from GitHub
   */
  async getSkillContent(githubUrl: string): Promise<ProviderResult<string>> {
    try {
      // Convert GitHub URL to raw content URL
      // https://github.com/user/repo/tree/main/path/to/skill
      // -> https://raw.githubusercontent.com/user/repo/main/path/to/skill/SKILL.md
      const rawUrl = githubUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/tree/', '/');

      const skillMdUrl = `${rawUrl}/SKILL.md`;

      const response = await fetch(skillMdUrl);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch skill content: ${response.status}`,
          source: 'skillsmp'
        };
      }

      const content = await response.text();

      return {
        success: true,
        data: content,
        source: 'skillsmp'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'skillsmp'
      };
    }
  }

  /**
   * Search and fetch full skill by name
   */
  async getSkillByName(name: string): Promise<ProviderResult<{ meta: SkillMeta; content: string }>> {
    // Search for the skill
    const searchResult = await this.searchSkills(name, 10);

    if (!searchResult.success || !searchResult.data?.length) {
      return {
        success: false,
        error: `Skill not found in SkillsMP: ${name}`,
        source: 'skillsmp'
      };
    }

    // Find exact match or closest match
    const match = searchResult.data.find(s =>
      s.name.toLowerCase() === name.toLowerCase()
    ) || searchResult.data[0];

    // Use the githubUrl from search results (now included)
    if (!match.githubUrl) {
      return {
        success: false,
        error: `No GitHub URL available for skill: ${name}`,
        source: 'skillsmp'
      };
    }

    // Fetch content from GitHub
    const contentResult = await this.getSkillContent(match.githubUrl);

    if (!contentResult.success || !contentResult.data) {
      return {
        success: false,
        error: contentResult.error || 'Failed to fetch skill content from GitHub',
        source: 'skillsmp'
      };
    }

    return {
      success: true,
      data: {
        meta: {
          id: match.id,
          name: match.name,
          description: match.description,
          author: match.author,
          keywords: match.keywords,
          source: 'skillsmp',
          stars: match.stars
        },
        content: contentResult.data
      },
      source: 'skillsmp'
    };
  }

  /**
   * Extract keywords from description
   */
  private extractKeywords(description: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'for', 'to', 'from', 'with',
      'use', 'when', 'you', 'your', 'of', 'in', 'on', 'at', 'by'
    ]);

    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }
}
