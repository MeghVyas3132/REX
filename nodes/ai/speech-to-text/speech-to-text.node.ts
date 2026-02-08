import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
import * as fs from 'fs';

export class SpeechToTextNode {
  getNodeDefinition() {
    return {
      id: 'speech-to-text',
      type: 'action',
      name: 'Speech to Text',
      description: 'Convert audio to text using AI',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'OpenAI API key for speech-to-text',
          required: false,
          placeholder: 'sk-...',
          credentialType: 'openai_api_key'
        },
        {
          name: 'audioFile',
          type: 'string',
          displayName: 'Audio File',
          description: 'Audio file path, URL, or base64 data',
          required: true,
          placeholder: '/path/to/audio.mp3 or data:audio/mp3;base64,...'
        },
        {
          name: 'provider',
          type: 'options',
          displayName: 'Provider',
          description: 'Speech-to-text service provider',
          required: false,
          default: 'openai',
          options: [
            { name: 'OpenAI Whisper', value: 'openai' },
            { name: 'Google Cloud Speech', value: 'google' },
            { name: 'Azure Speech', value: 'azure' },
            { name: 'Hugging Face', value: 'huggingface' }
          ]
        },
        {
          name: 'model',
          type: 'options',
          displayName: 'Model',
          description: 'AI model to use for transcription',
          required: false,
          default: 'whisper-1',
          options: [
            { name: 'Whisper-1', value: 'whisper-1' },
            { name: 'GPT-4o Audio', value: 'gpt-4o-audio-preview' }
          ]
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
          name: 'responseFormat',
          type: 'options',
          displayName: 'Response Format',
          description: 'Format of the transcription',
          required: false,
          default: 'json',
          options: [
            { name: 'JSON', value: 'json' },
            { name: 'Text', value: 'text' },
            { name: 'SRT Subtitles', value: 'srt' },
            { name: 'VTT Subtitles', value: 'vtt' }
          ]
        },
        {
          name: 'timestampGranularities',
          type: 'array',
          displayName: 'Timestamp Granularities',
          description: 'Include word-level timestamps',
          required: false,
          default: ['word']
        },
        {
          name: 'temperature',
          type: 'number',
          displayName: 'Temperature',
          description: 'Sampling temperature (0.0 to 1.0)',
          required: false,
          default: 0,
          min: 0,
          max: 1
        },
        {
          name: 'prompt',
          type: 'string',
          displayName: 'Prompt',
          description: 'Optional prompt to guide the model',
          required: false,
          placeholder: 'The following is a conversation about...'
        }
      ],
      inputs: [
        {
          name: 'audioFile',
          type: 'string',
          displayName: 'Audio File',
          description: 'Audio file from previous node (path, URL, or base64)',
          required: false,
          dataType: 'file'
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Language',
          description: 'Language code from previous node',
          required: false,
          dataType: 'text'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          audioFile: { type: 'string' },
          provider: { type: 'string', enum: ['openai', 'google', 'azure', 'huggingface'] },
          model: { type: 'string' },
          language: { type: 'string' },
          responseFormat: { type: 'string', enum: ['json', 'text', 'srt', 'vtt'] },
          timestampGranularities: { type: 'array' },
          temperature: { type: 'number', minimum: 0, maximum: 1 },
          prompt: { type: 'string' }
        },
        required: ['audioFile']
      },
      inputSchema: {
        type: 'object',
        properties: {
          audioFile: { type: 'string' },
          language: { type: 'string' }
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

    
    try {
      const audioFile = config.audioFile || context.input?.audioFile;
      const provider = config.provider || 'openai';
      const model = config.model || 'whisper-1';
      const language = config.language || context.input?.language || 'en';
      const responseFormat = config.responseFormat || 'json';
      const temperature = config.temperature || 0;
      const prompt = config.prompt;
      const apiKey = config.apiKey;

      if (!audioFile) {
        throw new Error('Audio file is required for speech-to-text');
      }

      logger.info('Transcribing audio to text', {
        nodeId: node.id,
        provider,
        model,
        language,
        runId: context.runId
      });

      let result: any;

      switch (provider) {
        case 'openai':
          result = await this.transcribeOpenAI(audioFile, model, language, responseFormat, temperature, prompt, apiKey);
          break;
        case 'google':
          result = await this.transcribeGoogle(audioFile, language);
          break;
        case 'azure':
          result = await this.transcribeAzure(audioFile, language);
          break;
        case 'huggingface':
          result = await this.transcribeHuggingFace(audioFile, model);
          break;
        default:
          throw new Error(`Unsupported transcription provider: ${provider}`);
      }

      const duration = Date.now() - startTime;

      logger.externalService('SpeechToText', provider, duration, true, {
        nodeId: node.id,
        model,
        language: result.language,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('SpeechToText', config.provider || 'unknown', duration, false, {
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

  private async readAudioFile(audioFile: string): Promise<Buffer> {
    if (audioFile.startsWith('data:audio/')) {
      // Base64 data URL
      const base64Data = audioFile.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else if (audioFile.startsWith('http://') || audioFile.startsWith('https://')) {
      // URL
      const response = await fetch(audioFile);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } else {
      // File path
      if (!fs.existsSync(audioFile)) {
        throw new Error(`Audio file not found: ${audioFile}`);
      }
      return fs.readFileSync(audioFile);
    }
  }

  private async transcribeOpenAI(
    audioFile: string,
    model: string,
    language: string,
    responseFormat: string,
    temperature: number,
    prompt?: string,
    apiKey?: string
  ) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }

    const audioBuffer = await this.readAudioFile(audioFile);
    
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
    formData.append('model', model);
    formData.append('language', language);
    formData.append('response_format', responseFormat);
    formData.append('temperature', temperature.toString());
    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`OpenAI transcription error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.text,
      language: data.language || language,
      segments: data.segments || [],
      confidence: data.confidence || 1.0
    };
  }

  private async transcribeGoogle(audioFile: string, language: string) {
    // Google Cloud Speech-to-Text implementation
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('Google Cloud API key is required');
    }

    const audioBuffer = await this.readAudioFile(audioFile);
    const audioBase64 = audioBuffer.toString('base64');

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: language,
            enableWordTimeOffsets: true
          },
          audio: {
            content: audioBase64
          }
        })
      }
    );

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Google transcription error: ${errorData?.error?.message || response.statusText}`);
    }

    const data: any = await response.json();
    const result = data.results?.[0]?.alternatives?.[0];

    return {
      text: result?.transcript || '',
      language: language,
      segments: result?.words?.map((word: any) => ({
        word: word.word,
        start: parseFloat(word.startTime.seconds) + (parseFloat(word.startTime.nanos || 0) / 1e9),
        end: parseFloat(word.endTime.seconds) + (parseFloat(word.endTime.nanos || 0) / 1e9)
      })) || [],
      confidence: result?.confidence || 1.0
    };
  }

  private async transcribeAzure(audioFile: string, language: string) {
    // Azure Cognitive Services Speech-to-Text implementation
    throw new Error('Azure transcription not implemented yet');
  }

  private async transcribeHuggingFace(audioFile: string, model: string) {
    // Hugging Face implementation
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('Hugging Face API key is required');
    }

    const audioBuffer = await this.readAudioFile(audioFile);
    const audioBase64 = audioBuffer.toString('base64');

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model || 'openai/whisper-large-v3'}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: audioBase64
        })
      }
    );

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Hugging Face transcription error: ${errorData?.error || response.statusText}`);
    }

    const data: any = await response.json();
    
    return {
      text: data.text || '',
      language: data.language || 'en',
      segments: data.segments || [],
      confidence: data.confidence || 1.0
    };
  }}


export default SpeechToTextNode;

