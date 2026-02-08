import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middlewares/validation.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/agents - List all agents (public access)
router.get('/', asyncHandler(async (req, res) => {
  try {
    const agents = [
      {
        id: 'agent_1',
        name: 'Decision Agent',
        type: 'decision',
        status: 'active',
        capabilities: ['decision', 'reasoning'],
        lastActivity: new Date().toISOString()
      },
      {
        id: 'agent_2', 
        name: 'Goal Agent',
        type: 'goal',
        status: 'active',
        capabilities: ['goal', 'planning'],
        lastActivity: new Date().toISOString()
      }
    ];
    
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    res.status(200).json({ 
      success: true, 
      data: [],
      message: 'No agents found'
    });
  }
}));

// Schemas for validation
const decisionSchema = z.object({
  decisionType: z.enum(['rule-based', 'llm-based', 'threshold', 'classification']),
  rules: z.array(z.object({
    condition: z.string(),
    action: z.string(),
    output: z.object({}).optional(),
    confidence: z.number().min(0).max(1).optional()
  })).optional(),
  fallbackAction: z.string().optional(),
  llmModel: z.string().optional(),
  decisionPrompt: z.string().optional(),
  threshold: z.number().optional(),
  classificationLabels: z.array(z.string()).optional(),
  context: z.object({}).optional(),
  input: z.object({}).optional(),
  goals: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional()
});

const goalSchema = z.object({
  goalType: z.enum(['define', 'track', 'evaluate', 'update']),
  goalName: z.string().optional(),
  goalDescription: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
  deadline: z.string().optional(),
  successCriteria: z.array(z.string()).optional(),
  progressMetrics: z.array(z.object({
    metric: z.string(),
    target: z.number(),
    current: z.number()
  })).optional(),
  dependencies: z.array(z.string()).optional(),
  goalData: z.object({}).optional(),
  progress: z.object({}).optional(),
  context: z.object({}).optional()
});

const contextSchema = z.object({
  contextType: z.enum(['analyze', 'enrich', 'summarize', 'extract']),
  analysisDepth: z.enum(['shallow', 'medium', 'deep']).optional(),
  includeMemory: z.boolean().optional(),
  includeGoals: z.boolean().optional(),
  includeHistory: z.boolean().optional(),
  focusAreas: z.array(z.string()).optional(),
  llmModel: z.string().optional(),
  maxContextLength: z.number().optional(),
  data: z.object({}).optional(),
  situation: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional()
});

const reasoningSchema = z.object({
  reasoningType: z.enum(['deductive', 'inductive', 'abductive', 'analogical', 'causal']),
  problemType: z.enum(['classification', 'optimization', 'planning', 'diagnosis', 'prediction']).optional(),
  reasoningSteps: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  llmModel: z.string().optional(),
  maxIterations: z.number().optional(),
  confidenceThreshold: z.number().optional(),
  problem: z.string().optional(),
  data: z.object({}).optional(),
  context: z.object({}).optional(),
  goals: z.array(z.string()).optional(),
  evidence: z.array(z.any()).optional()
});

const stateSchema = z.object({
  operation: z.enum(['get', 'update', 'transition', 'snapshot', 'restore', 'cleanup']),
  status: z.enum(['active', 'idle', 'busy', 'sleeping', 'error']).optional(),
  context: z.object({}).optional(),
  variables: z.object({}).optional(),
  preferences: z.object({}).optional(),
  goal: z.string().optional(),
  task: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  trigger: z.string().optional(),
  conditions: z.object({}).optional(),
  snapshotIndex: z.number().optional(),
  maxInactiveHours: z.number().optional()
});

