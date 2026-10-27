// LLM gateway. Open-weight models only on the product path.
// Ultramarine exists strictly as a labelled closed baseline for comparisons.
// Every provider is OpenAI-compatible HTTP or a local client; chosen per task by env.
import { z } from 'zod';

export type Task = 'autopsy' | 'epitaph' | 'seance' | 'arena' | 'judge';

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage?: { prompt?: number; completion?: number };
}

interface ProviderDef {
  id: string;
  baseUrl: () => string | undefined;
  apiKey: () => string | undefined;
  model: () => string;
  closed?: boolean;
}

const PROVIDERS: Record<string, ProviderDef> = {
  'gemma-aistudio': {
    id: 'gemma-aistudio',
    baseUrl: () => 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: () => process.env.GOOGLE_API_KEY || process.env.GEMMA_API_KEY,
    model: () => process.env.GEMMA_MODEL || 'gemma-3-27b-it',
  },
  'gemma-do': {
    id: 'gemma-do',
    baseUrl: () => process.env.DO_MODEL_URL, // Gradient AI Platform serverless inference endpoint
    apiKey: () => process.env.DO_MODEL_TOKEN || process.env.DIGITALOCEAN_TOKEN,
    model: () => process.env.DO_MODEL_NAME || 'gemma-3-27b-it',
  },
  'tinker-epitaph': {
    id: 'tinker-epitaph',
    baseUrl: () => process.env.ML_SERVICE_URL && `${process.env.ML_SERVICE_URL.replace(/\/$/, '')}/tinker`,
    apiKey: () => 'local', // auth happens inside the ml service (TINKER_API_KEY)
    model: () => process.env.TINKER_EPITAPH_MODEL || 'revenant-epitaph-lora',
  },
  backboard: {
    id: 'backboard',
    baseUrl: () => process.env.BACKBOARD_BASE_URL || 'https://api.backboard.io/v1',
    apiKey: () => process.env.BACKBOARD_API_KEY,
    model: () => 'default', // backboard:<model> resolved dynamically
  },
  ollama: {
    id: 'ollama',
    baseUrl: () => process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    apiKey: () => 'ollama',
    model: () => process.env.OLLAMA_MODEL || 'gemma3:4b',
  },
  ultramarine: {
    id: 'ultramarine',
    baseUrl: () => process.env.ULTRAMARINE_BASE_URL,
    apiKey: () => process.env.ULTRAMARINE_API_KEY,
    model: () => process.env.ULTRAMARINE_MODEL || 'ultramarine',
    closed: true,
  },
};

export function resolveProvider(spec: string): ProviderDef {
  const base = spec.split(':')[0];
  const p = PROVIDERS[base];
  if (!p) throw new Error(`unknown LLM provider: ${spec}`);
  if (spec.includes(':')) {
    const model = spec.split(':').slice(1).join(':');
    return { ...p, model: () => model };
  }
  return p;
}

export function providerFor(task: Task): ProviderDef | null {
  const envKey = `LLM_${task.toUpperCase()}_PROVIDER`;
  const spec = process.env[envKey];
  const candidates = spec ? [spec] : ['gemma-aistudio', 'ollama'];
  for (const c of candidates) {
    const p = resolveProvider(c);
    if (p.baseUrl() && p.apiKey()) return p;
  }
  return null;
}

export async function chat(spec: string, messages: ChatMsg[], opts: { temperature?: number; maxTokens?: number; json?: boolean } = {}): Promise<LlmResult> {
  const p = resolveProvider(spec);
  const base = p.baseUrl();
  const key = p.apiKey();
  if (!base || !key) throw new Error(`provider ${spec} not configured`);
  const t0 = Date.now();
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: p.model(),
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${spec} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return {
    text: j.choices?.[0]?.message?.content ?? '',
    provider: p.id,
    model: p.model(),
    latencyMs: Date.now() - t0,
    usage: { prompt: j.usage?.prompt_tokens, completion: j.usage?.completion_tokens },
  };
}

/** Structured call: validate with zod, retry once on bad JSON, then return null. */
export async function chatJson<T>(spec: string, messages: ChatMsg[], schema: z.ZodType<T>): Promise<{ data: T | null; result?: LlmResult }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await chat(spec, messages, { json: true, temperature: attempt ? 0.1 : 0.4 });
      const text = r.text.replace(/^```(?:json)?\s*|\s*```$/g, '');
      const parsed = schema.safeParse(JSON.parse(text));
      if (parsed.success) return { data: parsed.data, result: r };
    } catch {
      /* retry */
    }
  }
  return { data: null };
}

export const AutopsySchema = z.object({
  causeOfDeath: z.enum([
    'maintainer_burnout',
    'superseded',
    'archived_by_author',
    'ecosystem_shift',
    'company_pulled',
    'deprecated_official',
    'slow_decay',
    'alive',
    'unknown',
  ]),
  evidenceIds: z.array(z.string()).max(6),
  epitaph: z.string().max(500),
});

export type AutopsyOutput = z.infer<typeof AutopsySchema>;

export function listArenaProviders(): string[] {
  const spec = process.env.LLM_ARENA_PROVIDERS;
  if (spec) return spec.split(',').map((s) => s.trim()).filter(Boolean);
  // default trio: AI Studio Gemma + two Backboard open-weights when keys exist
  const out: string[] = [];
  if (process.env.GOOGLE_API_KEY || process.env.GEMMA_API_KEY) out.push('gemma-aistudio');
  if (process.env.BACKBOARD_API_KEY) out.push('backboard:qwen3-8b', 'backboard:llama-3.3-70b');
  if (process.env.OLLAMA_BASE_URL || process.env.REVENANT_OFFLINE) out.push('ollama');
  return out;
}
