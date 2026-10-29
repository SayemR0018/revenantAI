'use client';
import { useEffect, useState } from 'react';
import { ScoredDep, Successor } from '@/lib/types';

interface ResurrectResult {
  eco: string;
  name: string;
  selectedSuccessor: string | null;
  successors: Successor[];
  plan: string[];
  diff: string;
  generatedBy: string;
  auth0Configured: boolean;
}

export function ResurrectDrawer({
  dep,
  versionSpec,
  onClose,
}: {
  dep: ScoredDep | null;
  versionSpec?: string;
  onClose: () => void;
}) {
  if (!dep) return null;
  return (
    <ResurrectDrawerInner
      key={`${dep.dep.ecosystem}/${dep.dep.name}`}
      dep={dep}
      versionSpec={versionSpec}
      onClose={onClose}
    />
  );
}

function ResurrectDrawerInner({
  dep,
  versionSpec,
  onClose,
}: {
  dep: ScoredDep;
  versionSpec?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ResurrectResult | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<'plan' | 'diff' | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/resurrect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eco: dep.dep.ecosystem,
        name: dep.dep.name,
        versionSpec: versionSpec || dep.dep.versionSpec,
        successor: selected || undefined,
      }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        return j as ResurrectResult;
      })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setErr(null);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [dep, selected, versionSpec]);

  function copyText(kind: 'plan' | 'diff', text: string) {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied((prev) => (prev === kind ? null : prev)), 1800);
  }

  const activeSuccessor = selected || data?.selectedSuccessor || '';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resurrect-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[#35305c] bg-[#14112b] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-[#241f45] pb-4">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-wider" style={{ color: 'var(--alive)' }}>
              Resurrection plan
            </p>
            <h2 id="resurrect-title" className="font-display mt-1 text-2xl sm:text-3xl">
              {dep.dep.ecosystem}/{dep.dep.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close resurrection drawer"
            className="min-h-[44px] min-w-[44px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 text-sm hover:border-[var(--marigold)]"
          >
            ✕
          </button>
        </div>

        {!data && !err && (
          <div className="py-12 text-center" role="status" aria-live="polite">
            <div className="mx-auto flex justify-center" aria-hidden="true">
              <div className="candle" />
            </div>
            <p className="font-mono-data mt-5 text-xs" style={{ color: 'var(--violet-mute)' }}>
              Ranking living successors and drafting migration diff…
            </p>
          </div>
        )}

        {err && (
          <p role="alert" className="mt-4 rounded border border-[#35305c] bg-[#1d1936] p-3 text-sm" style={{ color: 'var(--departed)' }}>
            {err}
          </p>
        )}

        {data && (
          <div className="mt-5 flex-1 space-y-6">
            {/* Ranked successors */}
            <section aria-labelledby="succ-heading">
              <h3 id="succ-heading" className="font-display text-lg">
                1. Choose a living successor
              </h3>
              {data.successors.length ? (
                <div className="mt-2 space-y-2">
                  {data.successors.map((s) => {
                    const active = activeSuccessor === s.name;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setSelected(s.name)}
                        className="flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors"
                        style={{
                          borderColor: active ? 'var(--marigold)' : '#2c2752',
                          background: active ? '#1d1936' : '#0d0b1e',
                        }}
                      >
                        <div>
                          <div className="font-mono-data text-sm font-semibold" style={{ color: active ? 'var(--marigold)' : 'var(--bone)' }}>
                            {s.name}
                          </div>
                          <div className="mt-0.5 text-xs" style={{ color: 'var(--bone-dim)' }}>
                            {s.reason}
                          </div>
                        </div>
                        <span className="font-mono-data shrink-0 rounded bg-[#241f45] px-2 py-0.5 text-[10px] uppercase" style={{ color: 'var(--violet-mute)' }}>
                          {s.source.replace(/_/g, ' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: 'var(--bone-dim)' }}>
                  No automated drop-in replacement found in registry notices. Consider native platform APIs or vendoring.
                </p>
              )}
            </section>

            {/* Migration plan */}
            <section aria-labelledby="plan-heading">
              <div className="flex items-center justify-between gap-2">
                <h3 id="plan-heading" className="font-display text-lg">
                  2. Migration steps
                </h3>
                <button
                  type="button"
                  onClick={() => copyText('plan', data.plan.map((step, idx) => `${idx + 1}. ${step}`).join('\n'))}
                  className="font-mono-data min-h-[36px] rounded border border-[#35305c] bg-[#1d1936] px-2.5 py-1 text-xs hover:border-[var(--marigold)]"
                >
                  {copied === 'plan' ? '✓ Copied plan' : 'Copy plan'}
                </button>
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm" style={{ color: 'var(--bone-dim)' }}>
                {data.plan.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <p className="font-mono-data mt-2 text-[11px]" style={{ color: 'var(--violet-mute)' }}>
                plan source: {data.generatedBy}
              </p>
            </section>

            {/* Manifest diff */}
            <section aria-labelledby="diff-heading">
              <div className="flex items-center justify-between gap-2">
                <h3 id="diff-heading" className="font-display text-lg">
                  3. Manifest diff
                </h3>
                <button
                  type="button"
                  onClick={() => copyText('diff', data.diff)}
                  className="font-mono-data min-h-[36px] rounded border border-[#35305c] bg-[#1d1936] px-2.5 py-1 text-xs hover:border-[var(--marigold)]"
                >
                  {copied === 'diff' ? '✓ Copied diff' : 'Copy diff'}
                </button>
              </div>
              <pre className="font-mono-data mt-2 overflow-x-auto rounded-lg border border-[#2c2752] bg-[#0d0b1e] p-3 text-xs leading-relaxed">
                {data.diff.split('\n').map((line, idx) => {
                  const color = line.startsWith('-')
                    ? 'var(--departed)'
                    : line.startsWith('+')
                      ? 'var(--alive)'
                      : 'var(--bone-dim)';
                  return (
                    <div key={idx} style={{ color }}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </section>

            {/* Approval-gated PR section */}
            <section className="rounded-lg border border-[#2c2752] bg-[#0d0b1e] p-4" aria-labelledby="pr-heading">
              <h3 id="pr-heading" className="font-display text-base">
                How resurrection works (human approval gate)
              </h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--bone-dim)' }}>
                Revenant never writes to a repository unprompted. Opening a pull request requires
                GitHub sign-in via Auth0 Token Vault and an explicit human approval step before any
                branch or PR is created.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!data.auth0Configured}
                  title={
                    data.auth0Configured
                      ? 'Open pull request after approval'
                      : 'Requires GitHub sign-in (Auth0 Token Vault not configured on this instance)'
                  }
                  className="min-h-[42px] rounded-md px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
                >
                  Open Pull Request (requires GitHub sign-in)
                </button>
                {!data.auth0Configured && (
                  <span className="font-mono-data text-[11px]" style={{ color: 'var(--violet-mute)' }}>
                    Disabled: requires GitHub sign-in via Auth0 Token Vault
                  </span>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
