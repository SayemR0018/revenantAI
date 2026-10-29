'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NotFoundSearch() {
  const router = useRouter();
  const [eco, setEco] = useState<'npm' | 'pypi'>('npm');
  const [name, setName] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push(`/grave/${eco}/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
      <label htmlFor="nf-eco" className="sr-only">
        Ecosystem
      </label>
      <select
        id="nf-eco"
        value={eco}
        onChange={(e) => setEco(e.target.value as 'npm' | 'pypi')}
        className="min-h-[44px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm"
      >
        <option value="npm">npm</option>
        <option value="pypi">pypi</option>
      </select>
      <label htmlFor="nf-pkg" className="sr-only">
        Looking for a different package?
      </label>
      <input
        id="nf-pkg"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Looking for a different package? (e.g. request)"
        aria-label="Looking for a different package?"
        className="font-mono-data min-h-[44px] flex-1 rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="min-h-[44px] rounded-md px-5 py-2 text-sm font-semibold"
        style={{ background: 'var(--marigold)', color: 'var(--ink)' }}
      >
        Search graveyard
      </button>
    </form>
  );
}
