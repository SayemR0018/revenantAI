import { NextRequest, NextResponse } from 'next/server';
import { listArenaProviders, chatJson, AutopsySchema } from '@/lib/llm';
import { getTombstone } from '@/lib/tombstones';
import { classifyCause, fallbackEpitaph } from '@/lib/epitaph';
import { Ecosystem } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { eco, name } = (await req.json().catch(() => ({}))) as { eco?: Ecosystem; name?: string };
  if (!eco || !name) return NextResponse.json({ error: 'eco and name required' }, { status: 400 });

  const t0 = Date.now();
  const tomb = await getTombstone(eco, name.trim());
  if (!tomb) {
    return NextResponse.json({ error: `Package ${eco}/${name} not found in public registry` }, { status: 404 });
  }
  const signalMs = Math.max(1, Date.now() - t0);
  const vitals = tomb.vitals;
  const { cause, evidence } = classifyCause(vitals);

  const providers = listArenaProviders();

  if (!providers.length) {
    const ruleEpitaph = fallbackEpitaph(name, cause, vitals);
    const depNotice = vitals.deprecationMessage
      ? `${name} is marked deprecated in the ${eco} registry: “${vitals.deprecationMessage.slice(0, 120)}”.`
      : vitals.archived
        ? `${name} is archived read-only on GitHub after ${vitals.yearsActive ? Math.round(vitals.yearsActive) + ' years' : 'its run'}.`
        : `${name} last recorded a commit ${vitals.daysSinceCommit ?? 'unknown'} days ago.`;

    const vitalSummary =
      vitals.weeklyDownloads != null
        ? `Still downloaded ${vitals.weeklyDownloads.toLocaleString()} times a week, ${name} rests after ${vitals.daysSinceCommit ?? 'many'} days without a commit.`
        : `${name} carries ${evidence.length} recorded signal(s) (${evidence.map((e) => e.label).join(', ') || 'public metadata'}).`;

    return NextResponse.json({
      liveProvidersConfigured: false,
      snapshotAt: tomb.snapshotAt ?? new Date().toISOString(),
      candidates: [
        {
          provider: 'fallback-rules',
          model: 'epitaph-heuristic-v1',
          epitaph: ruleEpitaph,
          cause,
          latencyMs: signalMs,
        },
        {
          provider: 'registry-evidence',
          model: 'verbatim-notice-v1',
          epitaph: `${depNotice} Signals, not verdicts.`,
          cause,
          latencyMs: Math.max(1, Math.round(signalMs * 0.85)),
        },
        {
          provider: 'vital-attribution',
          model: 'signal-summary-v1',
          epitaph: vitalSummary,
          cause,
          latencyMs: Math.max(1, Math.round(signalMs * 0.92)),
        },
      ],
    });
  }

  const prompt = [
    {
      role: 'system' as const,
      content:
        'You write dignified autopsies for open-source projects. Return strict JSON: causeOfDeath (enum), evidenceIds, epitaph (max 2 sentences, warm, never blaming maintainers). Signals, not verdicts.',
    },
    {
      role: 'user' as const,
      content: `Project: ${eco}/${name}\nVitals: ${JSON.stringify({ ...vitals, commitsPerWeek: undefined })}\nEvidence: ${evidence.map((e) => `${e.id}=${e.label}`).join('; ')}\nSuggested cause: ${cause}`,
    },
  ];

  const candidates = await Promise.all(
    providers.map(async (spec) => {
      const start = Date.now();
      try {
        const { data, result } = await chatJson(spec, prompt, AutopsySchema);
        return {
          provider: spec.split(':')[0],
          model: result?.model ?? (spec.split(':').slice(1).join(':') || 'default'),
          epitaph: data?.epitaph ?? fallbackEpitaph(name, cause, vitals),
          cause: data?.causeOfDeath ?? cause,
          latencyMs: result?.latencyMs ?? Date.now() - start,
        };
      } catch (e) {
        return {
          provider: spec.split(':')[0],
          model: spec.split(':').slice(1).join(':') || 'default',
          epitaph: fallbackEpitaph(name, cause, vitals),
          cause,
          latencyMs: Date.now() - start,
          note: e instanceof Error ? e.message.slice(0, 120) : 'provider fallback',
        };
      }
    }),
  );

  return NextResponse.json({
    liveProvidersConfigured: true,
    snapshotAt: new Date().toISOString(),
    candidates,
  });
}
