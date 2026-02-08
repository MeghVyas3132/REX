import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class ExcelNode {
  getNodeDefinition() {
    return {
      id: 'excel',
      type: 'action',
      name: 'Excel',
      description: 'Read and write Excel files via Microsoft Graph API',
      category: 'productivity',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Microsoft Graph access token',
          required: true,
          placeholder: 'Bearer token...',
          credentialType: 'microsoft_graph_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Operation to perform',
          required: true,
          default: 'read',
          options: [
            { name: 'Read', value: 'read' },
            { name: 'Write', value: 'write' }
          ]
        },
        {
          name: 'workbookId',
          type: 'string',
          displayName: 'Workbook ID',
          description: 'Excel workbook ID',
          required: true,
          placeholder: 'workbook-id'
        },
        {
          name: 'worksheet',
          type: 'string',
          displayName: 'Worksheet',
          description: 'Worksheet name',
          required: true,
          placeholder: 'Sheet1'
        },
        {
          name: 'range',
          type: 'string',
          displayName: 'Range',
          description: 'Cell range (e.g., A1:B10)',
          required: true,
          placeholder: 'A1:B10'
        },
        {
          name: 'drive',
          type: 'options',
          displayName: 'Drive',
          description: 'Drive selection',
          required: false,
          default: 'me',
          options: [
            { name: 'My Drive', value: 'me' },
            { name: 'Drive ID', value: 'driveId' }
          ]
        },
        {
          name: 'driveId',
          type: 'string',
          displayName: 'Drive ID',
          description: 'Specific drive ID (if not using me)',
          required: false,
          placeholder: 'drive-id'
        },
        {
          name: 'values',
          type: 'array',
          displayName: 'Values',
          description: 'Values to write (for write operation)',
          required: false,
          placeholder: '[[1,2,3],[4,5,6]]'
        }
      ],
      inputs: [
        {
          name: 'values',
          type: 'array',
          displayName: 'Dynamic Values',
          description: 'Values from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'operation',
          type: 'string',
          displayName: 'Dynamic Operation',
          description: 'Operation from previous node',
          required: false,
          dataType: 'text'
        }
      ],
      outputs: [
        {
          name: 'values',
          type: 'array',
          displayName: 'Values',
          description: 'Read or written values',
          dataType: 'array'
        },
        {
          name: 'address',
          type: 'string',
          displayName: 'Address',
          description: 'Cell range address',
          dataType: 'text'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();
    // Validation
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    const cfg = node.data?.config || {};
    const start = Date.now();
    try {
      const operation = (cfg.operation || 'read') as 'read'|'write';
      const driveSel = cfg.drive || 'me';
      const driveId = cfg.driveId;
      const workbookId = cfg.workbookId;
      const worksheet = cfg.worksheet;
      const range = cfg.range;
      let values = cfg.values ? this.parseValues(cfg.values) : (Array.isArray(context.input?.values) ? context.input?.values : undefined);

      if (!workbookId || !worksheet || !range) throw new Error('workbookId, worksheet and range are required');

      // Access token (no Microsoft OAuth helper yet) - require explicit for now
      const accessToken: string | undefined = cfg.accessToken;
      if (!accessToken) throw new Error('Microsoft Graph access token required in config.accessToken');

      logger.info('Excel node execute', { nodeId: node.id, operation, runId: context.runId });

      const base = 'https://graph.microsoft.com/v1.0';
      const drivePath = driveSel === 'me' ? 'me/drive' : `drives/${encodeURIComponent(driveId || '')}`;
      if (driveSel !== 'me' && !driveId) throw new Error('driveId is required when Drive=Drive ID');

      const addr = `${base}/${drivePath}/items/${encodeURIComponent(workbookId)}/workbook/worksheets/${encodeURIComponent(worksheet)}/range(address='${encodeURIComponent(range)}')`;

      if (operation === 'read') {
        const res = await fetch(addr, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error(`Excel read error: ${res.status} ${res.statusText}`);
        const data = await res.json() as any;
        return this.ok({ values: data.values || [], address: data.address }, start);
      }

      // write
      if (!values) values = [];
      const res = await fetch(addr, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });
      if (!res.ok) throw new Error(`Excel write error: ${res.status} ${res.statusText}`);
      const data = await res.json() as any;
      return this.ok({ values: data.values || values, address: data.address }, start);
    } catch (error: any) {
      return { success: false, error: error.message, duration: Date.now() - start };
    }
  }

  private parseValues(raw: any): any[] {
    try {
      if (Array.isArray(raw)) return raw;
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private ok(output: any, start: number): ExecutionResult {
    return { success: true, output, duration: Date.now() - start };
  }}


export default ExcelNode;


