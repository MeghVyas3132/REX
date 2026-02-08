import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');

// Google Sheets (v4) via REST; supports OAuth via oauthService or explicit accessToken
export class GoogleSheetsNode {
  getNodeDefinition() {
    return {
      id: 'google-sheets',
      type: 'action',
      name: 'Google Sheets',
      description: 'Read and write ranges in Google Sheets using OAuth',
      category: 'productivity',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          required: true,
          default: 'read',
          options: [
            { name: 'Read', value: 'read' },
            { name: 'Append', value: 'append' },
            { name: 'Update', value: 'update' }
          ]
        },
        { name: 'spreadsheetId', type: 'string', displayName: 'Spreadsheet ID', required: true },
        { name: 'range', type: 'string', displayName: 'Range (A1 notation)', required: true },
        { name: 'values', type: 'string', displayName: 'Values (JSON array)', required: false },
        { name: 'valueInputOption', type: 'options', displayName: 'Value Input Option', required: false, default: 'RAW', options: [
          { name: 'RAW', value: 'RAW' },
          { name: 'USER_ENTERED', value: 'USER_ENTERED' }
        ]},
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Google OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
        }
      ],
      inputs: [
        { name: 'operation', type: 'string', displayName: 'Operation (override)', required: false },
        { name: 'values', type: 'array', displayName: 'Values from previous node', required: false }
      ],
      outputs: [
        { name: 'success', type: 'boolean', displayName: 'Success' },
        { name: 'values', type: 'array', displayName: 'Values' },
        { name: 'updatedRange', type: 'string', displayName: 'Updated Range' },
        { name: 'updatedRows', type: 'number', displayName: 'Updated Rows' }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const cfg = node.data?.config || {};
    const start = Date.now();
    try {
      const operation = (cfg.operation || context.input?.operation || 'read') as 'read'|'append'|'update';
      const spreadsheetId = cfg.spreadsheetId;
      const range = cfg.range;
      let values = cfg.values ? this.parseValues(cfg.values) : (Array.isArray(context.input?.values) ? context.input?.values : undefined);
      const valueInputOption = cfg.valueInputOption || 'RAW';

      if (!spreadsheetId || !range) throw new Error('spreadsheetId and range are required');

      // Access token: explicit or via oauthService
      let accessToken: string | undefined = cfg.accessToken;
      if (!accessToken) {
        try {
          const { oauthService } = await import('../../services/oauth.service');
          
          if (!oauthService) {
            throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
          }
          
          // IMPORTANT: Use context.userId which is set by workflow engine from authenticated user
          // This MUST match the userId used when storing OAuth tokens during OAuth callback
          const userId = (context as any).userId;
          
          if (!userId || userId === 'default-user') {
            throw new Error(`User ID not found in workflow context. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          logger.info('Google Sheets node getting OAuth token', {
            nodeId: node.id,
            userId,
            userIdType: typeof userId,
            userIdLength: userId?.length,
            workflowId: context.workflowId,
            runId: context.runId
          });
          
          // Clean userId to ensure consistent format
          const cleanUserId = String(userId || '').trim();
          if (!cleanUserId || cleanUserId === 'default-user') {
            throw new Error(`Invalid userId: ${userId}. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          accessToken = await oauthService.getValidAccessToken(cleanUserId, 'google');
          
          logger.info('Google Sheets node got OAuth token', {
            nodeId: node.id,
            userId: cleanUserId,
            tokenLength: accessToken?.length || 0,
            hasToken: !!accessToken
          });
          
          logger.info('Google Sheets node got OAuth token successfully', {
            nodeId: node.id,
            userId,
            tokenLength: accessToken?.length || 0
          });
        } catch (e: any) {
          const errorMessage = e?.message || e?.toString() || String(e);
          logger.error('Google Sheets node failed to get OAuth token', {
            nodeId: node.id,
            userId: (context as any).userId,
            error: errorMessage
          });
          throw new Error(`Google access token required. Provide accessToken in config or connect Google OAuth. Error: ${errorMessage}`);
        }
      }

      logger.info('Google Sheets node execute', { nodeId: node.id, operation, runId: context.runId });

      const base = 'https://sheets.googleapis.com/v4/spreadsheets';
      if (operation === 'read') {
        const url = `${base}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error(`Sheets read error: ${res.status} ${res.statusText}`);
        const data = await res.json() as any;
        return this.ok({ values: data.values || [] }, start);
      }

      // write-like operations need values
      if (!values) values = [];
      const body = { values };

      if (operation === 'append') {
        const url = `${base}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=${encodeURIComponent(valueInputOption)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` , 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`Sheets append error: ${res.status} ${res.statusText}`);
        const data = await res.json() as any;
        return this.ok({ updatedRange: data.updates?.updatedRange, updatedRows: data.updates?.updatedRows, values }, start);
      }

      if (operation === 'update') {
        const url = `${base}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=${encodeURIComponent(valueInputOption)}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` , 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`Sheets update error: ${res.status} ${res.statusText}`);
        const data = await res.json() as any;
        return this.ok({ updatedRange: data.updatedRange, updatedRows: data.updatedRows, values: data.values }, start);
      }

      throw new Error(`Unsupported operation: ${operation}`);
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


export default GoogleSheetsNode;


