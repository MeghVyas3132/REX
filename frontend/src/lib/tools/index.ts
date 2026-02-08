// Minimal tool registry wrapping existing executor capabilities

export interface ToolContext {
  fetch: typeof fetch;
}

export interface ToolDefinition<Args, Output> {
  name: string;
  description: string;
  validate(args: any): asserts args is Args;
  execute(ctx: ToolContext, args: Args): Promise<Output>;
}

// http-request tool
type HttpArgs = { url: string; method?: string; headers?: Record<string, string>; body?: string };
type HttpOutput = { status: number; ok: boolean; data: any };

export const HttpRequestTool: ToolDefinition<HttpArgs, HttpOutput> = {
  name: 'http-request',
  description: 'Make an HTTP request and return JSON or text',
  validate(args: any): asserts args is HttpArgs {
    if (!args || typeof args.url !== 'string') throw new Error('http-request.url required');
  },
  async execute(ctx, args) {
    const method = args.method || 'GET';
    const res = await ctx.fetch(args.url, {
      method,
      headers: args.headers,
      body: method !== 'GET' && method !== 'HEAD' ? args.body : undefined,
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, ok: res.ok, data };
  },
};

// code tool (very restricted)
type CodeArgs = { code: string; input?: any };
export const CodeTool: ToolDefinition<CodeArgs, any> = {
  name: 'code',
  description: 'Execute lightweight JavaScript on provided input and return the result',
  validate(args: any): asserts args is CodeArgs {
    if (!args || typeof args.code !== 'string') throw new Error('code.code required');
  },
  async execute(_ctx, args) {
    const safeUtils = { JSON, Number, String, Boolean, Array, Object, Math, Date };
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', 'utils', `"use strict"; ${args.code.includes('return') ? args.code : `return (async () => { ${args.code} })();`}`);
    return await fn(args.input, safeUtils);
  },
};

export const ToolRegistry = {
  tools: new Map<string, ToolDefinition<any, any>>([
    ['http-request', HttpRequestTool],
    ['code', CodeTool],
  ]),
  list() { return Array.from(this.tools.keys()); },
  get(name: string) { return this.tools.get(name); },
};

// Optional helper: route http-request via backend when credentialId is present
export async function executeHttpWithCredential(args: HttpArgs & { credentialId?: string }): Promise<HttpOutput> {
  if (args.credentialId) {
    const base = import.meta.env.VITE_BACKEND_URL || '';
    const res = await fetch(`${base}/api/tools/http-with-cred`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-workspace-id': (import.meta.env.VITE_DEFAULT_WORKSPACE_ID || 'default') },
      body: JSON.stringify({
        credentialId: args.credentialId,
        url: args.url,
        method: args.method,
        headers: args.headers,
        body: args.body,
      }),
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    const data = await res.json();
    return { status: data.status ?? 200, ok: data.ok !== false && (data.status >= 200 && data.status < 300), data: data.data };
  }
  return HttpRequestTool.execute({ fetch }, args);
}


