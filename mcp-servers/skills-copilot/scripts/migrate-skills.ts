#!/usr/bin/env npx ts-node
/**
 * Migrate Proprietary Skills to PostgreSQL
 *
 * Reads SKILL.md files from the local skills directory and inserts
 * them into the PostgreSQL database as proprietary skills.
 *
 * Usage:
 *   POSTGRES_URL=postgresql://... npx ts-node scripts/migrate-skills.ts
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Skills to mark as proprietary (not for public sharing)
const PROPRIETARY_SKILLS = new Set([
  'forces-analysis',
  'moments-mapping',
  'service-blueprint',
  'colab-facilitation',
  'cocreate-sprint',
  'forces-quick'
]);

// Skills path relative to shared-docs root
const SKILLS_PATH = process.env.SKILLS_PATH || '../../../01-skills';

interface SkillMeta {
  name: string;
  description: string;
  content: string;
  category: string;
  keywords: string[];
  isProprietary: boolean;
}

/**
 * Parse SKILL.md frontmatter and content
 */
function parseSkillFile(filePath: string): SkillMeta | null {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.warn(`No frontmatter in: ${filePath}`);
      return null;
    }

    const frontmatter = frontmatterMatch[1];

    // Parse name
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    if (!nameMatch) {
      console.warn(`No name in: ${filePath}`);
      return null;
    }
    const name = nameMatch[1].trim();

    // Parse description
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract category from path
    const pathParts = filePath.split('/');
    const categoryIndex = pathParts.findIndex(p => p.includes('-skills') || p === '01-skills');
    let category = 'uncategorized';
    if (categoryIndex >= 0 && pathParts.length > categoryIndex + 1) {
      category = pathParts[categoryIndex + 1].replace(/^\d+-/, '');
    }

    // Extract keywords from description
    const keywords = extractKeywords(description);

    return {
      name,
      description,
      content,
      category,
      keywords,
      isProprietary: PROPRIETARY_SKILLS.has(name)
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'for', 'to', 'with',
    'use', 'when', 'you', 'your', 'of', 'in', 'on', 'at', 'by', 'this', 'that'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

/**
 * Recursively find all SKILL.md files
 */
function findSkillFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return files;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Check for SKILL.md in this directory
      const skillPath = join(fullPath, 'SKILL.md');
      if (existsSync(skillPath)) {
        files.push(skillPath);
      }
      // Recurse into subdirectories
      files.push(...findSkillFiles(fullPath));
    }
  }

  return files;
}

/**
 * Insert skill into database
 */
async function insertSkill(pool: pg.Pool, skill: SkillMeta): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO skills (name, description, content, category, keywords, is_proprietary, version)
       VALUES ($1, $2, $3, $4, $5, $6, '1.0.0')
       ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         content = EXCLUDED.content,
         category = EXCLUDED.category,
         keywords = EXCLUDED.keywords,
         is_proprietary = EXCLUDED.is_proprietary,
         updated_at = NOW()`,
      [
        skill.name,
        skill.description,
        skill.content,
        skill.category,
        skill.keywords,
        skill.isProprietary
      ]
    );
    return true;
  } catch (error) {
    console.error(`Failed to insert ${skill.name}:`, error);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  const postgresUrl = process.env.POSTGRES_URL;

  if (!postgresUrl) {
    console.error('POSTGRES_URL environment variable is required');
    console.log('\nUsage:');
    console.log('  POSTGRES_URL=postgresql://user:pass@host:5432/db npx ts-node scripts/migrate-skills.ts');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...');
  const pool = new Pool({ connectionString: postgresUrl });

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('Connected!\n');

    // Find all skill files
    const skillsDir = SKILLS_PATH.startsWith('/') ? SKILLS_PATH : join(__dirname, SKILLS_PATH);
    console.log(`Scanning: ${skillsDir}`);

    const skillFiles = findSkillFiles(skillsDir);
    console.log(`Found ${skillFiles.length} skill files\n`);

    let migrated = 0;
    let failed = 0;
    let skipped = 0;

    for (const filePath of skillFiles) {
      const skill = parseSkillFile(filePath);

      if (!skill) {
        skipped++;
        continue;
      }

      const status = skill.isProprietary ? '(proprietary)' : '(shared)';
      process.stdout.write(`Migrating: ${skill.name} ${status}... `);

      const success = await insertSkill(pool, skill);

      if (success) {
        console.log('✓');
        migrated++;
      } else {
        console.log('✗');
        failed++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Migrated: ${migrated}`);
    console.log(`Failed:   ${failed}`);
    console.log(`Skipped:  ${skipped}`);
    console.log(`Total:    ${skillFiles.length}`);

    // Show proprietary skills
    const result = await pool.query(
      'SELECT name, category, is_proprietary FROM skills WHERE is_proprietary = true ORDER BY name'
    );

    if (result.rows.length > 0) {
      console.log('\n--- Proprietary Skills in Database ---');
      for (const row of result.rows) {
        console.log(`  - ${row.name} (${row.category})`);
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate().catch(console.error);
