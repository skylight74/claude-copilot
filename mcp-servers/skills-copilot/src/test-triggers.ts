#!/usr/bin/env node
/**
 * Test script for trigger detection system
 */

import { detectTriggeredSkills, formatTriggerMatches } from './triggers.js';
import type { SkillTriggers } from './types.js';

// Mock skill triggers
const mockTriggers = new Map<string, SkillTriggers>([
  ['token-budget-check', {
    files: ['*.md', '**\/docs/**\/*.md', '**\/documentation/**\/*.md'],
    keywords: ['token', 'budget', 'documentation', 'word-count', 'tokens', 'over-budget']
  }],
  ['link-validation', {
    files: ['*.md', '**\/docs/**\/*.md'],
    keywords: ['links', 'broken-links', 'validation', 'cross-reference', 'anchor', 'markdown-links']
  }],
  ['frontmatter-validation', {
    files: ['*.md', '**\/SKILL.md'],
    keywords: ['frontmatter', 'yaml', 'metadata', 'validation', 'headers']
  }]
]);

console.log('=== Trigger Detection Test ===\n');

// Test 1: File pattern matching
console.log('Test 1: Markdown files in docs directory');
const test1 = detectTriggeredSkills(
  { files: ['docs/api.md', 'docs/setup.md', 'README.md'] },
  mockTriggers
);
console.log(formatTriggerMatches(test1));
console.log();

// Test 2: Keyword matching
console.log('Test 2: Documentation with token budget concerns');
const test2 = detectTriggeredSkills(
  { text: 'This documentation file is over budget with too many tokens' },
  mockTriggers
);
console.log(formatTriggerMatches(test2));
console.log();

// Test 3: Combined file + keyword matching
console.log('Test 3: SKILL.md with frontmatter keywords');
const test3 = detectTriggeredSkills(
  {
    files: ['templates/skills/test/SKILL.md'],
    text: 'Check the yaml frontmatter metadata for validation errors'
  },
  mockTriggers
);
console.log(formatTriggerMatches(test3));
console.log();

// Test 4: Test file pattern matching
console.log('Test 4: Documentation subdirectory');
const test4 = detectTriggeredSkills(
  { files: ['documentation/guides/getting-started.md'] },
  mockTriggers
);
console.log(formatTriggerMatches(test4));
console.log();

// Test 5: No matches
console.log('Test 5: No matching triggers');
const test5 = detectTriggeredSkills(
  { files: ['src/index.ts', 'package.json'] },
  mockTriggers
);
console.log(formatTriggerMatches(test5));

console.log('\n=== Tests Complete ===');
