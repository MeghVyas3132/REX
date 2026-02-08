import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class HuggingFaceNode {
  getNodeDefinition() {
    return {
      id: 'huggingface',
      type: 'action',
      name: 'Hugging Face',
      description: 'Use Hugging Face models for AI inference',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'Hugging Face API Key',
          required: true,
          placeholder: 'hf_xxxxxxxxxxxx',
          credentialType: 'huggingface_api_key'
        },
        {
          name: 'model',
          type: 'string',
          displayName: 'Model',
          description: 'Hugging Face model name',
          required: true,
          placeholder: 'microsoft/DialoGPT-medium',
          default: 'microsoft/DialoGPT-medium'
        },
        {
          name: 'task',
          type: 'options',
          displayName: 'Task',
          description: 'Type of AI task to perform',
          required: true,
          default: 'text-generation',
          options: [
            { name: 'Text Generation', value: 'text-generation' },
            { name: 'Text Classification', value: 'text-classification' },
            { name: 'Sentiment Analysis', value: 'sentiment-analysis' },
            { name: 'Question Answering', value: 'question-answering' },
            { name: 'Summarization', value: 'summarization' },
            { name: 'Translation', value: 'translation' },
            { name: 'Named Entity Recognition', value: 'ner' },
            { name: 'Text to Speech', value: 'text-to-speech' },
            { name: 'Speech to Text', value: 'automatic-speech-recognition' },
            { name: 'Image Classification', value: 'image-classification' },
            { name: 'Object Detection', value: 'object-detection' },
            { name: 'Image Segmentation', value: 'image-segmentation' }
          ]
        },
        {
          name: 'input',
          type: 'string',
          displayName: 'Input',
          description: 'Input text or data for the model',
          required: true,
          placeholder: 'Hello, how are you?'
        },
        {
          name: 'maxLength',
          type: 'string',
          displayName: 'Max Length',
          description: 'Maximum length of generated text',
          required: false,
          placeholder: '100',
          default: '100'
        },
        {
          name: 'temperature',
          type: 'string',
          displayName: 'Temperature',
          description: 'Sampling temperature (0.0 to 1.0)',
          required: false,
          placeholder: '0.7',
          default: '0.7'
        },
        {
          name: 'topP',
          type: 'string',
          displayName: 'Top P',
          description: 'Nucleus sampling parameter',
          required: false,
          placeholder: '0.9',
          default: '0.9'
        },
        {
          name: 'topK',
          type: 'string',
          displayName: 'Top K',
          description: 'Top-k sampling parameter',
          required: false,
          placeholder: '50',
          default: '50'
        },
        {
          name: 'repetitionPenalty',
          type: 'string',
          displayName: 'Repetition Penalty',
          description: 'Penalty for repetition (1.0 = no penalty)',
          required: false,
          placeholder: '1.0',
          default: '1.0'
        },
        {
          name: 'context',
          type: 'string',
          displayName: 'Context',
          description: 'Context for question answering',
          required: false,
          placeholder: 'The context for the question...'
        },
        {
          name: 'question',
          type: 'string',
          displayName: 'Question',
          description: 'Question for question answering',
          required: false,
          placeholder: 'What is the main topic?'
        },
        {
          name: 'sourceLanguage',
          type: 'string',
          displayName: 'Source Language',
          description: 'Source language for translation',
          required: false,
          placeholder: 'en'
        },
        {
          name: 'targetLanguage',
          type: 'string',
          displayName: 'Target Language',
          description: 'Target language for translation',
          required: false,
          placeholder: 'es'
        }
      ],
      inputs: [
        { name: 'input', type: 'string', description: 'Input text from previous node', required: false },
        { name: 'context', type: 'string', description: 'Context from previous node', required: false },
        { name: 'question', type: 'string', description: 'Question from previous node', required: false }
      ],
      outputs: [
        { name: 'result', type: 'any', description: 'Model prediction result' },
        { name: 'confidence', type: 'number', description: 'Confidence score' },
        { name: 'model', type: 'string', description: 'Model used' },
        { name: 'task', type: 'string', description: 'Task performed' }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.apiKey && !context.input?.apiKey) {
      throw new Error('Required parameter "apiKey" is missing');
    }
    if (!config.model && !context.input?.model) {
      throw new Error('Required parameter "model" is missing');
    }
    if (!config.task && !context.input?.task) {
      throw new Error('Required parameter "task" is missing');
    }
    

    
    try {

      const { 
        apiKey, 
        model, 
        task,
        input,
        maxLength,
        temperature,
        topP,
        topK,
        repetitionPenalty,
        context,
        question,
        sourceLanguage,
        targetLanguage
      } = config;
      
      const inputText = context.input?.input || input;
      const inputContext = context.input?.context || context;
      const inputQuestion = context.input?.question || question;

      if (!apiKey) {
        throw new Error('Hugging Face API Key is required');
      }

      if (!model) {
        throw new Error('Model name is required');
      }

      if (!inputText) {
        throw new Error('Input text is required');
      }

      let result: any = {};

      switch (task) {
        case 'text-generation':
          result = await this.textGeneration(apiKey, model, inputText, maxLength, temperature, topP, topK, repetitionPenalty);
          break;
        case 'text-classification':
          result = await this.textClassification(apiKey, model, inputText);
          break;
        case 'sentiment-analysis':
          result = await this.sentimentAnalysis(apiKey, model, inputText);
          break;
        case 'question-answering':
          if (!inputContext || !inputQuestion) {
            throw new Error('Context and question are required for question answering');
          }
          result = await this.questionAnswering(apiKey, model, inputContext, inputQuestion);
          break;
        case 'summarization':
          result = await this.summarization(apiKey, model, inputText, maxLength);
          break;
        case 'translation':
          if (!sourceLanguage || !targetLanguage) {
            throw new Error('Source and target languages are required for translation');
          }
          result = await this.translation(apiKey, model, inputText, sourceLanguage, targetLanguage);
          break;
        case 'ner':
          result = await this.namedEntityRecognition(apiKey, model, inputText);
          break;
        case 'text-to-speech':
          result = await this.textToSpeech(apiKey, model, inputText);
          break;
        case 'automatic-speech-recognition':
          result = await this.speechToText(apiKey, model, inputText);
          break;
        case 'image-classification':
          result = await this.imageClassification(apiKey, model, inputText);
          break;
        case 'object-detection':
          result = await this.objectDetection(apiKey, model, inputText);
          break;
        case 'image-segmentation':
          result = await this.imageSegmentation(apiKey, model, inputText);
          break;
        default:
          throw new Error(`Unsupported Hugging Face task: ${task}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Hugging Face node executed successfully', {
        task,
        model,
        duration
      });

      return {
        success: true,
        output: {
          result: result.result || result,
          confidence: result.confidence || result.score || 0,
          model,
          task,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Hugging Face node execution failed', {
        error: error.message,
        task: config.task,
        model: config.model,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async textGeneration(apiKey: string, model: string, text: string, maxLength?: string, temperature?: string, topP?: string, topK?: string, repetitionPenalty?: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const parameters: any = {};
    if (maxLength) parameters.max_length = parseInt(maxLength);
    if (temperature) parameters.temperature = parseFloat(temperature);
    if (topP) parameters.top_p = parseFloat(topP);
    if (topK) parameters.top_k = parseInt(topK);
    if (repetitionPenalty) parameters.repetition_penalty = parseFloat(repetitionPenalty);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text,
        parameters
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async textClassification(apiKey: string, model: string, text: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sentimentAnalysis(apiKey: string, model: string, text: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async questionAnswering(apiKey: string, model: string, context: string, question: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          question: question,
          context: context
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async summarization(apiKey: string, model: string, text: string, maxLength?: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const parameters: any = {};
    if (maxLength) parameters.max_length = parseInt(maxLength);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text,
        parameters
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async translation(apiKey: string, model: string, text: string, sourceLanguage: string, targetLanguage: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          src_lang: sourceLanguage,
          tgt_lang: targetLanguage
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async namedEntityRecognition(apiKey: string, model: string, text: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async textToSpeech(apiKey: string, model: string, text: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async speechToText(apiKey: string, model: string, audioData: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: audioData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async imageClassification(apiKey: string, model: string, imageData: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: imageData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async objectDetection(apiKey: string, model: string, imageData: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: imageData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async imageSegmentation(apiKey: string, model: string, imageData: string) {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: imageData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${error}`);
    }

    return await response.json();
  }}


export default HuggingFaceNode;
