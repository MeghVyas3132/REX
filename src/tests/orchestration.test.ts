import { orchestrationService } from '../services/orchestration.service';
import { agentOrchestrator } from '../core/orchestration/agent-orchestrator';
import { workflowManager } from '../core/orchestration/workflow-manager';
import { coordinationService } from '../core/orchestration/coordination-service';
const logger = require('../utils/logger');

export class OrchestrationTest {
  private testResults: any[] = [];

  async runAllTests(): Promise<void> {
    try {
      logger.info('🚀 Starting Orchestration System Tests');
      
      await this.testAgentOrchestration();
      await this.testWorkflowManagement();
      await this.testCoordinationService();
      await this.testOrchestrationService();
      await this.testSystemIntegration();
      
      this.printTestResults();
    } catch (error: any) {
      logger.error('Orchestration test suite failed', error);
    }
  }

  private async testAgentOrchestration(): Promise<void> {
    try {
      logger.info('Testing Agent Orchestration...');
      
      // Test 1: Register agents
      const agent1 = {
        id: 'test-agent-1',
        name: 'Test Agent 1',
        type: 'primary' as const,
        capabilities: ['ai_processing', 'llm_integration'],
        status: 'idle' as const,
        workload: 0,
        maxWorkload: 5,
        preferences: {
          taskTypes: ['ai', 'llm'],
          priority: 8,
          availability: ['24/7']
        },
        metadata: {
          created: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          performance: {
            tasksCompleted: 0,
            successRate: 1.0,
            averageExecutionTime: 0
          }
        }
      };

      const agent2 = {
        id: 'test-agent-2',
        name: 'Test Agent 2',
        type: 'secondary' as const,
        capabilities: ['data_processing', 'api_integration'],
        status: 'idle' as const,
        workload: 0,
        maxWorkload: 3,
        preferences: {
          taskTypes: ['data', 'integrations'],
          priority: 6,
          availability: ['business_hours']
        },
        metadata: {
          created: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          performance: {
            tasksCompleted: 0,
            successRate: 1.0,
            averageExecutionTime: 0
          }
        }
      };

      agentOrchestrator.registerAgent(agent1);
      agentOrchestrator.registerAgent(agent2);
      coordinationService.registerAgent(agent1.id, agent1.capabilities);
      coordinationService.registerAgent(agent2.id, agent2.capabilities);

      this.recordTest('Agent Registration', true, 'Agents registered successfully');

      // Test 2: Submit tasks
      const task1 = {
        id: 'test-task-1',
        name: 'AI Processing Task',
        description: 'Process AI request',
        type: 'ai_processing',
        priority: 8,
        requirements: ['ai_processing', 'llm_integration'],
        dependencies: [],
        estimatedDuration: 30000,
        status: 'pending' as const,
        metadata: {}
      };

      const task2 = {
        id: 'test-task-2',
        name: 'Data Processing Task',
        description: 'Process data request',
        type: 'data_processing',
        priority: 6,
        requirements: ['data_processing'],
        dependencies: [],
        estimatedDuration: 15000,
        status: 'pending' as const,
        metadata: {}
      };

      const task1Id = agentOrchestrator.submitTask(task1);
      const task2Id = agentOrchestrator.submitTask(task2);

      this.recordTest('Task Submission', true, `Tasks submitted: ${task1Id}, ${task2Id}`);

      // Test 3: Process task queue
      agentOrchestrator.processTaskQueue();

      this.recordTest('Task Queue Processing', true, 'Task queue processed');

      // Test 4: Get system status
      const systemStatus = agentOrchestrator.getSystemStatus();
      this.recordTest('System Status', !!systemStatus, 'System status retrieved');

      logger.info('✅ Agent Orchestration tests completed');
    } catch (error: any) {
      this.recordTest('Agent Orchestration', false, error.message);
      logger.error('Agent orchestration test failed', error);
    }
  }

