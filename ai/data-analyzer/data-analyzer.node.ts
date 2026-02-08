import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class DataAnalyzerNode {
  getNodeDefinition() {
    return {
      id: 'data-analyzer',
      type: 'action',
      name: 'Data Analyzer',
      description: 'Analyze data using AI - insights, patterns, predictions, and visualizations',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'AI provider API key for data analysis',
          required: true,
          placeholder: 'sk-... or claude-...',
          credentialType: 'ai_api_key'
        },
        {
          name: 'provider',
          type: 'options',
          displayName: 'Provider',
          description: 'AI provider to use',
          required: false,
          default: 'openai',
          options: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'OpenRouter', value: 'openrouter' },
            { name: 'Gemini', value: 'gemini' }
          ]
        },
        {
          name: 'dataSource',
          type: 'options',
          displayName: 'Data Source',
          description: 'Type of data source to analyze',
          required: true,
          default: 'csv',
          options: [
            { name: 'CSV File', value: 'csv' },
            { name: 'JSON Data', value: 'json' },
            { name: 'Database', value: 'database' },
            { name: 'API Endpoint', value: 'api' }
          ]
        },
        {
          name: 'analysisType',
          type: 'options',
          displayName: 'Analysis Type',
          description: 'Type of analysis to perform',
          required: true,
          default: 'insights',
          options: [
            { name: 'Data Insights', value: 'insights' },
            { name: 'Predictions', value: 'predictions' },
            { name: 'Clustering', value: 'clustering' },
            { name: 'Classification', value: 'classification' },
            { name: 'Regression', value: 'regression' },
            { name: 'Sentiment Analysis', value: 'sentiment' }
          ]
        },
        {
          name: 'dataPath',
          type: 'string',
          displayName: 'Data Path',
          description: 'Path to data file or database connection',
          required: false,
          placeholder: '/path/to/data.csv or database://...'
        },
        {
          name: 'targetColumn',
          type: 'string',
          displayName: 'Target Column',
          description: 'Column to predict or analyze (for ML tasks)',
          required: false,
          placeholder: 'price, category, sentiment'
        },
        {
          name: 'model',
          type: 'options',
          displayName: 'AI Model',
          description: 'AI model to use for analysis',
          required: true,
          default: 'gpt-4',
          options: [
            { name: 'GPT-4', value: 'gpt-4' },
            { name: 'Claude 3', value: 'claude-3' },
            { name: 'Custom Model', value: 'custom' }
          ]
        },
        {
          name: 'includeVisualizations',
          type: 'boolean',
          displayName: 'Include Visualizations',
          description: 'Generate charts and graphs',
          required: false,
          default: true
        },
        {
          name: 'includeRecommendations',
          type: 'boolean',
          displayName: 'Include Recommendations',
          description: 'Generate actionable recommendations',
          required: false,
          default: true
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Input Data',
          description: 'Data to analyze from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'dataPath',
          type: 'string',
          displayName: 'Dynamic Data Path',
          description: 'Data path from previous node (overrides configured path)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'analysisType',
          type: 'string',
          displayName: 'Dynamic Analysis Type',
          description: 'Analysis type from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'targetColumn',
          type: 'string',
          displayName: 'Dynamic Target Column',
          description: 'Target column from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'insights',
          type: 'array',
          displayName: 'Data Insights',
          description: 'Key insights from the data analysis',
          dataType: 'array'
        },
        {
          name: 'predictions',
          type: 'array',
          displayName: 'Predictions',
          description: 'ML predictions and forecasts',
          dataType: 'array'
        },
        {
          name: 'visualizations',
          type: 'array',
          displayName: 'Charts & Graphs',
          description: 'Generated visualizations and charts',
          dataType: 'array'
        },
        {
          name: 'recommendations',
          type: 'array',
          displayName: 'Recommendations',
          description: 'Actionable recommendations based on analysis',
          dataType: 'array'
        },
        {
          name: 'summary',
          type: 'string',
          displayName: 'Analysis Summary',
          description: 'Summary of the analysis results',
          dataType: 'text'
        },
        {
          name: 'metrics',
          type: 'object',
          displayName: 'Performance Metrics',
          description: 'Statistical metrics and performance indicators',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          dataSource: { type: 'string' },
          analysisType: { type: 'string' },
          dataPath: { type: 'string' },
          targetColumn: { type: 'string' },
          model: { type: 'string' },
          includeVisualizations: { type: 'boolean' },
          includeRecommendations: { type: 'boolean' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          dataPath: { type: 'string' },
          analysisType: { type: 'string' },
          targetColumn: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          insights: { type: 'array' },
          predictions: { type: 'array' },
          visualizations: { type: 'array' },
          recommendations: { type: 'array' },
          summary: { type: 'string' },
          metrics: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    // Validation for required parameters
    if (!config.apiKey && !context.input?.apiKey) {
      throw new Error('Required parameter "apiKey" is missing');
    }
    if (!config.dataSource && !context.input?.dataSource) {
      throw new Error('Required parameter "dataSource" is missing');
    }

    
    try {
      const dataSource = config.dataSource || context.input?.dataSource;
      const analysisType = config.analysisType || context.input?.analysisType;
      const dataPath = config.dataPath || context.input?.dataPath;
      const provider = config.provider || context.input?.provider || 'openai';
      const targetColumn = config.targetColumn;
      const features = config.features || [];
      const model = config.model || 'gpt-4';
      const includeVisualizations = config.includeVisualizations || true;
      const includeRecommendations = config.includeRecommendations || true;

      if (!dataSource || !analysisType) {
        throw new Error('Data source and analysis type are required');
      }

      logger.info('Analyzing data', {
        nodeId: node.id,
        dataSource,
        analysisType,
        runId: context.runId
      });

      const { resolvedPath, candidates } = this.resolveDataPath(dataPath, context);
      const normalizedPath = this.normalizeDataPath(resolvedPath);

      if (!normalizedPath) {
        throw new Error(
          `Data path is missing. Provide a Data Path in the node configuration or connect an upstream node (e.g., File Upload) that outputs filePath/fileInfo.path. Candidates inspected: ${JSON.stringify(candidates.filter((c: any) => c !== undefined))}`
        );
      }

      // Auto-detect source from file extension if possible and fix mismatches
      const inferredSource = this.inferDataSourceFromPath(normalizedPath);
      const finalDataSource = dataSource || inferredSource;

      if (!finalDataSource) {
        throw new Error(
          `Data source is missing and could not be inferred from path ${normalizedPath}`
        );
      }

      if (dataSource && inferredSource && dataSource !== inferredSource) {
        logger.warn('Data source mismatch - overriding with inferred', {
          configured: dataSource,
          inferred: inferredSource,
          path: normalizedPath,
          nodeId: node.id,
          runId: context.runId
        });
      }

      // Load data
      const data = await this.loadData(finalDataSource, normalizedPath, context);
      
      // Perform analysis
      const result = await this.performAnalysis(data, analysisType, targetColumn, features, model, includeVisualizations, includeRecommendations, provider, config.apiKey || context.input?.apiKey);

      // Append lightweight visualizations/recommendations if requested
      if (includeVisualizations) {
        result.visualizations = this.buildVisualizations(data);
      }
      if (includeRecommendations) {
        result.recommendations = this.buildRecommendations(data, analysisType);
      }

      const duration = Date.now() - startTime;

      logger.externalService('DataAnalyzer', analysisType, duration, true, {
        nodeId: node.id,
        dataSource,
        dataSize: Array.isArray(data) ? data.length : Object.keys(data).length,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const enhancedMessage = error?.message?.includes('path')
        ? `${error.message} | resolvedPath=${dataPath || 'n/a'}`
        : error.message;
      
      logger.externalService('DataAnalyzer', config.analysisType || 'unknown', duration, false, {
        nodeId: node.id,
        error: enhancedMessage,
        runId: context.runId
      });

      return {
        success: false,
        error: enhancedMessage,
        duration
      };
    }
  }

  private async loadData(dataSource: string, dataPath: string, context: ExecutionContext): Promise<any> {
    // Validate path for file-based sources to avoid undefined/empty paths
    if ((dataSource === 'csv' || dataSource === 'json') && (!dataPath || typeof dataPath !== 'string')) {
      throw new Error(`Invalid data path for file-based source (got ${typeof dataPath})`);
    }

    if (dataSource === 'csv' || dataSource === 'json') {
      const fs = require('fs');
      const normalizedPath = dataPath.startsWith('file://') ? dataPath.replace('file://', '') : dataPath;
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`Data file not found at path: ${normalizedPath}`);
      }
      dataPath = normalizedPath;
    }

    switch (dataSource) {
      case 'csv':
        return this.loadCSV(dataPath);
      case 'json':
        return this.loadJSON(dataPath);
      case 'database':
        return this.loadFromDatabase(dataPath);
      case 'api':
        return this.loadFromAPI(dataPath);
      default:
        throw new Error(`Unsupported data source: ${dataSource}`);
    }
  }

  // Infer data source from file extension
  private inferDataSourceFromPath(dataPath?: string): string | undefined {
    if (!dataPath || typeof dataPath !== 'string') return undefined;
    const lower = dataPath.toLowerCase();
    if (lower.endsWith('.csv')) return 'csv';
    if (lower.endsWith('.json')) return 'json';
    return undefined;
  }

  // Prefer explicit config, then upstream file outputs (filePath or fileInfo.path), then any nodeOutputs path
  private resolveDataPath(dataPath: string | undefined, context: ExecutionContext): { resolvedPath?: any; candidates: any[] } {
    const candidates: Array<any> = [
      dataPath,
      context?.input?.dataPath,
      context?.input?.filePath,
      context?.input?.path,
      context?.input?.file?.path,
      context?.input?.fileInfo?.path
    ];

    // Inspect upstream outputs for common path fields
    if (context?.nodeOutputs && typeof context.nodeOutputs === 'object') {
      for (const output of Object.values(context.nodeOutputs)) {
        if (output && typeof output === 'object') {
          candidates.push((output as any).filePath);
          candidates.push((output as any).path);
          if (Array.isArray(output)) {
            for (const item of output) {
              if (item && typeof item === 'object') {
                candidates.push((item as any).filePath);
                candidates.push((item as any).path);
                if ((item as any).fileInfo) {
                  candidates.push((item as any).fileInfo.path);
                }
              }
            }
          }
          if ((output as any).fileInfo) {
            candidates.push((output as any).fileInfo.path);
          }
        }
      }
    }

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return { resolvedPath: candidate.trim(), candidates };
      }
    }
    return { resolvedPath: undefined, candidates };
  }

  // Ensure path is a trimmed string and normalize file:// prefix
  private normalizeDataPath(pathValue: any): string | undefined {
    if (typeof pathValue !== 'string') return undefined;
    const trimmed = pathValue.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('file://')) {
      return trimmed.replace('file://', '');
    }
    return trimmed;
  }

  private async loadCSV(dataPath: string): Promise<any[]> {
    if (!dataPath || typeof dataPath !== 'string') {
      throw new Error(`CSV path is invalid: ${String(dataPath)}`);
    }
    // This is a simplified implementation
    // In production, you'd use libraries like csv-parser, papaparse, etc.
    const fs = require('fs');
    const csv = require('csv-parser');
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(dataPath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private async loadJSON(dataPath: string): Promise<any> {
    if (!dataPath || typeof dataPath !== 'string') {
      throw new Error(`JSON path is invalid: ${String(dataPath)}`);
    }
    const fs = require('fs');
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  }

  private async loadFromDatabase(dataPath: string): Promise<any[]> {
    // This would connect to your database
    // For now, return mock data
    return [];
  }

  private async loadFromAPI(dataPath: string): Promise<any> {
    const response = await fetch(dataPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from API: ${response.statusText}`);
    }
    return response.json();
  }

  private async performAnalysis(
    data: any,
    analysisType: string,
    targetColumn: string,
    features: string[],
    model: string,
    includeVisualizations: boolean,
    includeRecommendations: boolean,
    provider: string,
    providedApiKey?: string
  ) {
    switch (analysisType) {
      case 'insights':
        return this.generateInsights(data, model, provider, providedApiKey);
      case 'predictions':
        return this.generatePredictions(data, targetColumn, features, model, provider, providedApiKey);
      case 'clustering':
        return this.performClustering(data, features, model, provider, providedApiKey);
      case 'classification':
        return this.performClassification(data, targetColumn, features, model, provider, providedApiKey);
      case 'regression':
        return this.performRegression(data, targetColumn, features, model, provider, providedApiKey);
      case 'sentiment':
        return this.performSentimentAnalysis(data, model, provider, providedApiKey);
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
  }

  private async generateInsights(data: any, model: string, provider: string, apiKeyFromConfig?: string) {
    const apiKey = this.resolveApiKey(provider, apiKeyFromConfig);
    const dataSummary = this.prepareDataSummary(data);
    const prompt = `You have the FULL dataset (rowCount=${dataSummary.length}). A small sample is provided for illustration along with column stats. Use the full dataset characteristics and stats below (not just the sample) to derive insights.\n\n${JSON.stringify(dataSummary, null, 2)}\n\nProvide: 1) Key patterns and trends, 2) Anomalies or outliers, 3) Business insights, 4) Recommendations for improvement. Be concise.`;
    const completion = await this.callProviderChat(provider, model, prompt, apiKey, 1500);

    const analysis = completion || '';
    
    return {
      insights: this.parseInsights(analysis),
      summary: analysis,
      metrics: this.calculateBasicMetrics(data)
    };
  }

  private async generatePredictions(data: any, targetColumn: string, features: string[], model: string, provider: string, apiKeyFromConfig?: string) {
    const apiKey = this.resolveApiKey(provider, apiKeyFromConfig);
    const dataSample = Array.isArray(data) ? data.slice(0, 10) : data;
    const prompt = `Based on this data, predict future values for ${targetColumn}:\n\n${JSON.stringify(dataSample, null, 2)}\n\nProvide predictions for the next 5 periods with confidence levels.`;

    const completion = await this.callProviderChat(provider, model, prompt, apiKey, 1000);

    const predictions = completion || '';
    
    return {
      predictions: this.parsePredictions(predictions),
      summary: predictions,
      metrics: this.calculateBasicMetrics(data)
    };
  }

  private async performClustering(data: any, features: string[], model: string, provider: string, apiKeyFromConfig?: string) {
    const apiKey = this.resolveApiKey(provider, apiKeyFromConfig);

    const dataSample = Array.isArray(data) ? data.slice(0, 20) : data;
    const prompt = `Identify clusters in this data:\n\n${JSON.stringify(dataSample, null, 2)}\n\nProvide: 1) Number of clusters, 2) Cluster characteristics, 3) Cluster members, 4) Cluster insights.`;

    const clustering = await this.callProviderChat(provider, model, prompt, apiKey, 1000) || '';
    
    return {
      clusters: this.parseClusters(clustering),
      summary: clustering,
      metrics: this.calculateBasicMetrics(data)
    };
  }

  private async performClassification(data: any, targetColumn: string, features: string[], model: string, provider: string, apiKeyFromConfig?: string) {
    const apiKey = this.resolveApiKey(provider, apiKeyFromConfig);

    const dataSample = Array.isArray(data) ? data.slice(0, 20) : data;
    const prompt = `Classify this data based on ${targetColumn}:\n\n${JSON.stringify(dataSample, null, 2)}\n\nProvide: 1) Classification rules, 2) Class predictions, 3) Confidence scores, 4) Classification insights.`;

    const classification = await this.callProviderChat(provider, model, prompt, apiKey, 1000) || '';
    
    return {
      classifications: this.parseClassifications(classification),
      summary: classification,
      metrics: this.calculateBasicMetrics(data)
    };
  }

  private async performRegression(data: any, targetColumn: string, features: string[], model: string, provider: string, apiKeyFromConfig?: string) {
    const apiKey = this.resolveApiKey(provider, apiKeyFromConfig);

    const dataSample = Array.isArray(data) ? data.slice(0, 20) : data;
    const prompt = `Perform regression analysis on this data to predict ${targetColumn}:\n\n${JSON.stringify(dataSample, null, 2)}\n\nProvide: 1) Regression equation, 2) R-squared value, 3) Predictions, 4) Regression insights.`;

    const regression = await this.callProviderChat(provider, model, prompt, apiKey, 1000) || '';
    
    return {
      regression: this.parseRegression(regression),
      summary: regression,
      metrics: this.calculateBasicMetrics(data)
    };
  }

  private async performSentimentAnalysis(data: any, model: string, provider: string, apiKeyFromConfig?: string) {
    const apiKey = this.resolveApiKey(provider, apiKeyFromConfig);

    const dataSample = Array.isArray(data) ? data.slice(0, 20) : data;
    const prompt = `Perform sentiment analysis on this data:\n\n${JSON.stringify(dataSample, null, 2)}\n\nProvide: 1) Sentiment scores, 2) Sentiment distribution, 3) Key sentiment drivers, 4) Sentiment insights.`;

    const sentiment = await this.callProviderChat(provider, model, prompt, apiKey, 1000) || '';
    
    return {
      sentiment: this.parseSentiment(sentiment),
      summary: sentiment,
      metrics: this.calculateBasicMetrics(data)
    };
  }

  // Unified chat caller for OpenAI, OpenRouter, and Gemini (basic)
  private async callProviderChat(provider: string, model: string, prompt: string, apiKey: string, maxTokens: number): Promise<string | null> {
    switch ((provider || 'openai').toLowerCase()) {
      case 'openrouter':
        return this.callOpenRouter(model || 'gpt-4o', prompt, apiKey, maxTokens);
      case 'gemini':
        return this.callGemini(model || 'gemini-1.5-flash', prompt, apiKey, maxTokens);
      case 'openai':
      default:
        return this.callOpenAI(model || 'gpt-4', prompt, apiKey, maxTokens);
    }
  }

  private async callOpenAI(model: string, prompt: string, apiKey: string, maxTokens: number): Promise<string | null> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json() as any;
    return result.choices?.[0]?.message?.content || null;
  }

  private async callOpenRouter(model: string, prompt: string, apiKey: string, maxTokens: number): Promise<string | null> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://workflow-studio.local',
        'X-Title': process.env.OPENROUTER_TITLE || 'Workflow Studio'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json() as any;
    return result.choices?.[0]?.message?.content || null;
  }

  private async callGemini(model: string, prompt: string, apiKey: string, maxTokens: number): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      })
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json() as any;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  }

  private resolveApiKey(provider: string, apiKeyFromConfig?: string): string {
    if (apiKeyFromConfig && apiKeyFromConfig.trim()) return apiKeyFromConfig.trim();
    const prov = (provider || 'openai').toLowerCase();
    if (prov === 'openrouter') {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) throw new Error('OpenRouter API key is required (set OPENROUTER_API_KEY or provide apiKey in config).');
      return key;
    }
    if (prov === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('Gemini API key is required (set GEMINI_API_KEY or provide apiKey in config).');
      return key;
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key is required (set OPENAI_API_KEY or provide apiKey in config).');
    return key;
  }

  private prepareDataSummary(data: any): any {
    if (Array.isArray(data)) {
      const sample = data.slice(0, 20);
      const columnStats = this.calculateColumnStats(data);
      return {
        type: 'array',
        length: data.length,
        sample,
        columns: Object.keys(data[0] || {}),
        summary: this.calculateBasicMetrics(data),
        columnStats
      };
    } else {
      return {
        type: 'object',
        keys: Object.keys(data),
        sample: data,
        summary: this.calculateBasicMetrics(data)
      };
    }
  }

  private calculateBasicMetrics(data: any): any {
    if (Array.isArray(data)) {
      return {
        count: data.length,
        columns: Object.keys(data[0] || {}),
        types: this.getColumnTypes(data)
      };
    } else {
      return {
        type: 'object',
        keys: Object.keys(data)
      };
    }
  }

  // Compute simple numeric/categorical stats for better prompts
  private calculateColumnStats(data: any[]): any {
    if (!Array.isArray(data) || data.length === 0) return {};
    const stats: any = {};
    const columns = Object.keys(data[0] || {});

    for (const col of columns) {
      const values = data.map(row => row?.[col]).filter(v => v !== undefined && v !== null);
      const numericVals = values
        .map(v => (typeof v === 'number' ? v : (isNaN(Number(v)) ? null : Number(v))))
        .filter((v): v is number => v !== null);

      if (numericVals.length > 0) {
        const n = numericVals.length;
        const mean = numericVals.reduce((a, b) => a + b, 0) / n;
        const min = Math.min(...numericVals);
        const max = Math.max(...numericVals);
        const variance = numericVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(variance);
        stats[col] = { type: 'number', count: n, mean, min, max, std };
      } else {
        // categorical stats: distinct values (limited)
        const distinct = Array.from(new Set(values.map(v => String(v)))).slice(0, 20);
        stats[col] = { type: 'categorical', distinctCount: distinct.length, sampleDistinct: distinct };
      }
    }

    return stats;
  }

  private buildVisualizations(data: any[]): any[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const vis: any[] = [];
    const cols = Object.keys(data[0] || {});
    const numericCols = cols.filter(c => data.some(row => !isNaN(Number(row?.[c]))));

    // Basic histogram suggestions for up to 3 numeric columns
    const histCols = numericCols.slice(0, 3);
    for (const col of histCols) {
      const values = data
        .map(r => Number(r?.[col]))
        .filter(v => !isNaN(v));
      if (values.length === 0) continue;
      vis.push({
        type: 'histogram',
        title: `${col} distribution`,
        column: col,
        sample: values.slice(0, 200) // keep payload small
      });
    }

    // Outcome bar chart if present
    if (cols.includes('Outcome')) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const v = String(row?.Outcome ?? 'unknown');
        counts[v] = (counts[v] || 0) + 1;
      }
      vis.push({
        type: 'bar',
        title: 'Outcome counts',
        column: 'Outcome',
        data: Object.entries(counts).map(([label, value]) => ({ label, value }))
      });
    }

    return vis;
  }

  private buildRecommendations(data: any[], analysisType: string): string[] {
    const recs: string[] = [];
    if (!Array.isArray(data) || data.length === 0) return recs;

    // Generic data quality recommendations
    recs.push('Ensure numeric columns are stored as numbers, not strings (e.g., Glucose, BMI, Age).');
    recs.push('Handle zero or missing values in critical columns (e.g., Insulin, BloodPressure).');

    // Analysis-specific
    if (analysisType === 'classification' || analysisType === 'predictions' || analysisType === 'regression') {
      recs.push('Scale/normalize continuous features and consider train/validation splits for robust modeling.');
    }
    if (analysisType === 'clustering') {
      recs.push('Standardize numeric features before clustering to avoid scale dominance.');
    }
    if (analysisType === 'insights') {
      recs.push('Add time stamps or cohorts to enable trend and segment analysis.');
    }

    return recs;
  }

  private getColumnTypes(data: any[]): any {
    if (data.length === 0) return {};
    
    const types: any = {};
    const firstRow = data[0];
    
    for (const key in firstRow) {
      const value = firstRow[key];
      if (typeof value === 'number') {
        types[key] = 'number';
      } else if (typeof value === 'boolean') {
        types[key] = 'boolean';
      } else if (typeof value === 'string') {
        types[key] = 'string';
      } else {
        types[key] = 'unknown';
      }
    }
    
    return types;
  }

  private parseInsights(analysis: string): string[] {
    // Parse insights from AI response
    return analysis.split('\n').filter(line => line.trim().length > 0);
  }

  private parsePredictions(predictions: string): any[] {
    // Parse predictions from AI response
    return [];
  }

  private parseClusters(clustering: string): any[] {
    // Parse clusters from AI response
    return [];
  }

  private parseClassifications(classification: string): any[] {
    // Parse classifications from AI response
    return [];
  }

  private parseRegression(regression: string): any {
    // Parse regression from AI response
    return {};
  }

  private parseSentiment(sentiment: string): any {
    // Parse sentiment from AI response
    return {};
  }}


export default DataAnalyzerNode;
