import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface NodeType {
  id: string;
  type: string;
  category: string;
  label: string;
  description: string;
  icon: string;
}

const nodeTypes: NodeType[] = [
    // Utility nodes (Triggers and basic utilities)
    { id: 'webhook-trigger', type: 'trigger', category: 'Utility', label: 'Webhook Trigger', description: 'Trigger workflow via HTTP request', icon: '🔗' },
    { id: 'schedule', type: 'trigger', category: 'Utility', label: 'Schedule Trigger', description: 'Run workflow on schedule', icon: '⏰' },
    { id: 'manual', type: 'trigger', category: 'Utility', label: 'Manual Trigger', description: 'Start workflow manually', icon: '▶️' },
    { id: 'signature-validation', type: 'action', category: 'Utility', label: 'Validate Signature', description: 'Validate webhook signature', icon: '🔐' },
    { id: 'audit-log', type: 'action', category: 'Utility', label: 'Audit Log', description: 'Create and push audit log entry', icon: '📋' },

    // Development nodes
    { id: 'http-request', type: 'action', category: 'Development', label: 'HTTP Request', description: 'Make HTTP API calls with auth, query params, and body controls', icon: '🌐' },
    { id: 'webhook-call', type: 'action', category: 'Development', label: 'Webhook Call', description: 'Send data to webhook URL', icon: '📤' },
    // removed GraphQL node
    { id: 'rest-api', type: 'action', category: 'Development', label: 'REST API', description: 'Interact with REST APIs', icon: '🔌' },

    // Communication nodes - n8n Style
    { id: 'email-trigger', type: 'trigger', category: 'Communication', label: 'Email Trigger', description: 'Trigger on new email', icon: '📧' },
    { id: 'gmail-trigger', type: 'trigger', category: 'Communication', label: 'Gmail Trigger', description: 'Fetches emails from Gmail and starts workflow on polling intervals', icon: '📬' },
    // removed Email and Email Integration nodes
    { id: 'gmail', type: 'action', category: 'Communication', label: 'Gmail', description: 'Gmail operations: send, list, read emails', icon: '📨' },
    { id: 'slack', type: 'action', category: 'Communication', label: 'Slack', description: 'Send Slack messages and notifications', icon: '💬' },
    { id: 'discord', type: 'action', category: 'Communication', label: 'Discord', description: 'Send Discord messages and embeds', icon: '🎮' },
    { id: 'telegram', type: 'action', category: 'Communication', label: 'Telegram', description: 'Send Telegram messages', icon: '✈️' },
    { id: 'whatsapp', type: 'action', category: 'Communication', label: 'WhatsApp', description: 'Send WhatsApp messages', icon: '💚' },
    { id: 'microsoft-teams', type: 'action', category: 'Communication', label: 'MS Teams', description: 'Microsoft Teams integration', icon: '👥' },
    { id: 'zoom', type: 'action', category: 'Communication', label: 'Zoom', description: 'Zoom meeting and chat integration', icon: '📹' },
    // removed WeChat
    { id: 'instagram', type: 'action', category: 'Communication', label: 'Instagram', description: 'Instagram messaging integration', icon: '📷' },
    { id: 'twitter-dm', type: 'action', category: 'Communication', label: 'Twitter DM', description: 'Twitter direct messages', icon: '🐦' },
    { id: 'linkedin-message', type: 'action', category: 'Communication', label: 'LinkedIn Message', description: 'LinkedIn messaging integration', icon: '💼' },

    // Finance & Accounting
    { id: 'stripe', type: 'action', category: 'Finance & Accounting', label: 'Stripe', description: 'Stripe payment integration', icon: '💳' },


    // Marketing & Content

    // Development
    { id: 'github', type: 'action', category: 'Development', label: 'GitHub', description: 'GitHub API integration', icon: '🐙' },

    // Analytics
    { id: 'google-analytics', type: 'action', category: 'Analytics', label: 'Google Analytics', description: 'Google Analytics integration', icon: '📊' },
    { id: 'segment', type: 'action', category: 'Analytics', label: 'Segment', description: 'Segment data integration', icon: '🔗' },

    // AI/Analytics Nodes
    { id: 'audio-processor', type: 'action', category: 'AI/Analytics', label: 'Audio Processor', description: 'Process audio with AI - Speech-to-Text, Text-to-Speech, Audio Analysis', icon: '🎤' },
    // removed Code Generator
    { id: 'data-analyzer', type: 'action', category: 'AI/Analytics', label: 'Data Analyzer', description: 'Analyze data using AI - insights, patterns, predictions, and visualizations', icon: '📊' },
    { id: 'document-processor', type: 'action', category: 'AI/Analytics', label: 'Document Processor', description: 'Process and extract text from various document formats', icon: '📄' },
    { id: 'email-analyzer', type: 'action', category: 'AI/Analytics', label: 'Email Analyzer', description: 'Analyze emails for sentiment, intent, classification, and insights', icon: '📧' },
    { id: 'image-generator', type: 'action', category: 'AI/Analytics', label: 'Image Generator', description: 'Generate images using AI models like DALL-E, Midjourney, Stable Diffusion', icon: '🎨' },
    { id: 'text-analyzer', type: 'action', category: 'AI/Analytics', label: 'Text Analyzer', description: 'Analyze text for sentiment, entities, keywords, and insights', icon: '📝' },
    { id: 'vector-search', type: 'action', category: 'AI/Analytics', label: 'Vector Search', description: 'Search for similar content using vector embeddings', icon: '🔍' },

    // Productivity
    { id: 'google-sheets', type: 'action', category: 'Productivity', label: 'Google Sheets', description: 'Google Sheets integration', icon: '📊' },
    { id: 'google-forms', type: 'action', category: 'Productivity', label: 'Google Forms', description: 'Get form responses and metadata from Google Forms', icon: '📝' },

    // Cloud & Infrastructure
    { id: 'aws-lambda', type: 'action', category: 'Cloud & Infrastructure', label: 'AWS Lambda', description: 'AWS Lambda serverless functions - invoke, create, update, delete functions and manage triggers', icon: '⚡' },
    { id: 'cloudwatch', type: 'action', category: 'Cloud & Infrastructure', label: 'AWS CloudWatch', description: 'AWS CloudWatch monitoring - metrics, logs, alarms, and dashboards', icon: '📊' },
    { id: 'docker', type: 'action', category: 'Cloud & Infrastructure', label: 'Docker', description: 'Docker container management - build, run, stop, remove containers and manage images', icon: '🐳' },
    // removed Terraform


    // Data & Storage - n8n Style
    { id: 'file-trigger', type: 'trigger', category: 'Data & Storage', label: 'File Trigger', description: 'Trigger on file changes', icon: '📁' },
    { id: 'database-trigger', type: 'trigger', category: 'Data & Storage', label: 'Database Trigger', description: 'Trigger on database changes', icon: '🗄️' },
    { id: 'google-drive', type: 'action', category: 'Data & Storage', label: 'Google Drive', description: 'Upload/download files to Google Drive', icon: '📁' },
    { id: 'onedrive', type: 'action', category: 'Data & Storage', label: 'OneDrive', description: 'Access Microsoft OneDrive files', icon: '☁️' },
    { id: 'aws-s3', type: 'action', category: 'Data & Storage', label: 'AWS S3', description: 'Upload to Amazon S3 bucket', icon: '🪣' },
    { id: 'azure-blob', type: 'action', category: 'Data & Storage', label: 'Azure Blob Storage', description: 'Microsoft Azure blob storage', icon: '☁️' },
    { id: 'google-cloud-storage', type: 'action', category: 'Data & Storage', label: 'Google Cloud Storage', description: 'Google Cloud Storage buckets', icon: '☁️' },

    // Data Processing Nodes (trimmed)
    { id: 'database', type: 'action', category: 'Data & Storage', label: 'Database', description: 'Execute database queries and operations (generic database)', icon: '🗄️' },

    // Databases
    { id: 'mysql', type: 'action', category: 'Data & Storage', label: 'MySQL', description: 'Execute MySQL queries', icon: '🗄️' },
    { id: 'postgresql', type: 'action', category: 'Data & Storage', label: 'PostgreSQL', description: 'Execute PostgreSQL queries', icon: '🐘' },
    { id: 'mongodb', type: 'action', category: 'Data & Storage', label: 'MongoDB', description: 'Query MongoDB collections', icon: '🍃' },
    { id: 'redis', type: 'action', category: 'Data & Storage', label: 'Redis', description: 'Cache data in Redis', icon: '🔴' },

    // Additional nodes for n8n categories
    { id: 'excel', type: 'action', category: 'Productivity', label: 'Excel Online', description: 'Work with Excel files', icon: '📈' },



    // Miscellaneous (AI & ML nodes)
    { id: 'openai', type: 'ai', category: 'Miscellaneous', label: 'OpenAI GPT', description: 'Generate text with GPT models', icon: '🤖' },
    // removed Anthropic Claude
    { id: 'gemini', type: 'ai', category: 'Miscellaneous', label: 'Google Gemini', description: 'Google multimodal language model', icon: '✨' },
    { id: 'openrouter', type: 'ai', category: 'Miscellaneous', label: 'OpenRouter', description: 'Unified API for many LLMs', icon: '🛣️' },
    { id: 'huggingface', type: 'ai', category: 'Miscellaneous', label: 'Hugging Face', description: 'ML model inference', icon: '🤗' },
    { id: 'speech-to-text', type: 'ai', category: 'Miscellaneous', label: 'Speech to Text', description: 'Convert audio to text', icon: '🎤' },
    { id: 'text-to-speech', type: 'ai', category: 'Miscellaneous', label: 'Text to Speech', description: 'Convert text to audio', icon: '🔊' },

    // Agent (AI/LLM) - Context/Decision/Goal/Reasoning/State
    { id: 'agent-context', type: 'ai', category: 'AI/LLM', label: 'Agent Context', description: 'Manage and inject agent context variables', icon: '🧭' },
    { id: 'agent-decision', type: 'ai', category: 'AI/LLM', label: 'Agent Decision', description: 'Decision-making logic for agents', icon: '⚖️' },
    { id: 'agent-goal', type: 'ai', category: 'AI/LLM', label: 'Agent Goal', description: 'Set and track agent goals', icon: '🎯' },
    { id: 'agent-reasoning', type: 'ai', category: 'AI/LLM', label: 'Agent Reasoning', description: 'Reasoning capabilities and chain-of-thought signals', icon: '🧠' },
    { id: 'agent-state', type: 'ai', category: 'AI/LLM', label: 'Agent State', description: 'Agent state read/write across workflow', icon: '📦' },

    // Utility nodes
    { id: 'condition', type: 'utility', category: 'Utility', label: 'Condition', description: 'Execute different paths based on conditions', icon: '🔀' },
    { id: 'code', type: 'utility', category: 'Utility', label: 'Code', description: 'Execute custom JavaScript code', icon: '💻' },
    { id: 'date-time', type: 'utility', category: 'Utility', label: 'Date & Time', description: 'Work with dates and times', icon: '📅' },
    // removed URL Parser

    // Additional Miscellaneous nodes
    { id: 'image-resize', type: 'utility', category: 'Miscellaneous', label: 'Image Resize', description: 'Resize and optimize images', icon: '🖼️' },
    { id: 'error-trigger', type: 'trigger', category: 'Utility', label: 'Error Trigger', description: 'Trigger on workflow errors', icon: '⚠️' },
    // removed File Watch node
    { id: 'analytics', type: 'utility', category: 'Analytics', label: 'Analytics', description: 'Track events and metrics', icon: '📈' },
    { id: 'logger', type: 'utility', category: 'Utility', label: 'Logger', description: 'Log workflow data', icon: '📝' },
    { id: 'data-converter', type: 'action', category: 'Utility', label: 'Data Converter', description: 'Convert data between formats (CSV, XLSX, JSON, XML, HTML, PDF)', icon: '🔄' },

    // File Processing nodes
    { id: 'file-upload', type: 'trigger', category: 'File Processing', label: 'File Upload', description: 'Upload and process files', icon: '📁' },
    { id: 'data-cleaning', type: 'action', category: 'File Processing', label: 'Data Cleaning', description: 'Clean and normalize data', icon: '🧹' },
    { id: 'data-transformation', type: 'action', category: 'File Processing', label: 'Data Transformation', description: 'Transform data structure and format', icon: '🔄' },
    // removed Quality Check
    { id: 'file-export', type: 'action', category: 'File Processing', label: 'File Export', description: 'Export processed data to various formats', icon: '💾' },
  ];

