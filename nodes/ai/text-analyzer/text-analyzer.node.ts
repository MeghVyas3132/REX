import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../lib/logger.js';

export class TextAnalyzerNode {
  getNodeDefinition() {
    return {
      id: 'text-analyzer',
      type: 'action',
      name: 'Text Analyzer',
      description: 'Analyze text for sentiment, entities, keywords, and insights',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'provider',
          type: 'options',
          displayName: 'AI Provider',
          description: 'AI provider to use for text analysis',
          required: true,
          default: 'openai',
          options: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'OpenRouter', value: 'openrouter' },
            { name: 'Google Gemini', value: 'gemini' }
          ]
        },
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'API key for the selected AI provider',
          required: true,
          placeholder: 'Enter your API key...',
          credentialType: 'ai_api_key'
        },
        {
          name: 'analysisType',
          type: 'options',
          displayName: 'Analysis Type',
          description: 'Type of text analysis to perform',
          required: true,
          default: 'comprehensive',
          options: [
            { name: 'Sentiment Analysis', value: 'sentiment' },
            { name: 'Entity Extraction', value: 'entities' },
            { name: 'Keyword Extraction', value: 'keywords' },
            { name: 'Text Summary', value: 'summary' },
            { name: 'Comprehensive Analysis', value: 'comprehensive' }
          ]
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Language',
          description: 'Text language code (en, es, fr, etc.)',
          required: false,
          default: 'en',
          placeholder: 'en'
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
            { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
            { name: 'GPT-4o', value: 'gpt-4o' },
            { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus' },
            { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet' },
            { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku' },
            { name: 'Gemini Pro', value: 'gemini-pro' },
            { name: 'Gemini Pro 1.5', value: 'gemini-1.5-pro' }
          ]
        },
        {
          name: 'includeConfidence',
          type: 'boolean',
          displayName: 'Include Confidence Scores',
          description: 'Include confidence scores in results',
          required: false,
          default: true
        },
        {
          name: 'includeEntities',
          type: 'boolean',
          displayName: 'Extract Entities',
          description: 'Extract named entities (people, places, organizations)',
          required: false,
          default: true
        },
        {
          name: 'includeKeywords',
          type: 'boolean',
          displayName: 'Extract Keywords',
          description: 'Extract key terms and phrases',
          required: false,
          default: true
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'text',
          type: 'string',
          displayName: 'Input Text',
          description: 'Text to analyze from previous node',
          required: true,
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
          name: 'language',
          type: 'string',
          displayName: 'Dynamic Language',
          description: 'Text language from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'context',
          type: 'string',
          displayName: 'Analysis Context',
          description: 'Additional context for analysis from previous node',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'sentiment',
          type: 'string',
          displayName: 'Sentiment',
          description: 'Text sentiment (positive, negative, neutral)',
          dataType: 'text'
        },
        {
          name: 'entities',
          type: 'array',
          displayName: 'Named Entities',
          description: 'Extracted entities (people, places, organizations)',
          dataType: 'array'
        },
        {
          name: 'keywords',
          type: 'array',
          displayName: 'Keywords',
          description: 'Key terms and phrases from the text',
          dataType: 'array'
        },
        {
          name: 'summary',
          type: 'string',
          displayName: 'Text Summary',
          description: 'Summarized version of the text',
          dataType: 'text'
        },
        {
          name: 'confidence',
          type: 'number',
          displayName: 'Confidence Score',
          description: 'Analysis confidence level',
          dataType: 'number'
        },
        {
          name: 'insights',
          type: 'array',
          displayName: 'Insights',
          description: 'Key insights extracted from the text',
          dataType: 'array'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          apiKey: { type: 'string' },
          analysisType: { type: 'string' },
          language: { type: 'string' },
          model: { type: 'string' },
          includeConfidence: { type: 'boolean' },
          includeEntities: { type: 'boolean' },
          includeKeywords: { type: 'boolean' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          analysisType: { type: 'string' },
          language: { type: 'string' },
          context: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          sentiment: { type: 'string' },
          entities: { type: 'array' },
          keywords: { type: 'array' },
          summary: { type: 'string' },
          confidence: { type: 'number' },
          insights: { type: 'array' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    // Validation for required parameters
    let provider = config.provider || context.input?.provider;
    
    // Auto-detect provider from model if not explicitly set
    // OpenRouter models contain "/" (e.g., "openai/gpt-4o-mini")
    if (!provider) {
      const model = config.model || context.input?.model || 'gpt-4';
      if (model.includes('/')) {
        provider = 'openrouter';
        logger.info('Auto-detected OpenRouter from model', { model, nodeId: node.id });
      } else {
        provider = 'openai'; // Default
      }
    }
    
    // Log provider and config for debugging
    logger.info('Text Analyzer node executing', {
      nodeId: node.id,
      provider,
      model: config.model || context.input?.model,
      hasConfigProvider: !!config.provider,
      hasInputProvider: !!context.input?.provider,
      configKeys: Object.keys(config),
      runId: context.runId
    });
    
    const apiKey = this.resolveApiKey(provider, config.apiKey || context.input?.apiKey);
    
    if (!config.analysisType && !context.input?.analysisType) {
      throw new Error('Required parameter "analysisType" is missing');
    }

    
    try {
      let text = config.text || context.input?.text;
      const analysisType = config.analysisType || context.input?.analysisType;
      const language = config.language || 'en';
      const model = config.model || this.getDefaultModel(provider);
      const includeConfidence = config.includeConfidence !== false;
      const includeEntities = config.includeEntities !== false;
      const includeKeywords = config.includeKeywords !== false;

      // If text is not provided, try to extract from file
      if (!text) {
        const filePath = this.resolveFilePath(config, context);
        if (filePath) {
          logger.info('Extracting text from file', {
            nodeId: node.id,
            filePath,
            runId: context.runId
          });
          text = await this.extractTextFromFile(filePath);
        }
      }

      if (!text || !analysisType) {
        throw new Error('Text and analysis type are required');
      }

      logger.info('Analyzing text', {
        nodeId: node.id,
        analysisType,
        textLength: text.length,
        runId: context.runId
      });

      const result = await this.performAnalysis(
        text,
        analysisType,
        language,
        provider,
        model,
        apiKey,
        includeConfidence,
        includeEntities,
        includeKeywords
      );

      const duration = Date.now() - startTime;

      logger.externalService('TextAnalyzer', analysisType, duration, true, {
        nodeId: node.id,
        analysisType,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('TextAnalyzer', config.analysisType || 'unknown', duration, false, {
        nodeId: node.id,
        error: error.message,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async performAnalysis(
    text: string,
    analysisType: string,
    language: string,
    provider: string,
    model: string,
    apiKey: string,
    includeConfidence: boolean,
    includeEntities: boolean,
    includeKeywords: boolean
  ): Promise<any> {
    let prompt = '';
    let systemPrompt = '';

    switch (analysisType) {
      case 'sentiment':
        systemPrompt = 'You are an expert text sentiment analyzer. Analyze the emotional tone and sentiment of text.';
        prompt = this.buildSentimentPrompt(text, language);
        break;
      case 'entities':
        systemPrompt = 'You are an expert named entity recognition system. Extract entities from text.';
        prompt = this.buildEntitiesPrompt(text, language);
        break;
      case 'keywords':
        systemPrompt = 'You are an expert keyword extraction system. Extract key terms and phrases from text.';
        prompt = this.buildKeywordsPrompt(text, language);
        break;
      case 'summary':
        systemPrompt = 'You are an expert text summarizer. Create concise summaries of text content.';
        prompt = this.buildSummaryPrompt(text, language);
        break;
      case 'comprehensive':
        systemPrompt = 'You are an expert text analyst. Provide comprehensive analysis of text including sentiment, entities, keywords, and summary.';
        prompt = this.buildComprehensivePrompt(text, language);
        break;
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }

    const prov = (provider || 'openai').toLowerCase().trim();
    
    logger.info('Calling AI provider', {
      provider: prov,
      model,
      analysisType
    });
    
    let analysis: string;

    if (prov === 'gemini') {
      analysis = await this.callGemini(model, systemPrompt, prompt, apiKey);
    } else if (prov === 'openrouter') {
      analysis = await this.callOpenRouter(model, systemPrompt, prompt, apiKey);
    } else {
      // Default to OpenAI
      logger.warn('Provider not recognized, defaulting to OpenAI', { provider: prov });
      analysis = await this.callOpenAI(model, systemPrompt, prompt, apiKey);
    }
    
    // Log the raw analysis response for debugging
    logger.info('AI analysis response received', {
      analysisLength: analysis.length,
      analysisPreview: analysis.substring(0, 200),
      analysisType
    });
    
    const parsedResult = this.parseAnalysis(analysis, analysisType, includeConfidence, includeEntities, includeKeywords);
    
    // Log the parsed result to verify insights
    logger.info('Parsed analysis result', {
      hasInsights: !!parsedResult.insights,
      insightsCount: parsedResult.insights?.length || 0,
      insights: parsedResult.insights,
      resultKeys: Object.keys(parsedResult)
    });
    
    return parsedResult;
  }

  private async callOpenAI(model: string, systemPrompt: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callOpenRouter(model: string, systemPrompt: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost',
        'X-Title': process.env.OPENROUTER_TITLE || 'Workflow Studio'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callGemini(model: string, systemPrompt: string, prompt: string, apiKey: string): Promise<string> {
    // Combine system prompt and user prompt for Gemini
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    const geminiModel = model === 'gemini-pro' ? 'gemini-pro' : model === 'gemini-1.5-pro' ? 'gemini-1.5-pro' : 'gemini-pro';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { 
          maxOutputTokens: 1000,
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json() as any;
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private resolveApiKey(provider: string, apiKeyFromConfig?: string): string {
    if (apiKeyFromConfig && apiKeyFromConfig.trim()) {
      return apiKeyFromConfig.trim();
    }
    
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
    // Default to OpenAI
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key is required (set OPENAI_API_KEY or provide apiKey in config).');
    return key;
  }

  private getDefaultModel(provider: string): string {
    const prov = (provider || 'openai').toLowerCase();
    if (prov === 'openrouter') {
      return 'openai/gpt-4o-mini';
    }
    if (prov === 'gemini') {
      return 'gemini-pro';
    }
    return 'gpt-4';
  }

  private buildSentimentPrompt(text: string, language: string): string {
    return `Analyze the sentiment of this text in ${language}:\n\n${text}\n\nProvide your analysis in the following format:\n1. Sentiment: [positive/negative/neutral]\n2. Confidence: [0-1 score]\n3. Emotional tone: [description]\n4. Key sentiment indicators: [list]\n5. Insights: [key insights and observations, separated by commas]`;
  }

  private buildEntitiesPrompt(text: string, language: string): string {
    return `Extract entities from this text in ${language}:\n\n${text}\n\nProvide your analysis in the following format:\n1. Person names: [list]\n2. Organizations: [list]\n3. Locations: [list]\n4. Dates: [list]\n5. Other entities: [list]\n6. Insights: [key insights about the entities found, separated by commas]`;
  }

  private buildKeywordsPrompt(text: string, language: string): string {
    return `Extract keywords from this text in ${language}:\n\n${text}\n\nProvide your analysis in the following format:\n1. Top keywords: [list]\n2. Key phrases: [list]\n3. Important terms: [list]\n4. Relevance scores: [if applicable]\n5. Insights: [key insights about the keywords and their significance, separated by commas]`;
  }

  private buildSummaryPrompt(text: string, language: string): string {
    return `Summarize this text in ${language}:\n\n${text}\n\nProvide your analysis in the following format:\n1. Main points: [list]\n2. Key insights: [list of insights, separated by commas]\n3. Concise summary: [paragraph]\n4. Important details: [list]`;
  }

  private buildComprehensivePrompt(text: string, language: string): string {
    return `Provide comprehensive analysis of this text in ${language}:\n\n${text}\n\nAnalyze and provide your response in the following format:\n1. Sentiment: [positive/negative/neutral] with confidence score\n2. Emotional tone: [description]\n3. Named entities: [list of people, organizations, locations, dates]\n4. Keywords: [list of key terms and phrases]\n5. Summary: [concise summary of main points]\n6. Insights: [list of key insights, observations, and recommendations, separated by commas]\n\nMake sure to always include insights in your response.`;
  }

  private parseAnalysis(analysis: string, analysisType: string, includeConfidence: boolean, includeEntities: boolean, includeKeywords: boolean): any {
    const result: any = {};

    // Parse based on analysis type
    switch (analysisType) {
      case 'sentiment':
        result.sentiment = this.extractSentiment(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
      case 'entities':
        result.entities = this.extractEntities(analysis);
        break;
      case 'keywords':
        result.keywords = this.extractKeywords(analysis);
        break;
      case 'summary':
        result.summary = this.extractSummary(analysis);
        break;
      case 'comprehensive':
        result.sentiment = this.extractSentiment(analysis);
        if (includeEntities) result.entities = this.extractEntities(analysis);
        if (includeKeywords) result.keywords = this.extractKeywords(analysis);
        result.summary = this.extractSummary(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
    }

    // Always extract insights - ensure it's always an array with at least one item
    const extractedInsights = this.extractInsights(analysis);
    
    // Use extracted insights if we have any, otherwise generate fallback
    if (extractedInsights && Array.isArray(extractedInsights) && extractedInsights.length > 0) {
      result.insights = extractedInsights;
    } else {
      result.insights = this.generateFallbackInsights(analysis, analysisType);
    }
    
    // Final safety check - ensure insights is always a non-empty array
    if (!result.insights || !Array.isArray(result.insights) || result.insights.length === 0) {
      logger.warn('No insights found, using minimal fallback', { analysisLength: analysis.length });
      result.insights = [`Analysis completed: ${analysisType} analysis of the provided text`];
    }
    
    // Log for debugging
    logger.info('Insights extraction result', {
      extractedCount: extractedInsights?.length || 0,
      finalCount: result.insights?.length || 0,
      insightsPreview: result.insights.slice(0, 2)
    });
    
    return result;
  }

  private generateFallbackInsights(analysis: string, analysisType: string): string[] {
    // If no insights were extracted, generate some from the analysis text
    const insights: string[] = [];
    
    if (!analysis || analysis.trim().length === 0) {
      // If no analysis text, return generic insights
      return [`Text analysis completed using ${analysisType} method`];
    }
    
    // Extract key sentences that might be insights
    const sentences = analysis
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300);
    
    // Look for sentences with insight-like keywords
    const insightKeywords = ['important', 'notable', 'significant', 'key', 'noteworthy', 'reveals', 'indicates', 'suggests', 'shows', 'demonstrates', 'highlights', 'emphasizes'];
    const relevantSentences = sentences.filter(s => {
      const lower = s.toLowerCase();
      return insightKeywords.some(keyword => lower.includes(keyword));
    });
    
    if (relevantSentences.length > 0) {
      insights.push(...relevantSentences.slice(0, 3));
    } else if (sentences.length > 0) {
      // Fallback to first few substantial sentences (skip very short ones)
      const substantialSentences = sentences.filter(s => s.length > 30);
      if (substantialSentences.length > 0) {
        insights.push(...substantialSentences.slice(0, 2));
      } else {
        // Use any sentences we have
        insights.push(...sentences.slice(0, 2));
      }
    }
    
    // If still no insights, extract from the beginning of the analysis
    if (insights.length === 0) {
      const firstParagraph = analysis.split('\n\n')[0] || analysis.split('\n')[0] || analysis;
      if (firstParagraph.length > 50) {
        // Split into sentences and take first meaningful one
        const firstSentences = firstParagraph.split(/[.!?]+/).filter(s => s.trim().length > 30);
        if (firstSentences.length > 0) {
          insights.push(firstSentences[0].trim());
        } else {
          insights.push(firstParagraph.substring(0, 200).trim() + '...');
        }
      } else {
        insights.push(firstParagraph.trim());
      }
    }
    
    // Last resort: provide a generic insight based on analysis type
    if (insights.length === 0) {
      insights.push(`Text analysis completed using ${analysisType} method`);
    }
    
    logger.info('Generated fallback insights', { 
      count: insights.length,
      insights: insights.slice(0, 2)
    });
    
    return insights;
  }

  private extractSentiment(analysis: string): string {
    const sentimentMatch = analysis.match(/sentiment[:\s]+(positive|negative|neutral)/i);
    return sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral';
  }

  private extractEntities(analysis: string): any[] {
    try {
      const entitiesMatch = analysis.match(/entities[:\s]+(\[.*\])/i);
      if (entitiesMatch) {
        return JSON.parse(entitiesMatch[1]);
      }
    } catch (error) {
      // Fallback to simple extraction
    }
    return [];
  }

  private extractKeywords(analysis: string): string[] {
    const keywordMatch = analysis.match(/keywords?[:\s]+(.+?)(?:\n|$)/i);
    if (keywordMatch) {
      return keywordMatch[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    return [];
  }

  private extractSummary(analysis: string): string {
    const summaryMatch = analysis.match(/summary[:\s]+(.+?)(?:\n|$)/i);
    return summaryMatch ? summaryMatch[1].trim() : analysis;
  }

  private extractConfidence(analysis: string): number {
    const confidenceMatch = analysis.match(/confidence[:\s]+([0-9.]+)/i);
    return confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
  }

  private extractInsights(analysis: string): string[] {
    if (!analysis || typeof analysis !== 'string') {
      return [];
    }

    // Try multiple patterns to extract insights
    const patterns = [
      /insights?[:\s]+(.+?)(?:\n\n|\n\d+\.|$)/is,  // "Insights: ..." followed by new section or end
      /insights?[:\s]+(.+?)(?:\n[1-9]\.|$)/is,     // "Insights: ..." followed by numbered list or end
      /insights?[:\s]+(.+?)(?:\n[A-Z][a-z]|$)/is,  // "Insights: ..." followed by capital letter or end
      /insights?[:\s]+(.+)/is,                      // "Insights: ..." anything after
      /6\.\s*Insights?[:\s]+(.+?)(?:\n|$)/is,        // "6. Insights: ..."
      /5\.\s*Insights?[:\s]+(.+?)(?:\n|$)/is,        // "5. Insights: ..."
      /Key\s+insights?[:\s]+(.+?)(?:\n\n|\n\d+\.|$)/is, // "Key insights: ..."
    ];

    for (const pattern of patterns) {
      const match = analysis.match(pattern);
      if (match && match[1]) {
        const insightsText = match[1].trim();
        if (insightsText.length === 0) continue;
        
        // Split by commas, semicolons, newlines with bullets, or just newlines
        let insights = insightsText
          .split(/[,;]\s*(?=[A-Z])|\n(?=\s*[-•*])|\n(?=\d+\.)/)
          .map(i => i.trim())
          .filter(i => {
            const trimmed = i.trim();
            return trimmed.length > 5 && 
                   !trimmed.match(/^\d+\.?\s*$/) && // Not just a number
                   !trimmed.match(/^[-•*]\s*$/); // Not just a bullet
          });
        
        // If splitting didn't work well, try splitting by commas/semicolons
        if (insights.length <= 1 && insightsText.includes(',')) {
          insights = insightsText
            .split(/[,;]/)
            .map(i => i.trim())
            .filter(i => i.length > 5);
        }
        
        if (insights.length > 0) {
          logger.info('Extracted insights using pattern', { 
            pattern: pattern.toString(), 
            count: insights.length,
            insights: insights.slice(0, 3)
          });
          return insights.slice(0, 10); // Limit to 10 insights
        }
      }
    }

    // Fallback: If no insights found, try to extract key points from the entire analysis
    // Look for bullet points or numbered lists that might contain insights
    const bulletPoints = analysis.match(/(?:[-•*]\s+|^\d+\.\s+)(.+?)(?:\n|$)/gm);
    if (bulletPoints && bulletPoints.length > 0) {
      const extracted = bulletPoints
        .map(bp => bp.replace(/^[-•*]\s+|^\d+\.\s+/, '').trim())
        .filter(bp => bp.length > 10 && bp.length < 300) // Only include substantial insights
        .slice(0, 5); // Limit to top 5
      
      if (extracted.length > 0) {
        logger.info('Extracted insights from bullet points', { count: extracted.length });
        return extracted;
      }
    }

    // Last resort: Extract sentences that might be insights (longer sentences with key words)
    const sentences = analysis.split(/[.!?]+/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 20 && 
             trimmed.length < 200 &&
             (trimmed.toLowerCase().includes('important') ||
              trimmed.toLowerCase().includes('key') ||
              trimmed.toLowerCase().includes('notable') ||
              trimmed.toLowerCase().includes('significant') ||
              trimmed.toLowerCase().includes('reveals') ||
              trimmed.toLowerCase().includes('indicates'));
    });

    if (sentences.length > 0) {
      logger.info('Extracted insights from sentences', { count: sentences.length });
      return sentences.slice(0, 3).map(s => s.trim());
    }

    return [];
  }

  /**
   * Resolve file path from various sources in context
   */
  private resolveFilePath(config: any, context: ExecutionContext): string | null {
    // Check config first
    if (config.filePath) {
      return config.filePath;
    }

    // Check context.input directly
    if (context.input?.filePath) {
      return context.input.filePath;
    }

    // Check fileInfo.path
    if (context.input?.fileInfo?.path) {
      return context.input.fileInfo.path;
    }

    // Check nodeOutputs for filePath from previous nodes (like File Upload)
    if (context.nodeOutputs && typeof context.nodeOutputs === 'object') {
      for (const output of Object.values(context.nodeOutputs)) {
        if (output && typeof output === 'object') {
          // Check direct filePath
          if ((output as any).filePath && typeof (output as any).filePath === 'string') {
            return (output as any).filePath;
          }
          // Check fileInfo.path
          if ((output as any).fileInfo?.path && typeof (output as any).fileInfo.path === 'string') {
            return (output as any).fileInfo.path;
          }
        }
      }
    }

    // Check context.input for nested node outputs (workflow engine may pass as context.input[nodeId])
    if (context.input) {
      for (const key of Object.keys(context.input)) {
        const value = context.input[key];
        if (value && typeof value === 'object') {
          if ((value as any).filePath && typeof (value as any).filePath === 'string') {
            return (value as any).filePath;
          }
          if ((value as any).fileInfo?.path && typeof (value as any).fileInfo.path === 'string') {
            return (value as any).fileInfo.path;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract text from file based on file extension
   */
  private async extractTextFromFile(filePath: string): Promise<string> {
    try {
      // Check if file exists
      await fs.access(filePath);
      
      const ext = path.extname(filePath).toLowerCase();
      
      switch (ext) {
        case '.pdf':
          return await this.extractTextFromPDF(filePath);
        case '.txt':
          return await this.extractTextFromTxt(filePath);
        case '.json':
          return await this.extractTextFromJSON(filePath);
        default:
          // For unknown file types, try to read as text
          logger.warn('Unknown file type, attempting to read as text', { filePath, ext });
          return await this.extractTextFromTxt(filePath);
      }
    } catch (error: any) {
      throw new Error(`Failed to extract text from file: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error: any) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from TXT file
   */
  private async extractTextFromTxt(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      throw new Error(`Failed to extract text from TXT file: ${error.message}`);
    }
  }

  /**
   * Extract text from JSON file (convert to readable text)
   */
  private async extractTextFromJSON(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(content);
      // Convert JSON to readable text format
      return JSON.stringify(json, null, 2);
    } catch (error: any) {
      throw new Error(`Failed to extract text from JSON file: ${error.message}`);
    }
  }
}


export default TextAnalyzerNode;
