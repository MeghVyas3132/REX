import {
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
  NodeConnectionTypes,
} from '../../types/n8n-types';

// Simplified Database Trigger (polling placeholder)
export class DatabaseTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Database Trigger',
    name: 'database-trigger',
    icon: 'fa:database',
    group: ['trigger'],
    version: 1,
    description: 'Triggers the workflow when database changes occur',
    eventTriggerDescription: '',
    defaults: { name: 'Database Trigger' },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    properties: [
      { displayName: 'Database Type', name: 'databaseType', type: 'options', required: true, default: 'postgresql', options: [
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'MongoDB', value: 'mongodb' },
      ] },
      { displayName: 'Connection String', name: 'connectionString', type: 'string', default: '', placeholder: 'postgresql://user:pass@host:5432/db' },
      { displayName: 'Host', name: 'host', type: 'string', default: '', placeholder: 'localhost' },
      { displayName: 'Port', name: 'port', type: 'number', default: 5432 },
      { displayName: 'Database', name: 'database', type: 'string', required: true, default: '', placeholder: 'mydb' },
      { displayName: 'Username', name: 'username', type: 'string', default: '', placeholder: 'postgres' },
      { displayName: 'Password', name: 'password', type: 'string', default: '', placeholder: 'password', typeOptions: { password: true } },
      { displayName: 'Table', name: 'table', type: 'string', required: true, default: '', placeholder: 'users' },
      { displayName: 'Schema', name: 'schema', type: 'string', default: 'public' },
      { displayName: 'Operations', name: 'operations', type: 'string', default: 'INSERT,UPDATE,DELETE', placeholder: 'INSERT,UPDATE,DELETE' },
      { displayName: 'Poll Interval (seconds)', name: 'interval', type: 'number', default: 30, typeOptions: { minValue: 5 } },
      { displayName: 'Watch Column', name: 'watchColumn', type: 'string', default: '', placeholder: 'updated_at' },
      { displayName: 'Filter Condition', name: 'filterCondition', type: 'string', default: '', placeholder: "status = 'active'" },
      { displayName: 'Use LISTEN/NOTIFY', name: 'useListenNotify', type: 'boolean', default: true },
      { displayName: 'Notice', name: 'notice', type: 'notice', default: '', description: 'Polling placeholder. Manual run emits a sample change.' },
    ],
  };

  getNodeDefinition() {
    return {
      id: 'database-trigger',
      type: 'trigger',
      name: 'Database Trigger',
      description: 'Triggers the workflow when database changes occur',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'databaseType',
          type: 'options',
          displayName: 'Database Type',
          description: 'Type of database',
          required: true,
          default: 'postgresql',
          options: [
            { name: 'PostgreSQL', value: 'postgresql' },
            { name: 'MySQL', value: 'mysql' },
            { name: 'MongoDB', value: 'mongodb' }
          ]
        },
        {
          name: 'table',
          type: 'string',
          displayName: 'Table',
          description: 'Table to watch',
          required: true,
          default: ''
        },
        {
          name: 'interval',
          type: 'number',
          displayName: 'Poll Interval (seconds)',
          description: 'How often to check for changes',
          required: false,
          default: 30,
          min: 5
        }
      ],
      inputs: [],
      outputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Trigger Data',
          description: 'Data from database change',
          dataType: 'object'
        }
      ]
    };
  }

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    let timer: NodeJS.Timeout | undefined;
    const intervalSec = this.getNodeParameter('interval', 0, 30) as number;
    const table = this.getNodeParameter('table', 0) as string;
    const operationsValue = this.getNodeParameter('operations', 0, 'INSERT,UPDATE,DELETE') as string;
    const operations = operationsValue.split(',').map((o) => o.trim().toUpperCase()).filter(Boolean);

    const tick = () => {
      // Emit a fake row change for now
      this.emit([
        this.helpers.returnJsonArray([
          { table, change: operations[0] || 'UPDATE', id: 1, timestamp: new Date().toISOString() },
        ]),
      ]);
    };

    timer = setInterval(tick, Math.max(5, intervalSec) * 1000);

    const manualTriggerFunction = async () => tick();
    const closeFunction = async () => { if (timer) clearInterval(timer); };
    return { manualTriggerFunction, closeFunction };
  }
}

export default DatabaseTrigger;


