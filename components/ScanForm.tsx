'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'manifest' | 'repo' | 'package';

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

  return (
    <form onSubmit={submit}>
      <div role="tablist" aria-label="Scan source" className="mb-4 flex gap-2">
        {(['manifest', 'repo', 'package'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="rounded-md px-3 py-1.5 text-sm capitalize"
            style={{
              background: tab === t ? 'var(--marigold)' : 'var(--ink-3)',
              color: tab === t ? 'var(--ink)' : 'var(--bone-dim)',
            }}
          >
            {t === 'manifest' ? 'manifest' : t === 'repo' ? 'repo URL' : 'one package'}
          </button>
        ))}
      </div>

      {tab === 'manifest' && (
        <textarea
          value={manifest}
          onChange={(e) => setManifest(e.target.value)}
          rows={9}
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
          className="font-mono-data w-full rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
          aria-label="GitHub repository URL"
        />
      )}
      {tab === 'package' && (
        <div className="flex gap-2">
          <select
            value={eco}
            onChange={(e) => setEco(e.target.value as 'npm' | 'pypi')}
            className="rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
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
            className="font-mono-data w-full rounded-md border border-[#35305c] bg-[#0d0b1e] p-3 text-sm"
            aria-label="Package name"
          />
        </div>
      )}

      {err && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--departed)' }}>{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-md py-3 text-lg font-semibold transition-opacity disabled:opacity-60"
        style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
      >
        {busy ? 'summoning…' : 'exhume my dependencies'}
      </button>
    </form>
  );
}