// Decision making endpoint
router.post('/decision', authenticateToken, validateBody(decisionSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { DecisionNode } = await import('../../nodes/agent/decision.node');
  const decisionNode = new DecisionNode();
  
  const node = {
    id: 'temp-decision',
    data: { config: req.body }
  };
  
  const context = {
    runId: `run_${Date.now()}`,
    workflowId: 'temp',
    nodeId: 'temp-decision',
    input: req.body,
    output: {},
    variables: req.body,
    credentials: {},
    sessionId: req.user?.id || 'anonymous',
    agentId: req.user?.id || 'anonymous'
  };
  
  const result = await decisionNode.execute(node as any, context);
  
  if (result.success) {
    res.status(200).json({ success: true, data: result.output });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));

// Goal management endpoint
router.post('/goal', authenticateToken, validateBody(goalSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { GoalNode } = await import('../../nodes/agent/goal.node');
  const goalNode = new GoalNode();
  
  const node = {
    id: 'temp-goal',
    data: { config: req.body }
  };
  
  const context = {
    runId: `run_${Date.now()}`,
    workflowId: 'temp',
    nodeId: 'temp-goal',
    input: req.body,
    output: {},
    variables: req.body,
    credentials: {},
    sessionId: req.user?.id || 'anonymous',
    agentId: req.user?.id || 'anonymous'
  };
  
  const result = await goalNode.execute(node as any, context);
  
  if (result.success) {
    res.status(200).json({ success: true, data: result.output });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));

// Context analysis endpoint
router.post('/context', authenticateToken, validateBody(contextSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { ContextNode } = await import('../../nodes/agent/context.node');
  const contextNode = new ContextNode();
  
  const node = {
    id: 'temp-context',
    data: { config: req.body }
  };
  
  const context = {
    runId: `run_${Date.now()}`,
    workflowId: 'temp',
    nodeId: 'temp-context',
    input: req.body,
    output: {},
    variables: req.body,
    credentials: {},
    sessionId: req.user?.id || 'anonymous',
    agentId: req.user?.id || 'anonymous'
  };
  
  const result = await contextNode.execute(node as any, context);
  
  if (result.success) {
    res.status(200).json({ success: true, data: result.output });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));

// Reasoning endpoint
router.post('/reasoning', authenticateToken, validateBody(reasoningSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { ReasoningNode } = await import('../../nodes/agent/reasoning.node');
  const reasoningNode = new ReasoningNode();
  
  const node = {
    id: 'temp-reasoning',
    data: { config: req.body }
  };
  
  const context = {
    runId: `run_${Date.now()}`,
    workflowId: 'temp',
    nodeId: 'temp-reasoning',
    input: req.body,
    output: {},
    variables: req.body,
    credentials: {},
    sessionId: req.user?.id || 'anonymous',
    agentId: req.user?.id || 'anonymous'
  };
  
  const result = await reasoningNode.execute(node as any, context);
  
  if (result.success) {
    res.status(200).json({ success: true, data: result.output });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));

// Get agent capabilities
router.get('/capabilities', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const capabilities = {
    decisionMaking: {
      types: ['rule-based', 'llm-based', 'threshold', 'classification'],
      features: ['Conditional logic', 'LLM integration', 'Confidence scoring', 'Alternative options']
    },
    goalManagement: {
      types: ['define', 'track', 'evaluate', 'update'],
      features: ['Goal tracking', 'Progress metrics', 'Deadline management', 'Dependency handling']
    },
    contextAnalysis: {
      types: ['analyze', 'enrich', 'summarize', 'extract'],
      features: ['Memory integration', 'Goal alignment', 'Pattern recognition', 'LLM summarization']
    },
    reasoning: {
      types: ['deductive', 'inductive', 'abductive', 'analogical', 'causal'],
      features: ['Logical reasoning', 'Pattern analysis', 'Hypothesis testing', 'Causal analysis']
    }
  };
  
  res.status(200).json({ success: true, data: capabilities });
}));

// State management endpoint
router.post('/state', authenticateToken, validateBody(stateSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { StateNode } = await import('../../nodes/agent/state.node');
  const stateNode = new StateNode();
  
  const node = {
    id: 'temp-state',
    data: { config: req.body }
  };
  
  const context = {
    runId: `run_${Date.now()}`,
    workflowId: 'temp',
    nodeId: 'temp-state',
    input: req.body,
    output: {},
    variables: req.body,
    credentials: {},
    sessionId: req.user?.id || 'anonymous',
    agentId: req.user?.id || 'anonymous'
  };
  
  const result = await stateNode.execute(node as any, context);
  
  if (result.success) {
    res.status(200).json({ success: true, data: result.output });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));

// Get agent status
router.get('/status', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || 'anonymous';
  
  // Get agent status from memory
  try {
    const { memoryService } = await import('../../services/memory.service');
    
    const goals = await memoryService.searchMemoriesForAPI({
      sessionId: `session_${userId}`,
      agentId: `agent_${userId}`,
      query: 'goal',
      limit: 5
    });
    
    const memories = await memoryService.getMemoryStats({
      sessionId: `session_${userId}`,
      agentId: `agent_${userId}`
    });
    
    const status = {
      agentId: `agent_${userId}`,
      sessionId: `session_${userId}`,
      activeGoals: goals.memories.length,
      memoryStats: memories,
      capabilities: ['decision', 'goal', 'context', 'reasoning', 'state'],
      lastActivity: new Date().toISOString()
    };
    
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(200).json({ 
      success: true, 
      data: {
        agentId: `agent_${userId}`,
        sessionId: `session_${userId}`,
        activeGoals: 0,
        memoryStats: {},
        capabilities: ['decision', 'goal', 'context', 'reasoning', 'state'],
        lastActivity: new Date().toISOString()
      }
    });
  }
}));

export default router;
