import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/ScanForm';
import { CopyCodeBlock } from '@/components/CopyCodeBlock';
import { loadCementerioIndex } from '@/lib/cementerio';
import { BAND_LABEL, Band } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Revenant — ghosts in your dependency tree',
  description:
    'Which of your dependencies are already ghosts? Revenant predicts which open-source projects are about to die, holds a funeral for the ones that did, and helps you resurrect your code.',
  openGraph: {
    title: 'Revenant — ghosts in your dependency tree',
    description:
      'Predict which open-source projects are about to die, honor departed packages with a dignified ofrenda, and resurrect your code with living successors.',
    type: 'website',
    images: [{ url: '/api/og/home', width: 1200, height: 630, alt: 'Revenant — Ghost in the Machine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revenant — ghosts in your dependency tree',
    description: 'Which of your dependencies are already ghosts? Signals, not verdicts.',
    images: ['/api/og/home'],
  },
};

const SHOWCASE_NAMES = ['request', 'left-pad', 'node-sass'];

const STACK_CHIPS = [
  { name: 'Gemma', role: 'Autopsy & Seance', href: '/receipts' },
  { name: 'TabPFN', role: 'Ghost-Risk Predictor', href: '/science' },
  { name: 'Tinker LoRA', role: 'Epitaph Writer', href: '/receipts' },
  { name: 'Mastra', role: 'Agent Workflows', href: '/receipts' },
  { name: 'Temporal', role: 'Durable Scans', href: '/receipts' },
];

export default async function Home() {
  const { generatedAt, rows } = await loadCementerioIndex();
  const total = rows.length;
  const atRisk = rows.filter((r) => r.band === 'haunted' || r.band === 'departed').length;
  const departedCount = rows.filter((r) => r.band === 'departed').length;
  const snapDate = generatedAt ? generatedAt.slice(0, 10) : '2026-10-30';

  const miniTombs = SHOWCASE_NAMES.map((n) => rows.find((r) => r.dep.name === n)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r),
  );

  return (
    <div className="pt-6 sm:pt-10">
      {/* Hero with inline-SVG marigold & candle altar scene */}
      <div className="text-center">
        <div className="mx-auto mb-5 flex justify-center" aria-hidden="true">
          <svg
            width="280"
            height="84"
            viewBox="0 0 280 84"
            className="max-w-full"
            role="presentation"
          >
            <defs>
              <radialGradient id="heroGlow" cx="50%" cy="55%" r="50%">
                <stop offset="0%" stopColor="#ffb757" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffb757" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="140" cy="48" rx="120" ry="34" fill="url(#heroGlow)" />
            {/* Altar base line */}
            <rect x="24" y="74" width="232" height="3" rx="1.5" fill="#35305c" />
            {/* Marigold blossoms (cempasúchil) */}
            {[52, 82, 198, 228].map((cx, idx) => (
              <g key={cx} transform={`translate(${cx}, ${idx % 2 === 0 ? 66 : 68})`}>
                <circle r="8" fill="#c2410c" />
                <circle r="6" fill="#f2a33c" />
                <circle r="3" fill="#ffb757" />
              </g>
            ))}
            {/* Central arch stone */}
            <path
              d="M114 74 V38 C114 23 126 12 140 12 C154 12 166 23 166 38 V74 Z"
              fill="#1d1936"
              stroke="#b87cff"
              strokeWidth="1.5"
            />
            <text x="140" y="47" textAnchor="middle" fill="#c594ff" fontSize="14" fontFamily="serif">
              RIP
            </text>
            <line x1="126" y1="56" x2="154" y2="56" stroke="#35305c" strokeWidth="1.5" />
            {/* Flanking candles */}
            {[96, 184].map((x) => (
              <g key={x}>
                <path
                  d={`M${x} 30 C${x} 30 ${x + 4} 35 ${x + 4} 39 C${x + 4} 42 ${x + 2} 44 ${x} 44 C${x - 2} 44 ${x - 4} 42 ${x - 4} 39 C${x - 4} 35 ${x} 30 ${x} 30 Z`}
                  fill="#ffb757"
                />
                <rect x={x - 4} y="45" width="8" height="29" rx="2" fill="#f4ecd8" />
              </g>
            ))}
          </svg>
        </div>

        <p className="font-mono-data text-xs uppercase tracking-[0.28em] sm:text-sm" style={{ color: 'var(--marigold)' }}>
          ghost in the machine · día de los muertos
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight sm:text-5xl md:text-6xl">
          Which of your dependencies
          <br />
          are already <em style={{ color: 'var(--departed)' }}>ghosts</em>?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: 'var(--bone-dim)' }}>
          Revenant predicts which open-source projects are about to die, holds a dignified ofrenda
          for the ones that already did, and helps you resurrect your code with a living successor.
        </p>
      </div>

      {/* Scan Form */}
      <div className="card mx-auto mt-10 max-w-3xl p-4 sm:p-6">
        <ScanForm />
      </div>

      {/* Real computed stat strip from seed index */}
      {total > 0 && (
        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2c2752] bg-[#120f26] px-4 py-3 text-xs sm:text-sm">
          <div>
            <strong className="font-mono-data" style={{ color: 'var(--marigold)' }}>
              {atRisk} of the {total}
            </strong>{' '}
            <span style={{ color: 'var(--bone-dim)' }}>
              indexed npm &amp; PyPI packages are Haunted or worse ({departedCount} Departed)
            </span>
          </div>
          <div className="font-mono-data flex items-center gap-3 text-xs" style={{ color: 'var(--violet-mute)' }}>
            <span>snapshot {snapDate}</span>
            <span>·</span>
            <Link href="/science" className="underline hover:text-[var(--marigold)]">
              methodology →
            </Link>
          </div>
        </div>
      )}

      {/* From the cementerio: 3 live mini tombstones */}
      {miniTombs.length > 0 && (
        <section className="mx-auto mt-14 max-w-4xl" aria-labelledby="from-cementerio">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="from-cementerio" className="font-display text-2xl">
              From the Cementerio
            </h2>
            <Link href="/cementerio" className="font-mono-data text-xs underline hover:text-[var(--marigold)]" style={{ color: 'var(--violet-mute)' }}>
              View all {total} packages →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {miniTombs.map((item) => (
              <Link
                key={`${item.dep.ecosystem}/${item.dep.name}`}
                href={`/grave/${item.dep.ecosystem}/${encodeURIComponent(item.dep.name)}`}
                className="card group flex flex-col justify-between p-5 transition-colors hover:border-[var(--marigold)]"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono-data text-xs uppercase" style={{ color: 'var(--violet-mute)' }}>
                      {item.dep.ecosystem}
                    </span>
                    <span className={`font-mono-data text-xs font-semibold uppercase band-${item.band}`}>
                      {BAND_LABEL[item.band as Band]} · {item.score}/100
                    </span>
                  </div>
                  <div className="font-display mt-2 text-2xl group-hover:text-[var(--marigold)]">
                    {item.dep.name}
                  </div>
                  {item.epitaph && (
                    <p className="mt-2 line-clamp-2 text-xs italic" style={{ color: 'var(--bone-dim)' }}>
                      “{item.epitaph}”
                    </p>
                  )}
                </div>
                <div className="font-mono-data mt-4 flex items-center justify-between border-t border-[#241f45] pt-3 text-[11px]" style={{ color: 'var(--violet-mute)' }}>
                  <span>
                    {item.vitals.daysSinceCommit !== undefined
                      ? `last commit ${Math.round(item.vitals.daysSinceCommit / 365 * 10) / 10}y ago`
                      : 'signals recorded'}
                  </span>
                  <span style={{ color: 'var(--marigold)' }}>Visit grave →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3-step How it works with inline SVG icons */}
      <section className="mx-auto mt-14 max-w-4xl" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="font-display text-2xl">
          How it works
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div className="card p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1d1936]" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--marigold)" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h4l2-5 4 10 2-5h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-display mt-3 text-xl">1. Haunting Report</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--bone-dim)' }}>
              Paste a manifest or repo URL. Every dependency gets a calibrated ghost score — Alive,
              Fading, Haunted, or Departed — worst offenders first.
            </p>
          </div>

          <div className="card p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1d1936]" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--candle)" strokeWidth="1.8">
                <path d="M12 3c0 0 3 3.2 3 5.5a3 3 0 0 1-6 0C9 6.2 12 3 12 3Z" fill="var(--candle)" />
                <rect x="9" y="10" width="6" height="10" rx="1" />
                <line x1="6" y1="20" x2="18" y2="20" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="font-display mt-3 text-xl">2. Tombstones &amp; Ofrendas</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--bone-dim)' }}>
              Each quiet project receives a dignified memorial: cited cause of death, last words,
              contributors remembered as candles, and a grounded seance.
            </p>
          </div>

          <div className="card p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1d1936]" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--alive)" strokeWidth="1.8">
                <path d="M7 20h10M12 20V8" strokeLinecap="round" />
                <path d="M12 8C12 5 15 3 18 4C18 7 15 9 12 8Z" />
                <path d="M12 11C12 8 9 6 6 7C6 10 9 12 12 11Z" />
              </svg>
            </div>
            <h3 className="font-display mt-3 text-xl">3. Resurrection</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--bone-dim)' }}>
              Ranked living successors, a step-by-step migration plan, a manifest diff, and — only
              after explicit human approval — a pull request.
            </p>
          </div>
        </div>
      </section>

      {/* CLI & GitHub Action copyable blocks */}
      <section className="mx-auto mt-14 max-w-4xl" aria-labelledby="cli-action">
        <h2 id="cli-action" className="font-display text-2xl">
          Run offline or in CI
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--bone-dim)' }}>
          Works with the lights and the internet off via the bundled Graveyard Index snapshot and local Ollama.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <CopyCodeBlock
            label="CLI · Terminal & Offline Mode"
            code={`npx revenant-cli scan .\nnpx revenant-cli scan . --offline`}
          />
          <CopyCodeBlock
            label="GitHub Action · PR Guard"
            code={`- name: Check for ghost dependencies\n  uses: SayemR0018/revenantAI@main\n  with:\n    manifest: package.json`}
          />
        </div>
      </section>

      {/* Open-weight stack chip row */}
      <section className="mx-auto mt-14 max-w-4xl text-center" aria-labelledby="open-stack">
        <h2 id="open-stack" className="font-mono-data text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--violet-mute)' }}>
          Open-weight AI stack · verify live receipts
        </h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          {STACK_CHIPS.map((s) => (
            <Link
              key={s.name}
              href={s.href}
              className="card inline-flex min-h-[40px] items-center gap-2 px-3.5 py-2 text-xs transition-colors hover:border-[var(--marigold)]"
            >
              <span className="font-mono-data font-semibold" style={{ color: 'var(--marigold)' }}>
                {s.name}
              </span>
              <span style={{ color: 'var(--bone-dim)' }}>· {s.role}</span>
            </Link>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-xs" style={{ color: 'var(--violet-mute)' }}>
          A tool that detects abandonment should not itself depend on a closed model that can be
          deprecated out from under it.{' '}
          <Link href="/science" className="underline hover:text-[var(--marigold)]">
            Read the science
          </Link>{' '}
          or{' '}
          <Link href="/receipts" className="underline hover:text-[var(--marigold)]">
            inspect live receipts
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
