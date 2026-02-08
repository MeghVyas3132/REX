import { Router } from 'express';
import { multiAgentCoordinationService } from '../../services/multi-agent-coordination.service';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { z } from 'zod';

const router = Router();

// Team Management Routes
const createTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  agents: z.array(z.string()).min(1),
  roles: z.record(z.string()),
  coordinationStyle: z.enum(['autonomous', 'collaborative', 'hierarchical', 'peer-to-peer']),
  communicationProtocol: z.string().min(1),
  sharedGoals: z.array(z.string())
});

const updateTeamSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  agents: z.array(z.string()).optional(),
  roles: z.record(z.string()).optional(),
  coordinationStyle: z.enum(['autonomous', 'collaborative', 'hierarchical', 'peer-to-peer']).optional(),
  communicationProtocol: z.string().optional(),
  sharedGoals: z.array(z.string()).optional()
});

// Workflow Management Routes
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  teamId: z.string().min(1),
  workflow: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    triggers: z.array(z.any())
  }),
  coordination: z.object({
    protocol: z.string().min(1),
    style: z.enum(['sequential', 'parallel', 'collaborative', 'competitive']),
    communication: z.object({
      frequency: z.string().min(1),
      channels: z.array(z.string())
    }),
    decisionMaking: z.object({
      authority: z.string().min(1),
      consensus: z.boolean(),
      voting: z.boolean()
    })
  }),
  monitoring: z.object({
    enabled: z.boolean(),
    metrics: z.array(z.string()),
    alerts: z.array(z.any())
  })
});

const executeWorkflowSchema = z.object({
  input: z.any().optional()
});

// Collaboration Management Routes
const startCollaborationSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  participants: z.array(z.string()).min(1),
  objective: z.string().min(1),
  constraints: z.array(z.string()),
  timeline: z.object({
    start: z.string(),
    deadline: z.string(),
    milestones: z.array(z.any())
  }),
  resources: z.object({
    allocated: z.any(),
    required: z.any(),
    available: z.any()
  })
});

// Communication Routes
const sendMessageSchema = z.object({
  from: z.string().min(1),
  message: z.string().min(1),
  priority: z.number().min(1).max(10).optional()
});

const broadcastSchema = z.object({
  from: z.string().min(1),
  content: z.any(),
  messageType: z.enum(['request', 'response', 'notification', 'query', 'proposal', 'agreement', 'disagreement', 'escalation']).optional()
});

// Decision Making Routes
const makeDecisionSchema = z.object({
  decisionType: z.enum(['consensus', 'majority', 'authority', 'delegation', 'competition']),
  proposal: z.any()
});

// Knowledge Sharing Routes
const shareKnowledgeSchema = z.object({
  key: z.string().min(1),
  value: z.any()
});

const getKnowledgeSchema = z.object({
  key: z.string().min(1)
});

// Team Management
router.post('/teams', authenticateToken, validateRequest(createTeamSchema), async (req, res) => {
  try {
    const teamId = multiAgentCoordinationService.createTeam(req.body);
    res.status(201).json({
      success: true,
      data: { teamId },
      message: 'Team created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const teams = multiAgentCoordinationService.getTeams();
    res.json({
      success: true,
      data: teams,
      count: teams.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = multiAgentCoordinationService.getTeam(teamId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: team
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.put('/teams/:teamId', authenticateToken, validateRequest(updateTeamSchema), async (req, res) => {
  try {
    const { teamId } = req.params;
    const success = multiAgentCoordinationService.updateTeam(teamId, req.body);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Team updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const success = multiAgentCoordinationService.deleteTeam(teamId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Workflow Management
router.post('/workflows', authenticateToken, validateRequest(createWorkflowSchema), async (req, res) => {
  try {
    const workflowId = multiAgentCoordinationService.createCoordinationWorkflow(req.body);
    res.status(201).json({
      success: true,
      data: { workflowId },
      message: 'Coordination workflow created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/workflows', authenticateToken, async (req, res) => {
  try {
    const workflows = multiAgentCoordinationService.getWorkflows();
    res.json({
      success: true,
      data: workflows,
      count: workflows.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/workflows/:workflowId/execute', authenticateToken, validateRequest(executeWorkflowSchema), async (req, res) => {
  try {
    const { workflowId } = req.params;
    const result = await multiAgentCoordinationService.executeCoordinationWorkflow(workflowId, req.body.input);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Collaboration Management
router.post('/collaborations', authenticateToken, validateRequest(startCollaborationSchema), async (req, res) => {
  try {
    const collaborationId = multiAgentCoordinationService.startCollaboration(req.body);
    res.status(201).json({
      success: true,
      data: { collaborationId },
      message: 'Collaboration started successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/collaborations', authenticateToken, async (req, res) => {
  try {
    const collaborations = multiAgentCoordinationService.getCollaborations();
    res.json({
      success: true,
      data: collaborations,
      count: collaborations.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/collaborations/:collaborationId/coordinate', authenticateToken, async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const result = await multiAgentCoordinationService.coordinateCollaboration(collaborationId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Communication
router.post('/teams/:teamId/messages', authenticateToken, validateRequest(sendMessageSchema), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { from, message, priority } = req.body;
    
    const messageId = multiAgentCoordinationService.sendTeamMessage(teamId, from, message, priority);
    
    res.json({
      success: true,
      data: { messageId },
      message: 'Message sent successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/teams/:teamId/broadcast', authenticateToken, validateRequest(broadcastSchema), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { from, content, messageType } = req.body;
    
    const messageIds = multiAgentCoordinationService.broadcastToTeam(teamId, from, content, messageType);
    
    res.json({
      success: true,
      data: { messageIds },
      message: 'Broadcast sent successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Decision Making
router.post('/teams/:teamId/decisions', authenticateToken, validateRequest(makeDecisionSchema), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { decisionType, proposal } = req.body;
    
    const decision = await multiAgentCoordinationService.makeTeamDecision(teamId, decisionType, proposal);
    
    res.json({
      success: true,
      data: decision
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Knowledge Sharing
router.post('/teams/:teamId/knowledge', authenticateToken, validateRequest(shareKnowledgeSchema), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { key, value } = req.body;
    
    multiAgentCoordinationService.shareTeamKnowledge(teamId, key, value);
    
    res.json({
      success: true,
      message: 'Knowledge shared successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/teams/:teamId/knowledge/:key', authenticateToken, async (req, res) => {
  try {
    const { teamId, key } = req.params;
    
    const knowledge = multiAgentCoordinationService.getTeamKnowledge(teamId, key);
    
    res.json({
      success: true,
      data: { key, value: knowledge }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance Monitoring
router.get('/teams/:teamId/performance', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const performance = multiAgentCoordinationService.getTeamPerformance(teamId);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = multiAgentCoordinationService.getSystemStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Active Sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = multiAgentCoordinationService.getActiveSessions();
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
