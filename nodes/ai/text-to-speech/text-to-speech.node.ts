import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class TextToSpeechNode {
  getNodeDefinition() {
    return {
      id: 'text-to-speech',
      type: 'action',
      name: 'Text to Speech',
      description: 'Convert text to audio using AI',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'OpenAI API key for text-to-speech',
          required: false,
          placeholder: 'sk-...',
          credentialType: 'openai_api_key'
        },
        {
          name: 'text',
          type: 'string',
          displayName: 'Text',
          description: 'Text to convert to speech',
          required: true,
          placeholder: 'Hello, this is a test.'
        },
        {
          name: 'provider',
          type: 'options',
          displayName: 'Provider',
          description: 'Text-to-speech service provider',
          required: false,
          default: 'openai',
          options: [
            { name: 'OpenAI TTS', value: 'openai' },
            { name: 'ElevenLabs', value: 'elevenlabs' },
            { name: 'Azure Speech', value: 'azure' },
            { name: 'Google Cloud TTS', value: 'google' },
            { name: 'Hugging Face', value: 'huggingface' }
          ]
        },
        {
          name: 'model',
          type: 'options',
          displayName: 'Model',
          description: 'AI model to use for synthesis',
          required: false,
          default: 'tts-1',
          options: [
            { name: 'TTS-1', value: 'tts-1' },
            { name: 'TTS-1-HD (High Quality)', value: 'tts-1-hd' }
          ]
        },
        {
          name: 'voice',
          type: 'options',
          displayName: 'Voice',
          description: 'Voice to use for speech synthesis',
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
          name: 'speed',
          type: 'number',
          displayName: 'Speed',
          description: 'Speech speed multiplier (0.25 to 4.0)',
          required: false,
          default: 1.0,
          min: 0.25,
          max: 4.0
        },
        {
          name: 'outputFormat',
          type: 'options',
          displayName: 'Output Format',
          description: 'Audio output format',
          required: false,
          default: 'mp3',
          options: [
            { name: 'MP3', value: 'mp3' },
            { name: 'Opus', value: 'opus' },
            { name: 'AAC', value: 'aac' },
            { name: 'FLAC', value: 'flac' },
            { name: 'WAV', value: 'wav' },
            { name: 'PCM', value: 'pcm' }
          ]
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Language',
          description: 'Language code (en, es, fr, etc.)',
          required: false,
          default: 'en',
          placeholder: 'en'
        },
        {
          name: 'outputPath',
          type: 'string',
          displayName: 'Output Path',
          description: 'Path to save audio file (if not provided, returns base64)',
          required: false,
          placeholder: '/path/to/output.mp3'
        }
      ],
      inputs: [
        {
          name: 'text',
          type: 'string',
          displayName: 'Text',
          description: 'Text from previous node to convert to speech',
          required: false,
          dataType: 'text'
        },
        {
          name: 'voice',
          type: 'string',
          displayName: 'Voice',
          description: 'Voice from previous node',
          required: false,
          dataType: 'text'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          text: { type: 'string' },
          provider: { type: 'string', enum: ['openai', 'elevenlabs', 'azure', 'google', 'huggingface'] },
          model: { type: 'string' },
          voice: { type: 'string' },
          speed: { type: 'number', minimum: 0.25, maximum: 4.0 },
          outputFormat: { type: 'string', enum: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'] },
          language: { type: 'string' },
          outputPath: { type: 'string' }
        },
        required: ['text']
      },
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          voice: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    try {
      const provider = config.provider || context.input?.provider || 'openai';
      const model = config.model || context.input?.model || 'tts-1';
      const voice = config.voice || context.input?.voice || 'alloy';
      const speed = config.speed || context.input?.speed || 1.0;
      const outputFormat = config.outputFormat || (config as any)?.responseFormat || 'mp3';
      const language = config.language || context.input?.language || 'en';
      const outputPath = config.outputPath;

      const text = this.resolveTextInput(config, context);
      const apiKey = this.resolveApiKey(provider, config.apiKey, context.input?.apiKey);

      if (!apiKey) {
        throw new Error(`Required parameter "apiKey" is missing for provider ${provider}`);
      }

      if (!text) {
        throw new Error('Text is required for text-to-speech');
      }

      logger.info('Synthesizing speech from text', {
        nodeId: node.id,
        provider,
        model,
        voice,
        textLength: text.length,
        runId: context.runId
      });

      let result: any;

      switch (provider) {
        case 'openai':
          result = await this.synthesizeOpenAI(text, model, voice, outputFormat, speed, apiKey);
          break;
        case 'elevenlabs':
          result = await this.synthesizeElevenLabs(text, voice, apiKey);
          break;
        case 'azure':
          result = await this.synthesizeAzure(text, voice, language, apiKey);
          break;
        case 'google':
          result = await this.synthesizeGoogle(text, voice, language, outputFormat, apiKey);
          break;
        case 'huggingface':
          result = await this.synthesizeHuggingFace(text, model, apiKey);
          break;
        default:
          throw new Error(`Unsupported synthesis provider: ${provider}`);
      }

      // Save to file if outputPath provided
      let savedPath: string | undefined;
      if (outputPath && result.audio) {
        const audioBase64 = result.audio.split(',')[1];
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const fs = require('fs');
        const path = require('path');
        
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, audioBuffer);
        savedPath = outputPath;

        logger.info('Audio file saved', {
          nodeId: node.id,
          outputPath,
          runId: context.runId
        });
      }

      const duration = Date.now() - startTime;

      logger.externalService('TextToSpeech', provider, duration, true, {
        nodeId: node.id,
        model,
        voice,
        textLength: text.length,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          ...result,
          audioPath: savedPath
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('TextToSpeech', config.provider || 'unknown', duration, false, {
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

  private async synthesizeOpenAI(
    text: string,
    model: string,
    voice: string,
    outputFormat: string,
    speed: number,
    apiKey: string
  ) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: outputFormat,
        speed
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`OpenAI synthesis error: ${errorData?.error?.message || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = `audio/${outputFormat}`;
    
    return {
      audio: `data:${mimeType};base64,${audioBase64}`,
      text,
      voice,
      format: outputFormat
    };
  }

  private async synthesizeElevenLabs(text: string, voice: string, apiKey: string) {
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
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs synthesis error: ${errorData?.detail || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audio: `data:audio/mp3;base64,${audioBase64}`,
      text,
      voice,
      format: 'mp3'
    };
  }

  private async synthesizeAzure(text: string, voice: string, language: string, apiKey: string) {
    // Azure Cognitive Services Speech synthesis implementation
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';

    // Get access token
    const tokenResponse = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        }
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Azure token error: ${tokenResponse.statusText}`);
    }

    const accessToken = await tokenResponse.text();

    // Synthesize speech
    const ssml = `<speak version='1.0' xml:lang='${language}'><voice xml:lang='${language}' name='${voice}'>${text}</voice></speak>`;
    
    const synthesisResponse = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        body: ssml
      }
    );

    if (!synthesisResponse.ok) {
      throw new Error(`Azure synthesis error: ${synthesisResponse.statusText}`);
    }

    const audioBuffer = await synthesisResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audio: `data:audio/mp3;base64,${audioBase64}`,
      text,
      voice,
      format: 'mp3'
    };
  }

  private async synthesizeGoogle(text: string, voice: string, language: string, outputFormat: string, apiKey: string) {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: language,
            name: voice
          },
          audioConfig: {
            audioEncoding: outputFormat.toUpperCase(),
            sampleRateHertz: 24000
          }
        })
      }
    );

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Google TTS error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    const audioBase64 = data.audioContent;
    const mimeType = `audio/${outputFormat}`;
    
    return {
      audio: `data:${mimeType};base64,${audioBase64}`,
      text,
      voice,
      format: outputFormat
    };
  }

  private async synthesizeHuggingFace(text: string, model: string, apiKey: string) {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model || 'microsoft/speecht5_tts'}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text
        })
      }
    );

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Hugging Face synthesis error: ${errorData?.error || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audio: `data:audio/mp3;base64,${audioBase64}`,
      text,
      voice: 'default',
      format: 'mp3'
    };
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
    addCandidate(context.input?.analysis);
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

  private resolveApiKey(provider: string, configKey?: string, inputKey?: string): string | undefined {
    const direct = configKey || inputKey;
    if (direct) return direct;

    switch ((provider || '').toLowerCase()) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'elevenlabs':
        return process.env.ELEVENLABS_API_KEY;
      case 'azure':
        return process.env.AZURE_SPEECH_KEY;
      case 'google':
        return process.env.GOOGLE_CLOUD_API_KEY;
      case 'huggingface':
        return process.env.HUGGINGFACE_API_KEY;
      default:
        return undefined;
    }
  }
}


export default TextToSpeechNode;

