#!/usr/bin/env ts-node
/**
 * Test script for confidence scoring feature
 */

import { DatabaseClient } from './src/database.js';
import { workProductStore, workProductGet, workProductList } from './src/tools/work-product.js';
import { progressSummary } from './src/tools/initiative.js';
import { v4 as uuidv4 } from 'uuid';

async function testConfidenceScoring() {
  console.log('Testing Confidence Scoring Feature...\n');

  // Initialize database with temp path
  const testDbPath = `/tmp/test-confidence-${Date.now()}`;
  const db = new DatabaseClient(testDbPath, testDbPath, 'test-workspace');

  try {
    // 1. Create initiative
    const initiativeId = `INIT-${uuidv4()}`;
    db.upsertInitiative({
      id: initiativeId,
      title: 'Test Initiative',
      description: 'Testing confidence scoring',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log('✓ Created initiative:', initiativeId);

    // 2. Create PRD
    const prdId = `PRD-${uuidv4()}`;
    db.insertPrd({
      id: prdId,
      initiative_id: initiativeId,
      title: 'Test PRD',
      description: 'Test PRD',
      content: 'Test content',
      metadata: JSON.stringify({}),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log('✓ Created PRD:', prdId);

    // 3. Create tasks
    const task1Id = `TASK-${uuidv4()}`;
    db.insertTask({
      id: task1Id,
      prd_id: prdId,
      parent_id: null,
      title: 'Test Task 1',
      description: 'Task for high confidence work product',
      assigned_agent: 'ta',
      status: 'in_progress',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });
    console.log('✓ Created task 1:', task1Id);

    const task2Id = `TASK-${uuidv4()}`;
    db.insertTask({
      id: task2Id,
      prd_id: prdId,
      parent_id: null,
      title: 'Test Task 2',
      description: 'Task for low confidence work product',
      assigned_agent: 'qa',
      status: 'in_progress',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });
    console.log('✓ Created task 2:', task2Id);

    // 4. Store work products with confidence scores
    console.log('\nStoring work products with confidence scores...');

    const wp1 = await workProductStore(db, {
      taskId: task1Id,
      type: 'architecture',
      title: 'High Confidence Design',
      content: 'This is a well-researched architectural decision with high confidence.',
      confidence: 0.95
    });
    console.log('✓ Stored high confidence work product:', wp1.id, '(confidence: 0.95)');

    const wp2 = await workProductStore(db, {
      taskId: task2Id,
      type: 'test_plan',
      title: 'Low Confidence Finding',
      content: 'This is a suspected issue that needs more investigation.',
      confidence: 0.35
    });
    console.log('✓ Stored low confidence work product:', wp2.id, '(confidence: 0.35)');

    const wp3 = await workProductStore(db, {
      taskId: task1Id,
      type: 'implementation',
      title: 'No Confidence Score',
      content: 'Informational work product without confidence score.'
      // No confidence provided (should be null)
    });
    console.log('✓ Stored work product without confidence:', wp3.id, '(confidence: null)');

    // 5. Test work_product_get
    console.log('\nTesting work_product_get...');
    const retrieved = workProductGet(db, { id: wp1.id });
    if (retrieved && retrieved.confidence === 0.95) {
      console.log('✓ Retrieved work product with correct confidence:', retrieved.confidence);
    } else {
      console.error('✗ Failed to retrieve confidence correctly');
    }

    // 6. Test work_product_list
    console.log('\nTesting work_product_list...');
    const list = workProductList(db, { taskId: task1Id });
    console.log('✓ Listed work products for task:', list.length, 'items');
    list.forEach(wp => {
      console.log(`  - ${wp.title}: confidence = ${wp.confidence ?? 'null'}`);
    });

    // 7. Test progress_summary without filter
    console.log('\nTesting progress_summary without confidence filter...');
    const summaryAll = progressSummary(db, { initiativeId });
    console.log('✓ Total work products:', summaryAll.workProducts.total);
    if (summaryAll.workProducts.confidenceStats) {
      console.log('  Confidence stats:');
      console.log('    Average:', summaryAll.workProducts.confidenceStats.averageConfidence.toFixed(2));
      console.log('    High (0.8+):', summaryAll.workProducts.confidenceStats.highConfidence);
      console.log('    Medium (0.5-0.79):', summaryAll.workProducts.confidenceStats.mediumConfidence);
      console.log('    Low (<0.5):', summaryAll.workProducts.confidenceStats.lowConfidence);
      console.log('    No confidence:', summaryAll.workProducts.confidenceStats.noConfidence);
    }

    // 8. Test progress_summary with confidence filter
    console.log('\nTesting progress_summary with minConfidence=0.5...');
    const summaryFiltered = progressSummary(db, { initiativeId, minConfidence: 0.5 });
    console.log('✓ Filtered work products (>= 0.5):', summaryFiltered.workProducts.total);
    console.log('  (Should exclude low confidence work product)');

    // 9. Test confidence validation
    console.log('\nTesting confidence validation...');
    try {
      await workProductStore(db, {
        taskId: task1Id,
        type: 'implementation',
        title: 'Invalid Confidence',
        content: 'Testing invalid confidence value',
        confidence: 1.5 // Invalid - should throw
      });
      console.error('✗ Failed to validate confidence (should have thrown)');
    } catch (error) {
      console.log('✓ Correctly rejected invalid confidence:', (error as Error).message);
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    db.getDb().close();
  }
}

// Run tests
testConfidenceScoring().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
