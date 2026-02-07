import {
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
  NodeConnectionTypes,
} from '../../types/n8n-types';

// Simplified Email Trigger (manual + placeholder). To be extended with IMAP/POP3.
export class EmailTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Email Trigger',
    name: 'email-trigger',
    icon: 'fa:envelope',
    group: ['trigger'],
    version: 1,
    description: 'Triggers the workflow when an email matching criteria is received',
    eventTriggerDescription: '',
    defaults: {
      name: 'Email Trigger',
    },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    properties: [
      { displayName: 'Email Address', name: 'email', type: 'string', required: true, default: '', placeholder: 'monitor@example.com' },
      { displayName: 'Subject Filter', name: 'subject', type: 'string', default: '', placeholder: '^URGENT|^ALERT|.*report.*' },
      { displayName: 'Sender Filter', name: 'from', type: 'string', default: '', placeholder: 'boss@company.com' },
      { displayName: 'Content Keywords', name: 'keywords', type: 'string', default: '', placeholder: 'urgent, alert, error' },
      { displayName: 'Check Interval (seconds)', name: 'checkInterval', type: 'number', default: 300, typeOptions: { minValue: 60 } },
      { displayName: 'Use OAuth', name: 'useOAuth', type: 'boolean', default: false },
      { displayName: 'Access Token', name: 'accessToken', type: 'string', default: '', placeholder: 'your-oauth-token', typeOptions: { password: true } },
      { displayName: 'Notice', name: 'notice', type: 'notice', default: '', description: 'Manual execution emits a sample email event.' },
    ],
  };

  getNodeDefinition() {
    return {
      id: 'email-trigger',
      type: 'trigger',
      name: 'Email Trigger',
      description: 'Triggers the workflow when an email matching criteria is received',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'email',
          type: 'string',
          displayName: 'Email Address',
          description: 'Email address to monitor',
          required: true,
          default: ''
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Subject Filter',
          description: 'Filter emails by subject',
          required: false,
          default: ''
        },
        {
          name: 'checkInterval',
          type: 'number',
          displayName: 'Check Interval (seconds)',
          description: 'How often to check for emails',
          required: false,
          default: 300,
          min: 60
        }
      ],
      inputs: [],
      outputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Email Data',
          description: 'Data from email',
          dataType: 'object'
        }
      ]
    };
  }

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    const manualTriggerFunction = async () => {
      // Emit a sample email for testing
      this.emit([
        this.helpers.returnJsonArray([
          {
            from: 'sample@example.com',
            to: 'you@example.com',
            subject: 'Sample Email',
            text: 'This is a sample email emitted by Email Trigger (manual test).',
          },
        ]),
      ]);
    };

    return { manualTriggerFunction };
  }
}

export default EmailTrigger;


