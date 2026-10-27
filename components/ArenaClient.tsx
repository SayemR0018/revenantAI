'use client';
import { useState } from 'react';

interface Candidate {
  provider: string;
  model: string;
  epitaph: string;
  cause: string;
  latencyMs: number;
  error?: string;
}

export function ArenaClient() {
  const [name, setName] = useState('request');
  const [eco, setEco] = useState<'npm' | 'pypi'>('npm');
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setVoted(null);
    try {
      const r = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eco, name }),
      });
      const j = await r.json();
      setCands(j.candidates ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function vote(c: Candidate) {
    await fetch('/api/arena/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: c.provider, model: c.model, eco, name }),
    });
    setVoted(c.provider + c.model);
  }

  return (
    <div className="mt-6">
      <form onSubmit={run} className="card flex flex-wrap items-center gap-2 p-4">
        <select value={eco} onChange={(e) => setEco(e.target.value as 'npm' | 'pypi')}
          className="rounded-md border border-[#35305c] bg-[#0d0b1e] p-2 text-sm" aria-label="ecosystem">
          <option value="npm">npm</option>
          <option value="pypi">pypi</option>
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="font-mono-data min-w-[200px] rounded-md border border-[#35305c] bg-[#0d0b1e] p-2 text-sm"
          placeholder="package name" aria-label="package name" />
        <button type="submit" disabled={busy}
          className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--marigold)', color: 'var(--ink)' }}>
          {busy ? 'the ghosts are writing…' : 'hold the contest'}
        </button>
      </form>

      {cands && !cands.length && (
        <p className="card mt-4 p-4 text-sm" style={{ color: 'var(--bone-dim)' }}>
          No arena providers configured. Set GOOGLE_API_KEY and/or BACKBOARD_API_KEY — or OLLAMA_BASE_URL for a
          fully local bout. See <code className="font-mono-data">LLM_ARENA_PROVIDERS</code> in .env.example.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cands?.map((c, i) => (
          <div key={i} className="card flex flex-col p-5">
            <div className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
              {c.provider}{c.model && c.model !== 'default' ? `:${c.model}` : ''} · {c.latencyMs}ms
            </div>
            {c.error ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--departed)' }}>{c.error}</p>
            ) : (
              <>
                <p className="font-display mt-3 flex-1 italic" style={{ color: 'var(--bone-dim)' }}>“{c.epitaph}”</p>
                <p className="mt-2 text-xs capitalize" style={{ color: 'var(--marigold)' }}>{c.cause.replace(/_/g, ' ')}</p>
              </>
            )}
            <button onClick={() => vote(c)} disabled={!!voted || !!c.error}
              className="mt-4 rounded-md py-2 text-sm disabled:opacity-40"
              style={{ background: voted === c.provider + c.model ? 'var(--departed)' : 'var(--ink-3)', color: 'var(--bone)' }}>
              {voted === c.provider + c.model ? 'your vote' : 'vote for this ghost'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
