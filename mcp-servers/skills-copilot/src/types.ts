/**
 * Skills Hub Types
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  category?: string;
  keywords: string[];
  tags?: string[];
  author?: string;
  source: SkillSource;
  sourceUrl?: string;
  version: string;
  isProprietary: boolean;
  cachedAt?: Date;
  expiresAt?: Date;
}

export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  category?: string;
  keywords: string[];
  author?: string;
  source: SkillSource;
  stars?: number;
}

export interface SkillMatch extends SkillMeta {
  relevance: number;
  githubUrl?: string;  // URL to fetch skill content (for SkillsMP skills)
}

export type SkillSource = 'private' | 'skillsmp' | 'local' | 'cache';

export interface SkillSearchParams {
  query: string;
  source?: SkillSource;
  limit?: number;
}

export interface SkillGetParams {
  name: string;
  forceRefresh?: boolean;
}

export interface SkillSaveParams {
  name: string;
  description: string;
  content: string;
  category?: string;
  keywords: string[];
  tags?: string[];
  isProprietary?: boolean;
}

export interface CachedSkill {
  name: string;
  content: string;
  source: SkillSource;
  cachedAt: number;
  expiresAt: number;
}

export interface SkillsHubConfig {
  skillsmpApiKey?: string;
  postgresUrl?: string;
  cachePath: string;
  cacheTtlDays: number;
  localSkillsPath?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SkillsMPSearchResponse {
  success: boolean;
  data: {
    skills: SkillsMPSkill[];
  };
}

export interface SkillsMPSkill {
  id: string;
  name: string;
  author: string;
  description: string;
  githubUrl: string;
  skillUrl: string;
  stars: number;
  updatedAt: number;
}

export interface ProviderResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: SkillSource;
}
