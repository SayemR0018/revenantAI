'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Tab = 'manifest' | 'repo' | 'package';

const SAMPLE_MANIFEST = JSON.stringify(
  {
    name: 'legacy-checkout-service',
    version: '1.4.0',
    dependencies: {
      request: '^2.88.2',
      'left-pad': '^1.3.0',
      'node-sass': '^9.0.0',
      moment: '^2.29.4',
      lodash: '^4.17.21',
      react: '^19.0.0',
    },
  },
  null,
  2,
);

const EXAMPLE_CHIPS = [
  { eco: 'npm', name: 'request', band: 'departed' },
  { eco: 'npm', name: 'left-pad', band: 'departed' },
  { eco: 'npm', name: 'node-sass', band: 'departed' },
  { eco: 'npm', name: 'moment', band: 'alive' },
  { eco: 'npm', name: 'react', band: 'alive' },
] as const;

export function ScanForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('manifest');
  const [manifest, setManifest] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [pkg, setPkg] = useState('');
  const [eco, setEco] = useState<'npm' | 'pypi'>('npm');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body =
        tab === 'manifest'
          ? { manifest }
          : tab === 'repo'
            ? { repoUrl }
            : { packageName: pkg, ecosystem: eco };
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      router.push(`/r/${j.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
      setBusy(false);
    }
  }

  function fillSample() {
    setTab('manifest');
    setManifest(SAMPLE_MANIFEST);
    setErr(null);
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Scan source" className="flex flex-wrap gap-2">
          {(['manifest', 'repo', 'package'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="min-h-[44px] rounded-md px-3.5 py-2 text-sm font-medium capitalize transition-colors"
              style={{
                background: tab === t ? 'var(--marigold)' : 'var(--ink-3)',
                color: tab === t ? 'var(--ink)' : 'var(--bone-dim)',
              }}
            >
              {t === 'manifest' ? 'manifest' : t === 'repo' ? 'repo URL' : 'one package'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fillSample}
          className="font-mono-data min-h-[44px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 py-1.5 text-xs hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
          style={{ color: 'var(--bone)' }}
        >
          Try a sample package.json
        </button>
      </div>

      {tab === 'manifest' && (
        <textarea
          value={manifest}
          onChange={(e) => setManifest(e.target.value)}
          rows={8}
          required
          placeholder='Paste package.json, requirements.txt, or pyproject.toml…  {"dependencies": {"lodash": "^4.17.21"}}'
          className="font-mono-data w-full rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
          aria-label="Manifest contents"
        />
      )}
      {tab === 'repo' && (
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
          placeholder="https://github.com/owner/repo"
          className="font-mono-data min-h-[44px] w-full rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
          aria-label="GitHub repository URL"
        />
      )}
      {tab === 'package' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={eco}
            onChange={(e) => setEco(e.target.value as 'npm' | 'pypi')}
            className="min-h-[44px] rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
            aria-label="Ecosystem"
          >
            <option value="npm">npm</option>
            <option value="pypi">pypi</option>
          </select>
          <input
            value={pkg}
            onChange={(e) => setPkg(e.target.value)}
            required
            placeholder="lodash"
            className="font-mono-data min-h-[44px] w-full rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
            aria-label="Package name"
          />
        </div>
      )}

      {err && (
        <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--departed)' }}>
          {err}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 min-h-[48px] w-full rounded-md py-3 text-base font-semibold transition-opacity disabled:opacity-60 sm:text-lg"
        style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
      >
        {busy ? 'summoning…' : 'exhume my dependencies'}
      </button>

      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[#241f45] pt-4 text-xs sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <span style={{ color: 'var(--violet-mute)' }}>Jump to tombstone:</span>
          {EXAMPLE_CHIPS.map((chip) => (
            <Link
              key={chip.name}
              href={`/grave/${chip.eco}/${chip.name}`}
              className="font-mono-data inline-flex min-h-[36px] items-center rounded border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1 text-xs hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
            >
              {chip.name}
            </Link>
          ))}
        </div>
        <p className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
          No account needed · public data only
        </p>
      </div>
    </form>
  );
}
