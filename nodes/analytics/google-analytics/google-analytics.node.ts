import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';
import axios from 'axios';

export class GoogleAnalyticsNode {
  getNodeDefinition() {
    return {
      id: 'google-analytics',
      type: 'action',
      name: 'Google Analytics',
      description: 'Query Google Analytics data using Google Analytics Reporting API',
      category: 'analytics',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Google Analytics operation to perform',
          required: true,
          default: 'getReport',
          options: [
            { name: 'Get Report', value: 'getReport' },
            { name: 'Get Realtime Report', value: 'getRealtimeReport' },
            { name: 'Get Account Summaries', value: 'getAccountSummaries' },
            { name: 'Get Properties', value: 'getProperties' },
            { name: 'Get Custom Dimensions', value: 'getCustomDimensions' },
            { name: 'Get Custom Metrics', value: 'getCustomMetrics' }
          ]
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Google Analytics API OAuth 2.0 access token',
          required: true,
          placeholder: 'Bearer token',
          credentialType: 'google_analytics_access_token'
        },
        {
          name: 'viewId',
          type: 'string',
          displayName: 'View ID (Property ID)',
          description: 'Google Analytics View ID or GA4 Property ID',
          required: false,
          placeholder: '123456789'
        },
        {
          name: 'propertyId',
          type: 'string',
          displayName: 'Property ID',
          description: 'Google Analytics 4 Property ID',
          required: false,
          placeholder: '123456789'
        },
        {
          name: 'startDate',
          type: 'string',
          displayName: 'Start Date',
          description: 'Start date (YYYY-MM-DD or relative like 30daysAgo, 7daysAgo)',
          required: false,
          default: '30daysAgo',
          placeholder: '30daysAgo or 2024-01-01'
        },
        {
          name: 'endDate',
          type: 'string',
          displayName: 'End Date',
          description: 'End date (YYYY-MM-DD or relative like today, yesterday)',
          required: false,
          default: 'today',
          placeholder: 'today or 2024-01-31'
        },
        {
          name: 'metrics',
          type: 'string',
          displayName: 'Metrics',
          description: 'Comma-separated metrics (e.g., ga:sessions,ga:users or sessions,users for GA4)',
          required: false,
          placeholder: 'ga:sessions,ga:users'
        },
        {
          name: 'dimensions',
          type: 'string',
          displayName: 'Dimensions',
          description: 'Comma-separated dimensions (e.g., ga:country,ga:city or country,city for GA4)',
          required: false,
          placeholder: 'ga:country,ga:city'
        },
        {
          name: 'filters',
          type: 'string',
          displayName: 'Filters (JSON)',
          description: 'JSON filter expression for filtering data',
          required: false,
          placeholder: '{"dimensionName": "country", "operator": "EXACT", "expression": "United States"}'
        },
        {
          name: 'orderBys',
          type: 'string',
          displayName: 'Order By (JSON)',
          description: 'JSON order by configuration',
          required: false,
          placeholder: '{"fieldName": "sessions", "sortOrder": "DESCENDING"}'
        },
        {
          name: 'pageSize',
          type: 'number',
          displayName: 'Page Size',
          description: 'Number of rows to return',
          required: false,
          default: 10,
          min: 1,
          max: 10000
        },
        {
          name: 'pageToken',
          type: 'string',
          displayName: 'Page Token',
          description: 'Token for pagination',
          required: false,
          placeholder: 'nextPageToken'
        },
        {
          name: 'apiVersion',
          type: 'options',
          displayName: 'API Version',
          description: 'Google Analytics API version',
          required: false,
          default: 'ga4',
          options: [
            { name: 'Universal Analytics (v3)', value: 'ua' },
            { name: 'Google Analytics 4', value: 'ga4' }
          ]
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'operation',
          type: 'string',
          displayName: 'Dynamic Operation',
          description: 'Operation from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'viewId',
          type: 'string',
          displayName: 'Dynamic View ID',
          description: 'View ID from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'propertyId',
          type: 'string',
          displayName: 'Dynamic Property ID',
          description: 'Property ID from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'startDate',
          type: 'string',
          displayName: 'Dynamic Start Date',
          description: 'Start date from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'endDate',
          type: 'string',
          displayName: 'Dynamic End Date',
          description: 'End date from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'metrics',
          type: 'string',
          displayName: 'Dynamic Metrics',
          description: 'Metrics from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'dimensions',
          type: 'string',
          displayName: 'Dynamic Dimensions',
          description: 'Dimensions from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'report',
          type: 'object',
          displayName: 'Report Data',
          description: 'Analytics report data',
          dataType: 'object'
        },
        {
          name: 'rows',
          type: 'array',
          displayName: 'Report Rows',
          description: 'Array of report rows',
          dataType: 'array'
        },
        {
          name: 'totals',
          type: 'object',
          displayName: 'Totals',
          description: 'Totals for all metrics',
          dataType: 'object'
        },
        {
          name: 'rowCount',
          type: 'number',
          displayName: 'Row Count',
          description: 'Number of rows returned',
          dataType: 'number'
        },
        {
          name: 'nextPageToken',
          type: 'string',
          displayName: 'Next Page Token',
          description: 'Token for next page',
          dataType: 'text'
        },
        {
          name: 'properties',
          type: 'array',
          displayName: 'Properties List',
          description: 'List of GA properties',
          dataType: 'array'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          accessToken: { type: 'string' },
          viewId: { type: 'string' },
          propertyId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          metrics: { type: 'string' },
          dimensions: { type: 'string' },
          filters: { type: 'string' },
          orderBys: { type: 'string' },
          pageSize: { type: 'number' },
          pageToken: { type: 'string' },
          apiVersion: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          viewId: { type: 'string' },
          propertyId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          metrics: { type: 'string' },
          dimensions: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          report: { type: 'object' },
          rows: { type: 'array' },
          totals: { type: 'object' },
          rowCount: { type: 'number' },
          nextPageToken: { type: 'string' },
          properties: { type: 'array' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }
    

    const startTime = Date.now();
    
    try {
      const operation = context.input?.operation || config.operation || 'getReport';
      const accessToken = config.accessToken;
      
      if (!accessToken) {
        throw new Error('Google Analytics API access token is required');
      }

      // Get dynamic inputs
      const apiVersion = config.apiVersion || 'ga4';
      const viewId = context.input?.viewId || config.viewId;
      const propertyId = context.input?.propertyId || config.propertyId;
      const startDate = context.input?.startDate || config.startDate || '30daysAgo';
      const endDate = context.input?.endDate || config.endDate || 'today';
      const metrics = context.input?.metrics || config.metrics;
      const dimensions = context.input?.dimensions || config.dimensions;
      const filters = config.filters;
      const orderBys = config.orderBys;
      const pageSize = config.pageSize || 10;
      const pageToken = config.pageToken;

      logger.info('Google Analytics operation executed', {
        nodeId: node.id,
        operation,
        apiVersion,
        runId: context.runId
      });

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };

      let result: any;

      switch (operation) {
        case 'getReport':
          if (apiVersion === 'ga4') {
            result = await this.getGA4Report(headers, propertyId, startDate, endDate, metrics, dimensions, filters, orderBys, pageSize, pageToken);
          } else {
            result = await this.getUAReport(headers, viewId, startDate, endDate, metrics, dimensions, filters, orderBys, pageSize, pageToken);
          }
          break;

        case 'getRealtimeReport':
          if (apiVersion === 'ga4') {
            result = await this.getGA4RealtimeReport(headers, propertyId, metrics, dimensions);
          } else {
            result = await this.getUARealtimeReport(headers, viewId, metrics, dimensions);
          }
          break;

        case 'getAccountSummaries':
          result = await this.getAccountSummaries(headers);
          break;

        case 'getProperties':
          result = await this.getProperties(headers);
          break;

        case 'getCustomDimensions':
          if (!propertyId) throw new Error('Property ID is required for getCustomDimensions');
          result = await this.getCustomDimensions(headers, propertyId);
          break;

        case 'getCustomMetrics':
          if (!propertyId) throw new Error('Property ID is required for getCustomMetrics');
          result = await this.getCustomMetrics(headers, propertyId);
          break;

        default:
          throw new Error(`Unsupported Google Analytics operation: ${operation}`);
      }

      return {
        success: true,
        output: {
          ...result,
          operation,
          apiVersion,
          timestamp: new Date().toISOString()
        },
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Google Analytics operation failed', error, {
        nodeId: node.id,
        operation: config.operation,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async getGA4Report(headers: any, propertyId: string, startDate: string, endDate: string, metrics: string, dimensions: string, filters: string, orderBys: string, pageSize: number, pageToken?: string) {
    if (!propertyId) {
      throw new Error('Property ID is required for GA4 reports');
    }

    const metricsArray = metrics ? metrics.split(',').map(m => m.trim()) : ['sessions'];
    const dimensionsArray = dimensions ? dimensions.split(',').map(d => d.trim()) : [];

    const requestBody: any = {
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: this.parseDate(startDate),
          endDate: this.parseDate(endDate)
        }
      ],
      metrics: metricsArray.map(m => ({ name: m })),
      limit: pageSize
    };

    if (dimensionsArray.length > 0) {
      requestBody.dimensions = dimensionsArray.map(d => ({ name: d }));
    }

    if (filters) {
      try {
        requestBody.dimensionFilter = JSON.parse(filters);
      } catch {
        logger.warn('Invalid filters JSON, skipping filters');
      }
    }

    if (orderBys) {
      try {
        requestBody.orderBys = JSON.parse(orderBys);
      } catch {
        logger.warn('Invalid orderBys JSON, skipping orderBys');
      }
    }

    if (pageToken) {
      requestBody.offset = pageToken;
    }

    const response = await axios.post(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
      requestBody,
      { headers }
    );

    return {
      rows: response.data.rows || [],
      rowCount: response.data.rowCount || 0,
      totals: response.data.totals || [],
      nextPageToken: response.data.nextPageToken,
      report: response.data
    };
  }

  private async getUAReport(headers: any, viewId: string, startDate: string, endDate: string, metrics: string, dimensions: string, filters: string, orderBys: string, pageSize: number, pageToken?: string) {
    if (!viewId) {
      throw new Error('View ID is required for Universal Analytics reports');
    }

    const params: any = {
      ids: 'ga:' + viewId,
      'start-date': this.parseDate(startDate),
      'end-date': this.parseDate(endDate),
      metrics: metrics || 'ga:sessions',
      'max-results': pageSize
    };

    if (dimensions) {
      params.dimensions = dimensions;
    }

    if (filters) {
      params.filters = filters;
    }

    if (orderBys) {
      try {
        const orderBysObj = JSON.parse(orderBys);
        params.sort = orderBysObj.map((ob: any) => `${ob.desc ? '-' : ''}${ob.fieldName || ob.field}`).join(',');
      } catch {
        params.sort = orderBys;
      }
    }

    if (pageToken) {
      params['start-index'] = pageToken;
    }

    const response = await axios.get(
      'https://www.googleapis.com/analytics/v3/data/ga',
      { headers, params }
    );

    return {
      rows: response.data.rows || [],
      rowCount: response.data.totalResults || 0,
      totals: response.data.totalsForAllResults || {},
      nextPageToken: response.data.nextLink ? String(response.data.query['start-index'] + pageSize) : undefined,
      report: response.data
    };
  }

  private async getGA4RealtimeReport(headers: any, propertyId: string, metrics: string, dimensions: string) {
    if (!propertyId) {
      throw new Error('Property ID is required for GA4 realtime reports');
    }

    const metricsArray = metrics ? metrics.split(',').map(m => m.trim()) : ['activeUsers'];
    const dimensionsArray = dimensions ? dimensions.split(',').map(d => d.trim()) : [];

    const requestBody: any = {
      property: `properties/${propertyId}`,
      metrics: metricsArray.map(m => ({ name: m }))
    };

    if (dimensionsArray.length > 0) {
      requestBody.dimensions = dimensionsArray.map(d => ({ name: d }));
    }

    const response = await axios.post(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runRealtimeReport',
      requestBody,
      { headers }
    );

    return {
      rows: response.data.rows || [],
      rowCount: response.data.rowCount || 0,
      report: response.data
    };
  }

  private async getUARealtimeReport(headers: any, viewId: string, metrics: string, dimensions: string) {
    if (!viewId) {
      throw new Error('View ID is required for Universal Analytics realtime reports');
    }

    const params: any = {
      ids: 'ga:' + viewId,
      metrics: metrics || 'rt:activeUsers'
    };

    if (dimensions) {
      params.dimensions = dimensions;
    }

    const response = await axios.get(
      'https://www.googleapis.com/analytics/v3/data/realtime',
      { headers, params }
    );

    return {
      rows: response.data.rows || [],
      rowCount: response.data.totalResults || 0,
      report: response.data
    };
  }

  private async getAccountSummaries(headers: any) {
    const response = await axios.get(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers }
    );

    return {
      properties: response.data.accountSummaries || [],
      count: (response.data.accountSummaries || []).length
    };
  }

  private async getProperties(headers: any) {
    const response = await axios.get(
      'https://analyticsadmin.googleapis.com/v1beta/properties',
      { headers }
    );

    return {
      properties: response.data.properties || [],
      count: (response.data.properties || []).length
    };
  }

  private async getCustomDimensions(headers: any, propertyId: string) {
    const response = await axios.get(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/customDimensions`,
      { headers }
    );

    return {
      customDimensions: response.data.customDimensions || [],
      count: (response.data.customDimensions || []).length
    };
  }

  private async getCustomMetrics(headers: any, propertyId: string) {
    const response = await axios.get(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/customMetrics`,
      { headers }
    );

    return {
      customMetrics: response.data.customMetrics || [],
      count: (response.data.customMetrics || []).length
    };
  }

  private parseDate(dateStr: string): string {
    // Handle relative dates
    if (dateStr === 'today') return new Date().toISOString().split('T')[0];
    if (dateStr === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    if (dateStr.endsWith('daysAgo')) {
      const days = parseInt(dateStr.replace('daysAgo', ''));
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().split('T')[0];
    }
    // Assume it's already in YYYY-MM-DD format
    return dateStr;
  }

}
export default GoogleAnalyticsNode;

