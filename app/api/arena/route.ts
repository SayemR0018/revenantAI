import { NextRequest, NextResponse } from 'next/server';
import { listArenaProviders, chatJson, AutopsySchema } from '@/lib/llm';
import { fetchSignals } from '@/lib/pipeline';
import { classifyCause } from '@/lib/epitaph';
import { Ecosystem } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { eco, name } = (await req.json().catch(() => ({}))) as { eco?: Ecosystem; name?: string };
  if (!eco || !name) return NextResponse.json({ error: 'eco and name required' }, { status: 400 });

  const providers = listArenaProviders();
  if (!providers.length) return NextResponse.json({ candidates: [] });

  const { vitals } = await fetchSignals({ ecosystem: eco, name });
  const { cause, evidence } = classifyCause(vitals);
  const prompt = [
    { role: 'system' as const, content: 'You write dignified autopsies for open-source projects. Return strict JSON: causeOfDeath (enum), evidenceIds, epitaph (max 2 sentences, warm, never blaming maintainers). Signals, not verdicts.' },
    { role: 'user' as const, content: `Project: ${eco}/${name}\nVitals: ${JSON.stringify({ ...vitals, commitsPerWeek: undefined })}\nEvidence: ${evidence.map((e) => `${e.id}=${e.label}`).join('; ')}\nSuggested cause: ${cause}` },
  ];

  const candidates = await Promise.all(
    providers.map(async (spec) => {
      const t0 = Date.now();
      try {
        const { data, result } = await chatJson(spec, prompt, AutopsySchema);
        return {
          provider: spec.split(':')[0],
          model: result?.model ?? (spec.split(':').slice(1).join(':') || 'default'),
          epitaph: data?.epitaph ?? '(invalid output after retry)',
          cause: data?.causeOfDeath ?? 'unknown',
          latencyMs: result?.latencyMs ?? Date.now() - t0,
          error: data ? undefined : 'model failed to produce valid JSON',
        };
      } catch (e) {
        return {
          provider: spec.split(':')[0],
          model: spec.split(':').slice(1).join(':') || 'default',
          epitaph: '',
          cause: 'unknown',
          latencyMs: Date.now() - t0,
          error: e instanceof Error ? e.message.slice(0, 160) : 'failed',
        };
      }
    }),
  );
  return NextResponse.json({ candidates });
}