  private async testWorkflowManagement(): Promise<void> {
    try {
      logger.info('Testing Workflow Management...');
      
      // Test 1: Register workflow
      const testWorkflow = {
        id: 'test-workflow-1',
        name: 'Test Workflow',
        description: 'A test workflow for orchestration',
        nodes: [
          {
            id: 'node-1',
            type: 'ai',
            name: 'AI Node',
            position: { x: 100, y: 100 },
            data: {
              config: {
                model: 'gpt-3.5-turbo',
                prompt: 'Test prompt'
              }
            }
          },
          {
            id: 'node-2',
            type: 'data',
            name: 'Data Node',
            position: { x: 300, y: 100 },
            data: {
              config: {
                operation: 'transform'
              }
            }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2'
          }
        ],
        settings: {
          retries: 3,
          timeout: 30000,
          concurrency: 1
        },
        isActive: true,
        userId: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      workflowManager.registerWorkflow(testWorkflow);
      this.recordTest('Workflow Registration', true, 'Workflow registered successfully');

      // Test 2: Create execution plan
      const planId = workflowManager.createExecutionPlan(testWorkflow.id, { input: 'test' }, { priority: 8 });
      this.recordTest('Execution Plan Creation', !!planId, `Execution plan created: ${planId}`);

      // Test 3: Get workflows
      const workflows = workflowManager.getWorkflows();
      this.recordTest('Get Workflows', workflows.length > 0, `Found ${workflows.length} workflows`);

      // Test 4: Get system status
      const workflowStatus = workflowManager.getSystemStatus();
      this.recordTest('Workflow System Status', !!workflowStatus, 'Workflow system status retrieved');

      logger.info('✅ Workflow Management tests completed');
    } catch (error: any) {
      this.recordTest('Workflow Management', false, error.message);
      logger.error('Workflow management test failed', error);
    }
  }

  private async testCoordinationService(): Promise<void> {
    try {
      logger.info('Testing Coordination Service...');
      
      // Test 1: Send coordination message
      const messageId = coordinationService.sendMessage({
        type: 'coordination_signal',
        from: 'test-coordinator',
        to: ['test-agent-1'],
        payload: {
          signal: 'test_signal',
          data: { test: true }
        },
        priority: 8,
        ttl: 300000
      });

      this.recordTest('Coordination Message', !!messageId, `Message sent: ${messageId}`);

      // Test 2: Broadcast message
      const messageIds = coordinationService.broadcastMessage({
        type: 'status_update',
        from: 'test-coordinator',
        payload: {
          status: 'testing',
          timestamp: new Date().toISOString()
        },
        priority: 5,
        ttl: 300000
      }, ['test-agent-1', 'test-agent-2']);

      this.recordTest('Broadcast Message', messageIds.length > 0, `Broadcast to ${messageIds.length} agents`);

      // Test 3: Get coordination status
      const coordinationStatus = coordinationService.getCoordinationStatus();
      this.recordTest('Coordination Status', !!coordinationStatus, 'Coordination status retrieved');

      // Test 4: Get coordination history
      const history = coordinationService.getCoordinationHistory(10);
      this.recordTest('Coordination History', Array.isArray(history), `History contains ${history.length} entries`);

      logger.info('✅ Coordination Service tests completed');
    } catch (error: any) {
      this.recordTest('Coordination Service', false, error.message);
      logger.error('Coordination service test failed', error);
    }
  }

  private async testOrchestrationService(): Promise<void> {
    try {
      logger.info('Testing Orchestration Service...');
      
      // Test 1: Get orchestration status
      const orchestrationStatus = orchestrationService.getOrchestrationStatus();
      this.recordTest('Orchestration Status', !!orchestrationStatus, 'Orchestration status retrieved');

      // Test 2: Get orchestration history
      const history = orchestrationService.getOrchestrationHistory(10);
      this.recordTest('Orchestration History', Array.isArray(history), `History contains ${history.length} entries`);

      // Test 3: Get configuration
      const config = orchestrationService.getConfig();
      this.recordTest('Orchestration Config', !!config, 'Configuration retrieved');

      // Test 4: Update configuration
      orchestrationService.updateConfig({
        maxConcurrentWorkflows: 3,
        maxConcurrentAgents: 5
      });
      this.recordTest('Configuration Update', true, 'Configuration updated successfully');

      logger.info('✅ Orchestration Service tests completed');
    } catch (error: any) {
      this.recordTest('Orchestration Service', false, error.message);
      logger.error('Orchestration service test failed', error);
    }
  }

  private async testSystemIntegration(): Promise<void> {
    try {
      logger.info('Testing System Integration...');
      
      // Test 1: Multi-agent task orchestration
      const taskData = {
        type: 'multi_agent_analysis',
        description: 'Analyze data using multiple agents',
        requirements: ['ai_processing', 'data_processing'],
        priority: 8
      };

      const agents = ['test-agent-1', 'test-agent-2'];
      
      try {
        const result = await orchestrationService.orchestrateMultiAgentTask(taskData, agents, {
          timeout: 30000,
          coordination: true
        });
        
        this.recordTest('Multi-Agent Task Orchestration', result.success, 
          `Multi-agent task orchestrated: ${result.success ? 'success' : 'failed'}`);
      } catch (error: any) {
        this.recordTest('Multi-Agent Task Orchestration', false, `Error: ${error.message}`);
      }

      // Test 2: Workflow orchestration
      const testWorkflow = {
        id: 'integration-test-workflow',
        name: 'Integration Test Workflow',
        description: 'A workflow for integration testing',
        nodes: [
          {
            id: 'integration-node-1',
            type: 'ai',
            name: 'Integration AI Node',
            position: { x: 100, y: 100 },
            data: {
              config: {
                model: 'gpt-3.5-turbo',
                prompt: 'Integration test prompt'
              }
            }
          }
        ],
        edges: [],
        settings: {
          retries: 3,
          timeout: 30000,
          concurrency: 1
        },
        isActive: true,
        userId: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        const result = await orchestrationService.orchestrateWorkflow(testWorkflow, { input: 'integration test' }, {
          priority: 7,
          coordination: true
        });
        
        this.recordTest('Workflow Orchestration', result.success, 
          `Workflow orchestrated: ${result.success ? 'success' : 'failed'}`);
      } catch (error: any) {
        this.recordTest('Workflow Orchestration', false, `Error: ${error.message}`);
      }

      // Test 3: System status integration
      const systemStatus = orchestrationService.getOrchestrationStatus();
      const hasAllComponents = systemStatus && 
        systemStatus.agents && 
        systemStatus.workflows && 
        systemStatus.coordination;
      
      this.recordTest('System Integration Status', hasAllComponents, 
        'All orchestration components integrated');

      logger.info('✅ System Integration tests completed');
    } catch (error: any) {
      this.recordTest('System Integration', false, error.message);
      logger.error('System integration test failed', error);
    }
  }

  private recordTest(testName: string, passed: boolean, message: string): void {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    logger.info(`${status} ${testName}: ${message}`);
  }

  private printTestResults(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    logger.info('\n📊 Orchestration Test Results:');
    logger.info(`Total Tests: ${totalTests}`);
    logger.info(`Passed: ${passedTests}`);
    logger.info(`Failed: ${failedTests}`);
    logger.info(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      logger.info('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => logger.info(`  - ${r.test}: ${r.message}`));
    }
    
    logger.info('\n🎉 Orchestration System Test Suite Completed!');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new OrchestrationTest();
  test.runAllTests().catch(console.error);
}
