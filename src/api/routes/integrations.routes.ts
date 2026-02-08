import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody, validateQuery, commonSchemas } from '../../utils/validators';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET /api/integrations - Get all integration nodes
router.get('/', async (req, res) => {
  try {
    const integrationNodes = [
      {
        id: 'slack',
        name: 'Slack Integration',
        description: 'Send messages, create channels, and interact with Slack',
        category: 'integration',
        configSchema: {
          action: { type: 'string', enum: ['send_message', 'create_channel', 'invite_user', 'upload_file'], required: true },
          channel: { type: 'string' },
          message: { type: 'string' },
          username: { type: 'string' }
        }
      },
      {
        id: 'discord',
        name: 'Discord Integration',
        description: 'Send messages, create channels, and interact with Discord',
        category: 'integration',
        configSchema: {
          action: { type: 'string', enum: ['send_message', 'create_channel', 'send_embed', 'react'], required: true },
          channelId: { type: 'string' },
          message: { type: 'string' },
          embed: { type: 'object' }
        }
      }
      // removed Email Integration
    ];

    res.json({
      success: true,
      data: integrationNodes,
      count: integrationNodes.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch integration nodes'
    });
  }
});

// POST /api/integrations/slack/test - Test Slack integration
router.post('/slack/test', async (req, res) => {
  try {
    const { action = 'send_message', channel, message = 'Test message' } = req.body;
    
    // Simulate Slack API call
    const result = {
      success: true,
      message: 'Slack integration test executed successfully',
      timestamp: new Date().toISOString(),
      channel: channel || '#general',
      action
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Slack integration'
    });
  }
});

// POST /api/integrations/discord/test - Test Discord integration
router.post('/discord/test', async (req, res) => {
  try {
    const { action = 'send_message', channelId, message = 'Test message' } = req.body;
    
    // Simulate Discord API call
    const result = {
      success: true,
      messageId: `msg_${Date.now()}`,
      channelId: channelId || '123456789',
      action
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Discord integration'
    });
  }
});

// removed email integration test endpoint

export default router;

// Generic dynamic proxy for frontend compatibility
// POST /api/integrations/:service/:action
router.post('/:service/:action', async (req, res) => {
  try {
    const { service, action } = req.params as { service: string; action: string };
    const { config = {}, data = {} } = req.body || {};

    // Minimal simulated handlers to integrate frontend quickly.
    // Extend with real providers as needed.
    switch (service) {
      case 'slack': {
        const channel = (data && (data.channel || config.channel)) || '#general';
        if (action === 'send-message') {
          return res.json({ success: true, data: { ok: true, channel, message: data?.message || 'Hello from Slack proxy', ts: Date.now() } });
        }
        break;
      }
      case 'email': {
        if (action === 'send') {
          const to = config?.toEmail || data?.to;
          if (!to) {
            return res.status(400).json({ success: false, error: 'Recipient email is required' });
          }
          return res.json({ success: true, data: { accepted: [to], messageId: `email_${Date.now()}` } });
        }
        break;
      }
      case 'discord': {
        if (action === 'send-message') {
          return res.json({ success: true, data: { id: `msg_${Date.now()}`, content: data?.message || 'Hello from Discord proxy' } });
        }
        break;
      }
      case 'github': {
        if (action === 'create-issue') {
          return res.json({ success: true, data: { number: Math.floor(Math.random() * 10000), url: `https://github.com/${config?.owner}/${config?.repo}/issues/1` } });
        }
        break;
      }
      case 'stripe': {
        if (action === 'create-payment-intent') {
          return res.json({ success: true, data: { clientSecret: `pi_${Date.now()}_secret_dummy` } });
        }
        break;
      }
      case 'telegram':
      case 'whatsapp': {
        if (action === 'send-message') {
          return res.json({ success: true, data: { id: `msg_${Date.now()}`, to: data?.to, message: data?.message } });
        }
        break;
      }
      case 'google-drive': {
        if (action === 'upload') {
          return res.json({ success: true, data: { fileId: `file_${Date.now()}`, name: data?.fileName } });
        }
        if (action === 'download') {
          return res.json({ success: true, data: { fileId: data?.fileId, size: 0 } });
        }
        if (action === 'list') {
          return res.json({ success: true, data: { files: [] } });
        }
        break;
      }
      case 'google-sheets': {
        if (action === 'read') {
          return res.json({ success: true, data: { values: [['Sample', 'Data']] } });
        }
        if (action === 'write') {
          return res.json({ success: true, data: { updatedRange: data?.range, updatedCells: (data?.values?.length || 0) * ((data?.values?.[0]?.length) || 0) } });
        }
        break;
      }
      case 'openai':
      case 'anthropic': {
        if (action === 'generate' || action === 'generate-image') {
          return res.json({ success: true, data: { content: 'Generated content (simulated)' } });
        }
        break;
      }
      case 'http': {
        if (action === 'request') {
          // Echo back request for now; real proxying would require outbound fetch with validation.
          return res.json({ success: true, data: { request: data } });
        }
        break;
      }
      default:
        break;
    }

    // Fallback: unknown combination
    return res.status(400).json({ success: false, error: `Unsupported integration: ${service}/${action}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Integration proxy failed' });
  }
});
