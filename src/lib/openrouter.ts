// Lightweight OpenRouter client for agent planning/tool calls
// Reads API key from Vite env: VITE_OPENROUTER_API_KEY

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type OpenRouterResponse = {
  text: string;
};

export interface OpenRouterOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export async function chatCompletion(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions
): Promise<OpenRouterResponse> {
  const apiKey = options.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY;
  const baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
  if (!apiKey) {
    throw new Error('OpenRouter API key missing. Set VITE_OPENROUTER_API_KEY');
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { text };
}

// Simple planner helper: require valid JSON response
export function buildPlanningSystemPrompt(availableTools: string[]): string {
  return [
    'You are a helpful agent that plans and executes tools to achieve the user goal.',
    'Always respond ONLY with a single JSON object, no prose.',
    'Schema:',
    '{"type": "plan", "tool": "<toolName>|final", "args": { /* tool args */ }, "thought": "brief reasoning"}',
    'If no tool is needed and you can answer, set tool to "final" and put the final text in args.answer.',
    `Available tools: ${availableTools.join(', ')}`,
  ].join('\n');
}


