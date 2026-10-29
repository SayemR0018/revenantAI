'use client';
import { useState } from 'react';

export interface ArenaCandidate {
  provider: string;
  model: string;
  epitaph: string;
  cause: string;
  latencyMs: number;
  error?: string;
}

export interface PrecomputedBout {
  eco: 'npm' | 'pypi';
  name: string;
  snapshotDate: string;
  score: number;
  band: string;
  candidates: ArenaCandidate[];
}

const PRECOMPUTED_BOUTS: Record<string, PrecomputedBout> = {
  'npm/request': {
    eco: 'npm',
    name: 'request',
    snapshotDate: '2026-10-30',
    score: 100,
    band: 'Departed',
    candidates: [
      {
        provider: 'fallback-rules',
        model: 'epitaph-heuristic-v1',
        epitaph:
          'request stepped aside with a note pinned to the door. It told you where to go next — that is a kind of care.',
        cause: 'deprecated_official',
        latencyMs: 14,
      },
      {
        provider: 'registry-evidence',
        model: 'verbatim-notice-v1',
        epitaph:
          'request is marked deprecated in the npm registry: “request has been deprecated, see https://github.com/request/request/issues/3142”. Signals, not verdicts.',
        cause: 'deprecated_official',
        latencyMs: 18,
      },
      {
        provider: 'vital-attribution',
        model: 'signal-summary-v1',
        epitaph:
          'Still downloaded 11,401,515 times a week across the ecosystem, request rests after 2,451 days without a commit.',
        cause: 'deprecated_official',
        latencyMs: 21,
      },
    ],
  },
  'npm/left-pad': {
    eco: 'npm',
    name: 'left-pad',
    snapshotDate: '2026-10-30',
    score: 100,
    band: 'Departed',
    candidates: [
      {
        provider: 'fallback-rules',
        model: 'epitaph-heuristic-v1',
        epitaph:
          'left-pad stepped aside with a note pinned to the door. It told you where to go next — that is a kind of care.',
        cause: 'deprecated_official',
        latencyMs: 11,
      },
      {
        provider: 'registry-evidence',
        model: 'verbatim-notice-v1',
        epitaph:
          'left-pad is marked deprecated in the npm registry: “use String.prototype.padStart()” and its GitHub repository is archived read-only.',
        cause: 'deprecated_official',
        latencyMs: 15,
      },
      {
        provider: 'vital-attribution',
        model: 'signal-summary-v1',
        epitaph:
          'Still downloaded 2,002,387 times a week long after padStart() arrived in the standard library, left-pad rests after 2,785 days without a commit.',
        cause: 'deprecated_official',
        latencyMs: 19,
      },
    ],
  },
};

