import { Workflow, WorkflowNode, WorkflowEdge } from '@rex/shared';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  useCases: string[];
  prerequisites: string[];
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  configuration: {
    required: string[];
    optional: string[];
    examples: Record<string, any>;
  };
  customization: {
    variables: string[];
    instructions: string[];
  };
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: 'customer-support-agent',
    name: 'Customer Support Agent',
    description: 'Intelligent customer support agent with context awareness and escalation handling',
    category: 'customer-service',
    version: '1.0.0',
    author: 'Workflow Studio',
    tags: ['customer-service', 'chatbot', 'escalation', 'context-aware'],
    difficulty: 'intermediate',
    estimatedTime: '15-30 minutes',
    useCases: [
      'Customer support automation',
      'FAQ handling',
      'Ticket routing',
      'Escalation management'
    ],
    prerequisites: [
      'OpenAI API key',
      'Database connection',
      'Email/Slack integration'
    ],
    workflow: {
      nodes: [
        {
          id: 'webhook-trigger',
          type: 'trigger',
          name: 'Customer Message',
          position: { x: 100, y: 100 },
          data: {
            config: {
              operation: 'receive',
              method: 'POST',
              path: '/customer-message'
            }
          }
        },
        {
          id: 'context-analysis',
          type: 'action',
          name: 'Analyze Context',
          position: { x: 300, y: 100 },
          data: {
            config: {
              contextType: 'analyze',
              includeMemory: true,
              includeHistory: true,
              analysisDepth: 'medium'
            }
          }
        },
        {
          id: 'intent-classification',
          type: 'action',
          name: 'Classify Intent',
          position: { x: 500, y: 100 },
          data: {
            config: {
              decisionType: 'classification',
              labels: ['billing', 'technical', 'general', 'complaint', 'refund'],
              classificationModel: 'gpt-3.5-turbo',
              confidenceThreshold: 0.7
            }
          }
        },
        {
          id: 'decision-router',
          type: 'action',
          name: 'Route Decision',
          position: { x: 700, y: 100 },
          data: {
            config: {
              decisionType: 'rule-based',
              rules: [
                {
                  condition: '"billing"',
                  action: 'route_to_billing',
                  confidence: 0.9
                },
                {
                  condition: '"technical"',
                  action: 'route_to_technical',
                  confidence: 0.9
                },
                {
                  condition: '"complaint"',
                  action: 'escalate_to_human',
                  confidence: 0.8
                }
              ],
              fallbackAction: 'general_response'
            }
          }
        },
        {
          id: 'billing-handler',
          type: 'action',
          name: 'Billing Handler',
          position: { x: 500, y: 250 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'You are a billing support specialist. Help the customer with their billing inquiry.',
              maxTokens: 500
            }
          }
        },
        {
          id: 'technical-handler',
          type: 'action',
          name: 'Technical Handler',
          position: { x: 500, y: 400 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'You are a technical support specialist. Help the customer with their technical issue.',
              maxTokens: 500
            }
          }
        },
        {
          id: 'escalation-handler',
          type: 'action',
          name: 'Human Escalation',
          position: { x: 500, y: 550 },
          data: {
            config: {
              operation: 'send',
              to: 'support-team@company.com',
              subject: 'Customer Escalation Required',
              body: 'A customer issue requires human attention.'
            }
          }
        },
        {
          id: 'response-generator',
          type: 'action',
          name: 'Generate Response',
          position: { x: 900, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Generate a helpful and professional response to the customer.',
              maxTokens: 300
            }
          }
        },
        {
          id: 'memory-store',
          type: 'action',
          name: 'Store Interaction',
          position: { x: 1100, y: 100 },
          data: {
            config: {
              operation: 'store',
              type: 'conversation',
              content: '{{response}}',
              metadata: {
                intent: '{{intent}}',
                confidence: '{{confidence}}'
              }
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'webhook-trigger', target: 'context-analysis' },
        { id: 'e2', source: 'context-analysis', target: 'intent-classification' },
        { id: 'e3', source: 'intent-classification', target: 'decision-router' },
        { id: 'e4', source: 'decision-router', target: 'billing-handler', condition: 'route_to_billing' },
        { id: 'e5', source: 'decision-router', target: 'technical-handler', condition: 'route_to_technical' },
        { id: 'e6', source: 'decision-router', target: 'escalation-handler', condition: 'escalate_to_human' },
        { id: 'e7', source: 'billing-handler', target: 'response-generator' },
        { id: 'e8', source: 'technical-handler', target: 'response-generator' },
        { id: 'e9', source: 'escalation-handler', target: 'response-generator' },
        { id: 'e10', source: 'response-generator', target: 'memory-store' }
      ]
    },
    configuration: {
      required: ['OPENAI_API_KEY', 'DATABASE_URL'],
      optional: ['SLACK_BOT_TOKEN', 'EMAIL_SERVICE'],
      examples: {
        OPENAI_API_KEY: 'sk-...',
        DATABASE_URL: 'postgresql://...',
        SLACK_BOT_TOKEN: 'xoxb-...'
      }
    },
    customization: {
      variables: ['company_name', 'support_email', 'escalation_threshold'],
      instructions: [
        'Update the intent classification labels to match your business needs',
        'Configure the escalation email address',
        'Customize the response templates for your brand voice'
      ]
    }
  },
  {
    id: 'content-creation-agent',
    name: 'Content Creation Agent',
    description: 'AI-powered content creation agent with research, writing, and review capabilities',
    category: 'content',
    version: '1.0.0',
    author: 'Workflow Studio',
    tags: ['content', 'writing', 'research', 'seo'],
    difficulty: 'intermediate',
    estimatedTime: '20-40 minutes',
    useCases: [
      'Blog post generation',
      'Social media content',
      'Marketing copy',
      'Technical documentation'
    ],
    prerequisites: [
      'OpenAI API key',
      'Web search capability',
      'Content management system'
    ],
    workflow: {
      nodes: [
        {
          id: 'schedule-trigger',
          type: 'trigger',
          name: 'Content Schedule',
          position: { x: 100, y: 100 },
          data: {
            config: {
              operation: 'schedule',
              cron: '0 9 * * 1-5',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'topic-research',
          type: 'action',
          name: 'Research Topic',
          position: { x: 300, y: 100 },
          data: {
            config: {
              operation: 'search',
              query: '{{topic}}',
              maxResults: 10,
              sources: ['web', 'news', 'academic']
            }
          }
        },
        {
          id: 'outline-generator',
          type: 'action',
          name: 'Generate Outline',
          position: { x: 500, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Create a detailed outline for a blog post about {{topic}} based on the research: {{research}}',
              maxTokens: 800
            }
          }
        },
        {
          id: 'content-writer',
          type: 'action',
          name: 'Write Content',
          position: { x: 700, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Write a comprehensive blog post based on this outline: {{outline}}',
              maxTokens: 2000,
              temperature: 0.7
            }
          }
        },
        {
          id: 'seo-optimizer',
          type: 'action',
          name: 'SEO Optimization',
          position: { x: 900, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Optimize this content for SEO: {{content}}',
              maxTokens: 1500
            }
          }
        },
        {
          id: 'quality-review',
          type: 'action',
          name: 'Quality Review',
          position: { x: 1100, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Review this content for quality, accuracy, and engagement: {{content}}',
              maxTokens: 500
            }
          }
        },
        {
          id: 'publish-content',
          type: 'action',
          name: 'Publish Content',
          position: { x: 1300, y: 100 },
          data: {
            config: {
              operation: 'publish',
              platform: 'wordpress',
              status: 'draft'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'schedule-trigger', target: 'topic-research' },
        { id: 'e2', source: 'topic-research', target: 'outline-generator' },
        { id: 'e3', source: 'outline-generator', target: 'content-writer' },
        { id: 'e4', source: 'content-writer', target: 'seo-optimizer' },
        { id: 'e5', source: 'seo-optimizer', target: 'quality-review' },
        { id: 'e6', source: 'quality-review', target: 'publish-content' }
      ]
    },
    configuration: {
      required: ['OPENAI_API_KEY', 'SEARCH_API_KEY'],
      optional: ['WORDPRESS_API', 'CMS_API'],
      examples: {
        OPENAI_API_KEY: 'sk-...',
        SEARCH_API_KEY: 'your-search-api-key',
        WORDPRESS_API: 'your-wordpress-api'
      }
    },
    customization: {
      variables: ['content_type', 'target_audience', 'brand_voice', 'seo_keywords'],
      instructions: [
        'Set your content schedule frequency',
        'Configure your target keywords for SEO',
        'Customize the writing style and tone'
      ]
    }
  },
  {
    id: 'data-analysis-agent',
    name: 'Data Analysis Agent',
    description: 'Automated data analysis agent with insights generation and reporting',
    category: 'analytics',
    version: '1.0.0',
    author: 'Workflow Studio',
    tags: ['data', 'analytics', 'insights', 'reporting'],
    difficulty: 'advanced',
    estimatedTime: '30-60 minutes',
    useCases: [
      'Business intelligence',
      'Performance monitoring',
      'Trend analysis',
      'Automated reporting'
    ],
    prerequisites: [
      'Database connection',
      'Data visualization tools',
      'Email/Slack for reports'
    ],
    workflow: {
      nodes: [
        {
          id: 'schedule-trigger',
          type: 'trigger',
          name: 'Daily Analysis',
          position: { x: 100, y: 100 },
          data: {
            config: {
              operation: 'schedule',
              cron: '0 8 * * *',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'data-extractor',
          type: 'action',
          name: 'Extract Data',
          position: { x: 300, y: 100 },
          data: {
            config: {
              operation: 'query',
              query: 'SELECT * FROM analytics WHERE date >= CURRENT_DATE - INTERVAL \'7 days\'',
              database: 'analytics_db'
            }
          }
        },
        {
          id: 'data-processor',
          type: 'action',
          name: 'Process Data',
          position: { x: 500, y: 100 },
          data: {
            config: {
              operation: 'analyze',
              metrics: ['conversion_rate', 'user_engagement', 'revenue'],
              timeRange: '7d'
            }
          }
        },
        {
          id: 'trend-analyzer',
          type: 'action',
          name: 'Analyze Trends',
          position: { x: 700, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Analyze these data trends and provide insights: {{data}}',
              maxTokens: 1000
            }
          }
        },
        {
          id: 'anomaly-detector',
          type: 'action',
          name: 'Detect Anomalies',
          position: { x: 500, y: 250 },
          data: {
            config: {
              operation: 'detect_anomalies',
              threshold: 0.1,
              method: 'statistical'
            }
          }
        },
        {
          id: 'insight-generator',
          type: 'action',
          name: 'Generate Insights',
          position: { x: 900, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Generate actionable business insights from this analysis: {{analysis}}',
              maxTokens: 800
            }
          }
        },
        {
          id: 'report-generator',
          type: 'action',
          name: 'Generate Report',
          position: { x: 1100, y: 100 },
          data: {
            config: {
              template: 'analytics_report',
              format: 'html',
              includeCharts: true
            }
          }
        },
        {
          id: 'alert-handler',
          type: 'action',
          name: 'Handle Alerts',
          position: { x: 700, y: 400 },
          data: {
            config: {
              operation: 'send',
              to: 'alerts@company.com',
              subject: 'Data Anomaly Detected',
              body: 'Anomaly detected in data: {{anomaly}}'
            }
          }
        },
        {
          id: 'report-sender',
          type: 'action',
          name: 'Send Report',
          position: { x: 1300, y: 100 },
          data: {
            config: {
              operation: 'send',
              to: 'team@company.com',
              subject: 'Daily Analytics Report',
              body: '{{report}}',
              attachments: ['{{charts}}']
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'schedule-trigger', target: 'data-extractor' },
        { id: 'e2', source: 'data-extractor', target: 'data-processor' },
        { id: 'e3', source: 'data-processor', target: 'trend-analyzer' },
        { id: 'e4', source: 'data-processor', target: 'anomaly-detector' },
        { id: 'e5', source: 'trend-analyzer', target: 'insight-generator' },
        { id: 'e6', source: 'insight-generator', target: 'report-generator' },
        { id: 'e7', source: 'report-generator', target: 'report-sender' },
        { id: 'e8', source: 'anomaly-detector', target: 'alert-handler', condition: 'anomaly_detected' }
      ]
    },
    configuration: {
      required: ['DATABASE_URL', 'OPENAI_API_KEY'],
      optional: ['EMAIL_SERVICE', 'CHART_API'],
      examples: {
        DATABASE_URL: 'postgresql://...',
        OPENAI_API_KEY: 'sk-...',
        EMAIL_SERVICE: 'smtp://...'
      }
    },
    customization: {
      variables: ['metrics', 'thresholds', 'report_recipients', 'alert_conditions'],
      instructions: [
        'Configure your database connection and queries',
        'Set up alert thresholds for anomalies',
        'Customize report templates and recipients'
      ]
    }
  },
  {
    id: 'social-media-agent',
    name: 'Social Media Agent',
    description: 'Automated social media management agent with content scheduling and engagement',
    category: 'social-media',
    version: '1.0.0',
    author: 'Workflow Studio',
    tags: ['social-media', 'automation', 'engagement', 'scheduling'],
    difficulty: 'intermediate',
    estimatedTime: '25-45 minutes',
    useCases: [
      'Social media automation',
      'Content scheduling',
      'Engagement monitoring',
      'Brand management'
    ],
    prerequisites: [
      'Social media API keys',
      'Content calendar',
      'Analytics tools'
    ],
    workflow: {
      nodes: [
        {
          id: 'schedule-trigger',
          type: 'trigger',
          name: 'Post Schedule',
          position: { x: 100, y: 100 },
          data: {
            config: {
              operation: 'schedule',
              cron: '0 */2 * * *',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'content-generator',
          type: 'action',
          name: 'Generate Content',
          position: { x: 300, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Create engaging social media content for {{platform}} about {{topic}}',
              maxTokens: 500
            }
          }
        },
        {
          id: 'hashtag-optimizer',
          type: 'action',
          name: 'Optimize Hashtags',
          position: { x: 500, y: 100 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Suggest relevant hashtags for this content: {{content}}',
              maxTokens: 200
            }
          }
        },
        {
          id: 'engagement-analyzer',
          type: 'action',
          name: 'Analyze Engagement',
          position: { x: 700, y: 100 },
          data: {
            config: {
              operation: 'analyze',
              metrics: ['likes', 'shares', 'comments', 'reach'],
              timeRange: '24h'
            }
          }
        },
        {
          id: 'response-generator',
          type: 'action',
          name: 'Generate Responses',
          position: { x: 500, y: 250 },
          data: {
            config: {
              model: 'gpt-3.5-turbo',
              prompt: 'Generate appropriate responses to these comments: {{comments}}',
              maxTokens: 300
            }
          }
        },
        {
          id: 'post-scheduler',
          type: 'action',
          name: 'Schedule Post',
          position: { x: 900, y: 100 },
          data: {
            config: {
              operation: 'schedule',
              platform: 'twitter',
              content: '{{content}}',
              hashtags: '{{hashtags}}',
              scheduledTime: '{{optimal_time}}'
            }
          }
        },
        {
          id: 'engagement-monitor',
          type: 'action',
          name: 'Monitor Engagement',
          position: { x: 1100, y: 100 },
          data: {
            config: {
              operation: 'monitor',
              platforms: ['twitter', 'facebook', 'instagram'],
              interval: '15m'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'schedule-trigger', target: 'content-generator' },
        { id: 'e2', source: 'content-generator', target: 'hashtag-optimizer' },
        { id: 'e3', source: 'hashtag-optimizer', target: 'post-scheduler' },
        { id: 'e4', source: 'post-scheduler', target: 'engagement-monitor' },
        { id: 'e5', source: 'engagement-monitor', target: 'engagement-analyzer' },
        { id: 'e6', source: 'engagement-analyzer', target: 'response-generator' }
      ]
    },
    configuration: {
      required: ['TWITTER_API_KEY', 'FACEBOOK_API_KEY', 'OPENAI_API_KEY'],
      optional: ['INSTAGRAM_API_KEY', 'LINKEDIN_API_KEY'],
      examples: {
        TWITTER_API_KEY: 'your-twitter-api-key',
        FACEBOOK_API_KEY: 'your-facebook-api-key',
        OPENAI_API_KEY: 'sk-...'
      }
    },
    customization: {
      variables: ['brand_voice', 'posting_schedule', 'hashtag_strategy', 'engagement_thresholds'],
      instructions: [
        'Configure your social media API credentials',
        'Set up your posting schedule and frequency',
        'Customize your brand voice and content style'
      ]
    }
  },
  {
    id: 'lead-qualification-agent',
    name: 'Lead Qualification Agent',
    description: 'Automated lead qualification and scoring agent with CRM integration',
    category: 'sales',
    version: '1.0.0',
    author: 'Workflow Studio',
    tags: ['sales', 'leads', 'qualification', 'crm'],
    difficulty: 'intermediate',
    estimatedTime: '20-35 minutes',
    useCases: [
      'Lead scoring',
      'Qualification automation',
      'CRM integration',
      'Sales pipeline management'
    ],
    prerequisites: [
      'CRM system',
      'Lead data source',
      'Scoring criteria'
    ],
    workflow: {
      nodes: [
        {
          id: 'webhook-trigger',
          type: 'trigger',
          name: 'New Lead',
          position: { x: 100, y: 100 },
          data: {
            config: {
              operation: 'receive',
              method: 'POST',
              path: '/new-lead'
            }
          }
        },
        {
          id: 'data-enricher',
          type: 'action',
          name: 'Enrich Lead Data',
          position: { x: 300, y: 100 },
          data: {
            config: {
              operation: 'enrich',
              sources: ['company_info', 'social_profiles', 'contact_details'],
              api: 'lead_enrichment_api'
            }
          }
        },
        {
          id: 'qualification-scorer',
          type: 'action',
          name: 'Score Lead',
          position: { x: 500, y: 100 },
          data: {
            config: {
              operation: 'score',
              criteria: {
                company_size: { weight: 0.3, values: { 'enterprise': 10, 'mid': 7, 'small': 4 } },
                industry: { weight: 0.2, values: { 'tech': 10, 'finance': 8, 'healthcare': 9 } },
                engagement: { weight: 0.2, values: { 'high': 10, 'medium': 6, 'low': 3 } },
                budget: { weight: 0.3, values: { 'high': 10, 'medium': 6, 'low': 2 } }
              },
              threshold: 7
            }
          }
        },
        {
          id: 'decision-router',
          type: 'action',
          name: 'Route Lead',
          position: { x: 700, y: 100 },
          data: {
            config: {
              decisionType: 'rule-based',
              rules: [
                {
                  condition: 'score >= 8',
                  action: 'hot_lead',
                  confidence: 0.9
                },
                {
                  condition: 'score >= 6',
                  action: 'warm_lead',
                  confidence: 0.8
                },
                {
                  condition: 'score < 6',
                  action: 'cold_lead',
                  confidence: 0.7
                }
              ]
            }
          }
        },
        {
          id: 'hot-lead-handler',
          type: 'action',
          name: 'Hot Lead Handler',
          position: { x: 500, y: 250 },
          data: {
            config: {
              operation: 'create_task',
              assignee: 'senior_sales_rep',
              priority: 'high',
              dueDate: '1h'
            }
          }
        },
        {
          id: 'warm-lead-handler',
          type: 'action',
          name: 'Warm Lead Handler',
          position: { x: 500, y: 400 },
          data: {
            config: {
              operation: 'nurture',
              campaign: 'warm_lead_nurture',
              schedule: '2d'
            }
          }
        },
        {
          id: 'cold-lead-handler',
          type: 'action',
          name: 'Cold Lead Handler',
          position: { x: 500, y: 550 },
          data: {
            config: {
              operation: 'nurture',
              campaign: 'cold_lead_nurture',
              schedule: '7d'
            }
          }
        },
        {
          id: 'crm-updater',
          type: 'action',
          name: 'Update CRM',
          position: { x: 900, y: 100 },
          data: {
            config: {
              operation: 'update',
              crm: 'salesforce',
              fields: {
                lead_score: '{{score}}',
                qualification_status: '{{status}}',
                assigned_rep: '{{assignee}}'
              }
            }
          }
        },
        {
          id: 'notification-sender',
          type: 'action',
          name: 'Send Notification',
          position: { x: 1100, y: 100 },
          data: {
            config: {
              operation: 'send',
              to: '{{assignee_email}}',
              subject: 'New {{status}} Lead: {{company_name}}',
              body: 'Lead details: {{lead_data}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'webhook-trigger', target: 'data-enricher' },
        { id: 'e2', source: 'data-enricher', target: 'qualification-scorer' },
        { id: 'e3', source: 'qualification-scorer', target: 'decision-router' },
        { id: 'e4', source: 'decision-router', target: 'hot-lead-handler', condition: 'hot_lead' },
        { id: 'e5', source: 'decision-router', target: 'warm-lead-handler', condition: 'warm_lead' },
        { id: 'e6', source: 'decision-router', target: 'cold-lead-handler', condition: 'cold_lead' },
        { id: 'e7', source: 'hot-lead-handler', target: 'crm-updater' },
        { id: 'e8', source: 'warm-lead-handler', target: 'crm-updater' },
        { id: 'e9', source: 'cold-lead-handler', target: 'crm-updater' },
        { id: 'e10', source: 'crm-updater', target: 'notification-sender' }
      ]
    },
    configuration: {
      required: ['CRM_API_KEY', 'LEAD_ENRICHMENT_API'],
      optional: ['EMAIL_SERVICE', 'TASK_MANAGEMENT_API'],
      examples: {
        CRM_API_KEY: 'your-crm-api-key',
        LEAD_ENRICHMENT_API: 'your-enrichment-api',
        EMAIL_SERVICE: 'smtp://...'
      }
    },
    customization: {
      variables: ['scoring_criteria', 'routing_rules', 'notification_recipients', 'nurture_campaigns'],
      instructions: [
        'Configure your lead scoring criteria and weights',
        'Set up your CRM integration and field mappings',
        'Customize your notification templates and recipients'
      ]
    }
  }
];

export const getTemplateById = (id: string): AgentTemplate | undefined => {
  return agentTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): AgentTemplate[] => {
  return agentTemplates.filter(template => template.category === category);
};

export const getTemplatesByDifficulty = (difficulty: string): AgentTemplate[] => {
  return agentTemplates.filter(template => template.difficulty === difficulty);
};

export const searchTemplates = (query: string): AgentTemplate[] => {
  const lowercaseQuery = query.toLowerCase();
  return agentTemplates.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    template.useCases.some(useCase => useCase.toLowerCase().includes(lowercaseQuery))
  );
};
