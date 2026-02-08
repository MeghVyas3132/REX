import { multiAgentCoordinationService } from '../services/multi-agent-coordination.service';
import { multiAgentCoordinator, MultiAgentTask } from '../core/coordination/multi-agent-coordinator';

const BASE_URL = 'http://localhost:3003';
const API_BASE = `${BASE_URL}/api/multi-agent-coordination`;

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  duration: number;
  data?: any;
}

class MultiAgentCoordinationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Multi-Agent Coordination System Tests...\n');

    await this.testSystemHealth();
    await this.testTeamManagement();
    await this.testWorkflowManagement();
    await this.testCollaborationManagement();
    await this.testCommunication();
    await this.testDecisionMaking();
    await this.testKnowledgeSharing();
    await this.testPerformanceMonitoring();
    await this.testCoordinationProtocols();
    await this.testMultiAgentTasks();

    this.printResults();
  }

  private async testSystemHealth(): Promise<void> {
    console.log('📊 Testing System Health...');
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/status`);
      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'System Health Check',
          success: true,
          duration,
          data: data.data
        });
        console.log('✅ System health check passed');
      } else {
        throw new Error(data.error || 'Health check failed');
      }
    } catch (error: any) {
      this.results.push({
        test: 'System Health Check',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ System health check failed:', error.message);
    }
  }

  private async testTeamManagement(): Promise<void> {
    console.log('\n👥 Testing Team Management...');

    // Test creating a team
    await this.testCreateTeam();
    
    // Test getting teams
    await this.testGetTeams();
    
    // Test updating team
    await this.testUpdateTeam();
    
    // Test team performance
    await this.testTeamPerformance();
  }

  private async testCreateTeam(): Promise<void> {
    try {
      const startTime = Date.now();
      const teamData = {
        name: 'Test Content Team',
        description: 'A test team for content creation workflows',
        agents: ['writer-agent', 'editor-agent', 'reviewer-agent'],
        roles: {
          'writer-agent': 'content-creator',
          'editor-agent': 'content-editor',
          'reviewer-agent': 'quality-reviewer'
        },
        coordinationStyle: 'collaborative',
        communicationProtocol: 'collaboration',
        sharedGoals: ['create-high-quality-content', 'meet-deadlines']
      };

      const response = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      });

      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Create Team',
          success: true,
          duration,
          data: data.data
        });
        console.log('✅ Team created successfully');
      } else {
        throw new Error(data.error || 'Team creation failed');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Create Team',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Team creation failed:', error.message);
    }
  }

  private async testGetTeams(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/teams`);
      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Get Teams',
          success: true,
          duration,
          data: { count: data.count }
        });
        console.log('✅ Teams retrieved successfully');
      } else {
        throw new Error(data.error || 'Failed to get teams');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Get Teams',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Get teams failed:', error.message);
    }
  }

  private async testUpdateTeam(): Promise<void> {
    try {
      const startTime = Date.now();
      const updateData = {
        name: 'Updated Test Content Team',
        sharedGoals: ['create-high-quality-content', 'meet-deadlines', 'maintain-consistency']
      };

      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const response = await fetch(`${API_BASE}/teams/${teamId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Update Team',
            success: true,
            duration
          });
          console.log('✅ Team updated successfully');
        } else {
          throw new Error(data.error || 'Team update failed');
        }
      } else {
        throw new Error('No teams found to update');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Update Team',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Team update failed:', error.message);
    }
  }

  private async testTeamPerformance(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const response = await fetch(`${API_BASE}/teams/${teamId}/performance`);
        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Team Performance',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Team performance retrieved successfully');
        } else {
          throw new Error(data.error || 'Failed to get team performance');
        }
      } else {
        throw new Error('No teams found for performance check');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Team Performance',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Team performance check failed:', error.message);
    }
  }

  private async testWorkflowManagement(): Promise<void> {
    console.log('\n🔄 Testing Workflow Management...');

    // Test creating a coordination workflow
    await this.testCreateWorkflow();
    
    // Test getting workflows
    await this.testGetWorkflows();
    
    // Test executing workflow
    await this.testExecuteWorkflow();
  }

  private async testCreateWorkflow(): Promise<void> {
    try {
      const startTime = Date.now();
      const workflowData = {
        name: 'Test Content Workflow',
        description: 'A test workflow for content creation with team coordination',
        teamId: 'content-team', // Use default team
        workflow: {
          nodes: [
            { id: 'node1', type: 'text-processing', name: 'Process Input' },
            { id: 'node2', type: 'content-generation', name: 'Generate Content' },
            { id: 'node3', type: 'quality-review', name: 'Review Content' }
          ],
          edges: [
            { from: 'node1', to: 'node2' },
            { from: 'node2', to: 'node3' }
          ],
          triggers: []
        },
        coordination: {
          protocol: 'collaboration',
          style: 'collaborative',
          communication: {
            frequency: 'realtime',
            channels: ['direct', 'broadcast']
          },
          decisionMaking: {
            authority: 'team-lead',
            consensus: true,
            voting: true
          }
        },
        monitoring: {
          enabled: true,
          metrics: ['execution-time', 'success-rate', 'collaboration-score'],
          alerts: []
        }
      };

      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Create Workflow',
          success: true,
          duration,
          data: data.data
        });
        console.log('✅ Workflow created successfully');
      } else {
        throw new Error(data.error || 'Workflow creation failed');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Create Workflow',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Workflow creation failed:', error.message);
    }
  }

  private async testGetWorkflows(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/workflows`);
      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Get Workflows',
          success: true,
          duration,
          data: { count: data.count }
        });
        console.log('✅ Workflows retrieved successfully');
      } else {
        throw new Error(data.error || 'Failed to get workflows');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Get Workflows',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Get workflows failed:', error.message);
    }
  }

  private async testExecuteWorkflow(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get workflows to find a workflow ID
      const workflowsResponse = await fetch(`${API_BASE}/workflows`);
      const workflowsData = await workflowsResponse.json();
      
      if (workflowsData.success && workflowsData.data.length > 0) {
        const workflowId = workflowsData.data[0].id;
        
        const response = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: { text: 'Test content for workflow execution' } })
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Execute Workflow',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Workflow executed successfully');
        } else {
          throw new Error(data.error || 'Workflow execution failed');
        }
      } else {
        throw new Error('No workflows found to execute');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Execute Workflow',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Workflow execution failed:', error.message);
    }
  }

  private async testCollaborationManagement(): Promise<void> {
    console.log('\n🤝 Testing Collaboration Management...');

    // Test starting a collaboration
    await this.testStartCollaboration();
    
    // Test getting collaborations
    await this.testGetCollaborations();
    
    // Test coordinating collaboration
    await this.testCoordinateCollaboration();
  }

  private async testStartCollaboration(): Promise<void> {
    try {
      const startTime = Date.now();
      const collaborationData = {
        name: 'Test Content Collaboration',
        description: 'A test collaboration for content creation',
        participants: ['writer-agent', 'editor-agent', 'reviewer-agent'],
        objective: 'Create high-quality content collaboratively',
        constraints: ['time-limit', 'quality-standards'],
        timeline: {
          start: new Date().toISOString(),
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          milestones: [
            { name: 'Planning', due: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
            { name: 'Draft', due: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() },
            { name: 'Review', due: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString() }
          ]
        },
        resources: {
          allocated: { time: '24h', tools: ['writing-software', 'review-tools'] },
          required: { expertise: ['writing', 'editing', 'reviewing'] },
          available: { team: 'content-team', budget: 1000 }
        }
      };

      const response = await fetch(`${API_BASE}/collaborations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collaborationData)
      });

      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Start Collaboration',
          success: true,
          duration,
          data: data.data
        });
        console.log('✅ Collaboration started successfully');
      } else {
        throw new Error(data.error || 'Collaboration start failed');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Start Collaboration',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Collaboration start failed:', error.message);
    }
  }

  private async testGetCollaborations(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/collaborations`);
      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Get Collaborations',
          success: true,
          duration,
          data: { count: data.count }
        });
        console.log('✅ Collaborations retrieved successfully');
      } else {
        throw new Error(data.error || 'Failed to get collaborations');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Get Collaborations',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Get collaborations failed:', error.message);
    }
  }

  private async testCoordinateCollaboration(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get collaborations to find a collaboration ID
      const collaborationsResponse = await fetch(`${API_BASE}/collaborations`);
      const collaborationsData = await collaborationsResponse.json();
      
      if (collaborationsData.success && collaborationsData.data.length > 0) {
        const collaborationId = collaborationsData.data[0].id;
        
        const response = await fetch(`${API_BASE}/collaborations/${collaborationId}/coordinate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Coordinate Collaboration',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Collaboration coordinated successfully');
        } else {
          throw new Error(data.error || 'Collaboration coordination failed');
        }
      } else {
        throw new Error('No collaborations found to coordinate');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Coordinate Collaboration',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Collaboration coordination failed:', error.message);
    }
  }

  private async testCommunication(): Promise<void> {
    console.log('\n💬 Testing Communication...');

    // Test sending team message
    await this.testSendTeamMessage();
    
    // Test broadcasting to team
    await this.testBroadcastToTeam();
  }

  private async testSendTeamMessage(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const messageData = {
          from: 'writer-agent',
          message: 'Hello team! Let\'s start working on the content.',
          priority: 5
        };

        const response = await fetch(`${API_BASE}/teams/${teamId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData)
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Send Team Message',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Team message sent successfully');
        } else {
          throw new Error(data.error || 'Failed to send team message');
        }
      } else {
        throw new Error('No teams found for message test');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Send Team Message',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Send team message failed:', error.message);
    }
  }

  private async testBroadcastToTeam(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const broadcastData = {
          from: 'team-lead',
          content: { announcement: 'Important update for the team!' },
          messageType: 'notification'
        };

        const response = await fetch(`${API_BASE}/teams/${teamId}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(broadcastData)
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Broadcast to Team',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Team broadcast sent successfully');
        } else {
          throw new Error(data.error || 'Failed to broadcast to team');
        }
      } else {
        throw new Error('No teams found for broadcast test');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Broadcast to Team',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Broadcast to team failed:', error.message);
    }
  }

  private async testDecisionMaking(): Promise<void> {
    console.log('\n🤔 Testing Decision Making...');

    // Test making team decision
    await this.testMakeTeamDecision();
  }

  private async testMakeTeamDecision(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const decisionData = {
          decisionType: 'consensus',
          proposal: {
            action: 'approve-content',
            reasoning: 'Content meets quality standards',
            confidence: 0.9
          }
        };

        const response = await fetch(`${API_BASE}/teams/${teamId}/decisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(decisionData)
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Make Team Decision',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Team decision made successfully');
        } else {
          throw new Error(data.error || 'Failed to make team decision');
        }
      } else {
        throw new Error('No teams found for decision test');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Make Team Decision',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Make team decision failed:', error.message);
    }
  }

  private async testKnowledgeSharing(): Promise<void> {
    console.log('\n🧠 Testing Knowledge Sharing...');

    // Test sharing team knowledge
    await this.testShareTeamKnowledge();
    
    // Test getting team knowledge
    await this.testGetTeamKnowledge();
  }

  private async testShareTeamKnowledge(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const knowledgeData = {
          key: 'content-guidelines',
          value: {
            style: 'professional',
            tone: 'friendly',
            length: '500-1000 words',
            keywords: ['AI', 'automation', 'workflow']
          }
        };

        const response = await fetch(`${API_BASE}/teams/${teamId}/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(knowledgeData)
        });

        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Share Team Knowledge',
            success: true,
            duration
          });
          console.log('✅ Team knowledge shared successfully');
        } else {
          throw new Error(data.error || 'Failed to share team knowledge');
        }
      } else {
        throw new Error('No teams found for knowledge sharing test');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Share Team Knowledge',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Share team knowledge failed:', error.message);
    }
  }

  private async testGetTeamKnowledge(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // First get teams to find a team ID
      const teamsResponse = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.data.length > 0) {
        const teamId = teamsData.data[0].id;
        
        const response = await fetch(`${API_BASE}/teams/${teamId}/knowledge/content-guidelines`);
        const data = await response.json() as any;
        const duration = Date.now() - startTime;

        if (response.ok && data.success) {
          this.results.push({
            test: 'Get Team Knowledge',
            success: true,
            duration,
            data: data.data
          });
          console.log('✅ Team knowledge retrieved successfully');
        } else {
          throw new Error(data.error || 'Failed to get team knowledge');
        }
      } else {
        throw new Error('No teams found for knowledge retrieval test');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Get Team Knowledge',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Get team knowledge failed:', error.message);
    }
  }

  private async testPerformanceMonitoring(): Promise<void> {
    console.log('\n📈 Testing Performance Monitoring...');

    // Test getting system status
    await this.testGetSystemStatus();
    
    // Test getting active sessions
    await this.testGetActiveSessions();
  }

  private async testGetSystemStatus(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/status`);
      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Get System Status',
          success: true,
          duration,
          data: data.data
        });
        console.log('✅ System status retrieved successfully');
      } else {
        throw new Error(data.error || 'Failed to get system status');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Get System Status',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Get system status failed:', error.message);
    }
  }

  private async testGetActiveSessions(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/sessions`);
      const data = await response.json() as any;
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        this.results.push({
          test: 'Get Active Sessions',
          success: true,
          duration,
          data: { count: data.count }
        });
        console.log('✅ Active sessions retrieved successfully');
      } else {
        throw new Error(data.error || 'Failed to get active sessions');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Get Active Sessions',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Get active sessions failed:', error.message);
    }
  }

  private async testCoordinationProtocols(): Promise<void> {
    console.log('\n🔄 Testing Coordination Protocols...');

    // Test protocol registration and usage
    try {
      const startTime = Date.now();
      
      // Test getting coordination status
      const status = multiAgentCoordinator.getCoordinationStatus();
      const duration = Date.now() - startTime;

      if (status) {
        this.results.push({
          test: 'Coordination Protocols',
          success: true,
          duration,
          data: status
        });
        console.log('✅ Coordination protocols working correctly');
      } else {
        throw new Error('Failed to get coordination status');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Coordination Protocols',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Coordination protocols test failed:', error.message);
    }
  }

  private async testMultiAgentTasks(): Promise<void> {
    console.log('\n🎯 Testing Multi-Agent Tasks...');

    // Test creating and coordinating multi-agent tasks
    try {
      const startTime = Date.now();
      
      const task: MultiAgentTask = {
        id: 'test-task-1',
        name: 'Test Multi-Agent Task',
        description: 'A test task for multi-agent coordination',
        complexity: 'moderate' as const,
        requirements: {
          capabilities: ['communication', 'analysis'],
          resources: ['database', 'api'],
          constraints: ['time-limit']
        },
        subtasks: [],
        coordination: {
          protocol: 'collaborative',
          style: 'collaborative' as const,
          communication: {
            frequency: 'realtime',
            channels: ['direct', 'broadcast']
          }
        },
        priority: 5,
        metadata: { test: true }
      };

      const result = await multiAgentCoordinator.coordinateTask(task);
      const duration = Date.now() - startTime;

      if (result.success) {
        this.results.push({
          test: 'Multi-Agent Tasks',
          success: true,
          duration,
          data: result.output
        });
        console.log('✅ Multi-agent task coordinated successfully');
      } else {
        throw new Error(result.error || 'Multi-agent task coordination failed');
      }
    } catch (error: any) {
      this.results.push({
        test: 'Multi-Agent Tasks',
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('❌ Multi-agent task test failed:', error.message);
    }
  }

  private printResults(): void {
    console.log('\n📊 Multi-Agent Coordination Test Results:');
    console.log('=====================================');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏱️  Average Duration: ${averageDuration.toFixed(2)}ms`);
    console.log(`   📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   • ${r.test}: ${r.error}`);
        });
    }

    console.log(`\n🎯 Multi-Agent Coordination System Status: ${failedTests === 0 ? '✅ READY' : '⚠️  NEEDS ATTENTION'}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new MultiAgentCoordinationTester();
  tester.runAllTests().catch(console.error);
}

export default MultiAgentCoordinationTester;
