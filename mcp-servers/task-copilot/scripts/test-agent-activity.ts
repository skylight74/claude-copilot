/**
 * Test script for agent activity tracking
 */

import { DatabaseClient } from './src/database.js';
import { taskCreate, taskUpdate } from './src/tools/task.js';
import type { TaskMetadata } from './src/types.js';

async function testAgentActivity() {
  console.log('Testing Agent Activity Tracking...\n');

  // Create test database
  const db = new DatabaseClient(process.cwd(), '/tmp/task-copilot-test');

  try {
    // 1. Create initiative
    db.upsertInitiative({
      id: 'INIT-test',
      title: 'Test Initiative',
      description: 'Testing agent activity',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 2. Create PRD
    db.insertPrd({
      id: 'PRD-test',
      initiative_id: 'INIT-test',
      title: 'Test PRD',
      description: 'Test PRD',
      content: 'Test PRD content',
      metadata: '{}',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 3. Create task
    console.log('1. Creating task...');
    const taskResult = await taskCreate(db, {
      title: 'Test Task for Activity Tracking',
      description: 'Testing agent activity tracking',
      prdId: 'PRD-test',
      assignedAgent: 'me',
      metadata: {
        streamId: 'Stream-A',
        streamName: 'foundation',
        phase: 'implementation'
      } as TaskMetadata
    });
    console.log(`   Created task: ${taskResult.id}`);

    // 4. Start task (should create activity record)
    console.log('\n2. Starting task (status -> in_progress)...');
    await taskUpdate(db, {
      id: taskResult.id,
      status: 'in_progress'
    });
    console.log('   Task started, activity should be tracked');

    // 5. Query activities
    console.log('\n3. Querying agent activities...');
    const activities = db.getAgentActivities({ activeOnly: true });
    console.log(`   Found ${activities.length} active activities:`);
    activities.forEach(activity => {
      console.log(`   - Agent: ${activity.agent_id}, Task: ${activity.task_id}`);
      console.log(`     Stream: ${activity.stream_id}, Phase: ${activity.phase || 'none'}`);
      console.log(`     Started: ${activity.started_at}`);
      console.log(`     Last heartbeat: ${activity.last_heartbeat}`);
    });

    // 6. Update heartbeat
    console.log('\n4. Updating heartbeat with new phase...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    db.updateAgentHeartbeat(taskResult.id, 'testing');
    const updatedActivities = db.getAgentActivities({ activeOnly: true });
    console.log(`   Heartbeat updated, phase changed to: ${updatedActivities[0]?.phase}`);

    // 7. Complete task (should mark activity as complete)
    console.log('\n5. Completing task...');
    await taskUpdate(db, {
      id: taskResult.id,
      status: 'completed'
    });
    console.log('   Task completed');

    // 8. Check active activities (should be empty)
    console.log('\n6. Checking active activities after completion...');
    const finalActivities = db.getAgentActivities({ activeOnly: true });
    console.log(`   Active activities: ${finalActivities.length}`);

    // 9. Check all activities (including completed)
    console.log('\n7. Checking all activities (including completed)...');
    const allActivities = db.getAgentActivities({ activeOnly: false });
    console.log(`   Total activities: ${allActivities.length}`);
    allActivities.forEach(activity => {
      console.log(`   - Task: ${activity.task_id}`);
      console.log(`     Completed: ${activity.completed_at || 'N/A'}`);
    });

    console.log('\n✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

testAgentActivity().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
