import Link from 'next/link';
import { NotFoundSearch } from '@/components/NotFoundSearch';

const EXAMPLES = [
  { eco: 'npm', name: 'request', note: 'Deprecated 2020' },
  { eco: 'npm', name: 'left-pad', note: 'Deprecated 2018' },
  { eco: 'npm', name: 'node-sass', note: 'Deprecated 2024' },
  { eco: 'npm', name: 'moment', note: 'Maintenance mode' },
  { eco: 'pypi', name: 'nose', note: 'Unmaintained PyPI runner' },
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <div className="mx-auto flex justify-center" aria-hidden="true">
        <div className="candle" />
      </div>
      <p className="font-mono-data mt-6 text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--marigold)' }}>
        404 · Unmarked Grave
      </p>
      <h1 className="font-display mt-2 text-3xl sm:text-5xl">
        No package rests under this stone
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base" style={{ color: 'var(--bone-dim)' }}>
        We checked the public registry and found no record of that package. Because Revenant reports signals rather than guessing, we never invent a tombstone for an unknown name.
      </p>

      <div className="card mx-auto mt-8 p-5 text-left">
        <h2 className="font-display text-lg">Looking for a different package?</h2>
        <NotFoundSearch />
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
            Or visit a known memorial
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Link
                key={`${ex.eco}/${ex.name}`}
                href={`/grave/${ex.eco}/${ex.name}`}
                className="font-mono-data inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-1.5 text-xs hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
              >
                <span>{ex.eco}/{ex.name}</span>
                <span style={{ color: 'var(--violet-mute)' }}>· {ex.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link href="/" className="underline hover:text-[var(--marigold)]">
          ← Scan a manifest
        </Link>
        <Link href="/cementerio" className="underline hover:text-[var(--marigold)]">
          Browse the Cementerio
        </Link>
      </div>
    </div>
  );
}