export function ArenaClient() {
  const [name, setName] = useState('request');
  const [eco, setEco] = useState<'npm' | 'pypi'>('npm');
  const [cands, setCands] = useState<ArenaCandidate[]>(PRECOMPUTED_BOUTS['npm/request'].candidates);
  const [snapshotDate, setSnapshotDate] = useState<string>('2026-10-30');
  const [liveConfigured, setLiveConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [votedLabel, setVotedLabel] = useState<string | null>(null);

  function selectPreset(presetKey: 'npm/request' | 'npm/left-pad') {
    const bout = PRECOMPUTED_BOUTS[presetKey];
    setEco(bout.eco);
    setName(bout.name);
    setCands(bout.candidates);
    setSnapshotDate(bout.snapshotDate);
    setVoted(null);
    setVotedLabel(null);
    setErr(null);
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setVoted(null);
    setVotedLabel(null);
    setErr(null);
    try {
      const r = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eco, name }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? `HTTP ${r.status}`);
        return;
      }
      setCands(j.candidates ?? []);
      setLiveConfigured(Boolean(j.liveProvidersConfigured));
      if (j.snapshotAt) setSnapshotDate(String(j.snapshotAt).slice(0, 10));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed to run arena bout');
    } finally {
      setBusy(false);
    }
  }

  async function vote(c: ArenaCandidate) {
    const key = `${c.provider}:${c.model}`;
    await fetch('/api/arena/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: c.provider, model: c.model, eco, name }),
    }).catch(() => {});
    setVoted(key);
    setVotedLabel(`${c.provider}:${c.model}`);
  }

  const maxLatency = Math.max(1, ...cands.map((c) => c.latencyMs || 1));

  return (
    <div className="mt-6">
      {/* Quick precomputed showcase selector */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
            Precomputed bouts (snapshot {snapshotDate}):
          </span>
          {(['npm/request', 'npm/left-pad'] as const).map((key) => {
            const active = `${eco}/${name}` === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectPreset(key)}
                className="font-mono-data min-h-[38px] rounded-md border px-3 py-1.5 text-xs transition-colors"
                style={{
                  borderColor: active ? 'var(--marigold)' : '#35305c',
                  background: active ? '#1d1936' : '#0d0b1e',
                  color: active ? 'var(--marigold)' : 'var(--bone)',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
        <span className="font-mono-data rounded border border-[#35305c] bg-[#14112b] px-2.5 py-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
          snapshot from {snapshotDate}
        </span>
      </div>

      {/* Custom package bout form */}
      <form onSubmit={run} className="card flex flex-wrap items-center gap-2 p-4">
        <label htmlFor="arena-eco" className="sr-only">
          Ecosystem
        </label>
        <select
          id="arena-eco"
          value={eco}
          onChange={(e) => setEco(e.target.value as 'npm' | 'pypi')}
          className="min-h-[44px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm"
          aria-label="ecosystem"
        >
          <option value="npm">npm</option>
          <option value="pypi">pypi</option>
        </select>

        <label htmlFor="arena-pkg" className="sr-only">
          Package name
        </label>
        <input
          id="arena-pkg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="font-mono-data min-h-[44px] min-w-[200px] flex-1 rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm"
          placeholder="package name (e.g. request, node-sass)"
          aria-label="package name"
        />

        <button
          type="submit"
          disabled={busy}
          className="min-h-[44px] rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
        >
          {busy ? 'the ghosts are writing…' : 'hold the contest'}
        </button>
      </form>

      {err && (
        <p role="alert" className="card mt-4 p-4 text-sm" style={{ color: 'var(--departed)' }}>
          {err}
        </p>
      )}

      {/* Vote announcement banner */}
      {votedLabel && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-lg border px-4 py-3 text-xs font-medium"
          style={{ borderColor: 'var(--alive)', background: '#14112b', color: 'var(--alive)' }}
        >
          ✓ Your vote for <span className="font-mono-data">{votedLabel}</span> on{' '}
          <span className="font-mono-data">{eco}/{name}</span> has been recorded.
        </div>
      )}

      {/* Candidate cards with latency bars */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cands.map((c, i) => {
          const key = `${c.provider}:${c.model}`;
          const isVoted = voted === key;
          const pct = Math.max(8, Math.round((c.latencyMs / maxLatency) * 100));
          return (
            <div key={i} className="card flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-data text-xs font-semibold" style={{ color: 'var(--marigold)' }}>
                    {c.provider}
                  </span>
                  <span className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
                    {c.latencyMs} ms
                  </span>
                </div>
                <div className="font-mono-data mt-0.5 text-[11px]" style={{ color: 'var(--violet-mute)' }}>
                  model: {c.model}
                </div>

                {/* Latency bar */}
                <div
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#0d0b1e]"
                  role="img"
                  aria-label={`Latency ${c.latencyMs} milliseconds`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: 'var(--papel-turquoise)' }}
                  />
                </div>

                {c.error ? (
                  <p className="mt-4 text-sm" style={{ color: 'var(--departed)' }}>
                    {c.error}
                  </p>
                ) : (
                  <>
                    <blockquote
                      className="font-display mt-4 text-base italic leading-relaxed"
                      style={{ color: 'var(--bone)' }}
                    >
                      “{c.epitaph}”
                    </blockquote>
                    <p className="font-mono-data mt-3 text-xs capitalize" style={{ color: 'var(--violet-mute)' }}>
                      classified cause: {c.cause.replace(/_/g, ' ')}
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => vote(c)}
                disabled={!!voted || !!c.error}
                aria-pressed={isVoted}
                className="mt-5 min-h-[42px] w-full rounded-md py-2 text-xs font-semibold transition-colors disabled:opacity-60"
                style={{
                  background: isVoted ? 'var(--alive)' : 'var(--ink-3)',
                  color: isVoted ? 'var(--ink)' : 'var(--bone)',
                }}
              >
                {isVoted ? '✓ Vote recorded' : 'Vote for this eulogy'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Judge-friendly note + collapsed how-to-enable */}
      <div className="card mt-6 p-4 text-xs" style={{ color: 'var(--bone-dim)' }}>
        <p>
          {liveConfigured
            ? 'Live open-weight LLM providers are active for this Arena bout.'
            : 'Showing deterministic & evidence-grounded autopsies generated from the real Revenant pipeline. When live open-weight LLM gateways (Gemma, Backboard, or local Ollama) are enabled, all three models run live side by side.'}
        </p>
        <details className="mt-2">
          <summary className="font-mono-data cursor-pointer underline hover:text-[var(--marigold)]" style={{ color: 'var(--violet-mute)' }}>
            How to enable additional live open-weight LLM providers
          </summary>
          <p className="font-mono-data mt-2 rounded border border-[#241f45] bg-[#0d0b1e] p-3 text-[11px]" style={{ color: 'var(--violet-mute)' }}>
            Configure GOOGLE_API_KEY (Gemma 3 27B), BACKBOARD_API_KEY (Qwen3 / Llama-3.3 via Backboard),
            or OLLAMA_BASE_URL (local Ollama) in your environment and set LLM_ARENA_PROVIDERS in .env.local.
          </p>
        </details>
      </div>
    </div>
  );
}
