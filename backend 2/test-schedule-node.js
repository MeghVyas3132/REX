// Quick test to see if schedule node loads and executes
const path = require('path');

try {
  console.log('Testing schedule node import...');
  
  // Try to load the schedule node
  const scheduleNodePath = path.join(__dirname, 'dist/nodes/triggers/schedule.node.js');
  console.log('Loading from:', scheduleNodePath);
  
  const scheduleModule = require(scheduleNodePath);
  console.log('Module exports:', Object.keys(scheduleModule));
  
  const ScheduleNode = scheduleModule.default || scheduleModule.ScheduleNode || scheduleModule;
  console.log('ScheduleNode type:', typeof ScheduleNode);
  
  if (typeof ScheduleNode !== 'function') {
    console.error('ERROR: ScheduleNode is not a function/class');
    process.exit(1);
  }
  
  // Try to instantiate
  console.log('Instantiating ScheduleNode...');
  const instance = new ScheduleNode();
  console.log('Instance created:', !!instance);
  
  // Check for getNodeDefinition
  if (typeof instance.getNodeDefinition !== 'function') {
    console.error('ERROR: getNodeDefinition is not a function');
    process.exit(1);
  }
  
  const definition = instance.getNodeDefinition();
  console.log('Node definition ID:', definition.id);
  console.log('Node definition type:', definition.type);
  
  // Check for execute
  if (typeof instance.execute !== 'function') {
    console.error('ERROR: execute is not a function');
    process.exit(1);
  }
  
  console.log('✅ Schedule node loads correctly!');
  
  // Try a simple execution
  console.log('\nTesting execution...');
  const testNode = {
    id: 'test-1',
    type: 'trigger',
    data: {
      config: {},
      options: {
        triggerInterval: 5,
        triggerIntervalUnit: 'minutes',
        timezone: 'UTC'
      }
    }
  };
  
  const testContext = {
    runId: 'test-run',
    workflowId: 'test-workflow',
    nodeId: 'test-1',
    input: {},
    output: {},
    variables: {},
    credentials: {}
  };
  
  instance.execute(testNode, testContext)
    .then(result => {
      console.log('✅ Execution successful!');
      console.log('Result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Execution failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
  
} catch (error) {
  console.error('❌ Error loading schedule node:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