const categories = [...new Set(nodeTypes.map(node => node.category))];

interface NodeSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const NodeSidebar: React.FC<NodeSidebarProps> = ({ isOpen, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set() // All categories collapsed by default
  );

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodeTypes;
    
    return nodeTypes.filter(node =>
      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredCategories = useMemo(() => {
    return [...new Set(filteredNodes.map(node => node.category))];
  }, [filteredNodes]);

  // Auto-expand categories with matching nodes when searching
  // Collapse all when search is cleared
  useEffect(() => {
    if (searchTerm) {
      setExpandedCategories(new Set(filteredCategories));
    } else {
      setExpandedCategories(new Set());
    }
  }, [searchTerm, filteredCategories]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getDefaultTriggerParameters = (nodeId: string) => {
    const defaultParams = {
      // Minimal n8n parameters - users can configure everything
      responseMode: 'responseToWebhook' as const,
      isActive: true,
      options: {},
      errorHandling: {},
      executionOrder: 'sequential' as const,
      maxConcurrentExecutions: 1
    };

    // Node-specific defaults
    switch (nodeId) {
      case 'webhook-trigger':
        return {
          ...defaultParams,
          httpMethod: 'POST' as const,
          path: '/webhook'
        };
      case 'schedule':
      case 'scheduler':
        return {
          ...defaultParams,
          options: {
            triggerInterval: 5,
            triggerIntervalUnit: 'minutes' as const,
            timezone: 'UTC'
          },
          config: {
            mode: 'interval',
            timezone: 'UTC'
          }
        };
      // removed file-watch default parameters
      case 'manual':
        return {
          ...defaultParams,
          responseMode: 'responseToUser' as const
        };
      case 'email-trigger':
        return {
          ...defaultParams,
          options: {
            mailbox: 'INBOX'
          }
        };
      case 'gmail-trigger':
        return {
          ...defaultParams,
          options: {
            authentication: 'oAuth2',
            event: 'messageReceived',
            pollTimes: {
              item: [{ mode: 'everyMinute' }]
            },
            simple: true,
            filters: {
              includeSpamTrash: false,
              includeDrafts: false,
              readStatus: 'unread'
            }
          }
        };
      // Database triggers
      case 'database-trigger':
      case 'mysql-trigger':
      case 'postgresql-trigger':
      case 'mongodb-trigger':
      case 'redis-trigger':
        return {
          ...defaultParams,
          options: {
            ...defaultParams.options,
            triggerInterval: 5,
            triggerIntervalUnit: 'seconds' as const
          }
        };
      // File system triggers
      case 'file-trigger':
      case 'google-drive-trigger':
      case 'aws-s3-trigger':
        return {
          ...defaultParams,
          options: {
            ...defaultParams.options,
            triggerInterval: 30,
            triggerIntervalUnit: 'seconds' as const
          }
        };
      // API/webhook triggers
      case 'slack-trigger':
      case 'github-trigger':
      case 'gitlab-trigger':
      case 'jira-trigger':
      case 'stripe-trigger':
      case 'twitter-trigger':
      case 'telegram-trigger':
      case 'discord-trigger':
        return {
          ...defaultParams,
          httpMethod: 'POST' as const,
          path: `/webhook/${nodeId}`,
          options: {
            ...defaultParams.options,
            rawBody: true
          }
        };
      // Spreadsheet/document triggers
      case 'google-sheets-trigger':
      case 'airtable-trigger':
        return {
          ...defaultParams,
          options: {
            ...defaultParams.options,
            triggerInterval: 1,
            triggerIntervalUnit: 'minutes' as const
          }
        };
      default:
        return defaultParams;
    }
  };

  const getDefaultStorageParameters = (nodeId: string) => {
    const defaultParams = {
      // Minimal n8n parameters for storage nodes
      options: {},
      errorHandling: {},
      executionOrder: 'sequential' as const,
      maxConcurrentExecutions: 1
    };

    // Storage-specific defaults
    switch (nodeId) {
      case 'google-drive':
        return {
          ...defaultParams,
          fileOperations: {
            operation: 'upload' as const,
            fileName: '',
            filePath: '',
            mimeType: 'text/plain',
            overwrite: false,
            createDirectories: true
          },
          options: {
            ...defaultParams.options,
            convertToGoogleFormat: false,
            sharedDrive: false,
            // Prefill to auto-use previous node output as file content
            usePreviousOutput: true,
            previousNodeId: '',
            fileName: 'notes-{{Date.now}}.txt',
            fileContent: '{{previousNode.output.content || previousNode.output.reasoning || previousNode.output}}'
          }
        };
      case 'aws-s3':
        return {
          ...defaultParams,
          config: {
            region: 'us-east-1'
          },
          fileOperations: {
            operation: 'upload' as const,
            fileName: '',
            filePath: '',
            mimeType: 'application/octet-stream',
            overwrite: false
          },
          bucketOperations: {
            operation: 'list' as const,
            bucketName: '',
            recursive: false
          },
          options: {
            ...defaultParams.options,
            region: 'us-east-1',
            acl: 'private',
            storageClass: 'STANDARD',
            serverSideEncryption: 'AES256',
            multipartUpload: true,
            chunkSize: 5242880 // 5MB
          }
        };
      case 'onedrive':
        return {
          ...defaultParams,
          fileOperations: {
            operation: 'upload' as const,
            fileName: '',
            filePath: '',
            mimeType: 'application/octet-stream',
            overwrite: false
          },
          options: {
            ...defaultParams.options
          }
        };
      case 'azure-blob':
        return {
          ...defaultParams,
          authentication: {
            type: 'apiKey' as const,
          },
          fileOperations: {
            operation: 'upload' as const,
            fileName: '',
            filePath: '',
            mimeType: 'application/octet-stream',
            overwrite: false
          },
          bucketOperations: {
            operation: 'list' as const,
            bucketName: '',
            recursive: false
          },
          options: {
            ...defaultParams.options,
            region: 'eastus',
            acl: 'private'
          }
        };
      case 'google-cloud-storage':
        return {
          ...defaultParams,
          authentication: {
            type: 'oauth2' as const,
          },
          fileOperations: {
            operation: 'upload' as const,
            fileName: '',
            filePath: '',
            mimeType: 'application/octet-stream',
            overwrite: false
          },
          bucketOperations: {
            operation: 'list' as const,
            bucketName: '',
            recursive: false
          },
          options: {
            ...defaultParams.options,
            region: 'us-central1',
            storageClass: 'STANDARD'
          }
        };
      default:
        return defaultParams;
    }
  };

  const getDefaultCommunicationParameters = (nodeId: string) => {
    const defaultParams = {
      // Minimal n8n parameters for communication nodes
      authentication: {
        type: 'none' as const,
      },
      communication: {
        operation: 'send' as const
      },
      communicationOptions: {},
      errorHandling: {},
      executionOrder: 'sequential' as const,
      maxConcurrentExecutions: 1
    };

    // Communication-specific defaults
    switch (nodeId) {
      case 'email':
        return {
          ...defaultParams,
          authentication: {
            type: 'apiKey' as const,
          },
          communication: {
            ...defaultParams.communication,
            fromEmail: '',
            toEmail: '',
            subject: '',
            emailFormat: 'text' as const,
            textContent: '',
            htmlContent: ''
          },
          communicationOptions: {
            ...defaultParams.communicationOptions,
            ignoreSSL: false,
            allowUnauthorizedCerts: false,
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000
          }
        };
      case 'slack':
        return {
          ...defaultParams,
          authentication: {
            type: 'oauth2' as const,
          },
          communication: {
            ...defaultParams.communication,
            channel: '',
            username: '',
            iconEmoji: '',
            message: ''
          },
          communicationOptions: {
            ...defaultParams.communicationOptions,
            unfurlLinks: true,
            unfurlMedia: true,
            linkNames: false,
            parse: 'full' as const
          }
        };
      case 'discord':
        return {
          ...defaultParams,
          authentication: {
            type: 'apiKey' as const,
          },
          communication: {
            ...defaultParams.communication,
            channel: '',
            message: ''
          },
          communicationOptions: {
            ...defaultParams.communicationOptions,
            tts: false,
            embeds: []
          }
        };
      case 'microsoft-teams':
        return {
          ...defaultParams,
          authentication: {
            type: 'oauth2' as const,
          },
          communication: {
            ...defaultParams.communication,
            channel: '',
            message: ''
          },
          communicationOptions: {
            ...defaultParams.communicationOptions,
            markdown: true
          }
        };
      case 'telegram':
        return {
          ...defaultParams,
          authentication: {
            type: 'apiKey' as const,
          },
          communication: {
            ...defaultParams.communication,
            channel: '',
            message: ''
          },
          communicationOptions: {
            ...defaultParams.communicationOptions,
            parseMode: 'HTML' as const,
            disableWebPagePreview: false,
            disableNotification: false
          }
        };
      case 'whatsapp':
        return {
          ...defaultParams,
          authentication: {
            type: 'apiKey' as const,
          },
          communication: {
            ...defaultParams.communication,
            phoneNumber: '',
            message: ''
          },
          communicationOptions: {
            ...defaultParams.communicationOptions,
            mediaType: 'text' as const
          }
        };
      case 'zoom':
      case 'wechat':
      case 'instagram':
      case 'twitter-dm':
      case 'linkedin-message':
        return {
          ...defaultParams,
          authentication: {
            type: 'oauth2' as const,
          },
          communication: {
            ...defaultParams.communication,
            channel: '',
            message: ''
          }
        };
      default:
        return defaultParams;
    }
  };

  const getDefaultAgentParameters = (nodeId: string) => {
    // Defaults for new Agent nodes to make them runnable immediately
    switch (nodeId) {
      case 'agent-context':
        return {
          config: {
            contextName: 'session',
            namespace: 'agent',
            scope: 'run',
            variables: JSON.stringify({ userRole: 'guest' }),
            inputsMapping: JSON.stringify({ lastOutput: 'input?.result ?? input' })
          },
          options: { mergeStrategy: 'deepMerge', persist: false, ttlSeconds: 0 }
        };
      case 'agent-decision':
        return {
          config: {
            policy: 'scoreBased',
            scoringFunction: 'Number(input?.score ?? 0)',
            threshold: 0.5,
            rules: JSON.stringify([{ if: 'input?.flag === true', then: 'approve' }]),
            branches: JSON.stringify({ approve: 'approve', reject: 'reject' })
          },
          options: { explain: true, logDecision: true }
        };
      case 'agent-goal':
        return {
          config: {
            goalId: 'goal-1',
            goal: 'Summarize the previous step output for the user.',
            priority: 'medium',
            deadline: '',
            constraints: JSON.stringify({ maxTokens: 600 }),
            successCriteria: 'Concise, accurate summary with key points.',
            evaluationMetric: 'custom',
            maxSteps: 4
          }
        };
      case 'agent-reasoning':
        return {
          config: {
            mode: 'balanced',
            model: 'openai/gpt-4o-mini',
            prompt: 'Think step-by-step using the provided context and goal.',
            maxTokens: 600,
            temperature: 0.5
          },
          options: { returnCitations: false, useToolInvocation: false, allowMemoryRead: true, allowMemoryWrite: false }
        };
      case 'agent-state':
        return {
          config: {
            store: 'memory',
            namespace: 'agent',
            stateKey: 'summary',
            operation: 'write',
            value: '""'
          },
          options: { mergeStrategy: 'overwrite', encrypt: false, ttlSeconds: 0, initIfMissing: true }
        };
      default:
        return {};
    }
  };

  const getDefaultUtilityParameters = (nodeId: string) => {
    switch (nodeId) {
      case 'condition':
        return {
          config: {
            logic: 'and',
            defaultPath: 'default',
            caseSensitive: false,
            strictMode: false,
            conditions: [
              {
                field: 'value',
                operator: 'greater_than',
                value: 0,
                path: 'positive'
              }
            ]
          }
        };
      default:
        return {};
    }
  };

  const onDragStart = (event: React.DragEvent, node: NodeType) => {
    event.dataTransfer.setData('application/reactflow', node.type);
    
    const nodeData = {
      label: node.label,
      icon: node.icon,
      subtype: node.id,
      description: node.description,
      // Add n8n parameters for trigger nodes
      ...(node.type === 'trigger' ? getDefaultTriggerParameters(node.id) : {}),
      // Add n8n parameters for storage nodes
      ...(node.category === 'Storage' ? getDefaultStorageParameters(node.id) : {}),
      // Add n8n parameters for communication nodes
      ...(node.category === 'Communication' ? getDefaultCommunicationParameters(node.id) : {}),
      // Add defaults for Agent AI nodes
      ...(node.type === 'ai' && node.id.startsWith('agent-') ? getDefaultAgentParameters(node.id) : {})
      ,
      // Defaults for common utility nodes
      ...(node.type === 'utility' ? getDefaultUtilityParameters(node.id) : {})
    };
    
    event.dataTransfer.setData('application/nodedata', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  if (!isOpen) {
    return null; // Sidebar toggle is now handled by header menu button
  }

  return (
    <div
      className="h-full w-80 bg-surface border-r border-border z-40 sidebar-enter flex flex-col"
      data-testid="node-sidebar"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
          Node Library
        </h2>
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-accent/10 rounded"
          title="Hide Node Library (use Menu button in header to show again)"
        >
          ✕
        </button>
      </div>

      <div className="p-4 border-b border-border">
        <Input
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {filteredCategories.map(category => {
            const categoryNodes = filteredNodes.filter(node => node.category === category);
            const isExpanded = expandedCategories.has(category);
            
            return (
              <div key={category} className="space-y-3">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 w-full text-left hover:bg-accent/10 rounded-md p-1 -ml-1 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(var(--node-${getCategoryType(category)}))` }}
                  />
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ({categoryNodes.length})
                  </span>
                </button>
                
                {isExpanded && (
                  <div className="space-y-2">
                    {categoryNodes.map(node => (
                    <Card
                      key={node.id}
                      className="p-3 cursor-grab hover:shadow-elevated transition-all duration-200 hover:-translate-y-1 border-l-4"
                      style={{ borderLeftColor: `hsl(var(--node-${node.type}))` }}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      data-testid={`node-card-${node.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg">{node.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{node.label}</h4>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: `hsl(var(--node-${node.type}) / 0.1)`,
                                color: `hsl(var(--node-${node.type}))`,
                                borderColor: `hsl(var(--node-${node.type}) / 0.2)`
                              }}
                            >
                              {node.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {node.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

function getCategoryColor(category: string): string {
  const colors = {
    'Triggers': 'node-trigger',
    'Actions': 'node-action',
    'Utilities': 'node-utility',
    'AI/LLM': 'node-ai',
    'File Processing': 'node-action',
    'Storage': 'node-action',
    'Communication': 'node-action',
  };
  return colors[category as keyof typeof colors] || 'primary';
}

function getCategoryType(category: string): string {
  const types = {
    'Triggers': 'trigger',
    'Actions': 'action',
    'Storage': 'action',
    'Utilities': 'utility',
    'AI/LLM': 'ai',
    'Integrations': 'action',
    'Communication': 'action',
    'Database': 'action',
    'Productivity': 'action',
    'Social Media': 'action',
    'E-commerce': 'action',
    'CRM': 'action',
    'Marketing': 'action',
    'Development': 'action',
    'File Processing': 'utility',
    'Monitoring': 'utility',
  };
  return types[category as keyof typeof types] || 'trigger';
}