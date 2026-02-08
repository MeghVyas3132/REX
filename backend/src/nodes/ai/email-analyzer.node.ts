import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class EmailAnalyzerNode {
  getNodeDefinition() {
    return {
      id: 'email-analyzer',
      type: 'action',
      name: 'Email Analyzer',
      description: 'Analyze emails for sentiment, intent, classification, and insights',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'provider',
          type: 'options',
          displayName: 'AI Provider',
          description: 'AI provider to use for email analysis',
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
          description: 'Type of email analysis to perform',
          required: true,
          default: 'comprehensive',
          options: [
            { name: 'Sentiment Analysis', value: 'sentiment' },
            { name: 'Intent Detection', value: 'intent' },
            { name: 'Classification', value: 'classification' },
            { name: 'Priority Assessment', value: 'priority' },
            { name: 'Spam Detection', value: 'spam' },
            { name: 'Comprehensive Analysis', value: 'comprehensive' }
          ]
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
            { name: 'GPT-4o', value: 'gpt-4o' },
            { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
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
          name: 'includeKeywords',
          type: 'boolean',
          displayName: 'Extract Keywords',
          description: 'Extract key terms and phrases',
          required: false,
          default: true
        },
        {
          name: 'includeActionItems',
          type: 'boolean',
          displayName: 'Extract Action Items',
          description: 'Identify actionable items in the email',
          required: false,
          default: true
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'emailContent',
          type: 'string',
          displayName: 'Email Content',
          description: 'Email body text from previous node',
          required: true,
          dataType: 'text'
        },
        {
          name: 'senderEmail',
          type: 'string',
          displayName: 'Sender Email',
          description: 'Email sender address from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Email Subject',
          description: 'Email subject line from previous node',
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
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'sentiment',
          type: 'string',
          displayName: 'Sentiment',
          description: 'Email sentiment (positive, negative, neutral)',
          dataType: 'text'
        },
        {
          name: 'intent',
          type: 'string',
          displayName: 'Intent',
          description: 'Email intent (question, complaint, request, etc.)',
          dataType: 'text'
        },
        {
          name: 'classification',
          type: 'string',
          displayName: 'Classification',
          description: 'Email category classification',
          dataType: 'text'
        },
        {
          name: 'priority',
          type: 'string',
          displayName: 'Priority Level',
          description: 'Email priority (high, medium, low)',
          dataType: 'text'
        },
        {
          name: 'isSpam',
          type: 'boolean',
          displayName: 'Is Spam',
          description: 'Whether the email is likely spam',
          dataType: 'boolean'
        },
        {
          name: 'confidence',
          type: 'number',
          displayName: 'Confidence Score',
          description: 'Analysis confidence level',
          dataType: 'number'
        },
        {
          name: 'keywords',
          type: 'array',
          displayName: 'Keywords',
          description: 'Key terms extracted from the email',
          dataType: 'array'
        },
        {
          name: 'actionItems',
          type: 'array',
          displayName: 'Action Items',
          description: 'Actionable items identified in the email',
          dataType: 'array'
        },
        {
          name: 'summary',
          type: 'string',
          displayName: 'Analysis Summary',
          description: 'Summary of the email analysis',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          analysisType: { type: 'string' },
          model: { type: 'string' },
          includeConfidence: { type: 'boolean' },
          includeKeywords: { type: 'boolean' },
          includeActionItems: { type: 'boolean' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          emailContent: { type: 'string' },
          senderEmail: { type: 'string' },
          subject: { type: 'string' },
          analysisType: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          sentiment: { type: 'string' },
          intent: { type: 'string' },
          classification: { type: 'string' },
          priority: { type: 'string' },
          isSpam: { type: 'boolean' },
          confidence: { type: 'number' },
          keywords: { type: 'array' },
          actionItems: { type: 'array' },
          summary: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    // Validation for required parameters
    if (!config.provider && !context.input?.provider) {
      throw new Error('Required parameter "provider" is missing');
    }
    if (!config.analysisType && !context.input?.analysisType) {
      throw new Error('Required parameter "analysisType" is missing');
    }

    
    try {
      const provider = config.provider || 'openai';
      const analysisType = config.analysisType || context.input?.analysisType;
      const emailContent = config.emailContent || context.input?.emailContent;
      const senderEmail = config.senderEmail || context.input?.senderEmail;
      const subject = config.subject || context.input?.subject;
      let model = config.model || this.getDefaultModel(provider);
      const includeConfidence = config.includeConfidence !== undefined ? config.includeConfidence : true;
      const includeKeywords = config.includeKeywords !== undefined ? config.includeKeywords : true;
      const includeActionItems = config.includeActionItems !== undefined ? config.includeActionItems : true;

      if (!analysisType || !emailContent) {
        throw new Error('Analysis type and email content are required');
      }

      // Resolve API key from config or environment
      const apiKey = this.resolveApiKey(provider, config.apiKey);
      if (!apiKey) {
        throw new Error(`API key is required for ${provider}. Please provide it in the configuration or set the environment variable.`);
      }

      // Auto-detect OpenRouter if model contains '/'
      let actualProvider = provider;
      if (model.includes('/')) {
        actualProvider = 'openrouter';
        logger.info('Auto-detected OpenRouter provider from model name', { model });
      }

      logger.info('Analyzing email', {
        nodeId: node.id,
        provider: actualProvider,
        model,
        analysisType,
        senderEmail,
        runId: context.runId
      });

      // Perform analysis based on type
      const result = await this.performAnalysis(
        actualProvider,
        analysisType,
        emailContent,
        senderEmail,
        subject,
        model,
        apiKey,
        includeConfidence,
        includeKeywords,
        includeActionItems
      );

      const duration = Date.now() - startTime;

      logger.externalService('EmailAnalyzer', analysisType, duration, true, {
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
      
      logger.externalService('EmailAnalyzer', config.analysisType || 'unknown', duration, false, {
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

  private resolveApiKey(provider: string, apiKeyFromConfig?: string): string {
    if (apiKeyFromConfig && apiKeyFromConfig.trim()) {
      return apiKeyFromConfig.trim();
    }

    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY || '';
      case 'gemini':
        return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      default:
        return '';
    }
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4';
      case 'openrouter':
        return 'openai/gpt-4';
      case 'gemini':
        return 'gemini-pro';
      default:
        return 'gpt-4';
    }
  }

  private async performAnalysis(
    provider: string,
    analysisType: string,
    emailContent: string,
    senderEmail: string | undefined,
    subject: string | undefined,
    model: string,
    apiKey: string,
    includeConfidence: boolean,
    includeKeywords: boolean,
    includeActionItems: boolean
  ): Promise<any> {
    let prompt = '';
    let systemPrompt = '';

    switch (analysisType) {
      case 'sentiment':
        systemPrompt = 'You are an expert email sentiment analyzer. Analyze the emotional tone and sentiment of emails.';
        prompt = this.buildSentimentPrompt(emailContent, senderEmail, subject);
        break;
      case 'intent':
        systemPrompt = 'You are an expert email intent analyzer. Determine the primary intent and purpose of emails.';
        prompt = this.buildIntentPrompt(emailContent, senderEmail, subject);
        break;
      case 'classification':
        systemPrompt = 'You are an expert email classifier. Categorize emails into relevant business categories.';
        prompt = this.buildClassificationPrompt(emailContent, senderEmail, subject);
        break;
      case 'priority':
        systemPrompt = 'You are an expert email priority analyzer. Determine the urgency and importance of emails.';
        prompt = this.buildPriorityPrompt(emailContent, senderEmail, subject);
        break;
      case 'spam':
        systemPrompt = 'You are an expert spam detector. Identify if emails are spam or legitimate.';
        prompt = this.buildSpamPrompt(emailContent, senderEmail, subject);
        break;
      case 'comprehensive':
        systemPrompt = 'You are an expert email analyst. Provide comprehensive analysis of emails including sentiment, intent, classification, priority, and spam detection.';
        prompt = this.buildComprehensivePrompt(emailContent, senderEmail, subject);
        break;
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }

    let analysis: string;
    
    switch (provider) {
      case 'openai':
        analysis = await this.callOpenAI(apiKey, model, systemPrompt, prompt);
        break;
      case 'openrouter':
        analysis = await this.callOpenRouter(apiKey, model, systemPrompt, prompt);
        break;
      case 'gemini':
        analysis = await this.callGemini(apiKey, model, systemPrompt, prompt);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    return this.parseAnalysis(analysis, analysisType, includeConfidence, includeKeywords, includeActionItems);
  }

  private async callOpenAI(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
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
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenAI API error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callOpenRouter(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BASE_URL || 'http://localhost:3003',
        'X-Title': 'Workflow Studio'
      },
      body: JSON.stringify({
        model: model.includes('/') ? model : `openai/${model}`,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenRouter API error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callGemini(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
    const geminiModel = model.includes('gemini') ? model : 'gemini-pro';
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`Google Gemini API error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private buildSentimentPrompt(emailContent: string, senderEmail: string | undefined, subject: string | undefined): string {
    let prompt = `Analyze the sentiment of this email:\n\n`;
    if (subject) prompt += `Subject: ${subject}\n`;
    if (senderEmail) prompt += `From: ${senderEmail}\n`;
    prompt += `Content: ${emailContent}\n\n`;
    prompt += `Provide: 1) Sentiment (positive, negative, neutral), 2) Confidence score (0-1), 3) Emotional tone, 4) Key sentiment indicators.`;
    return prompt;
  }

  private buildIntentPrompt(emailContent: string, senderEmail: string | undefined, subject: string | undefined): string {
    let prompt = `Analyze the intent of this email:\n\n`;
    if (subject) prompt += `Subject: ${subject}\n`;
    if (senderEmail) prompt += `From: ${senderEmail}\n`;
    prompt += `Content: ${emailContent}\n\n`;
    prompt += `Provide: 1) Primary intent, 2) Secondary intents, 3) Intent confidence, 4) Action required.`;
    return prompt;
  }

  private buildClassificationPrompt(emailContent: string, senderEmail: string | undefined, subject: string | undefined): string {
    let prompt = `Classify this email into business categories:\n\n`;
    if (subject) prompt += `Subject: ${subject}\n`;
    if (senderEmail) prompt += `From: ${senderEmail}\n`;
    prompt += `Content: ${emailContent}\n\n`;
    prompt += `Categories: Sales, Support, Marketing, Internal, External, Urgent, Follow-up, Meeting, Invoice, Complaint, Inquiry, etc.\n\n`;
    prompt += `Provide: 1) Primary category, 2) Secondary categories, 3) Classification confidence, 4) Reasoning.`;
    return prompt;
  }

  private buildPriorityPrompt(emailContent: string, senderEmail: string | undefined, subject: string | undefined): string {
    let prompt = `Analyze the priority of this email:\n\n`;
    if (subject) prompt += `Subject: ${subject}\n`;
    if (senderEmail) prompt += `From: ${senderEmail}\n`;
    prompt += `Content: ${emailContent}\n\n`;
    prompt += `Provide: 1) Priority level (High, Medium, Low), 2) Urgency score (0-10), 3) Importance score (0-10), 4) Reasoning, 5) Recommended response time.`;
    return prompt;
  }

  private buildSpamPrompt(emailContent: string, senderEmail: string | undefined, subject: string | undefined): string {
    let prompt = `Analyze if this email is spam:\n\n`;
    if (subject) prompt += `Subject: ${subject}\n`;
    if (senderEmail) prompt += `From: ${senderEmail}\n`;
    prompt += `Content: ${emailContent}\n\n`;
    prompt += `Provide: 1) Spam probability (0-1), 2) Spam indicators, 3) Legitimacy score, 4) Risk factors.`;
    return prompt;
  }

  private buildComprehensivePrompt(emailContent: string, senderEmail: string | undefined, subject: string | undefined): string {
    let prompt = `Provide comprehensive analysis of this email:\n\n`;
    if (subject) prompt += `Subject: ${subject}\n`;
    if (senderEmail) prompt += `From: ${senderEmail}\n`;
    prompt += `Content: ${emailContent}\n\n`;
    prompt += `Analyze: 1) Sentiment and emotional tone, 2) Intent and purpose, 3) Business category, 4) Priority and urgency, 5) Spam probability, 6) Key keywords, 7) Action items, 8) Summary and recommendations.`;
    return prompt;
  }

  private parseAnalysis(analysis: string, analysisType: string, includeConfidence: boolean, includeKeywords: boolean, includeActionItems: boolean): any {
    const result: any = {};

    // Parse based on analysis type
    switch (analysisType) {
      case 'sentiment':
        result.sentiment = this.extractSentiment(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
      case 'intent':
        result.intent = this.extractIntent(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
      case 'classification':
        result.classification = this.extractClassification(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
      case 'priority':
        result.priority = this.extractPriority(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
      case 'spam':
        result.isSpam = this.extractSpam(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
      case 'comprehensive':
        result.sentiment = this.extractSentiment(analysis);
        result.intent = this.extractIntent(analysis);
        result.classification = this.extractClassification(analysis);
        result.priority = this.extractPriority(analysis);
        result.isSpam = this.extractSpam(analysis);
        if (includeConfidence) result.confidence = this.extractConfidence(analysis);
        break;
    }

    if (includeKeywords) result.keywords = this.extractKeywords(analysis);
    if (includeActionItems) result.actionItems = this.extractActionItems(analysis);
    
    result.summary = analysis;
    return result;
  }

  private extractSentiment(analysis: string): string {
    const sentimentMatch = analysis.match(/sentiment[:\s]+(positive|negative|neutral)/i);
    return sentimentMatch?.[1]?.toLowerCase() || 'neutral';
  }

  private extractIntent(analysis: string): string {
    const intentMatch = analysis.match(/intent[:\s]+(.+?)(?:\n|$)/i);
    return intentMatch?.[1]?.trim() || 'unknown';
  }

  private extractClassification(analysis: string): string {
    const classificationMatch = analysis.match(/category[:\s]+(.+?)(?:\n|$)/i);
    return classificationMatch?.[1]?.trim() || 'unknown';
  }

  private extractPriority(analysis: string): string {
    const priorityMatch = analysis.match(/priority[:\s]+(high|medium|low)/i);
    return priorityMatch?.[1]?.toLowerCase() || 'medium';
  }

  private extractSpam(analysis: string): boolean {
    const spamMatch = analysis.match(/spam[:\s]+(true|false|yes|no)/i);
    return spamMatch?.[1] ? ['true', 'yes'].includes(spamMatch[1].toLowerCase()) : false;
  }

  private extractConfidence(analysis: string): number {
    const confidenceMatch = analysis.match(/confidence[:\s]+([0-9.]+)/i);
    return confidenceMatch?.[1] ? parseFloat(confidenceMatch[1]) : 0.5;
  }

  private extractKeywords(analysis: string): string[] {
    const keywordMatch = analysis.match(/keywords?[:\s]+(.+?)(?:\n|$)/i);
    if (keywordMatch?.[1]) {
      return keywordMatch[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    return [];
  }

  private extractActionItems(analysis: string): string[] {
    const actionMatch = analysis.match(/action[:\s]+(.+?)(?:\n|$)/i);
    if (actionMatch?.[1]) {
      return actionMatch[1].split(',').map(a => a.trim()).filter(a => a.length > 0);
    }
    return [];
  }}


export default EmailAnalyzerNode;
