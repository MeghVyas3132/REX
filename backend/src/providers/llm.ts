import logger from '../utils/logger';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatGenerateParams {
  model: string;
  messages: ChatMessage[];
  apiKey?: string;
  provider?: string;
}

interface ChatGenerateResult {
  content: string;
  raw: any;
}

export function createLLMProvider() {
  async function chatGenerate({ model, messages, apiKey, provider }: ChatGenerateParams): Promise<ChatGenerateResult> {
    const isOpenRouter = provider === 'openrouter' || String(model).includes('/');
    const key = apiKey || (isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY) || '';

    logger.debug('[LLM Provider]', {
      provider: provider || 'unknown',
      isOpenRouter,
      hasProvidedApiKey: !!apiKey,
      hasEnvApiKey: !!process.env.OPENROUTER_API_KEY,
      keyLength: key.length,
      keyPrefix: key ? `${key.substring(0, 8)}...` : 'none'
    });

    if (!key) {
      const reason = isOpenRouter ? 'OPENROUTER_API_KEY' : 'OPENAI_API_KEY';
      throw new Error(`Missing API key: set ${reason} in backend .env`);
    }

    const url = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const headers: Record<string, string> = isOpenRouter
      ? {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost',
          'X-Title': process.env.OPENROUTER_TITLE || 'Workflow Studio'
        }
      : {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        };

    const requestBody = { model, messages };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(`LLM error ${response.status}: ${JSON.stringify(data)}`);
    }

    const content = data?.choices?.[0]?.message?.content || '';
    return { content, raw: data };
  }

  return { chatGenerate };
}
