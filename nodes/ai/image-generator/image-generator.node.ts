import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class ImageGeneratorNode {
  getNodeDefinition() {
    return {
      id: 'image-generator',
      type: 'action',
      name: 'Image Generator',
      description: 'Generate images using AI models like DALL-E, Midjourney, Stable Diffusion',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'provider',
          type: 'options',
          displayName: 'AI Provider',
          description: 'AI service to use for image generation',
          required: true,
          default: 'openai',
          options: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'OpenRouter', value: 'openrouter' },
            { name: 'Google Gemini', value: 'gemini' },
            { name: 'Replicate', value: 'replicate' },
            { name: 'Hugging Face', value: 'huggingface' },
            { name: 'Stability AI', value: 'stability' }
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
          name: 'model',
          type: 'options',
          displayName: 'Model',
          description: 'AI model to use for image generation',
          required: true,
          default: 'dall-e-3',
          options: [
            { name: 'DALL-E 2', value: 'dall-e-2' },
            { name: 'DALL-E 3', value: 'dall-e-3' },
            { name: 'DALL-E 3 HD', value: 'dall-e-3-hd' },
            { name: 'Imagen 3', value: 'imagen-3' },
            { name: 'Stable Diffusion XL', value: 'stable-diffusion-xl' },
            { name: 'Stable Diffusion', value: 'stable-diffusion' },
            { name: 'Midjourney', value: 'midjourney' },
            { name: 'Flux', value: 'flux' }
          ]
        },
        {
          name: 'size',
          type: 'options',
          displayName: 'Image Size',
          description: 'Size of generated images',
          required: true,
          default: '1024x1024',
          options: [
            { name: '256x256', value: '256x256' },
            { name: '512x512', value: '512x512' },
            { name: '1024x1024', value: '1024x1024' },
            { name: '1792x1024', value: '1792x1024' },
            { name: '1024x1792', value: '1024x1792' }
          ]
        },
        {
          name: 'quality',
          type: 'options',
          displayName: 'Quality',
          description: 'Image quality setting',
          required: true,
          default: 'standard',
          options: [
            { name: 'Standard', value: 'standard' },
            { name: 'HD', value: 'hd' }
          ]
        },
        {
          name: 'style',
          type: 'options',
          displayName: 'Style',
          description: 'Image style preference',
          required: true,
          default: 'vivid',
          options: [
            { name: 'Vivid', value: 'vivid' },
            { name: 'Natural', value: 'natural' }
          ]
        },
        {
          name: 'n',
          type: 'number',
          displayName: 'Number of Images',
          description: 'Number of images to generate',
          required: false,
          default: 1,
          min: 1,
          max: 4
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'prompt',
          type: 'string',
          displayName: 'Image Prompt',
          description: 'Text description for image generation from previous node',
          required: true,
          dataType: 'text'
        },
        {
          name: 'size',
          type: 'string',
          displayName: 'Dynamic Size',
          description: 'Image size from previous node (overrides configured size)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'quality',
          type: 'string',
          displayName: 'Dynamic Quality',
          description: 'Image quality from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'referenceImage',
          type: 'string',
          displayName: 'Reference Image',
          description: 'Reference image URL or path from previous node',
          required: false,
          dataType: 'file'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'images',
          type: 'array',
          displayName: 'Generated Images',
          description: 'Array of generated image objects',
          dataType: 'array'
        },
        {
          name: 'urls',
          type: 'array',
          displayName: 'Image URLs',
          description: 'URLs of generated images',
          dataType: 'array'
        },
        {
          name: 'revised_prompt',
          type: 'string',
          displayName: 'Revised Prompt',
          description: 'AI-revised version of the prompt',
          dataType: 'text'
        },
        {
          name: 'usage',
          type: 'object',
          displayName: 'Usage Information',
          description: 'Token usage and cost information',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          provider: { type: 'string' },
          model: { type: 'string' },
          size: { type: 'string' },
          quality: { type: 'string' },
          style: { type: 'string' },
          n: { type: 'number' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          size: { type: 'string' },
          quality: { type: 'string' },
          referenceImage: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          images: { type: 'array' },
          urls: { type: 'array' },
          revised_prompt: { type: 'string' },
          usage: { type: 'object' }
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

    
    try {
      const provider = config.provider || 'openai';
      const prompt = config.prompt || context.input?.prompt;
      let model = config.model || this.getDefaultModel(provider);
      const size = config.size || '1024x1024';
      const quality = config.quality || 'standard';
      const style = config.style || 'vivid';
      const n = config.n || 1;

      if (!prompt) {
        throw new Error('Prompt is required for image generation');
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

      logger.info('Generating image', {
        nodeId: node.id,
        provider: actualProvider,
        model,
        prompt: prompt.substring(0, 100) + '...',
        runId: context.runId
      });

      let result: any;

      switch (actualProvider) {
        case 'openai':
          result = await this.generateOpenAI({ ...config, apiKey }, prompt, model, size, quality, style, n);
          break;
        case 'openrouter':
          result = await this.generateOpenRouter({ ...config, apiKey }, prompt, model, size, quality, style, n);
          break;
        case 'gemini':
          result = await this.generateGemini({ ...config, apiKey }, prompt, model, size);
          break;
        case 'replicate':
          result = await this.generateReplicate({ ...config, apiKey }, prompt, model);
          break;
        case 'huggingface':
          result = await this.generateHuggingFace({ ...config, apiKey }, prompt, model);
          break;
        case 'stability':
          result = await this.generateStability({ ...config, apiKey }, prompt, model, size);
          break;
        default:
          throw new Error(`Unsupported image generation provider: ${actualProvider}`);
      }

      const duration = Date.now() - startTime;

      logger.externalService('ImageGenerator', provider, duration, true, {
        nodeId: node.id,
        imageCount: result.images?.length || 0,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('ImageGenerator', config.provider || 'unknown', duration, false, {
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
      case 'replicate':
        return process.env.REPLICATE_API_TOKEN || '';
      case 'huggingface':
        return process.env.HUGGINGFACE_API_KEY || '';
      case 'stability':
        return process.env.STABILITY_API_KEY || '';
      default:
        return '';
    }
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'dall-e-3';
      case 'openrouter':
        return 'openai/dall-e-3';
      case 'gemini':
        return 'imagen-3';
      case 'replicate':
        return 'stable-diffusion';
      case 'huggingface':
        return 'stable-diffusion';
      case 'stability':
        return 'stable-diffusion-xl';
      default:
        return 'dall-e-3';
    }
  }

  private async generateOpenAI(config: any, prompt: string, model: string, size: string, quality: string, style: string, n: number) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        n,
        size,
        quality,
        style
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      images: data.data,
      urls: data.data.map((img: any) => img.url),
      revised_prompt: data.data[0]?.revised_prompt,
      usage: data.usage
    };
  }

  private async generateReplicate(config: any, prompt: string, model: string) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('Replicate API token is required');
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: model,
        input: { prompt }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Replicate API error: ${errorData.detail || response.statusText}`);
    }

    const data = await response.json();
    
    // Poll for completion
    let result = data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });
      
      result = await statusResponse.json();
    }

    if (result.status === 'failed') {
      throw new Error(`Replicate generation failed: ${result.error}`);
    }

    return {
      images: result.output,
      urls: result.output,
      revised_prompt: prompt
    };
  }

  private async generateHuggingFace(config: any, prompt: string, model: string) {
    const apiKey = config.apiKey;
    
    const headers: any = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      images: data,
      urls: data,
      revised_prompt: prompt
    };
  }

  private async generateStability(config: any, prompt: string, model: string, size: string) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('Stability AI API key is required');
    }

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: parseInt(size.split('x')[1]),
        width: parseInt(size.split('x')[0]),
        samples: 1,
        steps: 30
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Stability AI error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      images: data.artifacts,
      urls: data.artifacts.map((artifact: any) => `data:image/png;base64,${artifact.base64}`),
      revised_prompt: prompt
    };
  }

  private async generateOpenRouter(config: any, prompt: string, model: string, size: string, quality: string, style: string, n: number) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // OpenRouter can route to various image generation models
    // For DALL-E models, use OpenAI's API format
    if (model.includes('dall-e')) {
      const openaiModel = model.replace('openai/', '').replace('openai-', '');
      return await this.generateOpenAI(config, prompt, openaiModel, size, quality, style, n);
    }

    // For other models, use OpenRouter's API
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
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Generate an image: ${prompt}. Size: ${size}, Quality: ${quality}, Style: ${style}`
              }
            ]
          }
        ],
        n
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      images: data.data || [],
      urls: data.data?.map((item: any) => item.url || item.b64_json) || [],
      revised_prompt: prompt,
      usage: data.usage
    };
  }

  private async generateGemini(config: any, prompt: string, model: string, size: string) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    // Google Imagen API for image generation
    const modelName = model === 'imagen-3' ? 'imagegeneration@006' : 'imagegeneration@005';
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateImages?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: {
          text: prompt
        },
        number_of_images: 1,
        aspect_ratio: this.getGeminiAspectRatio(size),
        safety_filter_level: 'block_some',
        person_generation: 'allow_all'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      images: data.generatedImages || [],
      urls: data.generatedImages?.map((img: any) => img.imageBase64 ? `data:image/png;base64,${img.imageBase64}` : img.imageUri) || [],
      revised_prompt: prompt
    };
  }

  private getGeminiAspectRatio(size: string): string {
    const [width, height] = size.split('x').map(Number);
    const ratio = width / height;
    
    if (ratio > 1.5) return '16_9';
    if (ratio > 1.2) return '4_3';
    if (ratio > 0.8) return '1_1';
    if (ratio > 0.6) return '3_4';
    return '9_16';
  }
}


export default ImageGeneratorNode;
