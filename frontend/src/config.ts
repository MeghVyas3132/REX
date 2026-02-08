// Available models you can use
export const AVAILABLE_MODELS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.1-8b-instruct'
];

// Access OpenRouter key via Vite env at runtime (do not hardcode secrets)
export const getOpenRouterApiKey = (): string | undefined => {
  return import.meta.env.VITE_OPENROUTER_API_KEY;
};
