import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class GoalNode {
  getNodeDefinition() {
    return {
      id: 'agent-goal',
      type: 'action',
      name: 'Goal',
      description: 'Define and track agent goals and objectives',
      category: 'agent',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'goalType',
          type: 'options',
          displayName: 'Goal Operation',
          description: 'Type of goal operation to perform',
          required: true,
          default: 'define',
          options: [
            { name: 'Define Goal', value: 'define' },
            { name: 'Track Progress', value: 'track' },
            { name: 'Evaluate Goal', value: 'evaluate' },
            { name: 'Update Goal', value: 'update' }
          ]
        },
        {
          name: 'goalName',
          type: 'string',
          displayName: 'Goal Name',
          description: 'Name of the goal',
          required: false,
          placeholder: 'Increase Sales, Improve Customer Satisfaction'
        },
        {
          name: 'goalDescription',
          type: 'string',
          displayName: 'Goal Description',
          description: 'Detailed description of the goal',
          required: false,
          placeholder: 'Achieve 20% increase in quarterly sales'
        },
        {
          name: 'priority',
          type: 'number',
          displayName: 'Priority Level',
          description: 'Priority level of the goal (1-10)',
          required: false,
          default: 5,
          min: 1,
          max: 10
        },
        {
          name: 'deadline',
          type: 'string',
          displayName: 'Deadline',
          description: 'Deadline for the goal (ISO date string)',
          required: false,
          placeholder: '2024-12-31T23:59:59Z'
        },
        {
          name: 'successCriteria',
          type: 'array',
          displayName: 'Success Criteria',
          description: 'Criteria that define goal success',
          required: false,
          placeholder: 'Sales increase by 20%, Customer satisfaction > 90%'
        },
        {
          name: 'progressMetrics',
          type: 'array',
          displayName: 'Progress Metrics',
          description: 'Metrics to track goal progress',
          required: false,
          placeholder: 'Sales volume, Customer count, Revenue'
        },
        {
          name: 'dependencies',
          type: 'array',
          displayName: 'Goal Dependencies',
          description: 'Other goals this goal depends on',
          required: false,
          placeholder: 'goal1, goal2, goal3'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'goalData',
          type: 'object',
          displayName: 'Goal Data',
          description: 'Goal information from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'progress',
          type: 'object',
          displayName: 'Progress Data',
          description: 'Current progress data from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'context',
          type: 'object',
          displayName: 'Context Data',
          description: 'Context information for goal evaluation from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'goalType',
          type: 'string',
          displayName: 'Dynamic Goal Type',
          description: 'Goal operation type from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'goalName',
          type: 'string',
          displayName: 'Dynamic Goal Name',
          description: 'Goal name from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'priority',
          type: 'number',
          displayName: 'Dynamic Priority',
          description: 'Priority from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'deadline',
          type: 'string',
          displayName: 'Dynamic Deadline',
          description: 'Deadline from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'goal',
          type: 'object',
          displayName: 'Goal Object',
          description: 'The goal object with all details',
          dataType: 'object'
        },
        {
          name: 'progress',
          type: 'number',
          displayName: 'Progress Percentage',
          description: 'Current progress percentage (0-100)',
          dataType: 'number'
        },
        {
          name: 'status',
          type: 'string',
          displayName: 'Goal Status',
          description: 'Current status of the goal',
          dataType: 'text'
        },
        {
          name: 'completion',
          type: 'number',
          displayName: 'Completion Percentage',
          description: 'Percentage of goal completion (0-100)',
          dataType: 'number'
        },
        {
          name: 'nextSteps',
          type: 'array',
          displayName: 'Next Steps',
          description: 'Recommended next steps to achieve the goal',
          dataType: 'array'
        },
        {
          name: 'metrics',
          type: 'object',
          displayName: 'Progress Metrics',
          description: 'Detailed progress metrics',
          dataType: 'object'
        },
        {
          name: 'evaluation',
          type: 'object',
          displayName: 'Goal Evaluation',
          description: 'Evaluation results of the goal',
          dataType: 'object'
        },
        {
          name: 'deadlineStatus',
          type: 'string',
          displayName: 'Deadline Status',
          description: 'Status relative to deadline (on-track, behind, overdue)',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          goalType: { type: 'string' },
          goalName: { type: 'string' },
          goalDescription: { type: 'string' },
          priority: { type: 'number' },
          deadline: { type: 'string' },
          successCriteria: { type: 'array' },
          progressMetrics: { type: 'array' },
          dependencies: { type: 'array' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          goalData: { type: 'object' },
          progress: { type: 'object' },
          context: { type: 'object' },
          goalType: { type: 'string' },
          goalName: { type: 'string' },
          priority: { type: 'number' },
          deadline: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'object' },
          progress: { type: 'number' },
          status: { type: 'string' },
          completion: { type: 'number' },
          nextSteps: { type: 'array' },
          metrics: { type: 'object' },
          evaluation: { type: 'object' },
          deadlineStatus: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    // Validation
    if (!config.goalType && !context.input?.goalType) {
      throw new Error('Required parameter "goalType" is missing');
    }

    try {
      const goalType = config.goalType || context.input?.goalType || 'define';
      const input = context.input;
      const goalData = input.goalData || {};
      const progress = input.progress || {};
      const agentContext = input.context || {};

      logger.info('Goal operation', {
        nodeId: node.id,
        goalType,
        runId: context.runId,
        agentId: context.agentId
      });

      let result: any;

      switch (goalType) {
        case 'define':
          result = await this.defineGoal(config, goalData, context);
          break;
        case 'track':
          result = await this.trackGoal(config, progress, context);
          break;
        case 'evaluate':
          result = await this.evaluateGoal(config, agentContext, context);
          break;
        case 'update':
          result = await this.updateGoal(config, goalData, context);
          break;
        default:
          throw new Error(`Unsupported goal type: ${goalType}`);
      }

      const duration = Date.now() - startTime;

      logger.info('Goal operation completed', {
        nodeId: node.id,
        goalType,
        status: result.status,
        progress: result.progress,
        duration,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          ...result  // Add new goal data
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Goal operation failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async defineGoal(config: any, goalData: any, context: ExecutionContext): Promise<any> {
    const goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: config.goalName || goalData.name || 'Unnamed Goal',
      description: config.goalDescription || goalData.description || '',
      priority: config.priority || goalData.priority || 5,
      deadline: config.deadline || goalData.deadline,
      successCriteria: config.successCriteria || goalData.successCriteria || [],
      progressMetrics: config.progressMetrics || goalData.progressMetrics || [],
      dependencies: config.dependencies || goalData.dependencies || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      progress: 0,
      agentId: context.agentId,
      sessionId: context.sessionId
    };

    // Store goal in memory
    await this.storeGoal(goal, context);

    return {
      goal,
      progress: 0,
      status: 'active',
      nextActions: this.generateNextActions(goal),
      metrics: {
        priority: goal.priority,
        deadline: goal.deadline,
        criteriaCount: goal.successCriteria.length,
        dependenciesCount: goal.dependencies.length
      }
    };
  }

  private async trackGoal(config: any, progress: any, context: ExecutionContext): Promise<any> {
    const goalId = config.goalId || progress.goalId;
    if (!goalId) {
      throw new Error('Goal ID is required for tracking');
    }

    // Retrieve goal from memory
    const goal = await this.retrieveGoal(goalId, context);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Update progress
    const updatedGoal = {
      ...goal,
      progress: Math.min(100, Math.max(0, progress.progress || goal.progress)),
      lastUpdated: new Date().toISOString(),
      progressHistory: [
        ...(goal.progressHistory || []),
        {
          progress: progress.progress || goal.progress,
          timestamp: new Date().toISOString(),
          notes: progress.notes || ''
        }
      ]
    };

    // Update status based on progress
    if (updatedGoal.progress >= 100) {
      updatedGoal.status = 'completed';
    } else if (updatedGoal.progress > 0) {
      updatedGoal.status = 'in_progress';
    }

    // Store updated goal
    await this.storeGoal(updatedGoal, context);

    return {
      goal: updatedGoal,
      progress: updatedGoal.progress,
      status: updatedGoal.status,
      nextActions: this.generateNextActions(updatedGoal),
      metrics: {
        progressChange: (progress.progress || 0) - (goal.progress || 0),
        timeSinceLastUpdate: this.getTimeSinceLastUpdate(goal),
        completionRate: this.calculateCompletionRate(updatedGoal)
      }
    };
  }

  private async evaluateGoal(config: any, agentContext: any, context: ExecutionContext): Promise<any> {
    const goalId = config.goalId;
    if (!goalId) {
      throw new Error('Goal ID is required for evaluation');
    }

    // Retrieve goal from memory
    const goal = await this.retrieveGoal(goalId, context);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Evaluate goal against success criteria
    const evaluation = this.evaluateGoalCriteria(goal, agentContext);
    
    // Check deadline
    const deadlineStatus = this.checkDeadline(goal);
    
    // Calculate overall status
    const status = this.determineGoalStatus(goal, evaluation, deadlineStatus);

    return {
      goal,
      progress: goal.progress || 0,
      status,
      nextActions: this.generateNextActions(goal),
      metrics: {
        criteriaMet: evaluation.criteriaMet,
        totalCriteria: evaluation.totalCriteria,
        deadlineStatus,
        priority: goal.priority,
        timeRemaining: this.getTimeRemaining(goal)
      }
    };
  }

  private async updateGoal(config: any, goalData: any, context: ExecutionContext): Promise<any> {
    const goalId = config.goalId || goalData.id;
    if (!goalId) {
      throw new Error('Goal ID is required for update');
    }

    // Retrieve existing goal
    const existingGoal = await this.retrieveGoal(goalId, context);
    if (!existingGoal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // Update goal with new data
    const updatedGoal = {
      ...existingGoal,
      ...goalData,
      lastUpdated: new Date().toISOString(),
      updatedBy: context.agentId
    };

    // Store updated goal
    await this.storeGoal(updatedGoal, context);

    return {
      goal: updatedGoal,
      progress: updatedGoal.progress || 0,
      status: updatedGoal.status || 'active',
      nextActions: this.generateNextActions(updatedGoal),
      metrics: {
        changes: Object.keys(goalData).length,
        lastUpdated: updatedGoal.lastUpdated
      }
    };
  }

  private async storeGoal(goal: any, context: ExecutionContext): Promise<void> {
    try {
      const { memoryService } = await import('../../services/memory.service');
      await memoryService.storeMemory({
        sessionId: context.sessionId || 'default-session',
        agentId: context.agentId || 'default-agent',
        type: 'goal',
        content: JSON.stringify(goal),
        metadata: {
          goalId: goal.id,
          goalName: goal.name,
          status: goal.status,
          priority: goal.priority
        },
        importance: goal.priority || 5,
        tags: ['goal', goal.status, `priority-${goal.priority}`]
      });
    } catch (error) {
      logger.warn('Failed to store goal in memory', { goalId: goal.id, error: error.message });
    }
  }

  private async retrieveGoal(goalId: string, context: ExecutionContext): Promise<any> {
    try {
      const { memoryService } = await import('../../services/memory.service');
      const memories = await memoryService.searchMemories(
        context.sessionId || 'default-session',
        context.agentId || 'default-agent',
        `goal ${goalId}`,
        1
      );

      if (memories.length > 0) {
        return JSON.parse(memories[0].content);
      }
      return null;
    } catch (error) {
      logger.warn('Failed to retrieve goal from memory', { goalId, error: error.message });
      return null;
    }
  }

  private evaluateGoalCriteria(goal: any, context: any): any {
    const criteria = goal.successCriteria || [];
    let criteriaMet = 0;

    for (const criterion of criteria) {
      if (this.evaluateCriterion(criterion, context)) {
        criteriaMet++;
      }
    }

    return {
      criteriaMet,
      totalCriteria: criteria.length,
      percentage: criteria.length > 0 ? (criteriaMet / criteria.length) * 100 : 0
    };
  }

  private evaluateCriterion(criterion: string, context: any): boolean {
    try {
      // Simple criterion evaluation (in production, use a proper expression evaluator)
      const processedCriterion = criterion.replace(/context\.(\w+)/g, (match, key) => {
        return JSON.stringify(context[key] || null);
      });
      
      return eval(processedCriterion);
    } catch (error) {
      logger.warn('Criterion evaluation failed', { criterion, error: error.message });
      return false;
    }
  }

  private checkDeadline(goal: any): string {
    if (!goal.deadline) return 'no_deadline';
    
    const deadline = new Date(goal.deadline);
    const now = new Date();
    
    if (now > deadline) return 'overdue';
    if (deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'due_soon';
    return 'on_track';
  }

  private determineGoalStatus(goal: any, evaluation: any, deadlineStatus: string): string {
    if (goal.progress >= 100) return 'completed';
    if (deadlineStatus === 'overdue') return 'overdue';
    if (evaluation.percentage >= 80) return 'near_completion';
    if (goal.progress > 0) return 'in_progress';
    return 'not_started';
  }

  private generateNextActions(goal: any): string[] {
    const actions = [];
    
    if (goal.status === 'not_started') {
      actions.push('Start working on the goal');
    } else if (goal.status === 'in_progress') {
      actions.push('Continue working on the goal');
      actions.push('Update progress metrics');
    } else if (goal.status === 'near_completion') {
      actions.push('Focus on remaining criteria');
      actions.push('Prepare for completion');
    } else if (goal.status === 'overdue') {
      actions.push('Prioritize this goal');
      actions.push('Consider extending deadline');
    }
    
    if (goal.dependencies && goal.dependencies.length > 0) {
      actions.push('Check dependency status');
    }
    
    return actions;
  }

  private getTimeSinceLastUpdate(goal: any): number {
    if (!goal.lastUpdated) return 0;
    return Date.now() - new Date(goal.lastUpdated).getTime();
  }

  private calculateCompletionRate(goal: any): number {
    const history = goal.progressHistory || [];
    if (history.length < 2) return 0;
    
    const recent = history.slice(-2);
    const timeDiff = new Date(recent[1].timestamp).getTime() - new Date(recent[0].timestamp).getTime();
    const progressDiff = recent[1].progress - recent[0].progress;
    
    return timeDiff > 0 ? (progressDiff / timeDiff) * 1000 * 60 * 60 : 0; // per hour
  }

  private getTimeRemaining(goal: any): number {
    if (!goal.deadline) return Infinity;
    return new Date(goal.deadline).getTime() - Date.now();
  }
}

export default GoalNode;
