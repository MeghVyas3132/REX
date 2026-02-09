export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'nodeOutput'
  | 'expression'
  | 'file'
  | 'credentialSelect'
  | 'notice'
  | 'hidden'
  | 'code';

export interface FieldSchema {
  key: string; // dot-path from selectedNode.data (e.g., "httpMethod" or "options.rawBody")
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>; // for select
  credentialTypes?: string[]; // for credentialSelect - array of credential type names or patterns (e.g., ['postgres', 'extends:oAuth2Api'])
  loadOptionsMethod?: string; // Method name for dynamic option loading
  loadOptionsDependsOn?: string[]; // Parameters this field depends on for dynamic loading
  displayOptions?: any; // n8n displayOptions for conditional field visibility
  rows?: number; // for textarea
  min?: number; // for number
  max?: number; // for number
  password?: boolean; // for string with password type
  content?: string; // for notice fields
}

export interface NodeSchema {
  title: string;
  fields: FieldSchema[];
}

// Minimal initial set; extend progressively
export const nodeParameterSchemas: Record<string, NodeSchema> = {
  // Agent - Context/Decision/Goal/Reasoning/State
  'agent-context': {
    title: 'Agent Context Configuration',
    fields: [
      { key: 'config.contextType', label: 'Context Type', type: 'select', required: true, options: [
        { value: 'analyze', label: 'Analyze Context' },
        { value: 'extract', label: 'Extract Context' },
        { value: 'update', label: 'Update Context' },
        { value: 'merge', label: 'Merge Context' },
      ], placeholder: 'analyze' },
      { key: 'config.contextFields', label: 'Context Fields (comma-separated)', type: 'textarea', placeholder: 'user, environment, history, preferences' },
      { key: 'config.analysisDepth', label: 'Analysis Depth', type: 'select', options: [
        { value: 'shallow', label: 'Shallow' },
        { value: 'medium', label: 'Medium' },
        { value: 'deep', label: 'Deep' },
      ], placeholder: 'medium' },
      { key: 'config.includeHistory', label: 'Include History', type: 'boolean', placeholder: 'true' },
      { key: 'config.includePreferences', label: 'Include Preferences', type: 'boolean', placeholder: 'true' },
      { key: 'config.contextWindow', label: 'Context Window', type: 'number', placeholder: '10 (number of recent interactions to include)' },
    ],
  },
  'agent-decision': {
    title: 'Agent Decision Configuration',
    fields: [
      { key: 'config.decisionType', label: 'Decision Type', type: 'select', required: true, options: [
        { value: 'rule-based', label: 'Rule-Based' },
        { value: 'llm-based', label: 'LLM-Based' },
        { value: 'threshold', label: 'Threshold' },
        { value: 'classification', label: 'Classification' },
      ], placeholder: 'rule-based' },
      { key: 'config.fallbackAction', label: 'Fallback Action', type: 'string', placeholder: 'default, escalate, retry' },
      { key: 'config.llmModel', label: 'LLM Model', type: 'select', options: [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'claude-3', label: 'Claude 3' },
        { value: 'custom', label: 'Custom Model' },
      ], placeholder: 'gpt-3.5-turbo' },
      { key: 'config.decisionPrompt', label: 'Decision Prompt', type: 'textarea', placeholder: 'Prompt for LLM-based decisions' },
      { key: 'config.rules', label: 'Rules (JSON Array)', type: 'textarea', placeholder: '[{"condition": "input.value > 10", "action": "approve"}]' },
      { key: 'config.threshold', label: 'Threshold', type: 'number', placeholder: '0.5 (for threshold-based decisions)' },
      { key: 'config.confidenceThreshold', label: 'Confidence Threshold', type: 'number', placeholder: '0.8 (minimum confidence for decision)' },
    ],
  },
  'agent-goal': {
    title: 'Agent Goal Configuration',
    fields: [
      { key: 'config.goalType', label: 'Goal Operation', type: 'select', required: true, options: [
        { value: 'define', label: 'Define Goal' },
        { value: 'track', label: 'Track Progress' },
        { value: 'evaluate', label: 'Evaluate Goal' },
        { value: 'update', label: 'Update Goal' },
      ], placeholder: 'define' },
      { key: 'config.goalName', label: 'Goal Name', type: 'string', placeholder: 'Increase Sales, Improve Customer Satisfaction' },
      { key: 'config.goalDescription', label: 'Goal Description', type: 'textarea', placeholder: 'Achieve 20% increase in quarterly sales' },
      { key: 'config.priority', label: 'Priority Level', type: 'number', placeholder: '5 (1-10)' },
      { key: 'config.deadline', label: 'Deadline (ISO)', type: 'string', placeholder: '2024-12-31T23:59:59Z' },
      { key: 'config.successCriteria', label: 'Success Criteria (comma-separated)', type: 'textarea', placeholder: 'Sales increase by 20%, Customer satisfaction > 90%' },
      { key: 'config.progressMetrics', label: 'Progress Metrics (comma-separated)', type: 'textarea', placeholder: 'Sales volume, Customer count, Revenue' },
      { key: 'config.dependencies', label: 'Goal Dependencies (comma-separated)', type: 'textarea', placeholder: 'goal1, goal2, goal3' },
    ],
  },
  'agent-reasoning': {
    title: 'Agent Reasoning Configuration',
    fields: [
      { key: 'config.reasoningType', label: 'Reasoning Type', type: 'select', required: true, options: [
        { value: 'deductive', label: 'Deductive' },
        { value: 'inductive', label: 'Inductive' },
        { value: 'abductive', label: 'Abductive' },
        { value: 'analogical', label: 'Analogical' },
        { value: 'causal', label: 'Causal' },
      ], placeholder: 'deductive' },
      { key: 'config.reasoningDepth', label: 'Reasoning Depth', type: 'select', options: [
        { value: 'shallow', label: 'Shallow' },
        { value: 'medium', label: 'Medium' },
        { value: 'deep', label: 'Deep' },
      ], placeholder: 'medium' },
      { key: 'config.includeUncertainty', label: 'Include Uncertainty', type: 'boolean', placeholder: 'true' },
      { key: 'config.maxSteps', label: 'Max Reasoning Steps', type: 'number', placeholder: '10 (maximum number of reasoning steps)' },
      { key: 'config.confidenceThreshold', label: 'Confidence Threshold', type: 'number', placeholder: '0.8 (minimum confidence for reasoning result)' },
    ],
  },
  'agent-state': {
    title: 'Agent State Configuration',
    fields: [
      { key: 'config.stateOperation', label: 'State Operation', type: 'select', required: true, options: [
        { value: 'get', label: 'Get State' },
        { value: 'set', label: 'Set State' },
        { value: 'update', label: 'Update State' },
        { value: 'reset', label: 'Reset State' },
        { value: 'transition', label: 'Transition State' },
      ], placeholder: 'get' },
      { key: 'config.stateKey', label: 'State Key', type: 'string', placeholder: 'user_preferences, session_data, workflow_state' },
      { key: 'config.defaultValue', label: 'Default Value (JSON)', type: 'textarea', placeholder: '{} (default value for the state)' },
      { key: 'config.persistState', label: 'Persist State', type: 'boolean', placeholder: 'true (whether to persist state across sessions)' },
      { key: 'config.stateExpiry', label: 'State Expiry (seconds)', type: 'number', placeholder: '0 (0 = never expire)' },
      { key: 'config.stateValidation', label: 'State Validation', type: 'textarea', placeholder: 'schema validation rules' },
    ],
  },
  agent: {
    title: 'AI Agent Configuration',
    fields: [
      { key: 'config.model', label: 'Model', type: 'select', required: true, options: [
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
      ]},
      { key: 'config.systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful agent.' },
      { key: 'config.tools', label: 'Allowed Tools (comma-separated)', type: 'string', required: true, placeholder: 'http-request,code' },
      { key: 'config.maxSteps', label: 'Max Steps', type: 'number', placeholder: '6' },
      { key: 'config.temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
    ],
  },
  'webhook-trigger': {
    title: 'Webhook Trigger Configuration',
    fields: [
      { key: 'httpMethod', label: 'HTTP Method', type: 'select', required: true, options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
      ]},
      { key: 'path', label: 'Webhook Path', type: 'string', required: true, placeholder: '/webhook' },
      { key: 'responseMode', label: 'Response Mode', type: 'select', required: true, options: [
        { value: 'responseToWebhook', label: 'Response to Webhook' },
        { value: 'responseToUser', label: 'Response to User' },
        { value: 'usingLastNode', label: 'Using Last Node' },
      ]},
      { key: 'options.rawBody', label: 'Raw Body', type: 'boolean' },
      { key: 'options.binaryData', label: 'Binary Data', type: 'boolean' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'Enter username' },
      { key: 'config.password', label: 'Password', type: 'string', placeholder: 'Enter password' },
      { key: 'config.apiKey', label: 'API Key', type: 'string', placeholder: 'Enter API key' },
      { key: 'config.apiKeyHeader', label: 'API Key Header', type: 'string', placeholder: 'X-API-Key' },
    ],
  },
  // schedule: Removed - using custom rendering in renderNodeSpecificN8nParameters to avoid duplicates
  schedule: {
    title: 'Schedule Configuration',
    fields: [
      { key: 'config.mode', label: 'Mode', type: 'select', required: true, options: [
        { value: 'cron', label: 'CRON' },
        { value: 'interval', label: 'Interval' },
      ]},
      { key: 'config.cron', label: 'CRON Expression', type: 'string', placeholder: '*/5 * * * *' },
      { key: 'config.intervalMs', label: 'Interval (ms)', type: 'number', placeholder: '60000' },
      { key: 'config.timezone', label: 'Timezone', type: 'string', placeholder: 'UTC' },
    ],
  },
  'manual': {
    title: 'Manual Trigger Configuration',
    fields: [
      { key: 'config.buttonText', label: 'Button Text', type: 'string', placeholder: 'Run Workflow' },
      { key: 'config.inputData', label: 'Initial Input (JSON)', type: 'textarea', rows: 4, placeholder: '{ "example": true }' },
    ],
  },
  'email-trigger': {
    title: 'Email Trigger Configuration',
    fields: [
      { key: 'config.email', label: 'Email Address', type: 'string', required: true, placeholder: 'monitor@example.com' },
      { key: 'config.subject', label: 'Subject Filter', type: 'string', placeholder: '^URGENT|^ALERT|.*report.* (supports regex patterns)' },
      { key: 'config.from', label: 'Sender Filter', type: 'string', placeholder: 'boss@company.com, alerts@system.com' },
      { key: 'config.keywords', label: 'Content Keywords (comma-separated)', type: 'textarea', placeholder: 'urgent, alert, error, report (any match triggers)' },
      { key: 'config.checkInterval', label: 'Check Interval (seconds)', type: 'number', placeholder: '300 (how often to check for new emails)' },
      { key: 'config.useOAuth', label: 'Use OAuth', type: 'boolean', placeholder: 'false (use OAuth for Gmail/Outlook authentication)' },
      { key: 'config.accessToken', label: 'Access Token', type: 'string', password: true, placeholder: 'your-oauth-token (optional - OAuth will be used if not provided)' },
    ],
  },
  'gmail-trigger': {
    title: 'Gmail Trigger Configuration',
    fields: [
      { 
        key: 'config.authentication', 
        label: 'Authentication', 
        type: 'select', 
        options: [
          { value: 'oAuth2', label: 'OAuth2 (recommended)' },
          { value: 'serviceAccount', label: 'Service Account' }
        ],
        default: 'oAuth2',
        placeholder: 'Authentication method'
      },
      { 
        key: 'config.event', 
        label: 'Event', 
        type: 'select', 
        options: [
          { value: 'messageReceived', label: 'Message Received' }
        ],
        default: 'messageReceived',
        placeholder: 'Event to trigger on'
      },
      { 
        key: 'config.pollTimes.item[0].mode', 
        label: 'Poll Time Mode', 
        type: 'select', 
        options: [
          { value: 'everyMinute', label: 'Every Minute' },
          { value: 'everyHour', label: 'Every Hour' },
          { value: 'everyDay', label: 'Every Day' },
          { value: 'everyWeek', label: 'Every Week' },
          { value: 'everyMonth', label: 'Every Month' },
          { value: 'everyX', label: 'Every X' },
          { value: 'custom', label: 'Custom' }
        ],
        default: 'everyMinute',
        placeholder: 'How often to poll'
      },
      { 
        key: 'config.pollTimes.item[0].hour', 
        label: 'Hour', 
        type: 'number', 
        min: 0,
        max: 23,
        default: 14,
        placeholder: 'Hour of day (0-23)',
        displayOptions: {
          hide: {
            'config.pollTimes.item[0].mode': ['custom', 'everyHour', 'everyMinute', 'everyX']
          }
        }
      },
      { 
        key: 'config.pollTimes.item[0].minute', 
        label: 'Minute', 
        type: 'number', 
        min: 0,
        max: 59,
        default: 0,
        placeholder: 'Minute of hour (0-59)',
        displayOptions: {
          hide: {
            'config.pollTimes.item[0].mode': ['custom', 'everyMinute', 'everyX']
          }
        }
      },
      { 
        key: 'config.pollTimes.item[0].dayOfMonth', 
        label: 'Day of Month', 
        type: 'number', 
        min: 1,
        max: 31,
        default: 1,
        placeholder: 'Day of month (1-31)',
        displayOptions: {
          show: {
            'config.pollTimes.item[0].mode': ['everyMonth']
          }
        }
      },
      { 
        key: 'config.pollTimes.item[0].weekday', 
        label: 'Weekday', 
        type: 'select', 
        options: [
          { value: '0', label: 'Sunday' },
          { value: '1', label: 'Monday' },
          { value: '2', label: 'Tuesday' },
          { value: '3', label: 'Wednesday' },
          { value: '4', label: 'Thursday' },
          { value: '5', label: 'Friday' },
          { value: '6', label: 'Saturday' }
        ],
        default: '1',
        placeholder: 'Weekday to trigger',
        displayOptions: {
          show: {
            'config.pollTimes.item[0].mode': ['everyWeek']
          }
        }
      },
      { 
        key: 'config.pollTimes.item[0].cronExpression', 
        label: 'Cron Expression', 
        type: 'string', 
        default: '* * * * * *',
        placeholder: '* * * * * * (seconds minutes hours day month weekday)',
        displayOptions: {
          show: {
            'config.pollTimes.item[0].mode': ['custom']
          }
        }
      },
      { 
        key: 'config.pollTimes.item[0].value', 
        label: 'Every X Value', 
        type: 'number', 
        min: 0,
        max: 1000,
        default: 2,
        placeholder: 'Number of units',
        displayOptions: {
          show: {
            'config.pollTimes.item[0].mode': ['everyX']
          }
        }
      },
      { 
        key: 'config.pollTimes.item[0].unit', 
        label: 'Every X Unit', 
        type: 'select', 
        options: [
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours', label: 'Hours' }
        ],
        default: 'hours',
        placeholder: 'Unit for Every X',
        displayOptions: {
          show: {
            'config.pollTimes.item[0].mode': ['everyX']
          }
        }
      },
      { 
        key: 'config.simple', 
        label: 'Simplify', 
        type: 'boolean', 
        default: true,
        placeholder: 'Return simplified email data instead of raw data'
      },
      { 
        key: 'config.filters.includeSpamTrash', 
        label: 'Include Spam and Trash', 
        type: 'boolean', 
        default: false,
        placeholder: 'Include messages from SPAM and TRASH folders'
      },
      { 
        key: 'config.filters.includeDrafts', 
        label: 'Include Drafts', 
        type: 'boolean', 
        default: false,
        placeholder: 'Include email drafts in results'
      },
      { 
        key: 'config.filters.labelIds', 
        label: 'Label Names or IDs', 
        type: 'string', 
        placeholder: 'INBOX,UNREAD (comma-separated label IDs)'
      },
      { 
        key: 'config.filters.q', 
        label: 'Search Query', 
        type: 'string', 
        placeholder: 'has:attachment from:example@gmail.com (Gmail search format)'
      },
      { 
        key: 'config.filters.readStatus', 
        label: 'Read Status', 
        type: 'select', 
        options: [
          { value: 'both', label: 'Unread and read emails' },
          { value: 'unread', label: 'Unread emails only' },
          { value: 'read', label: 'Read emails only' }
        ],
        default: 'unread'
      },
      { 
        key: 'config.filters.sender', 
        label: 'Sender', 
        type: 'string', 
        placeholder: 'sender@example.com (filter by sender email)'
      },
      { 
        key: 'config.options.dataPropertyAttachmentsPrefixName', 
        label: 'Attachment Prefix', 
        type: 'string', 
        default: 'attachment_',
        placeholder: 'Prefix for attachment binary property names',
        displayOptions: {
          hide: {
            'config.simple': [true]
          }
        }
      },
      { 
        key: 'config.options.downloadAttachments', 
        label: 'Download Attachments', 
        type: 'boolean', 
        default: false,
        placeholder: 'Download email attachments',
        displayOptions: {
          hide: {
            'config.simple': [true]
          }
        }
      },
    ],
  },
  'google-drive': {
    title: 'Google Drive Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'list', label: 'List Files' },
        { value: 'download', label: 'Download File' },
        { value: 'upload', label: 'Upload File' },
        { value: 'create_folder', label: 'Create Folder' },
        { value: 'delete', label: 'Delete File' },
      ], placeholder: 'list' },
      { key: 'options.folderId', label: 'Folder ID', type: 'string', required: false, placeholder: 'Enter Google Drive folder ID (optional - defaults to root folder)' },
      { key: 'options.sharedDrive', label: 'Shared Drive', type: 'boolean' },
      { key: 'options.usePreviousOutput', label: 'Use Previous Node Output', type: 'boolean', placeholder: 'Check to use output from previous node as file content' },
      { key: 'options.previousNodeId', label: 'Previous Node ID', type: 'string', placeholder: 'ID of the node to get output from' },
      { key: 'options.fileName', label: 'File Name', type: 'string', placeholder: 'Enter file name or use {{previousNode.output}}' },
      { key: 'options.fileContent', label: 'File Content', type: 'textarea', placeholder: 'Enter file content or use {{previousNode.output}}' },
      { key: 'config.clientId', label: 'Client ID', type: 'string', placeholder: 'Enter OAuth Client ID' },
      { key: 'config.clientSecret', label: 'Client Secret', type: 'string', placeholder: 'Enter OAuth Client Secret' },
      { key: 'config.refreshToken', label: 'Refresh Token', type: 'string', placeholder: 'Enter OAuth Refresh Token' },
      { key: 'fileOperations.fileName', label: 'File Name', type: 'string', placeholder: 'Enter file name' },
      { key: 'fileOperations.filePath', label: 'File Path', type: 'string', placeholder: 'Enter file path' },
    ],
  },
  slack: {
    title: 'Slack Configuration',
    fields: [
      { key: 'config.action', label: 'Slack Action', type: 'select', required: true, options: [
        { value: 'send_message', label: 'Send Message' },
        { value: 'create_channel', label: 'Create Channel' },
        { value: 'invite_user', label: 'Invite User' },
        { value: 'upload_file', label: 'Upload File' },
        { value: 'get_user_info', label: 'Get User Info' },
      ], placeholder: 'send_message' },
      { key: 'config.channel', label: 'Channel', type: 'string', placeholder: '#general or C1234567890' },
      { key: 'config.message', label: 'Message', type: 'textarea', placeholder: 'Enter your Slack message...' },
      { key: 'config.username', label: 'Bot Username', type: 'string', placeholder: 'WorkflowBot' },
      { key: 'config.icon_emoji', label: 'Bot Icon Emoji', type: 'string', placeholder: ':robot_face:' },
      { key: 'config.useOAuth', label: 'Use OAuth', type: 'boolean', placeholder: 'false' },
      { key: 'config.accessToken', label: 'Access Token', type: 'string', password: true, placeholder: 'xoxb-... (optional - OAuth will be used if not provided)' },
    ],
  },
  // removed Email and Email Integration node schemas

  // Productivity
  'google-sheets': {
    title: 'Google Sheets Configuration',
    fields: [
      { key: 'options.spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
      { key: 'options.range', label: 'Range', type: 'string', required: true, placeholder: 'Sheet1!A1:C10' },
      { key: 'options.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'read', label: 'Read' },
        { value: 'append', label: 'Append' },
        { value: 'update', label: 'Update' },
      ]},
      { key: 'options.data', label: 'Data (JSON or CSV)', type: 'textarea', placeholder: '[["a","b"],["c","d"]]' },
      { key: 'options.valueInputOption', label: 'Value Input Option', type: 'select', options: [
        { value: 'RAW', label: 'RAW' },
        { value: 'USER_ENTERED', label: 'USER_ENTERED' },
      ], placeholder: 'USER_ENTERED (for append/update operations)' },
      { key: 'config.clientId', label: 'Client ID', type: 'string', placeholder: 'Enter OAuth Client ID' },
      { key: 'config.clientSecret', label: 'Client Secret', type: 'string', placeholder: 'Enter OAuth Client Secret' },
      { key: 'config.refreshToken', label: 'Refresh Token', type: 'string', placeholder: 'Enter OAuth Refresh Token' },
      { key: 'options.worksheet', label: 'Worksheet Name', type: 'string', placeholder: 'Sheet1' },
    ],
  },
  'google-forms': {
    title: 'Google Forms Configuration',
    fields: [
      { key: 'credentials.google', label: 'Google Account', type: 'credentialSelect', required: true, placeholder: 'Select Google account' },
      { key: 'config.formId', label: 'Form ID', type: 'string', required: true, placeholder: 'Enter the Google Form ID' },
      { key: 'config.responseId', label: 'Response ID', type: 'string', required: false, placeholder: 'Enter a specific response ID' },
      { key: 'config.pageSize', label: 'Page Size', type: 'number', required: false, placeholder: '100', min: 1, max: 1000 },
      { key: 'config.accessToken', label: 'Access Token', type: 'string', required: false, password: true, placeholder: 'Google OAuth access token (optional - OAuth will be used if not provided)' },
    ],
  },

  // AI Nodes
  'openai': {
    title: 'OpenAI Configuration',
    fields: [
      { key: 'config.model', label: 'Model', type: 'select', required: true, options: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      ]},
      { key: 'config.systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant.' },
      { key: 'config.userPrompt', label: 'User Prompt', type: 'textarea', required: true, placeholder: 'Enter your prompt...' },
      { key: 'config.maxTokens', label: 'Max Tokens', type: 'number', placeholder: '1000' },
      { key: 'config.temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
      { key: 'config.apiKey', label: 'OpenAI API Key', type: 'string', required: true, placeholder: 'sk-...' },
    ],
  },
  'openrouter': {
    title: 'OpenRouter Configuration',
    fields: [
      { key: 'config.model', label: 'Model', type: 'select', required: true, options: [
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
        { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
        { value: 'google/gemini-pro', label: 'Gemini Pro' },
      ]},
      { key: 'config.systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant.' },
      { key: 'config.userPrompt', label: 'User Prompt (Optional - can come from previous node)', type: 'textarea', required: false, placeholder: 'Enter your prompt or leave empty to use input from Manual Trigger...' },
      { key: 'config.maxTokens', label: 'Max Tokens', type: 'number', placeholder: '1000' },
      { key: 'config.temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
      { key: 'config.apiKey', label: 'OpenRouter API Key', type: 'string', required: false, placeholder: 'sk-or-... (or set OPENROUTER_API_KEY in env)' },
    ],
  },
  'http-request': {
    title: 'HTTP Request Configuration',
    fields: [
      { key: 'config.method', label: 'Method', type: 'select', required: true, options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
        { value: 'HEAD', label: 'HEAD' },
        { value: 'OPTIONS', label: 'OPTIONS' },
      ]},
      { key: 'config.url', label: 'URL', type: 'string', required: true, placeholder: 'https://api.example.com/resource' },
      { key: 'config.queryParams', label: 'Query Parameters (JSON)', type: 'textarea', placeholder: '{"param1": "value1"}', rows: 3 },
      { key: 'config.headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization":"Bearer ..."}' },
      { key: 'config.bodyType', label: 'Body Type', type: 'select', options: [
        { value: 'json', label: 'JSON' },
        { value: 'raw', label: 'Raw Text' },
        { value: 'form', label: 'Form URL Encoded' },
      ], placeholder: 'json', displayOptions: { show: { 'config.method': ['POST', 'PUT', 'PATCH', 'DELETE'] } } },
      { key: 'config.body', label: 'Body', type: 'textarea', placeholder: '{"key": "value"}', rows: 6, displayOptions: { show: { 'config.method': ['POST', 'PUT', 'PATCH', 'DELETE'] } } },
      { key: 'config.timeout', label: 'Timeout (s)', type: 'string', placeholder: '30' },
      { key: 'config.followRedirects', label: 'Follow Redirects', type: 'boolean', placeholder: 'true' },
      { key: 'config.authType', label: 'Authentication Type', type: 'select', options: [
        { value: 'none', label: 'None' },
        { value: 'basic', label: 'Basic Auth' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'apikey', label: 'API Key' },
      ], placeholder: 'none' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'Basic auth username', displayOptions: { show: { 'config.authType': ['basic'] } } },
      { key: 'config.password', label: 'Password', type: 'string', placeholder: 'Basic auth password', password: true, displayOptions: { show: { 'config.authType': ['basic'] } } },
      { key: 'config.bearerToken', label: 'Bearer Token', type: 'string', placeholder: 'ey...', password: true, displayOptions: { show: { 'config.authType': ['bearer'] } } },
      { key: 'config.apiKeyHeader', label: 'API Key Header', type: 'string', placeholder: 'X-API-Key', displayOptions: { show: { 'config.authType': ['apikey'] } } },
      { key: 'config.apiKey', label: 'API Key', type: 'string', placeholder: 'Key value', password: true, displayOptions: { show: { 'config.authType': ['apikey'] } } },
    ],
  },

  // Utility Nodes
  // removed Delay node schema
  // removed File Watch node schema
  'code': {
    title: 'Code Configuration',
    fields: [
      { key: 'config.mode', label: 'Mode', type: 'select', required: false, options: [
        { value: 'runOnceForAllItems', label: 'Run Once for All Items' },
        { value: 'runOnceForEachItem', label: 'Run Once for Each Item' },
      ], placeholder: 'runOnceForAllItems', default: 'runOnceForAllItems' },
      { key: 'config.language', label: 'Language', type: 'select', required: true, options: [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'python', label: 'Python' },
      ], placeholder: 'javascript' },
      { key: 'config.code', label: 'Code', type: 'textarea', required: true, placeholder: '// Your code here\n// Access previous node output via: inputs, input, or inputs.apiResponse\nconst response = inputs.apiResponse || input.data;\nconst content = response?.choices?.[0]?.message?.content;\nreturn { rawResponse: response, outputText: content };' },
      { key: 'config.timeout', label: 'Timeout (seconds)', type: 'number', placeholder: '30', min: 1, max: 300 },
      { key: 'config.allowImports', label: 'Allow Imports', type: 'boolean', placeholder: 'false' },
    ],
  },
  'merge': {
    title: 'Data Merge Configuration',
    fields: [
      { key: 'config.mode', label: 'Merge Mode', type: 'select', required: true, options: [
        { value: 'merge', label: 'Merge Objects' },
        { value: 'concat', label: 'Concatenate Arrays' },
        { value: 'intersect', label: 'Intersection' },
        { value: 'union', label: 'Union' },
        { value: 'custom', label: 'Custom Function' },
      ], placeholder: 'merge' },
      { key: 'config.fields', label: 'Fields to Merge (comma-separated)', type: 'textarea', placeholder: 'name, email, id (leave empty for all fields)' },
      { key: 'config.customFunction', label: 'Custom Function (JavaScript)', type: 'textarea', placeholder: 'function(inputs) { return inputs.reduce((acc, curr) => ({...acc, ...curr}), {}); }' },
      { key: 'config.outputFormat', label: 'Output Format', type: 'select', options: [
        { value: 'object', label: 'Object' },
        { value: 'array', label: 'Array' },
        { value: 'string', label: 'String' },
      ], placeholder: 'object' },
      { key: 'config.conflictResolution', label: 'Conflict Resolution', type: 'select', options: [
        { value: 'last', label: 'Last Wins' },
        { value: 'first', label: 'First Wins' },
        { value: 'merge_arrays', label: 'Merge Arrays' },
        { value: 'custom', label: 'Custom' },
      ], placeholder: 'last' },
    ],
  },
  'filter': {
    title: 'Filter Configuration',
    fields: [
      { key: 'options.condition', label: 'Filter Condition', type: 'textarea', required: true, placeholder: 'input.value > 10' },
    ],
  },
  'condition': {
    title: 'Condition Logic Configuration',
    fields: [
      { key: 'config.logic', label: 'Logic Operator', type: 'select', options: [
        { value: 'and', label: 'AND (All must be true)' },
        { value: 'or', label: 'OR (Any can be true)' },
      ], placeholder: 'and' },
      { key: 'config.defaultPath', label: 'Default Path', type: 'string', placeholder: 'default (path to follow when no conditions match)' },
      { key: 'config.caseSensitive', label: 'Case Sensitive', type: 'boolean', placeholder: 'false (for string comparisons)' },
      { key: 'config.strictMode', label: 'Strict Mode', type: 'boolean', placeholder: 'false (fail if any condition field is missing)' },
      { key: 'config.conditions', label: 'Conditions (JSON Array)', type: 'textarea', required: true, placeholder: '[{"field":"data.value","operator":"equals","value":"test","path":"true"}] - Operators: equals, not_equals, greater_than, less_than, contains, regex, exists (required)' },
    ],
  },
  'date-time': {
    title: 'Date & Time Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'now', label: 'Get Current Time' },
        { value: 'format', label: 'Format Date' },
        { value: 'parse', label: 'Parse Date' },
        { value: 'add', label: 'Add Duration' },
        { value: 'subtract', label: 'Subtract Duration' },
      ], placeholder: 'now' },
      { key: 'config.format', label: 'Date Format', type: 'string', placeholder: 'YYYY-MM-DD HH:mm:ss' },
      { key: 'config.value', label: 'Date Value', type: 'string', placeholder: '2024-01-01T00:00:00Z' },
      { key: 'config.amount', label: 'Amount', type: 'number', placeholder: '1 (only for add/subtract)' },
      { key: 'config.unit', label: 'Time Unit', type: 'select', options: [
        { value: 'milliseconds', label: 'Milliseconds' },
        { value: 'seconds', label: 'Seconds' },
        { value: 'minutes', label: 'Minutes' },
        { value: 'hours', label: 'Hours' },
        { value: 'days', label: 'Days' },
        { value: 'weeks', label: 'Weeks' },
      ], placeholder: 'days' },
    ],
  },

  'data-converter': {
    title: 'Data Converter Configuration',
    fields: [
      { key: 'config.inputFormat', label: 'Input Format', type: 'select', required: true, options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'xml', label: 'XML' },
        { value: 'html', label: 'HTML' },
        { value: 'xlsx', label: 'XLSX' },
      ]},
      { key: 'config.outputFormat', label: 'Output Format', type: 'select', required: true, options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'xml', label: 'XML' },
        { value: 'html', label: 'HTML' },
        { value: 'xlsx', label: 'XLSX' },
      ]},
      { key: 'config.options', label: 'Conversion Options (JSON)', type: 'textarea', placeholder: '{"delimiter": ",", "headers": true}' },
    ],
  },

  // Data & Storage (Databases)
  mysql: {
    title: 'MySQL Configuration',
    fields: [
      { key: 'options.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'query', label: 'Run Query' },
        { value: 'insert', label: 'Insert' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
      ]},
      { key: 'options.host', label: 'Host', type: 'string', required: true, placeholder: 'localhost' },
      { key: 'options.port', label: 'Port', type: 'number', required: true, placeholder: '3306' },
      { key: 'options.database', label: 'Database', type: 'string', required: true, placeholder: 'mydb' },
      { key: 'options.table', label: 'Table', type: 'string', placeholder: 'users' },
      { key: 'options.query', label: 'SQL Query', type: 'textarea', placeholder: 'SELECT * FROM users;' },
      { key: 'options.values', label: 'Values (JSON)', type: 'textarea', placeholder: '{"name":"Alice"}' },
      { key: 'config.username', label: 'Username', type: 'string', required: true, placeholder: 'root' },
      { key: 'config.password', label: 'Password', type: 'string', required: true, placeholder: 'password' },
    ],
  },
  postgresql: {
    title: 'PostgreSQL Configuration',
    fields: [
      { key: 'options.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'query', label: 'Run Query' },
        { value: 'insert', label: 'Insert' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
      ]},
      { key: 'options.host', label: 'Host', type: 'string', required: true, placeholder: 'localhost' },
      { key: 'options.port', label: 'Port', type: 'number', required: true, placeholder: '5432' },
      { key: 'options.database', label: 'Database', type: 'string', required: true, placeholder: 'mydb' },
      { key: 'options.table', label: 'Table', type: 'string', placeholder: 'users' },
      { key: 'options.query', label: 'SQL Query', type: 'textarea', placeholder: 'SELECT * FROM public.users;' },
      { key: 'options.values', label: 'Values (JSON)', type: 'textarea', placeholder: '{"name":"Alice"}' },
      { key: 'config.username', label: 'Username', type: 'string', required: true, placeholder: 'postgres' },
      { key: 'config.password', label: 'Password', type: 'string', required: true, placeholder: 'password' },
    ],
  },
  mongodb: {
    title: 'MongoDB Configuration',
    fields: [
      { key: 'options.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'find', label: 'Find' },
        { value: 'insert', label: 'Insert' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
      ]},
      { key: 'options.host', label: 'Host', type: 'string', required: true, placeholder: 'localhost' },
      { key: 'options.port', label: 'Port', type: 'number', required: true, placeholder: '27017' },
      { key: 'options.database', label: 'Database', type: 'string', required: true, placeholder: 'mydb' },
      { key: 'options.collection', label: 'Collection', type: 'string', required: true, placeholder: 'users' },
      { key: 'options.filter', label: 'Filter (JSON)', type: 'textarea', placeholder: '{"status":"active"}' },
      { key: 'options.document', label: 'Document (JSON)', type: 'textarea', placeholder: '{"name":"Alice","age":30}' },
      { key: 'options.update', label: 'Update (JSON)', type: 'textarea', placeholder: '{"$set":{"status":"updated"}}' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'admin' },
      { key: 'config.password', label: 'Password', type: 'string', placeholder: 'password' },
    ],
  },

  // Data & Storage (Files)
  'aws-s3': {
    title: 'AWS S3 Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'upload', label: 'Upload' },
        { value: 'download', label: 'Download' },
        { value: 'list', label: 'List Objects' },
        { value: 'delete', label: 'Delete Object' },
        { value: 'copy', label: 'Copy Object' },
        { value: 'move', label: 'Move Object' },
        { value: 'create-bucket', label: 'Create Bucket' },
        { value: 'delete-bucket', label: 'Delete Bucket' },
        { value: 'list-buckets', label: 'List Buckets' },
      ]},
      { key: 'config.bucketName', label: 'Bucket Name', type: 'string', required: true, placeholder: 'my-bucket' },
      { key: 'config.objectKey', label: 'Object Key', type: 'string', placeholder: 'path/to/file.txt' },
      { key: 'config.filePath', label: 'File Path', type: 'string', placeholder: '/local/path/file.txt' },
      { key: 'config.contentType', label: 'Content Type', type: 'string', placeholder: 'application/octet-stream' },
      { key: 'config.acl', label: 'ACL', type: 'select', options: [
        { value: 'private', label: 'Private' },
        { value: 'public-read', label: 'Public Read' },
        { value: 'public-read-write', label: 'Public Read Write' },
        { value: 'authenticated-read', label: 'Authenticated Read' },
      ]},
      { key: 'config.region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
      { key: 'config.maxKeys', label: 'Max Keys', type: 'number', placeholder: '1000' },
      { key: 'config.prefix', label: 'Prefix', type: 'string', placeholder: 'folder/' },
      { key: 'config.delimiter', label: 'Delimiter', type: 'string', placeholder: '/' },
      { key: 'config.accessKeyId', label: 'Access Key ID', type: 'string', required: true, placeholder: 'AKIA...' },
      { key: 'config.secretAccessKey', label: 'Secret Access Key', type: 'string', required: true, placeholder: 'Enter secret key' },
    ],
  },
  onedrive: {
    title: 'OneDrive Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'list', label: 'List Files' },
        { value: 'upload', label: 'Upload File' },
        { value: 'download', label: 'Download File' },
        { value: 'getInfo', label: 'Get File Info' },
        { value: 'delete', label: 'Delete File' },
        { value: 'createFolder', label: 'Create Folder' },
        { value: 'search', label: 'Search Files' },
        { value: 'copy', label: 'Copy File' },
        { value: 'move', label: 'Move File' },
        { value: 'share', label: 'Share File' },
      ]},
      { key: 'config.accessToken', label: 'Access Token', type: 'string', required: true, placeholder: 'Microsoft Graph API access token' },
      { key: 'config.path', label: 'Path', type: 'string', placeholder: '/Documents/file.txt' },
      { key: 'config.fileId', label: 'File ID', type: 'string', placeholder: '01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36' },
      { key: 'config.fileName', label: 'File Name', type: 'string', placeholder: 'document.pdf (for upload)' },
      { key: 'config.fileContent', label: 'File Content', type: 'textarea', placeholder: 'Base64 encoded content or text (for upload)' },
      { key: 'config.folderId', label: 'Folder ID', type: 'string', placeholder: 'Folder ID (for upload/list)' },
      { key: 'config.folderName', label: 'Folder Name', type: 'string', placeholder: 'NewFolder (for createFolder)' },
      { key: 'config.query', label: 'Search Query', type: 'string', placeholder: 'filename:document.pdf (for search)' },
      { key: 'config.destinationPath', label: 'Destination Path', type: 'string', placeholder: '/Documents/newfile.txt (for copy/move)' },
      { key: 'config.shareEmail', label: 'Share Email', type: 'string', placeholder: 'user@example.com (for share)' },
      { key: 'config.permission', label: 'Permission', type: 'select', options: [
        { value: 'read', label: 'Read' },
        { value: 'write', label: 'Write' },
        { value: 'owner', label: 'Owner' },
      ]},
      { key: 'config.overwrite', label: 'Overwrite', type: 'boolean' },
      { key: 'config.pageSize', label: 'Page Size', type: 'number', placeholder: '20' },
    ],
  },
  redis: {
    title: 'Redis Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'get', label: 'Get' },
        { value: 'set', label: 'Set' },
        { value: 'delete', label: 'Delete' },
        { value: 'exists', label: 'Exists' },
        { value: 'increment', label: 'Increment' },
        { value: 'decrement', label: 'Decrement' },
        { value: 'mget', label: 'Get Multiple' },
        { value: 'mset', label: 'Set Multiple' },
        { value: 'setex', label: 'Set with Expiry' },
        { value: 'lpush', label: 'List Push' },
        { value: 'rpop', label: 'List Pop' },
        { value: 'lrange', label: 'List Range' },
        { value: 'hset', label: 'Hash Set' },
        { value: 'hget', label: 'Hash Get' },
        { value: 'hgetall', label: 'Hash Get All' },
        { value: 'keys', label: 'Keys' },
        { value: 'del', label: 'Delete Multiple' },
      ]},
      { key: 'config.host', label: 'Redis Host', type: 'string', required: true, placeholder: 'localhost' },
      { key: 'config.port', label: 'Redis Port', type: 'number', placeholder: '6379' },
      { key: 'config.password', label: 'Password', type: 'string', placeholder: 'Redis password (if required)' },
      { key: 'config.db', label: 'Database Number', type: 'number', placeholder: '0' },
      { key: 'config.key', label: 'Key', type: 'string', placeholder: 'mykey' },
      { key: 'config.value', label: 'Value', type: 'textarea', placeholder: 'myvalue or {"key":"value"}' },
      { key: 'config.expiry', label: 'Expiry (seconds)', type: 'number', placeholder: '3600 (for setex)' },
      { key: 'config.keys', label: 'Keys (JSON array)', type: 'textarea', placeholder: '["key1", "key2"] (for mget, del)' },
      { key: 'config.keyValues', label: 'Key-Value Pairs (JSON object)', type: 'textarea', placeholder: '{"key1":"value1", "key2":"value2"} (for mset)' },
      { key: 'config.start', label: 'Start Index', type: 'number', placeholder: '0 (for lrange)' },
      { key: 'config.end', label: 'End Index', type: 'number', placeholder: '-1 (for lrange)' },
      { key: 'config.field', label: 'Hash Field', type: 'string', placeholder: 'fieldname (for hash operations)' },
      { key: 'config.hashData', label: 'Hash Data (JSON object)', type: 'textarea', placeholder: '{"field1":"value1", "field2":"value2"} (for hset)' },
      { key: 'config.pattern', label: 'Key Pattern', type: 'string', placeholder: 'user:* (for keys)' },
    ],
  },
  'azure-blob': {
    title: 'Azure Blob Storage Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'upload', label: 'Upload Blob' },
        { value: 'download', label: 'Download Blob' },
        { value: 'list', label: 'List Blobs' },
        { value: 'delete', label: 'Delete Blob' },
        { value: 'copy', label: 'Copy Blob' },
        { value: 'move', label: 'Move Blob' },
        { value: 'create-container', label: 'Create Container' },
        { value: 'delete-container', label: 'Delete Container' },
        { value: 'list-containers', label: 'List Containers' },
      ], placeholder: 'upload' },
      { key: 'options.container', label: 'Container', type: 'string', required: true },
      { key: 'options.blob', label: 'Blob Name', type: 'string', placeholder: 'folder/file.txt' },
      { key: 'options.connectionString', label: 'Connection String', type: 'textarea' },
    ],
  },
  'google-cloud-storage': {
    title: 'Google Cloud Storage Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'upload', label: 'Upload Object' },
        { value: 'download', label: 'Download Object' },
        { value: 'list', label: 'List Objects' },
        { value: 'delete', label: 'Delete Object' },
        { value: 'copy', label: 'Copy Object' },
        { value: 'move', label: 'Move Object' },
        { value: 'create-bucket', label: 'Create Bucket' },
        { value: 'delete-bucket', label: 'Delete Bucket' },
        { value: 'list-buckets', label: 'List Buckets' },
      ], placeholder: 'upload' },
      { key: 'options.bucket', label: 'Bucket', type: 'string', required: true },
      { key: 'options.fileName', label: 'File Name', type: 'string' },
      { key: 'options.path', label: 'Path', type: 'string' },
    ],
  },

  // Analytics
  'google-analytics': {
    title: 'Google Analytics Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation *', type: 'select', required: true, options: [
        { value: 'getReport', label: 'Get Report' },
        { value: 'getRealtimeReport', label: 'Get Realtime Report' },
        { value: 'getAccountSummaries', label: 'Get Account Summaries' },
        { value: 'getProperties', label: 'Get Properties' },
        { value: 'getCustomDimensions', label: 'Get Custom Dimensions' },
        { value: 'getCustomMetrics', label: 'Get Custom Metrics' },
      ]},
      { key: 'config.accessToken', label: 'Access Token', type: 'string', password: true, placeholder: 'OAuth access token' },
      { key: 'config.apiVersion', label: 'API Version', type: 'select', required: false, options: [
        { value: 'ga4', label: 'Google Analytics 4 (default)' },
        { value: 'ua', label: 'Universal Analytics (v3)' },
      ]},
      { key: 'config.propertyId', label: 'Property ID (GA4)', type: 'string', placeholder: '123456789 (required for GA4 operations: getReport, getRealtimeReport, getCustomDimensions, getCustomMetrics)' },
      { key: 'config.viewId', label: 'View ID (UA)', type: 'string', placeholder: '123456789 (required for Universal Analytics operations: getReport, getRealtimeReport)' },
      { key: 'config.startDate', label: 'Start Date', type: 'string', placeholder: '30daysAgo (default) or 2024-01-01' },
      { key: 'config.endDate', label: 'End Date', type: 'string', placeholder: 'today (default) or 2024-01-31' },
      { key: 'config.metrics', label: 'Metrics', type: 'string', placeholder: 'sessions,users (GA4) or ga:sessions,ga:users (UA) - optional' },
      { key: 'config.dimensions', label: 'Dimensions', type: 'string', placeholder: 'country,city (GA4) or ga:country,ga:city (UA) - optional' },
      { key: 'config.filters', label: 'Filters (JSON)', type: 'textarea', placeholder: '{"dimension": "country", "operator": "equals", "value": "US"}' },
    ],
  },
  gmail: {
    title: 'Gmail Configuration',
    fields: [
      { 
        key: 'config.operation', 
        label: 'Operation', 
        type: 'select', 
        required: true, 
        options: [
        { value: 'send', label: 'Send Email' },
        { value: 'list', label: 'List Messages' },
          { value: 'read', label: 'Read Emails' },
          { value: 'search', label: 'Search Emails' },
        { value: 'get', label: 'Get Message' },
          { value: 'reply', label: 'Reply to Email' },
          { value: 'createDraft', label: 'Create Draft' },
          { value: 'listDrafts', label: 'List Drafts' },
          { value: 'getDraft', label: 'Get Draft' },
          { value: 'deleteDraft', label: 'Delete Draft' },
          { value: 'listLabels', label: 'List Labels' },
          { value: 'createLabel', label: 'Create Label' },
          { value: 'getLabel', label: 'Get Label' },
          { value: 'deleteLabel', label: 'Delete Label' },
          { value: 'listThreads', label: 'List Threads' },
          { value: 'getThread', label: 'Get Thread' },
          { value: 'trashThread', label: 'Trash Thread' },
          { value: 'untrashThread', label: 'Untrash Thread' },
          { value: 'addLabelToThread', label: 'Add Label to Thread' },
          { value: 'removeLabelFromThread', label: 'Remove Label from Thread' },
          { value: 'addLabelToMessage', label: 'Add Label to Message' },
          { value: 'removeLabelFromMessage', label: 'Remove Label from Message' },
          { value: 'deleteMessage', label: 'Delete Message' },
          { value: 'getManyMessages', label: 'Get Many Messages' },
          { value: 'markAsRead', label: 'Mark Message as Read' },
          { value: 'markAsUnread', label: 'Mark Message as Unread' },
          { value: 'sendAndWait', label: 'Send Message and Wait for Response' },
        ]
      },
      // OAuth credentials are handled via "Connect to Google" button - no manual fields needed
      // Send Email fields
      { 
        key: 'communication.toEmail', 
        label: 'To', 
        type: 'string', 
        placeholder: 'recipient@example.com',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['send', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.subject', 
        label: 'Subject', 
        type: 'string', 
        placeholder: 'Subject',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.textContent', 
        label: 'Text', 
        type: 'textarea', 
        placeholder: 'Body text',
        rows: 4,
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.htmlContent', 
        label: 'HTML', 
        type: 'textarea', 
        placeholder: '<p>Body</p>',
        rows: 4,
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.cc', 
        label: 'CC', 
        type: 'string', 
        placeholder: 'cc@example.com (comma-separated for multiple)',
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.bcc', 
        label: 'BCC', 
        type: 'string', 
        placeholder: 'bcc@example.com (comma-separated for multiple)',
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.from', 
        label: 'From', 
        type: 'string', 
        placeholder: 'sender@example.com',
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      { 
        key: 'communication.replyTo', 
        label: 'Reply To', 
        type: 'string', 
        placeholder: 'reply@example.com',
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      // Attachments field (array of objects with name/filename, content, type)
      { 
        key: 'communication.attachments', 
        label: 'Attachments', 
        type: 'array', 
        placeholder: 'Array of attachment objects: [{name: "file.pdf", content: "base64...", type: "application/pdf"}]',
        displayOptions: {
          show: {
            'config.operation': ['send', 'reply', 'createDraft', 'sendAndWait']
          }
        }
      },
      // Read Emails fields
      { 
        key: 'config.maxResults', 
        label: 'Max Results', 
        type: 'number', 
        placeholder: '10',
        default: 10,
        min: 1,
        max: 100,
        displayOptions: {
          show: {
            'config.operation': ['list', 'read', 'search', 'listDrafts', 'listThreads']
          }
        }
      },
      { 
        key: 'config.pageToken', 
        label: 'Page Token', 
        type: 'string', 
        placeholder: 'Token for pagination (from previous response)',
        displayOptions: {
          show: {
            'config.operation': ['list', 'read', 'search', 'listDrafts', 'listThreads']
          }
        }
      },
      { 
        key: 'config.labelIds', 
        label: 'Label IDs', 
        type: 'string', 
        placeholder: 'INBOX,UNREAD (comma-separated)',
        displayOptions: {
          show: {
            'config.operation': ['list', 'read']
          }
        }
      },
      // Search Emails fields
      { 
        key: 'config.query', 
        label: 'Search Query', 
        type: 'string', 
        placeholder: 'from:example@gmail.com subject:important',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['search', 'listThreads']
          }
        }
      },
      // Get Message fields
      { 
        key: 'config.messageId', 
        label: 'Message ID', 
        type: 'string', 
        placeholder: '172ce2c4a72cc243',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['get', 'deleteMessage', 'markAsRead', 'markAsUnread', 'addLabelToMessage', 'removeLabelFromMessage']
          }
        }
      },
      { 
        key: 'config.format', 
        label: 'Format', 
        type: 'select', 
        options: [
          { value: 'full', label: 'Full' },
          { value: 'metadata', label: 'Metadata' },
          { value: 'minimal', label: 'Minimal' },
        ],
        default: 'full',
        displayOptions: {
          show: {
            'config.operation': ['get']
          }
        }
      },
      // Reply to Email / Get Thread fields
      { 
        key: 'config.threadId', 
        label: 'Thread ID', 
        type: 'string', 
        placeholder: 'Thread ID',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['reply', 'getThread', 'trashThread', 'untrashThread', 'addLabelToThread', 'removeLabelFromThread']
          }
        }
      },
      { 
        key: 'communication.toEmail', 
        label: 'To', 
        type: 'string', 
        placeholder: 'recipient@example.com (optional for reply)',
        displayOptions: {
          show: {
            'config.operation': ['reply']
          }
        }
      },
      { 
        key: 'config.replyToMessageId', 
        label: 'Reply To Message ID', 
        type: 'string', 
        placeholder: 'Message ID to reply to (optional)',
        displayOptions: {
          show: {
            'config.operation': ['reply']
          }
        }
      },
      // Get/Delete Draft fields
      { 
        key: 'config.draftId', 
        label: 'Draft ID', 
        type: 'string', 
        placeholder: 'Draft ID',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['getDraft', 'deleteDraft']
          }
        }
      },
      // Create Label fields
      { 
        key: 'config.labelName', 
        label: 'Label Name', 
        type: 'string', 
        placeholder: 'My Label',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['createLabel']
          }
        }
      },
      { 
        key: 'config.labelListVisibility', 
        label: 'Label List Visibility', 
        type: 'select', 
        options: [
          { value: 'labelShow', label: 'Show' },
          { value: 'labelHide', label: 'Hide' },
        ],
        default: 'labelShow',
        displayOptions: {
          show: {
            'config.operation': ['createLabel']
          }
        }
      },
      { 
        key: 'config.messageListVisibility', 
        label: 'Message List Visibility', 
        type: 'select', 
        options: [
          { value: 'show', label: 'Show' },
          { value: 'hide', label: 'Hide' },
        ],
        default: 'show',
        displayOptions: {
          show: {
            'config.operation': ['createLabel']
          }
        }
      },
      // Get/Delete Label fields
      { 
        key: 'config.labelId', 
        label: 'Label ID', 
        type: 'string', 
        placeholder: 'Label ID',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['getLabel', 'deleteLabel']
          }
        }
      },
      // Get Thread fields
      { 
        key: 'config.format', 
        label: 'Format', 
        type: 'select', 
        options: [
          { value: 'full', label: 'Full' },
          { value: 'metadata', label: 'Metadata' },
          { value: 'minimal', label: 'Minimal' },
        ],
        default: 'full',
        displayOptions: {
          show: {
            'config.operation': ['getThread']
          }
        }
      },
      // Add/Remove Label to Thread fields
      { 
        key: 'config.labelIds', 
        label: 'Label IDs', 
        type: 'string', 
        placeholder: 'INBOX,UNREAD (comma-separated)',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['addLabelToThread', 'removeLabelFromThread', 'addLabelToMessage', 'removeLabelFromMessage']
          }
        }
      },
      // Get Many Messages fields
      { 
        key: 'config.messageIds', 
        label: 'Message IDs', 
        type: 'string', 
        placeholder: 'id1,id2,id3 (comma-separated)',
        required: true,
        displayOptions: {
          show: {
            'config.operation': ['getManyMessages']
          }
        }
      },
      { 
        key: 'config.format', 
        label: 'Format', 
        type: 'select', 
        options: [
          { value: 'full', label: 'Full' },
          { value: 'metadata', label: 'Metadata' },
          { value: 'minimal', label: 'Minimal' },
        ],
        default: 'full',
        displayOptions: {
          show: {
            'config.operation': ['getManyMessages']
          }
        }
      },
      // Send and Wait fields
      { 
        key: 'config.maxWaitTime', 
        label: 'Max Wait Time (seconds)', 
        type: 'number', 
        placeholder: '300',
        default: 300,
        min: 10,
        max: 3600,
        displayOptions: {
          show: {
            'config.operation': ['sendAndWait']
          }
        }
      },
      { 
        key: 'config.pollInterval', 
        label: 'Poll Interval (seconds)', 
        type: 'number', 
        placeholder: '5',
        default: 5,
        min: 1,
        max: 60,
        displayOptions: {
          show: {
            'config.operation': ['sendAndWait']
          }
        }
      },
    ],
  },
  segment: {
    title: 'Segment Configuration',
    fields: [
      { key: 'config.resource', label: 'Resource *', type: 'select', required: true, options: [
        { value: 'track', label: 'Track' },
        { value: 'identify', label: 'Identify' },
        { value: 'group', label: 'Group' },
      ]},
      { key: 'config.operation', label: 'Operation *', type: 'select', required: true, options: [
        { value: 'event', label: 'Event' },
        { value: 'page', label: 'Page' },
        { value: 'create', label: 'Create' },
        { value: 'add', label: 'Add' },
      ]},
      { key: 'config.writeKey', label: 'Write Key *', type: 'string', required: true, password: true, placeholder: 'Your Segment write key (get from Segment Dashboard → Sources → Settings → API Keys)' },
      { key: 'config.userId', label: 'User ID', type: 'string', placeholder: 'user123' },
      { key: 'config.event', label: 'Event', type: 'string', placeholder: 'Button Clicked (required for track event)' },
      { key: 'config.properties', label: 'Properties (JSON)', type: 'textarea', placeholder: '{"buttonName": "Sign Up", "location": "header"}' },
      { key: 'config.traits', label: 'Traits (JSON)', type: 'textarea', placeholder: '{"email": "user@example.com", "name": "John Doe"}' },
      { key: 'config.context', label: 'Context (JSON)', type: 'textarea', placeholder: '{"ip": "1.2.3.4", "userAgent": "..."}' },
      { key: 'config.name', label: 'Name', type: 'string', placeholder: 'Home Page (for page operation)' },
      { key: 'config.groupId', label: 'Group ID', type: 'string', placeholder: 'group123 (required for group operation)' },
    ],
  },

  // Productivity - Excel
  excel: {
    title: 'Excel Online Configuration',
    fields: [
      { key: 'config.accessToken', label: 'Access Token', type: 'string', required: true, password: true, placeholder: 'Bearer token...' },
      { key: 'options.operation', label: 'Operation', type: 'select', options: [
        { value: 'read', label: 'Read Range' },
        { value: 'write', label: 'Write Range' },
      ]},
      { key: 'options.workbookId', label: 'Workbook ID', type: 'string' },
      { key: 'options.worksheet', label: 'Worksheet', type: 'string' },
      { key: 'options.range', label: 'Range', type: 'string', placeholder: 'A1:C10' },
      { key: 'options.data', label: 'Data (JSON)', type: 'textarea', placeholder: '[["a","b"],["c","d"]]' },
      { key: 'config.drive', label: 'Drive', type: 'select', options: [
        { value: 'me', label: 'My Drive' },
        { value: 'driveId', label: 'Drive ID' },
      ], placeholder: 'me' },
      { key: 'config.driveId', label: 'Drive ID', type: 'string', placeholder: 'drive-id' },
      { key: 'config.values', label: 'Values (JSON Array)', type: 'textarea', placeholder: '[["A1", "B1"], ["A2", "B2"]] (for write operation)' },
    ],
  },


  // Communication
  telegram: {
    title: 'Telegram Configuration',
    fields: [
      { key: 'communication.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'send', label: 'Send Message' },
        { value: 'reply', label: 'Reply to Message' },
        { value: 'edit', label: 'Edit Message' },
        { value: 'delete', label: 'Delete Message' },
      ]},
      { key: 'communication.chatId', label: 'Chat ID', type: 'string', required: true, placeholder: '@channel or -1001234567890' },
      { key: 'communication.message', label: 'Message', type: 'textarea', required: true, placeholder: 'Enter your message...' },
      { key: 'config.botToken', label: 'Bot Token', type: 'string', required: true, placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz' },
      { key: 'communicationOptions.parseMode', label: 'Parse Mode', type: 'select', options: [
        { value: 'HTML', label: 'HTML' },
        { value: 'Markdown', label: 'Markdown' },
        { value: 'MarkdownV2', label: 'MarkdownV2' },
      ]},
    ],
  },
  discord: {
    title: 'Discord Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'sendMessage', label: 'Send Message' },
        { value: 'sendEmbed', label: 'Send Embed' },
        { value: 'editMessage', label: 'Edit Message' },
        { value: 'deleteMessage', label: 'Delete Message' },
        { value: 'createChannel', label: 'Create Channel' },
        { value: 'getChannelInfo', label: 'Get Channel Info' },
      ]},
      { key: 'config.botToken', label: 'Bot Token *', type: 'string', required: true, password: true, placeholder: 'Enter Discord bot token' },
      { key: 'config.guildId', label: 'Server ID *', type: 'string', required: true, placeholder: 'Enter Discord server ID' },
      { key: 'config.channelId', label: 'Channel ID *', type: 'string', required: true, placeholder: 'Enter Discord channel ID' },
      { key: 'config.message', label: 'Message Content', type: 'textarea', placeholder: 'Enter message content...' },
      { key: 'config.attachments', label: 'Attachments', type: 'file', placeholder: 'Select or upload file' },
    ],
  },

  'twitter-dm': {
    title: 'Twitter DM Configuration',
    fields: [
      { key: 'config.apiKey', label: 'API Key', type: 'string', required: true, placeholder: 'Your Twitter API key' },
      { key: 'config.apiSecret', label: 'API Secret', type: 'string', required: true, placeholder: 'Your Twitter API secret' },
      { key: 'config.accessToken', label: 'Access Token', type: 'string', required: true, placeholder: 'Your Twitter access token' },
      { key: 'config.accessTokenSecret', label: 'Access Token Secret', type: 'string', required: true, placeholder: 'Your Twitter access token secret' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'sendDirectMessage', label: 'Send Direct Message' },
        { value: 'getDirectMessage', label: 'Get Direct Message' },
        { value: 'listDirectMessages', label: 'List Direct Messages' },
        { value: 'getUserInfo', label: 'Get User Info' },
        { value: 'searchUsers', label: 'Search Users' },
      ]},
      { key: 'config.userId', label: 'User ID', type: 'string', placeholder: '123456789' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'username (without @)' },
      { key: 'config.message', label: 'Message', type: 'textarea', placeholder: 'Hello from workflow!' },
      { key: 'config.messageId', label: 'Message ID', type: 'string', placeholder: 'message_id' },
      { key: 'config.query', label: 'Search Query', type: 'string', placeholder: 'search term' },
    ],
  },
  'linkedin-message': {
    title: 'LinkedIn Message Configuration',
    fields: [
      { key: 'config.accessToken', label: 'Access Token', type: 'string', required: true, placeholder: 'Your LinkedIn access token' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'sendMessage', label: 'Send Message' },
        { value: 'getConversation', label: 'Get Conversation' },
        { value: 'listConversations', label: 'List Conversations' },
        { value: 'getProfile', label: 'Get Profile' },
        { value: 'searchPeople', label: 'Search People' },
      ]},
      { key: 'config.conversationId', label: 'Conversation ID', type: 'string', placeholder: 'conversation_id' },
      { key: 'config.recipientUrn', label: 'Recipient URN', type: 'string', placeholder: 'urn:li:person:abc123' },
      { key: 'config.message', label: 'Message', type: 'textarea', placeholder: 'Hello from workflow!' },
      { key: 'config.subject', label: 'Subject', type: 'string', placeholder: 'Subject line' },
      { key: 'config.personId', label: 'Person ID', type: 'string', placeholder: 'person_id' },
      { key: 'config.searchQuery', label: 'Search Query', type: 'string', placeholder: 'search term' },
    ],
  },
  // Development
  github: {
    title: 'GitHub Configuration',
    fields: [
      { key: 'options.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'createIssue', label: 'Create Issue' },
        { value: 'listIssues', label: 'List Issues' },
        { value: 'getRepo', label: 'Get Repository' },
        { value: 'createPR', label: 'Create Pull Request' },
        { value: 'listPRs', label: 'List Pull Requests' },
      ]},
      { key: 'options.owner', label: 'Owner/Org', type: 'string', required: true, placeholder: 'octocat' },
      { key: 'options.repo', label: 'Repository', type: 'string', required: true, placeholder: 'Hello-World' },
      { key: 'options.title', label: 'Title', type: 'string', placeholder: 'Issue title' },
      { key: 'options.body', label: 'Body', type: 'textarea', placeholder: 'Issue description' },
      { key: 'config.token', label: 'Access Token', type: 'string', required: true, placeholder: 'ghp_...' },
      { key: 'options.labels', label: 'Labels (comma-separated)', type: 'string', placeholder: 'bug,enhancement' },
    ],
  },
  instagram: {
    title: 'Instagram Configuration',
    fields: [
      { key: 'config.accessToken', label: 'Access Token', type: 'string', required: true, placeholder: 'Your Instagram access token' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'sendDirectMessage', label: 'Send Direct Message' },
        { value: 'createMediaObject', label: 'Create Media Object' },
        { value: 'publishMedia', label: 'Publish Media' },
        { value: 'getUserProfile', label: 'Get User Profile' },
        { value: 'getMedia', label: 'Get Media' },
        { value: 'listMedia', label: 'List Media' },
        { value: 'getComments', label: 'Get Comments' },
        { value: 'addComment', label: 'Add Comment' },
      ]},
      { key: 'config.userId', label: 'User ID', type: 'string', placeholder: 'user_id' },
      { key: 'config.recipientId', label: 'Recipient ID', type: 'string', placeholder: 'recipient_user_id' },
      { key: 'config.message', label: 'Message', type: 'textarea', placeholder: 'Hello from workflow!' },
      { key: 'config.imageUrl', label: 'Image URL', type: 'string', placeholder: 'https://example.com/image.jpg' },
      { key: 'config.caption', label: 'Caption', type: 'textarea', placeholder: 'My post caption' },
      { key: 'config.mediaType', label: 'Media Type', type: 'select', options: [
        { value: 'IMAGE', label: 'Image' },
        { value: 'VIDEO', label: 'Video' },
        { value: 'CAROUSEL_ALBUM', label: 'Carousel' },
      ]},
      { key: 'config.mediaId', label: 'Media ID', type: 'string', placeholder: 'media_id' },
      { key: 'config.commentText', label: 'Comment Text', type: 'textarea', placeholder: 'Great post!' },
    ],
  },


  'microsoft-teams': {
    title: 'Microsoft Teams Configuration',
    fields: [
      { key: 'config.authType', label: 'Authentication Type *', type: 'select', required: true, options: [
        { value: 'oauth', label: 'OAuth (Recommended)' },
        { value: 'accessToken', label: 'Access Token' },
        { value: 'clientCredentials', label: 'Client Credentials' },
      ]},
      { key: 'config.accessToken', label: 'Access Token', type: 'string', placeholder: 'Microsoft Graph API access token' },
      { key: 'config.tenantId', label: 'Tenant ID', type: 'string', placeholder: 'Your Tenant ID' },
      { key: 'config.clientId', label: 'Client ID', type: 'string', placeholder: 'Your Client ID' },
      { key: 'config.clientSecret', label: 'Client Secret', type: 'string', placeholder: 'Your Client Secret', password: true },
      { key: 'config.operation', label: 'Operation *', type: 'select', required: true, options: [
        { value: 'sendMessage', label: 'Send Message' },
        { value: 'sendChatMessage', label: 'Send Chat Message' },
        { value: 'createChannel', label: 'Create Channel' },
        { value: 'listChannels', label: 'List Channels' },
        { value: 'getChannelInfo', label: 'Get Channel Info' },
        { value: 'getChat', label: 'Get Chat' },
        { value: 'listChats', label: 'List Chats' },
      ]},
      { key: 'config.teamId', label: 'Team ID', type: 'string', placeholder: '19:meeting_...' },
      { key: 'config.channelId', label: 'Channel ID', type: 'string', placeholder: '19:channel_...' },
      { key: 'config.chatId', label: 'Chat ID', type: 'string', placeholder: '19:chat_...' },
      { key: 'config.message', label: 'Message', type: 'textarea', placeholder: 'Hello from workflow!' },
      { key: 'config.channelName', label: 'Channel Name', type: 'string', placeholder: 'general' },
    ],
  },

  // Finance & Accounting
  stripe: {
    title: 'Stripe Configuration',
    fields: [
      { key: 'options.operation', label: 'Operation', type: 'select', options: [
        { value: 'createCharge', label: 'Create Charge' },
        { value: 'createCustomer', label: 'Create Customer' },
      ]},
      { key: 'options.amount', label: 'Amount (cents)', type: 'number' },
      { key: 'options.currency', label: 'Currency', type: 'string', placeholder: 'usd' },
      { key: 'options.customerId', label: 'Customer ID', type: 'string' },
      { key: 'options.description', label: 'Description', type: 'textarea' },
    ],
  },


  // Comms variants
  whatsapp: {
    title: 'WhatsApp Configuration',
    fields: [
      { key: 'config.recipientPhoneNumber', label: 'Recipient Phone Number', type: 'string', placeholder: '+1234567890' },
      { key: 'config.textBody', label: 'Message', type: 'textarea', placeholder: 'Hello there' },
      { key: 'config.phoneNumberId', label: 'WhatsApp Phone Number ID', type: 'string', placeholder: '123456789012345' },
      { key: 'config.accessToken', label: 'Access Token', type: 'string', placeholder: 'WhatsApp Business API token', password: true },
      { key: 'config.businessAccountId', label: 'Business Account ID (optional if passed via flow)', type: 'string', placeholder: '123456789012345' },
    ],
  },
  zoom: {
    title: 'Zoom Configuration',
    fields: [
      { key: 'config.authType', label: 'Authentication Type', type: 'select', required: true, options: [
        { value: 'oauth', label: 'OAuth (Server-to-Server)' },
        { value: 'jwt', label: 'JWT' },
      ]},
      { key: 'config.accountId', label: 'Account ID', type: 'string', placeholder: 'Your Zoom Account ID (for OAuth)' },
      { key: 'config.clientId', label: 'Client ID / API Key', type: 'string', required: true, placeholder: 'Your Zoom Client ID or API Key' },
      { key: 'config.clientSecret', label: 'Client Secret / API Secret', type: 'string', required: true, placeholder: 'Your Zoom Client Secret or API Secret' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'createMeeting', label: 'Create Meeting' },
        { value: 'listMeetings', label: 'List Meetings' },
        { value: 'getMeeting', label: 'Get Meeting Info' },
        { value: 'updateMeeting', label: 'Update Meeting' },
        { value: 'deleteMeeting', label: 'Delete Meeting' },
        { value: 'sendChatMessage', label: 'Send Chat Message' },
        { value: 'listChatChannels', label: 'List Chat Channels' },
      ]},
      { key: 'config.userId', label: 'User ID', type: 'string', placeholder: 'user@example.com' },
      { key: 'config.meetingId', label: 'Meeting ID', type: 'string', placeholder: '123456789' },
      { key: 'config.topic', label: 'Topic', type: 'string', placeholder: 'Team Standup' },
      { key: 'config.startTime', label: 'Start Time (ISO 8601)', type: 'string', placeholder: '2024-01-01T10:00:00Z' },
      { key: 'config.duration', label: 'Duration (minutes)', type: 'number', placeholder: '60' },
      { key: 'config.type', label: 'Meeting Type', type: 'select', options: [
        { value: 'instant', label: 'Instant' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'recurring_no_fixed_time', label: 'Recurring (No fixed time)' },
        { value: 'recurring_fixed_time', label: 'Recurring (Fixed time)' },
      ]},
      { key: 'config.password', label: 'Password', type: 'string', placeholder: 'optional' },
      { key: 'config.channelId', label: 'Channel ID', type: 'string', placeholder: 'channel_id' },
      { key: 'config.message', label: 'Message', type: 'textarea', placeholder: 'Hello from workflow!' },
      { key: 'config.toChannel', label: 'To Channel', type: 'string', placeholder: '#general' },
      { key: 'config.toContact', label: 'To Contact', type: 'string', placeholder: 'user@example.com' },
    ],
  },

  // AI Nodes (Backend-only nodes)
  'claude': {
    title: 'Claude Configuration',
    fields: [
      { key: 'config.apiKey', label: 'API Key', type: 'string', required: true, placeholder: 'sk-ant-...' },
      { key: 'config.model', label: 'Model', type: 'select', required: true, options: [
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      ]},
      { key: 'config.systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant.' },
      { key: 'config.userPrompt', label: 'User Prompt', type: 'textarea', required: true, placeholder: 'Enter your prompt...' },
      { key: 'config.maxTokens', label: 'Max Tokens', type: 'number', placeholder: '1000' },
      { key: 'config.temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
    ],
  },
  database: {
    title: 'Database Configuration',
    fields: [
      { key: 'config.connectionString', label: 'Connection String', type: 'string', required: true, placeholder: 'postgresql://user:password@localhost:5432/dbname' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'select', label: 'Select' },
        { value: 'insert', label: 'Insert' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'raw_query', label: 'Raw Query' },
      ]},
      { key: 'config.table', label: 'Table Name', type: 'string', placeholder: 'users (required for select/insert/update/delete operations)' },
      { key: 'config.query', label: 'SQL Query', type: 'textarea', placeholder: 'SELECT * FROM users WHERE age > 18 (required for raw_query operation)' },
    ],
  },

  // Cloud & Infrastructure Nodes
  'aws-lambda': {
    title: 'AWS Lambda Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'invoke', label: 'Invoke Function' },
        { value: 'create', label: 'Create Function' },
        { value: 'update', label: 'Update Function' },
        { value: 'delete', label: 'Delete Function' },
        { value: 'list', label: 'List Functions' },
        { value: 'get', label: 'Get Function' },
        { value: 'publish', label: 'Publish Version' },
        { value: 'create-trigger', label: 'Create Trigger' },
        { value: 'delete-trigger', label: 'Delete Trigger' },
      ]},
      { key: 'config.functionName', label: 'Function Name', type: 'string', placeholder: 'my-function (required for invoke/create/update/delete/get/publish/create-trigger/delete-trigger operations)' },
      { key: 'config.runtime', label: 'Runtime', type: 'select', options: [
        { value: 'nodejs18.x', label: 'Node.js 18.x' },
        { value: 'nodejs16.x', label: 'Node.js 16.x' },
        { value: 'python3.9', label: 'Python 3.9' },
        { value: 'python3.8', label: 'Python 3.8' },
        { value: 'java11', label: 'Java 11' },
        { value: 'go1.x', label: 'Go 1.x' },
        { value: 'dotnet6', label: '.NET 6' },
      ], placeholder: 'nodejs18.x (required for create operation)' },
      { key: 'config.handler', label: 'Handler', type: 'string', placeholder: 'index.handler (required for create/update operations)' },
      { key: 'config.code', label: 'Code (Base64 or URL)', type: 'textarea', placeholder: 'Function code or Base64 string (required for create operation)' },
      { key: 'config.zipFile', label: 'Zip File (Base64)', type: 'textarea', placeholder: 'Base64 encoded zip file (alternative to code)' },
      { key: 'config.s3Bucket', label: 'S3 Bucket', type: 'string', placeholder: 'my-bucket (for S3 deployment)' },
      { key: 'config.s3Key', label: 'S3 Key', type: 'string', placeholder: 'lambda/functions/my-function.zip (for S3 deployment)' },
      { key: 'config.payload', label: 'Payload (JSON)', type: 'textarea', placeholder: '{"key":"value"} (required for invoke operation)' },
      { key: 'config.invocationType', label: 'Invocation Type', type: 'select', options: [
        { value: 'RequestResponse', label: 'Request Response' },
        { value: 'Event', label: 'Event' },
        { value: 'DryRun', label: 'Dry Run' },
      ], placeholder: 'RequestResponse (for invoke operation)' },
      { key: 'config.timeout', label: 'Timeout (seconds)', type: 'number', placeholder: '3' },
      { key: 'config.memorySize', label: 'Memory Size (MB)', type: 'number', placeholder: '128' },
      { key: 'config.environment', label: 'Environment Variables (JSON)', type: 'textarea', placeholder: '{"KEY":"value"} (for create/update operations)' },
      { key: 'config.role', label: 'IAM Role ARN', type: 'string', placeholder: 'arn:aws:iam::123456789012:role/lambda-execution-role (required for create operation)' },
      { key: 'config.description', label: 'Description', type: 'string', placeholder: 'Function description' },
      { key: 'config.region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
      { key: 'config.accessKeyId', label: 'Access Key ID', type: 'string', required: true, placeholder: 'AKIA...' },
      { key: 'config.secretAccessKey', label: 'Secret Access Key', type: 'string', required: true, placeholder: 'Enter secret key' },
    ],
  },
  cloudwatch: {
    title: 'AWS CloudWatch Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'get-metrics', label: 'Get Metrics' },
        { value: 'put-metric', label: 'Put Metric' },
        { value: 'get-logs', label: 'Get Logs' },
        { value: 'put-logs', label: 'Put Logs' },
        { value: 'create-alarm', label: 'Create Alarm' },
        { value: 'delete-alarm', label: 'Delete Alarm' },
        { value: 'describe-alarms', label: 'Describe Alarms' },
        { value: 'get-dashboard', label: 'Get Dashboard' },
        { value: 'put-dashboard', label: 'Put Dashboard' },
      ]},
      { key: 'config.namespace', label: 'Namespace', type: 'string', placeholder: 'AWS/Application (required for metric operations)' },
      { key: 'config.metricName', label: 'Metric Name', type: 'string', placeholder: 'CPUUtilization (required for metric operations)' },
      { key: 'config.dimensions', label: 'Dimensions (JSON)', type: 'textarea', placeholder: '{"InstanceId":"i-123"} (for metric operations)' },
      { key: 'config.value', label: 'Metric Value', type: 'number', placeholder: '45.2 (required for put-metric operation)' },
      { key: 'config.unit', label: 'Unit', type: 'select', options: [
        { value: 'Count', label: 'Count' },
        { value: 'Bytes', label: 'Bytes' },
        { value: 'Seconds', label: 'Seconds' },
        { value: 'Percent', label: 'Percent' },
        { value: 'None', label: 'None' },
      ], placeholder: 'Count (for put-metric operation)' },
      { key: 'config.logGroupName', label: 'Log Group Name', type: 'string', placeholder: '/aws/lambda/my-function (required for log operations)' },
      { key: 'config.logStreamName', label: 'Log Stream Name', type: 'string', placeholder: 'stream-name (for log operations)' },
      { key: 'config.logEvents', label: 'Log Events (JSON Array)', type: 'textarea', placeholder: '[{"timestamp":1234567890,"message":"log message"}] (required for put-logs operation)' },
      { key: 'config.alarmName', label: 'Alarm Name', type: 'string', placeholder: 'my-alarm (required for alarm operations)' },
      { key: 'config.comparisonOperator', label: 'Comparison Operator', type: 'select', options: [
        { value: 'GreaterThanThreshold', label: 'Greater Than Threshold' },
        { value: 'LessThanThreshold', label: 'Less Than Threshold' },
        { value: 'LessThanOrEqualToThreshold', label: 'Less Than Or Equal To Threshold' },
        { value: 'GreaterThanOrEqualToThreshold', label: 'Greater Than Or Equal To Threshold' },
      ], placeholder: 'GreaterThanThreshold (required for create-alarm operation)' },
      { key: 'config.threshold', label: 'Threshold', type: 'number', placeholder: '80 (required for create-alarm operation)' },
      { key: 'config.evaluationPeriods', label: 'Evaluation Periods', type: 'number', placeholder: '1 (for create-alarm operation)' },
      { key: 'config.period', label: 'Period (seconds)', type: 'number', placeholder: '300 (for create-alarm operation)' },
      { key: 'config.statistic', label: 'Statistic', type: 'select', options: [
        { value: 'Average', label: 'Average' },
        { value: 'Sum', label: 'Sum' },
        { value: 'SampleCount', label: 'Sample Count' },
        { value: 'Maximum', label: 'Maximum' },
        { value: 'Minimum', label: 'Minimum' },
      ], placeholder: 'Average (required for create-alarm operation)' },
      { key: 'config.dashboardName', label: 'Dashboard Name', type: 'string', placeholder: 'my-dashboard (required for dashboard operations)' },
      { key: 'config.dashboardBody', label: 'Dashboard Body (JSON)', type: 'textarea', placeholder: '{"widgets":[...]} (required for put-dashboard operation)' },
      { key: 'config.startTime', label: 'Start Time (ISO 8601)', type: 'string', placeholder: '2024-01-01T00:00:00Z (for get-metrics/get-logs operations)' },
      { key: 'config.endTime', label: 'End Time (ISO 8601)', type: 'string', placeholder: '2024-01-01T23:59:59Z (for get-metrics/get-logs operations)' },
      { key: 'config.region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
      { key: 'config.accessKeyId', label: 'Access Key ID', type: 'string', required: true, placeholder: 'AKIA...' },
      { key: 'config.secretAccessKey', label: 'Secret Access Key', type: 'string', required: true, placeholder: 'Enter secret key' },
    ],
  },
  docker: {
    title: 'Docker Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'build', label: 'Build Image' },
        { value: 'run', label: 'Run Container' },
        { value: 'stop', label: 'Stop Container' },
        { value: 'start', label: 'Start Container' },
        { value: 'restart', label: 'Restart Container' },
        { value: 'remove', label: 'Remove Container' },
        { value: 'pull', label: 'Pull Image' },
        { value: 'push', label: 'Push Image' },
        { value: 'list', label: 'List Containers/Images' },
        { value: 'logs', label: 'Get Logs' },
        { value: 'exec', label: 'Execute Command' },
        { value: 'inspect', label: 'Inspect Container/Image' },
      ]},
      { key: 'config.imageName', label: 'Image Name', type: 'string', placeholder: 'nginx:latest (required for build/run/pull/push operations)' },
      { key: 'config.containerName', label: 'Container Name', type: 'string', placeholder: 'my-container (required for container operations)' },
      { key: 'config.dockerfile', label: 'Dockerfile Path', type: 'string', placeholder: 'Dockerfile (for build operation)' },
      { key: 'config.context', label: 'Build Context', type: 'string', placeholder: '.' },
      { key: 'config.tag', label: 'Tag', type: 'string', placeholder: 'latest' },
      { key: 'config.ports', label: 'Port Mappings (JSON Array)', type: 'textarea', placeholder: '["8080:80"] or [{"8080":"80"}] (for run operation)' },
      { key: 'config.environment', label: 'Environment Variables (JSON)', type: 'textarea', placeholder: '{"KEY":"value"} (for run operation)' },
      { key: 'config.volumes', label: 'Volume Mappings (JSON Array)', type: 'textarea', placeholder: '["/host:/container"] (for run operation)' },
      { key: 'config.command', label: 'Command', type: 'string', placeholder: '/bin/sh -c "echo hello" (for run/exec operations)' },
      { key: 'config.detach', label: 'Detach (Run in Background)', type: 'boolean' },
      { key: 'config.remove', label: 'Remove Container After Stop', type: 'boolean' },
      { key: 'config.registry', label: 'Registry URL', type: 'string', placeholder: 'docker.io or registry.example.com (for push/pull operations)' },
      { key: 'config.username', label: 'Registry Username', type: 'string', placeholder: 'username (for push/pull operations)' },
      { key: 'config.password', label: 'Registry Password', type: 'string', placeholder: 'password (for push/pull operations)' },
    ],
  },
  'signature-validation': {
    title: 'Signature Validation Configuration',
    fields: [
      { key: 'config.algorithm', label: 'Algorithm', type: 'select', required: true, options: [
        { value: 'sha256', label: 'SHA-256' },
        { value: 'sha512', label: 'SHA-512' },
        { value: 'sha1', label: 'SHA-1' },
      ]},
      { key: 'config.secret', label: 'Secret Key', type: 'string', required: true, placeholder: 'your-webhook-secret' },
      { key: 'config.headerName', label: 'Signature Header Name', type: 'string', placeholder: 'x-signature' },
      { key: 'config.payloadPath', label: 'Payload Path (optional)', type: 'string', placeholder: 'body.data' },
    ],
  },
  'audit-log': {
    title: 'Audit Log Configuration',
    fields: [
      { key: 'config.apiUrl', label: 'API URL', type: 'string', placeholder: 'http://localhost:3001/api/audit-logs' },
      { key: 'config.logType', label: 'Log Type', type: 'select', required: true, options: [
        { value: 'success', label: 'Success' },
        { value: 'error', label: 'Error' },
        { value: 'info', label: 'Info' },
        { value: 'warning', label: 'Warning' },
      ]},
      { key: 'config.event', label: 'Event Name', type: 'string', placeholder: 'email.sent' },
      { key: 'config.authType', label: 'Authentication Type', type: 'select', options: [
        { value: 'none', label: 'None' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'apiKey', label: 'API Key' },
        { value: 'basic', label: 'Basic Auth' },
      ], placeholder: 'bearer' },
      { key: 'config.bearerToken', label: 'Bearer Token', type: 'string', placeholder: 'your-access-token' },
      { key: 'config.apiKey', label: 'API Key', type: 'string', placeholder: 'your-api-key' },
    ],
  },
  // AI/Analytics Nodes
  'audio-processor': {
    title: 'Audio Processor Configuration',
    fields: [
      { key: 'config.provider', label: 'AI Provider', type: 'select', required: true, options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'gemini', label: 'Google Gemini' },
      ], placeholder: 'openai' },
      { key: 'config.apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'Enter your API key...' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'transcribe', label: 'Speech to Text' },
        { value: 'synthesize', label: 'Text to Speech' },
        { value: 'analyze', label: 'Audio Analysis' },
        { value: 'translate', label: 'Audio Translation' },
      ]},
      { key: 'config.model', label: 'Model', type: 'select', required: true, options: [
        { value: 'whisper-1', label: 'Whisper-1 (Speech)' },
        { value: 'tts-1', label: 'TTS-1 (Speech)' },
        { value: 'tts-1-hd', label: 'TTS-1-HD (High Quality)' },
        { value: 'gpt-4o-audio-preview', label: 'GPT-4o Audio' },
      ]},
      { key: 'config.text', label: 'Text (for synthesis)', type: 'textarea', placeholder: 'Optional - will auto-use previous node summary/content if left blank' },
      { key: 'config.language', label: 'Language', type: 'string', placeholder: 'en (language code)' },
      { key: 'config.voice', label: 'Voice', type: 'select', options: [
        { value: 'alloy', label: 'Alloy' },
        { value: 'echo', label: 'Echo' },
        { value: 'fable', label: 'Fable' },
        { value: 'onyx', label: 'Onyx' },
        { value: 'nova', label: 'Nova' },
        { value: 'shimmer', label: 'Shimmer' },
      ], placeholder: 'alloy (for text-to-speech)' },
      { key: 'config.responseFormat', label: 'Response Format', type: 'select', options: [
        { value: 'json', label: 'JSON' },
        { value: 'text', label: 'Text' },
        { value: 'srt', label: 'SRT Subtitles' },
        { value: 'vtt', label: 'VTT Subtitles' },
        { value: 'mp3', label: 'MP3' },
        { value: 'opus', label: 'Opus' },
        { value: 'aac', label: 'AAC' },
        { value: 'flac', label: 'FLAC' },
      ], placeholder: 'json (for speech-to-text) or mp3 (for text-to-speech)' },
    ],
  },
  'data-analyzer': {
    title: 'Data Analyzer Configuration',
    fields: [
      { key: 'config.apiKey', label: 'API Key', type: 'string', required: true, placeholder: 'OpenAI/OpenRouter/Gemini API key' },
      { key: 'config.provider', label: 'Provider', type: 'select', required: false, options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'gemini', label: 'Gemini' },
      ], placeholder: 'openai' },
      { key: 'config.dataSource', label: 'Data Source', type: 'select', required: true, options: [
        { value: 'csv', label: 'CSV File' },
        { value: 'json', label: 'JSON Data' },
        { value: 'database', label: 'Database' },
        { value: 'api', label: 'API Endpoint' },
      ]},
      { key: 'config.dataPath', label: 'Data Path', type: 'string', placeholder: 'Path to data (e.g., /path/to/data.json or input.data)' },
      { key: 'config.targetColumn', label: 'Target Column', type: 'string', placeholder: 'Column name to analyze (for structured data)' },
      { key: 'config.analysisType', label: 'Analysis Type', type: 'select', required: true, options: [
        { value: 'insights', label: 'Data Insights' },
        { value: 'predictions', label: 'Predictions' },
        { value: 'clustering', label: 'Clustering' },
        { value: 'classification', label: 'Classification' },
        { value: 'regression', label: 'Regression' },
        { value: 'sentiment', label: 'Sentiment Analysis' },
      ]},
      { key: 'config.model', label: 'AI Model', type: 'select', required: true, options: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'claude-3', label: 'Claude 3' },
        { value: 'custom', label: 'Custom Model' },
      ]},
      { key: 'config.includeVisualizations', label: 'Include Visualizations', type: 'boolean', placeholder: 'false' },
      { key: 'config.includeRecommendations', label: 'Include Recommendations', type: 'boolean', placeholder: 'false' },
    ],
  },
  'document-processor': {
    title: 'Document Processor Configuration',
    fields: [
      { key: 'config.filePath', label: 'Upload Document', type: 'file', required: true, placeholder: 'Upload PDF, DOCX, TXT, or other document files' },
      { key: 'config.outputFormat', label: 'Output Format', type: 'select', required: true, options: [
        { value: 'text', label: 'Plain Text' },
        { value: 'json', label: 'JSON' },
        { value: 'markdown', label: 'Markdown' },
      ]},
    ],
  },
  'email-analyzer': {
    title: 'Email Analyzer Configuration',
    fields: [
      { key: 'config.provider', label: 'AI Provider *', type: 'select', required: true, options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'gemini', label: 'Google Gemini' },
      ]},
      { key: 'config.apiKey', label: 'API Key *', type: 'string', required: true, password: true, placeholder: 'Enter your API key...' },
      { key: 'config.analysisType', label: 'Analysis Type *', type: 'select', required: true, options: [
        { value: 'sentiment', label: 'Sentiment Analysis' },
        { value: 'intent', label: 'Intent Detection' },
        { value: 'classification', label: 'Classification' },
        { value: 'priority', label: 'Priority Assessment' },
        { value: 'spam', label: 'Spam Detection' },
        { value: 'comprehensive', label: 'Comprehensive Analysis' },
      ]},
      { key: 'config.model', label: 'AI Model *', type: 'select', required: true, options: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
        { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-1.5-pro', label: 'Gemini Pro 1.5' },
      ]},
      { key: 'config.includeConfidence', label: 'Include Confidence', type: 'boolean', placeholder: 'false' },
      { key: 'config.includeKeywords', label: 'Include Keywords', type: 'boolean', placeholder: 'false' },
      { key: 'config.includeActionItems', label: 'Include Action Items', type: 'boolean', placeholder: 'false' },
    ],
  },
  'image-generator': {
    title: 'Image Generator Configuration',
    fields: [
      { key: 'config.provider', label: 'AI Provider *', type: 'select', required: true, options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'gemini', label: 'Google Gemini' },
        { value: 'replicate', label: 'Replicate' },
        { value: 'huggingface', label: 'Hugging Face' },
        { value: 'stability', label: 'Stability AI' },
      ]},
      { key: 'config.apiKey', label: 'API Key *', type: 'string', required: true, password: true, placeholder: 'Enter your API key...' },
      { key: 'config.model', label: 'Model *', type: 'select', required: true, options: [
        { value: 'dall-e-2', label: 'DALL-E 2' },
        { value: 'dall-e-3', label: 'DALL-E 3' },
        { value: 'dall-e-3-hd', label: 'DALL-E 3 HD' },
        { value: 'imagen-3', label: 'Imagen 3' },
        { value: 'stable-diffusion-xl', label: 'Stable Diffusion XL' },
        { value: 'stable-diffusion', label: 'Stable Diffusion' },
        { value: 'midjourney', label: 'Midjourney' },
        { value: 'flux', label: 'Flux' },
      ]},
      { key: 'config.prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'A beautiful sunset over mountains' },
      { key: 'config.n', label: 'Number of Images', type: 'number', placeholder: '1', min: 1, max: 10 },
      { key: 'config.size', label: 'Image Size', type: 'select', required: true, options: [
        { value: '256x256', label: '256x256' },
        { value: '512x512', label: '512x512' },
        { value: '1024x1024', label: '1024x1024' },
        { value: '1792x1024', label: '1792x1024' },
        { value: '1024x1792', label: '1024x1792' },
      ]},
      { key: 'config.quality', label: 'Quality', type: 'select', required: true, options: [
        { value: 'standard', label: 'Standard' },
        { value: 'hd', label: 'HD' },
      ]},
      { key: 'config.style', label: 'Style', type: 'select', required: true, options: [
        { value: 'vivid', label: 'Vivid' },
        { value: 'natural', label: 'Natural' },
      ]},
    ],
  },
  'text-analyzer': {
    title: 'Text Analyzer Configuration',
    fields: [
      { key: 'config.provider', label: 'AI Provider', type: 'select', required: true, options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'gemini', label: 'Google Gemini' },
      ]},
      { key: 'config.apiKey', label: 'API Key', type: 'string', required: true, placeholder: 'Enter your API key...' },
      { key: 'config.analysisType', label: 'Analysis Type', type: 'select', required: true, options: [
        { value: 'sentiment', label: 'Sentiment Analysis' },
        { value: 'entities', label: 'Entity Extraction' },
        { value: 'keywords', label: 'Keyword Extraction' },
        { value: 'summary', label: 'Text Summary' },
        { value: 'comprehensive', label: 'Comprehensive Analysis' },
      ]},
      { key: 'config.model', label: 'AI Model', type: 'select', required: true, options: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
        { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-1.5-pro', label: 'Gemini Pro 1.5' },
      ]},
      { key: 'config.language', label: 'Language', type: 'string', placeholder: 'en (language code)' },
      { key: 'config.includeConfidence', label: 'Include Confidence', type: 'boolean', placeholder: 'false' },
      { key: 'config.includeEntities', label: 'Include Entities', type: 'boolean', placeholder: 'false' },
      { key: 'config.includeKeywords', label: 'Include Keywords', type: 'boolean', placeholder: 'false' },
    ],
  },
  'vector-search': {
    title: 'Vector Search Configuration',
    fields: [
      { key: 'config.apiKey', label: 'Vector DB API Key', type: 'string', required: true, placeholder: 'your-vector-db-api-key' },
      { key: 'config.provider', label: 'Vector Database', type: 'select', required: true, options: [
        { value: 'pinecone', label: 'Pinecone' },
        { value: 'chroma', label: 'Chroma' },
        { value: 'weaviate', label: 'Weaviate' },
      ]},
      { key: 'config.aiProvider', label: 'AI Provider', type: 'select', required: true, options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'gemini', label: 'Google Gemini' },
      ], placeholder: 'openai' },
      { key: 'config.aiApiKey', label: 'AI API Key', type: 'password', required: true, placeholder: 'Enter your AI API key...' },
      { key: 'config.embeddingModel', label: 'Embedding Model', type: 'select', required: false, options: [
        { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002' },
        { value: 'text-embedding-3-small', label: 'text-embedding-3-small' },
        { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
        { value: 'openai/text-embedding-ada-002', label: 'OpenAI via OpenRouter' },
      ], placeholder: 'text-embedding-ada-002' },
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'search', label: 'Search' },
        { value: 'store', label: 'Store' },
        { value: 'similarity', label: 'Similarity' },
        { value: 'embedding', label: 'Embedding' },
      ], placeholder: 'search' },
      { key: 'config.indexName', label: 'Index Name', type: 'string', required: true, placeholder: 'my-index' },
      { key: 'config.query', label: 'Query', type: 'textarea', placeholder: 'Search query text or vector' },
      { key: 'config.topK', label: 'Top K', type: 'number', placeholder: '10', min: 1, max: 100 },
    ],
  },
  // Utility Nodes - Missing nodes
  'logger': {
    title: 'Logger Configuration',
    fields: [
      { key: 'config.message', label: 'Message', type: 'textarea', required: true, placeholder: 'Enter log message...' },
      { key: 'config.logLevel', label: 'Log Level', type: 'select', required: true, options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warn' },
        { value: 'error', label: 'Error' },
      ], placeholder: 'info' },
      { key: 'config.data', label: 'Additional Data (JSON)', type: 'textarea', placeholder: '{}' },
    ],
  },
  'image-resize': {
    title: 'Image Resize Configuration',
    fields: [
      { key: 'config.imageSource', label: 'Image Source', type: 'file', required: true, placeholder: 'Upload an image file (JPEG, PNG, WebP, GIF)' },
      { key: 'config.width', label: 'Width', type: 'number', placeholder: 'Target width in pixels', min: 1, max: 10000 },
      { key: 'config.height', label: 'Height', type: 'number', placeholder: 'Target height in pixels', min: 1, max: 10000 },
      { key: 'config.resizeMode', label: 'Resize Mode', type: 'select', options: [
        { value: 'fit', label: 'Fit (Maintain Aspect)' },
        { value: 'fill', label: 'Fill (Crop)' },
        { value: 'stretch', label: 'Stretch' },
        { value: 'cover', label: 'Cover' },
        { value: 'contain', label: 'Contain' },
      ], placeholder: 'fit' },
      { key: 'config.quality', label: 'Quality', type: 'number', placeholder: 'Image quality (1-100)', min: 1, max: 100 },
      { key: 'config.format', label: 'Format', type: 'select', options: [
        { value: 'jpeg', label: 'JPEG' },
        { value: 'png', label: 'PNG' },
        { value: 'webp', label: 'WebP' },
        { value: 'gif', label: 'GIF' },
      ], placeholder: 'jpeg' },
    ],
  },
  // Trigger Nodes - Missing nodes
  'file-trigger': {
    title: 'File Trigger Configuration',
    fields: [
      { key: 'config.watchPath', label: 'Watch Path', type: 'string', required: true, placeholder: '/path/to/watch or /path/to/file.txt' },
      { key: 'config.events', label: 'Watch Events', type: 'select', options: [
        { value: 'add', label: 'File Added' },
        { value: 'change', label: 'File Changed' },
        { value: 'unlink', label: 'File Deleted' },
        { value: 'rename', label: 'File Renamed' },
      ], placeholder: 'add, change' },
      { key: 'config.recursive', label: 'Recursive', type: 'boolean', placeholder: 'Watch subdirectories recursively' },
      { key: 'config.extensions', label: 'File Extensions (JSON Array)', type: 'textarea', placeholder: '["txt", "json", "csv"]' },
      { key: 'config.ignorePatterns', label: 'Ignore Patterns (JSON Array)', type: 'textarea', placeholder: '["*.tmp", ".git/*", "node_modules/*"]' },
    ],
  },
  'database-trigger': {
    title: 'Database Trigger Configuration',
    fields: [
      { key: 'config.databaseType', label: 'Database Type', type: 'select', required: true, options: [
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'mongodb', label: 'MongoDB' },
      ], placeholder: 'postgresql' },
      { key: 'config.connectionString', label: 'Connection String', type: 'string', placeholder: 'postgresql://user:password@localhost:5432/dbname' },
      { key: 'config.host', label: 'Host', type: 'string', placeholder: 'localhost' },
      { key: 'config.port', label: 'Port', type: 'number', placeholder: '5432' },
      { key: 'config.database', label: 'Database Name', type: 'string', required: true, placeholder: 'mydb' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'postgres' },
      { key: 'config.password', label: 'Password', type: 'string', password: true, placeholder: 'password' },
      { key: 'config.table', label: 'Table Name', type: 'string', required: true, placeholder: 'users' },
      { key: 'config.operation', label: 'Operation', type: 'select', options: [
        { value: 'insert', label: 'INSERT' },
        { value: 'update', label: 'UPDATE' },
        { value: 'delete', label: 'DELETE' },
        { value: 'all', label: 'All Operations' },
      ], placeholder: 'all' },
      { key: 'config.pollInterval', label: 'Poll Interval (seconds)', type: 'number', placeholder: '5' },
    ],
  },
  'error-trigger': {
    title: 'Error Trigger Configuration',
    fields: [
      { key: 'config.errorTypes', label: 'Error Types (JSON Array)', type: 'textarea', placeholder: '["validation", "network", "server"]' },
      { key: 'config.minSeverity', label: 'Minimum Severity', type: 'select', options: [
        { value: 'warning', label: 'Warning' },
        { value: 'error', label: 'Error' },
        { value: 'critical', label: 'Critical' },
      ], placeholder: 'error' },
    ],
  },
  // LLM Nodes - Missing nodes
  'gemini': {
    title: 'Gemini Configuration',
    fields: [
      { key: 'config.model', label: 'Model', type: 'string', required: true, placeholder: 'gemini-2.0-flash' },
      { key: 'config.apiKey', label: 'API Key', type: 'string', required: true, password: true, placeholder: 'Enter API key...' },
      { key: 'config.systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant.' },
      { key: 'config.userPrompt', label: 'User Prompt', type: 'textarea', placeholder: 'Enter prompt...' },
      { key: 'config.temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
      { key: 'config.maxTokens', label: 'Max Tokens', type: 'number', placeholder: '1000' },
    ],
  },
  'huggingface': {
    title: 'Hugging Face Configuration',
    fields: [
      { key: 'config.apiKey', label: 'API Key', type: 'string', required: true, password: true, placeholder: 'hf_xxxxxxxxxxxx' },
      { key: 'config.model', label: 'Model', type: 'string', required: true, placeholder: 'microsoft/DialoGPT-medium' },
      { key: 'config.task', label: 'Task', type: 'select', required: true, options: [
        { value: 'text-generation', label: 'Text Generation' },
        { value: 'text-classification', label: 'Text Classification' },
        { value: 'sentiment-analysis', label: 'Sentiment Analysis' },
        { value: 'question-answering', label: 'Question Answering' },
        { value: 'summarization', label: 'Summarization' },
        { value: 'translation', label: 'Translation' },
        { value: 'ner', label: 'Named Entity Recognition' },
        { value: 'text-to-speech', label: 'Text to Speech' },
        { value: 'automatic-speech-recognition', label: 'Speech to Text' },
        { value: 'image-classification', label: 'Image Classification' },
        { value: 'object-detection', label: 'Object Detection' },
        { value: 'image-segmentation', label: 'Image Segmentation' },
      ], placeholder: 'text-generation' },
      { key: 'config.input', label: 'Input', type: 'textarea', required: true, placeholder: 'Hello, how are you?' },
      { key: 'config.maxLength', label: 'Max Length', type: 'number', placeholder: '100' },
      { key: 'config.temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
    ],
  },
  // File Processing Nodes - Missing nodes
  'file-upload': {
    title: 'File Upload Configuration',
    fields: [
      { 
        key: 'config.allowedTypes', 
        label: 'Allowed Types', 
        type: 'multiselect', 
        options: [
          { value: '*', label: 'All Types (*)' },
          { value: 'text/plain', label: 'Text Files (.txt)' },
          { value: 'text/csv', label: 'CSV Files (.csv)' },
          { value: 'application/json', label: 'JSON Files (.json)' },
          { value: 'application/pdf', label: 'PDF Files (.pdf)' },
          { value: 'image/jpeg', label: 'JPEG Images (.jpg, .jpeg)' },
          { value: 'image/png', label: 'PNG Images (.png)' },
          { value: 'image/gif', label: 'GIF Images (.gif)' },
          { value: 'image/webp', label: 'WebP Images (.webp)' },
          { value: 'image/*', label: 'All Images' },
          { value: 'video/mp4', label: 'MP4 Videos (.mp4)' },
          { value: 'video/*', label: 'All Videos' },
          { value: 'audio/mpeg', label: 'MP3 Audio (.mp3)' },
          { value: 'audio/*', label: 'All Audio' },
          { value: 'application/zip', label: 'ZIP Archives (.zip)' },
          { value: 'application/x-zip-compressed', label: 'ZIP Compressed' },
          { value: 'application/msword', label: 'Word Documents (.doc)' },
          { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Documents (.docx)' },
          { value: 'application/vnd.ms-excel', label: 'Excel Files (.xls)' },
          { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Files (.xlsx)' },
          { value: 'application/vnd.ms-powerpoint', label: 'PowerPoint (.ppt)' },
          { value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint (.pptx)' },
        ],
        placeholder: 'Select allowed file types'
      },
      { key: 'config.maxSize', label: 'Max Size (bytes)', type: 'number', placeholder: '10485760' },
    ],
  },
  'data-cleaning': {
    title: 'Data Cleaning Configuration',
    fields: [],
  },
  'data-transformation': {
    title: 'Data Transformation Configuration',
    fields: [
      { key: 'config.transformationOperations', label: 'Transformation Operations (JSON Array)', type: 'textarea', required: true, placeholder: '["reshape", "pivot", "aggregate"]' },
      { key: 'config.reshape', label: 'Reshape Config (JSON)', type: 'textarea', placeholder: '{"enabled": true, "targetFormat": "normalized"}' },
      { key: 'config.pivot', label: 'Pivot Config (JSON)', type: 'textarea', placeholder: '{"enabled": false, "indexFields": [], "pivotField": ""}' },
      { key: 'config.aggregate', label: 'Aggregate Config (JSON)', type: 'textarea', placeholder: '{"enabled": false, "groupBy": [], "functions": {}}' },
    ],
  },
  'file-export': {
    title: 'File Export Configuration',
    fields: [
      { key: 'config.format', label: 'Format', type: 'select', required: true, options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'txt', label: 'TXT' },
        { value: 'xlsx', label: 'XLSX' },
      ], placeholder: 'json' },
    ],
  },
  'webhook-call': {
    title: 'Webhook Call Configuration',
    fields: [
      { key: 'config.url', label: 'Webhook URL', type: 'string', required: true, placeholder: 'https://example.com/webhook' },
      { key: 'config.method', label: 'HTTP Method', type: 'select', required: true, options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
      ], placeholder: 'POST' },
      { key: 'config.headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
      { key: 'config.timeout', label: 'Timeout (seconds)', type: 'number', placeholder: '30' },
    ],
  },
  // removed GraphQL node schema
  'rest-api': {
    title: 'REST API Configuration',
    fields: [
      { key: 'config.baseUrl', label: 'Base URL', type: 'string', required: true, placeholder: 'https://api.example.com' },
      { key: 'config.endpoint', label: 'Endpoint', type: 'string', required: true, placeholder: '/v1/users' },
      { key: 'config.method', label: 'HTTP Method', type: 'select', required: true, options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
      ], placeholder: 'GET' },
      { key: 'config.headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
    ],
  },
  // AI Nodes - Missing nodes
  'speech-to-text': {
    title: 'Speech to Text Configuration',
    fields: [
      { key: 'config.apiKey', label: 'API Key', type: 'string', password: true, placeholder: 'sk-... (OpenAI API key)' },
      { key: 'config.audioFile', label: 'Audio File', type: 'string', required: true, placeholder: '/path/to/audio.mp3 or data:audio/mp3;base64,...' },
      { key: 'config.provider', label: 'Provider', type: 'select', options: [
        { value: 'openai', label: 'OpenAI Whisper' },
        { value: 'google', label: 'Google Cloud Speech' },
        { value: 'azure', label: 'Azure Speech' },
        { value: 'huggingface', label: 'Hugging Face' },
      ], placeholder: 'openai' },
      { key: 'config.model', label: 'Model', type: 'select', options: [
        { value: 'whisper-1', label: 'Whisper-1' },
        { value: 'gpt-4o-audio-preview', label: 'GPT-4o Audio' },
      ], placeholder: 'whisper-1' },
      { key: 'config.language', label: 'Language', type: 'string', placeholder: 'en' },
      { key: 'config.responseFormat', label: 'Response Format', type: 'select', options: [
        { value: 'json', label: 'JSON' },
        { value: 'text', label: 'Text' },
        { value: 'srt', label: 'SRT Subtitles' },
        { value: 'vtt', label: 'VTT Subtitles' },
      ], placeholder: 'json' },
    ],
  },
  'text-to-speech': {
    title: 'Text to Speech Configuration',
    fields: [
      { key: 'config.apiKey', label: 'API Key', type: 'string', password: true, placeholder: 'sk-... (OpenAI API key)' },
      { key: 'config.text', label: 'Text', type: 'textarea', required: false, placeholder: 'Leave blank to use previous node summary/content automatically' },
      { key: 'config.provider', label: 'Provider', type: 'select', options: [
        { value: 'openai', label: 'OpenAI TTS' },
        { value: 'elevenlabs', label: 'ElevenLabs' },
        { value: 'azure', label: 'Azure Speech' },
        { value: 'google', label: 'Google Cloud TTS' },
        { value: 'huggingface', label: 'Hugging Face' },
      ], placeholder: 'openai' },
      { key: 'config.model', label: 'Model', type: 'select', options: [
        { value: 'tts-1', label: 'TTS-1' },
        { value: 'tts-1-hd', label: 'TTS-1-HD (High Quality)' },
      ], placeholder: 'tts-1' },
      { key: 'config.voice', label: 'Voice', type: 'select', options: [
        { value: 'alloy', label: 'Alloy' },
        { value: 'echo', label: 'Echo' },
        { value: 'fable', label: 'Fable' },
        { value: 'onyx', label: 'Onyx' },
        { value: 'nova', label: 'Nova' },
        { value: 'shimmer', label: 'Shimmer' },
      ], placeholder: 'alloy' },
      { key: 'config.speed', label: 'Speed', type: 'number', placeholder: '1.0 (0.25 to 4.0)' },
      { key: 'config.outputFormat', label: 'Response Format', type: 'select', options: [
        { value: 'mp3', label: 'MP3' },
        { value: 'opus', label: 'Opus' },
        { value: 'aac', label: 'AAC' },
        { value: 'flac', label: 'FLAC' },
      ], placeholder: 'mp3' },
    ],
  },
  'memory': {
    title: 'Memory Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'store', label: 'Store' },
        { value: 'retrieve', label: 'Retrieve' },
        { value: 'search', label: 'Search' },
        { value: 'update', label: 'Update' },
        { value: 'cleanup', label: 'Cleanup' },
      ], placeholder: 'store' },
      { key: 'config.memoryType', label: 'Memory Type', type: 'select', options: [
        { value: 'conversation', label: 'Conversation' },
        { value: 'preference', label: 'Preference' },
        { value: 'fact', label: 'Fact' },
        { value: 'goal', label: 'Goal' },
        { value: 'context', label: 'Context' },
      ], placeholder: 'conversation' },
      { key: 'config.content', label: 'Content', type: 'textarea', placeholder: 'Memory content' },
      { key: 'config.metadata', label: 'Metadata (JSON)', type: 'textarea', placeholder: '{"key": "value"}' },
      { key: 'config.importance', label: 'Importance', type: 'number', placeholder: '5 (1-10)' },
      { key: 'config.tags', label: 'Tags (JSON Array)', type: 'textarea', placeholder: '["tag1", "tag2"]' },
      { key: 'config.searchQuery', label: 'Search Query', type: 'string', placeholder: 'Search query (for search operation)' },
      { key: 'config.limit', label: 'Limit', type: 'number', placeholder: '10' },
    ],
  },
  // Real SDK Nodes - Missing nodes
  'gemini-real': {
    title: 'Gemini Real Configuration',
    fields: [
      { key: 'config.model', label: 'Model', type: 'string', required: true, placeholder: 'gemini-pro' },
      { key: 'config.apiKey', label: 'API Key', type: 'string', password: true, placeholder: 'AIza...' },
      { key: 'config.prompt', label: 'Prompt', type: 'textarea', placeholder: 'Enter prompt...' },
    ],
  },
  'aws-s3-real': {
    title: 'AWS S3 Real Configuration',
    fields: [
      { key: 'config.accessKeyId', label: 'Access Key ID', type: 'string', required: true, placeholder: 'AKIA...' },
      { key: 'config.secretAccessKey', label: 'Secret Access Key', type: 'string', required: true, password: true, placeholder: 'Secret key...' },
      { key: 'config.bucketName', label: 'Bucket Name', type: 'string', required: true, placeholder: 'my-bucket' },
      { key: 'config.operation', label: 'Operation', type: 'string', placeholder: 'upload, download, list, delete' },
      { key: 'config.region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
    ],
  },
  'aws-lambda-real': {
    title: 'AWS Lambda Real Configuration',
    fields: [
      { key: 'config.accessKeyId', label: 'Access Key ID', type: 'string', required: true, placeholder: 'AKIA...' },
      { key: 'config.secretAccessKey', label: 'Secret Access Key', type: 'string', required: true, password: true, placeholder: 'Secret key...' },
      { key: 'config.functionName', label: 'Function Name', type: 'string', required: true, placeholder: 'my-function' },
      { key: 'config.operation', label: 'Operation', type: 'string', placeholder: 'invoke, list, get' },
      { key: 'config.payload', label: 'Payload (JSON)', type: 'textarea', placeholder: '{"key": "value"}' },
      { key: 'config.region', label: 'Region', type: 'string', placeholder: 'us-east-1' },
    ],
  },
  'azure-blob-real': {
    title: 'Azure Blob Real Configuration',
    fields: [
      { key: 'config.containerName', label: 'Container Name', type: 'string', required: true, placeholder: 'my-container' },
      { key: 'config.operation', label: 'Operation', type: 'string', placeholder: 'upload, download, list, delete' },
      { key: 'config.connectionString', label: 'Connection String', type: 'string', password: true, placeholder: 'DefaultEndpointsProtocol=...' },
      { key: 'config.blobName', label: 'Blob Name', type: 'string', placeholder: 'file.txt' },
    ],
  },
  'postgresql-real': {
    title: 'PostgreSQL Real Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'string', required: true, placeholder: 'query, insert, update, delete' },
      { key: 'config.host', label: 'Host', type: 'string', placeholder: 'localhost' },
      { key: 'config.port', label: 'Port', type: 'number', placeholder: '5432' },
      { key: 'config.database', label: 'Database', type: 'string', placeholder: 'mydb' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'postgres' },
      { key: 'config.password', label: 'Password', type: 'string', password: true, placeholder: 'password' },
      { key: 'config.ssl', label: 'SSL', type: 'boolean', placeholder: 'false' },
      { key: 'config.query', label: 'Query', type: 'textarea', placeholder: 'SELECT * FROM users' },
      { key: 'config.table', label: 'Table', type: 'string', placeholder: 'users' },
    ],
  },
  'mongodb-real': {
    title: 'MongoDB Real Configuration',
    fields: [
      { key: 'config.connectionString', label: 'Connection String', type: 'string', required: true, password: true, placeholder: 'mongodb://...' },
      { key: 'config.operation', label: 'Operation', type: 'string', required: true, placeholder: 'find, insert, update, delete' },
      { key: 'config.database', label: 'Database', type: 'string', placeholder: 'mydb' },
      { key: 'config.collection', label: 'Collection', type: 'string', placeholder: 'users' },
      { key: 'config.query', label: 'Query (JSON)', type: 'textarea', placeholder: '{"name": "John"}' },
    ],
  },
  'google-cloud-storage-real': {
    title: 'Google Cloud Storage Real Configuration',
    fields: [
      { key: 'config.bucketName', label: 'Bucket Name', type: 'string', required: true, placeholder: 'my-bucket' },
      { key: 'config.operation', label: 'Operation', type: 'string', placeholder: 'upload, download, list, delete' },
      { key: 'config.credentials', label: 'Credentials (JSON)', type: 'textarea', placeholder: 'Service account JSON' },
      { key: 'config.fileName', label: 'File Name', type: 'string', placeholder: 'file.txt' },
    ],
  },
  'docker-real': {
    title: 'Docker Real Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'build', label: 'Build' },
        { value: 'run', label: 'Run' },
        { value: 'stop', label: 'Stop' },
        { value: 'start', label: 'Start' },
        { value: 'restart', label: 'Restart' },
        { value: 'remove', label: 'Remove' },
        { value: 'pull', label: 'Pull' },
        { value: 'push', label: 'Push' },
        { value: 'list', label: 'List' },
        { value: 'logs', label: 'Logs' },
        { value: 'exec', label: 'Exec' },
        { value: 'inspect', label: 'Inspect' },
      ], placeholder: 'run' },
      { key: 'config.imageName', label: 'Image Name', type: 'string', placeholder: 'nginx:latest' },
      { key: 'config.containerName', label: 'Container Name', type: 'string', placeholder: 'my-container' },
    ],
  },
  'google-drive-real': {
    title: 'Google Drive Real Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'select', required: true, options: [
        { value: 'list', label: 'List Files' },
        { value: 'upload', label: 'Upload File' },
        { value: 'download', label: 'Download File' },
        { value: 'getInfo', label: 'Get File Info' },
        { value: 'delete', label: 'Delete File' },
        { value: 'createFolder', label: 'Create Folder' },
        { value: 'search', label: 'Search Files' },
        { value: 'copy', label: 'Copy File' },
        { value: 'move', label: 'Move File' },
        { value: 'share', label: 'Share File' },
      ], placeholder: 'list' },
      { key: 'config.accessToken', label: 'Access Token', type: 'string', password: true, placeholder: 'Bearer token' },
      { key: 'config.fileId', label: 'File ID', type: 'string', placeholder: 'File ID' },
      { key: 'config.fileName', label: 'File Name', type: 'string', placeholder: 'file.txt' },
      { key: 'config.path', label: 'Path', type: 'string', placeholder: '/path/to/file' },
    ],
  },
  'mysql-real': {
    title: 'MySQL Real Configuration',
    fields: [
      { key: 'config.operation', label: 'Operation', type: 'string', required: true, placeholder: 'query, insert, update, delete' },
      { key: 'config.host', label: 'Host', type: 'string', placeholder: 'localhost' },
      { key: 'config.port', label: 'Port', type: 'number', placeholder: '3306' },
      { key: 'config.database', label: 'Database', type: 'string', placeholder: 'mydb' },
      { key: 'config.username', label: 'Username', type: 'string', placeholder: 'root' },
      { key: 'config.password', label: 'Password', type: 'string', password: true, placeholder: 'password' },
      { key: 'config.query', label: 'Query', type: 'textarea', placeholder: 'SELECT * FROM users' },
      { key: 'config.table', label: 'Table', type: 'string', placeholder: 'users' },
    ],
  },
};


