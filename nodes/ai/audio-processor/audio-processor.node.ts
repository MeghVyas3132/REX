import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class AudioProcessorNode {
  getNodeDefinition() {
    return {
      id: 'audio-processor',
      type: 'action',
      name: 'Audio Processor',
      description: 'Process audio with AI - Speech-to-Text, Text-to-Speech, Audio Analysis',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'provider',
          type: 'options',
          displayName: 'AI Provider',
          description: 'AI provider to use for audio processing',
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
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Audio processing operation to perform',
          required: true,
          default: 'transcribe',
          options: [
            { name: 'Speech to Text', value: 'transcribe' },
            { name: 'Text to Speech', value: 'synthesize' },
            { name: 'Audio Analysis', value: 'analyze' },
            { name: 'Audio Translation', value: 'translate' }
          ]
        },
        {
          name: 'model',
          type: 'options',
          displayName: 'Model',
          description: 'AI model to use for processing',
          required: true,
          default: 'whisper-1',
          options: [
            { name: 'Whisper-1 (Speech)', value: 'whisper-1' },
            { name: 'TTS-1 (Speech)', value: 'tts-1' },
            { name: 'TTS-1-HD (High Quality)', value: 'tts-1-hd' },
            { name: 'GPT-4o Audio', value: 'gpt-4o-audio-preview' }
          ]
        },
        {
          name: 'text',
          type: 'string',
          displayName: 'Text',
          description: 'Text to convert to speech (leave blank to use previous node output)',
          required: false,
          placeholder: 'Will fall back to previous node summary/content'
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Language',
          description: 'Audio language code (en, es, fr, etc.)',
          required: false,
          default: 'en',
          placeholder: 'en'
        },
        {
          name: 'voice',
          type: 'options',
          displayName: 'Voice (TTS)',
          description: 'Voice for text-to-speech',
          required: false,
          default: 'alloy',
          options: [
            { name: 'Alloy', value: 'alloy' },
            { name: 'Echo', value: 'echo' },
            { name: 'Fable', value: 'fable' },
            { name: 'Onyx', value: 'onyx' },
            { name: 'Nova', value: 'nova' },
            { name: 'Shimmer', value: 'shimmer' }
          ]
        },
        {
          name: 'responseFormat',
          type: 'options',
          displayName: 'Response Format',
          description: 'Format of the response',
          required: false,
          default: 'json',
          options: [
            { name: 'JSON', value: 'json' },
            { name: 'Text', value: 'text' },
            { name: 'SRT Subtitles', value: 'srt' },
            { name: 'VTT Subtitles', value: 'vtt' }
          ]
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'audioFile',
          type: 'string',
          displayName: 'Audio File',
          description: 'Audio file path or URL from previous node',
          required: false,
          dataType: 'file'
        },
        {
          name: 'text',
          type: 'string',
          displayName: 'Text Input',
          description: 'Text to convert to speech from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Dynamic Language',
          description: 'Language from previous node (overrides configured language)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'text',
          type: 'string',
          displayName: 'Transcribed Text',
          description: 'Text extracted from audio',
          dataType: 'text'
        },
        {
          name: 'audio',
          type: 'string',
          displayName: 'Generated Audio',
          description: 'Generated audio file path',
          dataType: 'file'
        },
        {
          name: 'segments',
          type: 'array',
          displayName: 'Audio Segments',
          description: 'Timestamps and segments of audio',
          dataType: 'array'
        },
        {
          name: 'confidence',
          type: 'number',
          displayName: 'Confidence Score',
          description: 'Confidence level of the processing',
          dataType: 'number'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          apiKey: { type: 'string' },
          operation: { type: 'string' },
          model: { type: 'string' },
          text: { type: 'string' },
          language: { type: 'string' },
          voice: { type: 'string' },
          responseFormat: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          audioFile: { type: 'string' },
          text: { type: 'string' },
          operation: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          audio: { type: 'string' },
          segments: { type: 'array' },
          language: { type: 'string' },
          confidence: { type: 'number' }
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
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    
    try {
      const operation = config.operation || context.input?.operation;
      let provider = config.provider || context.input?.provider;
      
      // Auto-detect provider from model if not explicitly set
      // OpenRouter models contain "/" (e.g., "openai/whisper-1")
      if (!provider) {
        const model = config.model || context.input?.model || 'whisper-1';
        if (model.includes('/')) {
          provider = 'openrouter';
          logger.info('Auto-detected OpenRouter from model', { model, nodeId: node.id });
        } else {
          provider = 'openai'; // Default
        }
      }
      
      const apiKey = this.resolveApiKey(provider, config.apiKey || context.input?.apiKey);
      const model = config.model || this.getDefaultModel(provider, operation);
      const language = config.language || 'en';
      const voice = config.voice || 'alloy';
      const responseFormat = config.responseFormat || 'json';

      if (!operation) {
        throw new Error('Operation is required for audio processing');
      }

      logger.info('Processing audio', {
        nodeId: node.id,
        operation,
        provider,
        model,
        runId: context.runId
      });

      let result: any;

      switch (operation) {
        case 'transcribe':
          result = await this.transcribeAudio(config, context, provider, model, language, responseFormat, apiKey);
          break;
        case 'synthesize':
          result = await this.synthesizeSpeech(config, context, provider, model, voice, apiKey);
          break;
        case 'analyze':
          result = await this.analyzeAudio(config, context, provider, model, apiKey);
          break;
        case 'translate':
          result = await this.translateAudio(config, context, provider, model, language, apiKey);
          break;
        default:
          throw new Error(`Unsupported audio operation: ${operation}`);
      }

      const duration = Date.now() - startTime;

      logger.externalService('AudioProcessor', operation, duration, true, {
        nodeId: node.id,
        provider,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('AudioProcessor', config.operation || 'unknown', duration, false, {
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

  private async transcribeAudio(config: any, context: ExecutionContext, provider: string, model: string, language: string, responseFormat: string, apiKey: string) {
    const audioFile = config.audioFile || context.input?.audioFile;
    if (!audioFile) {
      throw new Error('Audio file is required for transcription');
    }

    const prov = (provider || 'openai').toLowerCase();
    
    if (prov === 'openrouter') {
      return this.transcribeOpenRouter(audioFile, model, language, responseFormat, apiKey);
    } else if (prov === 'gemini') {
      // Gemini doesn't have direct audio transcription, use OpenAI via OpenRouter
      logger.warn('Gemini does not support audio transcription directly, using OpenAI via OpenRouter');
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) {
        throw new Error('OpenRouter API key is required when using Gemini (set OPENROUTER_API_KEY or provide apiKey in config)');
      }
      return this.transcribeOpenRouter(audioFile, 'openai/whisper-1', language, responseFormat, openRouterKey);
    } else {
      // Default to OpenAI
        return this.transcribeOpenAI(audioFile, model, language, responseFormat, apiKey);
    }
  }

  private async transcribeOpenAI(audioFile: string, model: string, language: string, responseFormat: string, apiKey: string) {
    // Read audio file
    const audioBuffer = await this.readAudioFile(audioFile);
    
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
    formData.append('model', model || 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', responseFormat);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenAI transcription error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.text,
      language: data.language,
      segments: data.segments || [],
      confidence: data.confidence || 1.0
    };
  }

  private async transcribeOpenRouter(audioFile: string, model: string, language: string, responseFormat: string, apiKey: string) {
    // Read audio file
    const audioBuffer = await this.readAudioFile(audioFile);
    
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
    formData.append('model', model || 'openai/whisper-1');
    formData.append('language', language);
    formData.append('response_format', responseFormat);

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://workflow-studio.com',
        'X-Title': 'Workflow Studio'
      },
      body: formData
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenRouter transcription error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.text,
      language: data.language,
      segments: data.segments || [],
      confidence: data.confidence || 1.0
    };
  }

  private async synthesizeSpeech(config: any, context: ExecutionContext, provider: string, model: string, voice: string, apiKey: string) {
    const text = this.resolveTextInput(config, context);
    if (!text) {
      throw new Error('Text is required for speech synthesis');
    }

    const prov = (provider || 'openai').toLowerCase();
    
    if (prov === 'openrouter') {
      return this.synthesizeOpenRouter(text, model, voice, apiKey);
    } else if (prov === 'gemini') {
      // Gemini doesn't have direct TTS, use OpenAI via OpenRouter
      logger.warn('Gemini does not support text-to-speech directly, using OpenAI via OpenRouter');
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) {
        throw new Error('OpenRouter API key is required when using Gemini (set OPENROUTER_API_KEY or provide apiKey in config)');
      }
      return this.synthesizeOpenRouter(text, 'openai/tts-1', voice, openRouterKey);
    } else {
      // Default to OpenAI
        return this.synthesizeOpenAI(text, model, voice, apiKey);
    }
  }

  private async synthesizeOpenAI(text: string, model: string, voice: string, apiKey: string) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'tts-1',
        input: text,
        voice,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenAI synthesis error: ${errorData?.error?.message || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audio: `data:audio/mp3;base64,${audioBase64}`,
      text,
      voice
    };
  }

  private async synthesizeOpenRouter(text: string, model: string, voice: string, apiKey: string) {
    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://workflow-studio.com',
        'X-Title': 'Workflow Studio'
      },
      body: JSON.stringify({
        model: model || 'openai/tts-1',
        input: text,
        voice,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenRouter synthesis error: ${errorData?.error?.message || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audio: `data:audio/mp3;base64,${audioBase64}`,
      text,
      voice
    };
  }

  private async synthesizeElevenLabs(text: string, voice: string) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`ElevenLabs synthesis error: ${errorData?.detail || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audio: `data:audio/mp3;base64,${audioBase64}`,
      text,
      voice
    };
  }

  private async analyzeAudio(config: any, context: ExecutionContext, provider: string, model: string, apiKey: string) {
    const audioFile = config.audioFile || context.input?.audioFile;
    if (!audioFile) {
      throw new Error('Audio file is required for analysis');
    }

    const prov = (provider || 'openai').toLowerCase();
    
    if (prov === 'openrouter') {
      return this.analyzeAudioOpenRouter(audioFile, model, apiKey);
    } else if (prov === 'gemini') {
      // Gemini doesn't have direct audio analysis, use OpenAI via OpenRouter
      logger.warn('Gemini does not support audio analysis directly, using OpenAI via OpenRouter');
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) {
        throw new Error('OpenRouter API key is required when using Gemini (set OPENROUTER_API_KEY or provide apiKey in config)');
      }
      return this.analyzeAudioOpenRouter(audioFile, 'openai/gpt-4o-audio-preview', openRouterKey);
    } else {
      // Default to OpenAI
      return this.analyzeAudioOpenAI(audioFile, model, apiKey);
    }
  }

  private async analyzeAudioOpenAI(audioFile: string, model: string, apiKey: string) {
    const audioBuffer = await this.readAudioFile(audioFile);
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-audio-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this audio and provide insights about the content, emotions, and key topics.'
              },
              {
                type: 'input_audio',
                input_audio: `data:audio/mp3;base64,${audioBase64}`
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenAI analysis error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.choices[0]?.message?.content || '',
      analysis: data.choices[0]?.message?.content || '',
      confidence: 0.9
    };
  }

  private async analyzeAudioOpenRouter(audioFile: string, model: string, apiKey: string) {
    const audioBuffer = await this.readAudioFile(audioFile);
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://workflow-studio.com',
        'X-Title': 'Workflow Studio'
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-4o-audio-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this audio and provide insights about the content, emotions, and key topics.'
              },
              {
                type: 'input_audio',
                input_audio: `data:audio/mp3;base64,${audioBase64}`
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenRouter analysis error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.choices[0]?.message?.content || '',
      analysis: data.choices[0]?.message?.content || '',
      confidence: 0.9
    };
  }

  private async translateAudio(config: any, context: ExecutionContext, provider: string, model: string, language: string, apiKey: string) {
    const audioFile = config.audioFile || context.input?.audioFile;
    if (!audioFile) {
      throw new Error('Audio file is required for translation');
    }

    const prov = (provider || 'openai').toLowerCase();
    
    if (prov === 'openrouter') {
      return this.translateAudioOpenRouter(audioFile, model, language, apiKey);
    } else if (prov === 'gemini') {
      // Gemini doesn't have direct audio translation, use OpenAI via OpenRouter
      logger.warn('Gemini does not support audio translation directly, using OpenAI via OpenRouter');
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) {
        throw new Error('OpenRouter API key is required when using Gemini (set OPENROUTER_API_KEY or provide apiKey in config)');
      }
      return this.translateAudioOpenRouter(audioFile, 'openai/whisper-1', language, openRouterKey);
    } else {
      // Default to OpenAI
      return this.translateAudioOpenAI(audioFile, model, language, apiKey);
    }
  }

  private async translateAudioOpenAI(audioFile: string, model: string, language: string, apiKey: string) {
    const audioBuffer = await this.readAudioFile(audioFile);

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
    formData.append('model', model || 'whisper-1');
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/translations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenAI translation error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.text,
      language: data.language,
      translated: true
    };
  }

  private async translateAudioOpenRouter(audioFile: string, model: string, language: string, apiKey: string) {
    const audioBuffer = await this.readAudioFile(audioFile);

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
    formData.append('model', model || 'openai/whisper-1');
    formData.append('response_format', 'json');

    const response = await fetch('https://openrouter.ai/api/v1/audio/translations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://workflow-studio.com',
        'X-Title': 'Workflow Studio'
      },
      body: formData
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => undefined);
      throw new Error(`OpenRouter translation error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.text,
      language: data.language,
      translated: true
    };
  }

  private async readAudioFile(filePath: string): Promise<Buffer> {
    // This is a simplified implementation
    // In production, you'd handle different file types and sources
    const fs = require('fs');
    return fs.readFileSync(filePath);
  }

  private async transcribeAzure(audioFile: string, language: string) {
    // Azure Speech Services implementation
    throw new Error('Azure transcription not implemented yet');
  }

  private async transcribeGoogle(audioFile: string, language: string) {
    // Google Cloud Speech-to-Text implementation
    throw new Error('Google transcription not implemented yet');
  }

  private async synthesizeAzure(text: string, voice: string) {
    // Azure Cognitive Services implementation
    throw new Error('Azure synthesis not implemented yet');
  }

  private resolveTextInput(config: any, context: ExecutionContext): string | undefined {
    const candidates: any[] = [];
    const addCandidate = (value: any) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string' && value.trim()) {
        candidates.push(value.trim());
        return;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        candidates.push(String(value));
        return;
      }
      if (Array.isArray(value)) {
        const joined = value.filter(v => typeof v === 'string').join('\n').trim();
        if (joined) candidates.push(joined);
        return;
      }
      if (typeof value === 'object') {
        const commonKeys = ['text', 'summary', 'content', 'prompt', 'message', 'output'];
        for (const key of commonKeys) {
          if ((value as any)[key]) {
            addCandidate((value as any)[key]);
          }
        }
      }
    };

    addCandidate(config.text);
    addCandidate(context.input?.text);
    addCandidate(context.input?.summary);
    addCandidate(context.input?.content);
    addCandidate(context.input?.prompt);
    addCandidate(context.input?.cleanedData);
    addCandidate((context.input as any)?.aiOutput?.content);
    addCandidate((context.input as any)?.aiOutput?.text);

    const scanObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const value of Object.values(obj)) {
        addCandidate((value as any)?.text);
        addCandidate((value as any)?.summary);
        addCandidate((value as any)?.content);
        addCandidate((value as any)?.prompt);
        addCandidate((value as any)?.message);
      }
    };

    scanObject(context.input);
    scanObject(context.nodeOutputs);

    if (!candidates.length && context.input && typeof context.input === 'object') {
      const json = JSON.stringify(context.input);
      if (json) {
        candidates.push(json);
      }
    }

    return candidates[0];
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

  private getDefaultModel(provider: string, operation: string): string {
    const prov = (provider || 'openai').toLowerCase();
    
    if (operation === 'transcribe' || operation === 'translate') {
      if (prov === 'openrouter') {
        return 'openai/whisper-1';
      }
      return 'whisper-1';
    } else if (operation === 'synthesize') {
      if (prov === 'openrouter') {
        return 'openai/tts-1';
      }
      return 'tts-1';
    } else if (operation === 'analyze') {
      if (prov === 'openrouter') {
        return 'openai/gpt-4o-audio-preview';
      }
      return 'gpt-4o-audio-preview';
    }
    
    return 'whisper-1';
  }
}

export default AudioProcessorNode;
