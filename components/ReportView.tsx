'use client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Report, ScoredDep, BAND_LABEL, VisualBand, visualBandFor } from '@/lib/types';
import { humanizeDays, numberWord } from '@/lib/format';
import { PulseSparkline } from './PulseSparkline';
import { ResurrectDrawer } from './ResurrectDrawer';

const ORDER: Record<VisualBand, number> = {
  departed: 0,
  haunted: 1,
  fading: 2,
  alive: 3,
  unknown: 4,
};

type SortKey = 'score' | 'lastCommit' | 'downloads';

const BAND_FILTERS: { key: '' | VisualBand; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'departed', label: 'Departed' },
  { key: 'haunted', label: 'Haunted' },
  { key: 'fading', label: 'Fading' },
  { key: 'alive', label: 'Alive' },
  { key: 'unknown', label: 'Unknown' },
];

const PHASES = [
  { key: 'queued', label: '1. Queue & parse' },
  { key: 'resolving', label: '2. Resolve repos' },
  { key: 'examining', label: '3. Score & autopsy' },
  { key: 'rendering', label: '4. Render report' },
];

export function ReportView({
  initial,
  initialBand = '',
  initialEco = '',
  initialSort = 'score',
}: {
  initial: Report;
  initialBand?: string;
  initialEco?: string;
  initialSort?: string;
}) {
  const [report, setReport] = useState(initial);
  const [bandFilter, setBandFilter] = useState<string>(initialBand);
  const [ecoFilter, setEcoFilter] = useState<string>(initialEco);
  const [sortBy, setSortBy] = useState<SortKey>(
    initialSort === 'lastCommit' || initialSort === 'downloads' ? initialSort : 'score',
  );
  const [resurrectDep, setResurrectDep] = useState<ScoredDep | null>(null);

  useEffect(() => {
    if (initial.status === 'done' || initial.status === 'error') return;
    const es = new EventSource(`/api/scan/${initial.id}/events`);
    const poll = async () => {
      const r = await fetch(`/api/scan/${initial.id}`).then((x) => x.json());
      setReport(r);
    };
    es.addEventListener('progress', () => poll());
    es.addEventListener('done', () => {
      poll();
      es.close();
    });
    es.addEventListener('error', () => es.close());
    return () => es.close();
  }, [initial.id, initial.status]);

  function syncUrl(nextBand: string, nextEco: string, nextSort: SortKey) {
    if (typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    if (nextBand) u.searchParams.set('band', nextBand);
    else u.searchParams.delete('band');
    if (nextEco) u.searchParams.set('eco', nextEco);
    else u.searchParams.delete('eco');
    if (nextSort !== 'score') u.searchParams.set('sort', nextSort);
    else u.searchParams.delete('sort');
    window.history.replaceState({}, '', u.toString());
  }

  const counts = useMemo(() => {
    const c: Record<VisualBand, number> = { departed: 0, haunted: 0, fading: 0, alive: 0, unknown: 0 };
    for (const d of report.results) {
      c[visualBandFor(d)]++;
    }
    return c;
  }, [report.results]);

  const filteredAndSorted = useMemo(() => {
    return report.results
      .filter((d) => {
        const vb = visualBandFor(d);
        if (bandFilter && vb !== bandFilter) return false;
        if (ecoFilter && d.dep.ecosystem !== ecoFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'lastCommit') {
          return (b.vitals.daysSinceCommit ?? -1) - (a.vitals.daysSinceCommit ?? -1);
        }
        if (sortBy === 'downloads') {
          return (b.vitals.weeklyDownloads ?? -1) - (a.vitals.weeklyDownloads ?? -1);
        }
        return ORDER[visualBandFor(a)] - ORDER[visualBandFor(b)] || b.score - a.score;
      });
  }, [report.results, bandFilter, ecoFilter, sortBy]);

  const s = report.summary;
  const ghosts = s.haunted + s.departed;
  const total = Math.max(1, s.total);
  const phaseStr = report.progress.phase.toLowerCase();
  const activeStepIdx = phaseStr.includes('render')
    ? 3
    : phaseStr.includes('examin')
      ? 2
      : phaseStr.includes('resolv')
        ? 1
        : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Haunting Report</h1>
          <p className="font-mono-data mt-1 text-sm" style={{ color: 'var(--violet-mute)' }}>
            {report.sourceLabel} ·{' '}
            <time dateTime={report.createdAt}>
              {new Date(report.createdAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'UTC',
              })}{' '}
              UTC
            </time>
          </p>
        </div>
        <ShareBlock report={report} />
      </div>

      {/* Live progress with per-phase steps */}
      {report.status !== 'done' && report.status !== 'error' && (
        <div className="card mt-6 p-5" role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--marigold)"
              strokeWidth="1.8"
              className="ghost-float shrink-0"
              aria-hidden="true"
            >
              <path d="M12 3a7 7 0 0 0-7 7v9l2.5-2 2.5 2 2-2 2 2 2.5-2 2.5 2v-9a7 7 0 0 0-7-7Z" />
              <circle cx="9.5" cy="10" r="1" fill="var(--marigold)" />
              <circle cx="14.5" cy="10" r="1" fill="var(--marigold)" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize" style={{ color: 'var(--bone)' }}>
                  {report.progress.phase}
                </span>
                <span className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
                  {report.progress.done}/{report.progress.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-[#241f45]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${report.progress.total ? (report.progress.done / report.progress.total) * 100 : 10}%`,
                    background: 'var(--marigold)',
                  }}
                />
              </div>
            </div>
          </div>
          <ol className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {PHASES.map((p, idx) => {
              const done = idx < activeStepIdx;
              const current = idx === activeStepIdx;
              return (
                <li
                  key={p.key}
                  className="font-mono-data rounded border px-2.5 py-1.5"
                  style={{
                    borderColor: current ? 'var(--marigold)' : '#2c2752',
                    color: current ? 'var(--marigold)' : done ? 'var(--alive)' : 'var(--violet-mute)',
                    background: current ? '#1d1936' : 'transparent',
                  }}
                >
                  {done ? '✓ ' : ''}
                  {p.label}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {report.status === 'error' && (
        <p role="alert" className="card mt-6 p-4" style={{ color: 'var(--departed)' }}>
          The seance failed: {report.error ?? 'unknown error'}
        </p>
      )}

      {/* Summary header with stacked distribution bar */}
      {report.status === 'done' && (
        <section className="card mt-6 p-5" aria-label="Report summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-xl sm:text-2xl">
              {ghosts === 0
                ? `No ghosts among ${s.total} dependencies — a healthy tree.`
                : `${numberWord(ghosts)} ghost${ghosts === 1 ? '' : 's'} among ${s.total} dependencies.`}
            </p>
            <span
              className="font-mono-data rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: ghosts > 0 ? 'var(--haunted)' : 'var(--alive)',
                color: ghosts > 0 ? 'var(--haunted)' : 'var(--alive)',
                background: '#0d0b1e',
              }}
            >
              {ghosts > 0 ? `${ghosts} need attention` : '0 need attention'}
            </span>
          </div>

          {/* Stacked band bar */}
          <div
            className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#0d0b1e]"
            role="img"
            aria-label={`Band distribution: ${s.departed} departed, ${s.haunted} haunted, ${s.fading} fading, ${s.alive} alive, ${s.unknown} unknown`}
          >
            {s.departed > 0 && (
              <div style={{ width: `${(s.departed / total) * 100}%`, background: 'var(--departed)' }} />
            )}
            {s.haunted > 0 && (
              <div style={{ width: `${(s.haunted / total) * 100}%`, background: 'var(--haunted)' }} />
            )}
            {s.fading > 0 && (
              <div style={{ width: `${(s.fading / total) * 100}%`, background: '#f2bd49' }} />
            )}
            {s.alive > 0 && (
              <div style={{ width: `${(s.alive / total) * 100}%`, background: 'var(--alive)' }} />
            )}
            {s.unknown > 0 && (
              <div style={{ width: `${(s.unknown / total) * 100}%`, background: 'var(--unknown)' }} />
            )}
          </div>

          <div className="font-mono-data mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span className="band-departed">● {s.departed} departed</span>
            <span className="band-haunted">● {s.haunted} haunted</span>
            <span className="band-fading">● {s.fading} fading</span>
            <span className="band-alive">● {s.alive} alive</span>
            {s.unknown > 0 && <span className="band-unknown">● {s.unknown} unknown</span>}
          </div>
        </section>
      )}

      {/* Filter & sort controls */}
      {report.results.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by band">
            {BAND_FILTERS.map((bf) => {
              const count = bf.key ? counts[bf.key] : report.results.length;
              if (bf.key === 'unknown' && count === 0) return null;
              const active = bandFilter === bf.key;
              return (
                <button
                  key={bf.key || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setBandFilter(bf.key);
                    syncUrl(bf.key, ecoFilter, sortBy);
                  }}
                  className="font-mono-data min-h-[40px] rounded-md px-3 py-1.5 text-xs transition-colors"
                  style={{
                    background: active ? 'var(--marigold)' : 'var(--ink-3)',
                    color: active ? 'var(--ink)' : 'var(--bone-dim)',
                  }}
                >
                  {bf.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="report-eco-filter" className="sr-only">
              Filter by ecosystem
            </label>
            <select
              id="report-eco-filter"
              value={ecoFilter}
              onChange={(e) => {
                setEcoFilter(e.target.value);
                syncUrl(bandFilter, e.target.value, sortBy);
              }}
              aria-label="Filter by ecosystem"
              className="font-mono-data min-h-[40px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1.5 text-xs"
            >
              <option value="">All ecosystems</option>
              <option value="npm">npm</option>
              <option value="pypi">pypi</option>
            </select>

            <label htmlFor="report-sort" className="sr-only">
              Sort dependencies
            </label>
            <select
              id="report-sort"
              value={sortBy}
              onChange={(e) => {
                const next = e.target.value as SortKey;
                setSortBy(next);
                syncUrl(bandFilter, ecoFilter, next);
              }}
              aria-label="Sort dependencies"
              className="font-mono-data min-h-[40px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1.5 text-xs"
            >
              <option value="score">Sort: Ghost score</option>
              <option value="lastCommit">Sort: Last commit</option>
              <option value="downloads">Sort: Weekly downloads</option>
            </select>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-3">
        {filteredAndSorted.map((d) => (
          <DepRow
            key={`${d.dep.ecosystem}/${d.dep.name}`}
            d={d}
            onResurrect={(target) => setResurrectDep(target)}
          />
        ))}
      </ol>

      {report.status === 'done' && filteredAndSorted.length === 0 && (
        <p className="mt-8 text-sm" style={{ color: 'var(--violet-mute)' }}>
          No dependencies match the selected filters.
        </p>
      )}

      <ResurrectDrawer
        dep={resurrectDep}
        versionSpec={
          resurrectDep
            ? report.manifestSpecs?.[`${resurrectDep.dep.ecosystem}/${resurrectDep.dep.name}`] ??
              resurrectDep.dep.versionSpec
            : undefined
        }
        onClose={() => setResurrectDep(null)}
      />
    </div>
  );
}

function DepRow({
  d,
  onResurrect,
}: {
  d: ScoredDep;
  onResurrect: (dep: ScoredDep) => void;
}) {
  const vb = visualBandFor(d);
  const needsResurrection = vb === 'departed' || vb === 'haunted';

  return (
    <li className="card group relative flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:border-[var(--marigold)]">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="w-16 shrink-0 text-center">
          <div className={`font-display text-2xl band-${vb}`}>{d.error ? '?' : d.score}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider band-${vb}`}>
            {BAND_LABEL[vb]}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {d.notFound ? (
            <span className="font-mono-data block truncate text-lg" style={{ color: 'var(--bone)' }}>
              {d.dep.name}
            </span>
          ) : (
            <Link
              href={`/grave/${d.dep.ecosystem}/${encodeURIComponent(d.dep.name)}`}
              className="font-mono-data block truncate text-lg after:absolute after:inset-0 group-hover:text-[var(--marigold)]"
            >
              {d.dep.name}
            </Link>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={{ color: 'var(--violet-mute)' }}>
            <span>{d.dep.ecosystem}</span>
            {!d.error && d.vitals.daysSinceCommit !== undefined && (
              <span>· last commit {humanizeDays(d.vitals.daysSinceCommit)}</span>
            )}
            {!d.error && d.vitals.weeklyDownloads != null && (
              <span>· {d.vitals.weeklyDownloads.toLocaleString()}/wk</span>
            )}
            {!d.error && d.vitals.archived && <span>· ✝ archived</span>}
            {!d.error && d.vitals.deprecated && <span>· ⚠ deprecated</span>}
            {d.error && <span>· {d.error || "We couldn't find enough public signals"}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <PulseSparkline data={d.vitals.commitsPerWeek} />
        </div>
        {needsResurrection && (
          <button
            type="button"
            onClick={() => onResurrect(d)}
            className="font-mono-data relative z-10 min-h-[38px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 py-1.5 text-xs font-semibold hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
            style={{ color: 'var(--marigold)' }}
          >
            Resurrect
          </button>
        )}
        {!d.notFound && (
          <span
            aria-hidden="true"
            className="text-lg transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--violet-mute)' }}
          >
            →
          </span>
        )}
      </div>
    </li>
  );
}

const emptySubscribe = () => () => {};

function ShareBlock({ report }: { report: Report }) {
  const [copiedKind, setCopiedKind] = useState<'link' | 'md' | null>(null);
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
  );
  const canNativeShare = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );

  const base = origin.replace(/\/$/, '');
  const reportUrl = `${base}/r/${report.id}`;
  const ogPngUrl = `/api/og-report/${report.id}`;
  const shareText = `My dependency tree has ${report.summary.haunted + report.summary.departed} ghosts among ${report.summary.total} dependencies. Haunting report (signals, not verdicts):`;

  function buildMarkdownTable(): string {
    const header = [
      `### Revenant Haunting Report (${report.sourceLabel})`,
      '',
      '| Package | Ecosystem | Ghost Score | Band | Last Commit |',
      '|---|---|---:|---|---|',
    ];
    const rows = report.results.map((d) => {
      const vb = visualBandFor(d);
      const score = d.error ? '?' : `${d.score}/100`;
      const last = d.error
        ? "We couldn't find enough public signals"
        : humanizeDays(d.vitals.daysSinceCommit);
      const link = d.notFound
        ? d.dep.name
        : `[${d.dep.name}](${base}/grave/${d.dep.ecosystem}/${encodeURIComponent(d.dep.name)})`;
      return `| ${link} | ${d.dep.ecosystem} | ${score} | ${BAND_LABEL[vb]} | ${last} |`;
    });
    return [...header, ...rows, '', `_Signals, not verdicts — [Full report](${reportUrl})_`].join('\n');
  }

  function copy(kind: 'link' | 'md', text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKind(kind);
    setTimeout(() => setCopiedKind((prev) => (prev === kind ? null : prev)), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => copy('link', reportUrl)}
        className="card min-h-[40px] px-3 py-2 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
      >
        {copiedKind === 'link' ? '✓ copied link' : 'copy link'}
      </button>
      <button
        type="button"
        onClick={() => copy('md', buildMarkdownTable())}
        className="card min-h-[40px] px-3 py-2 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
      >
        {copiedKind === 'md' ? '✓ copied Markdown' : 'Copy as Markdown table'}
      </button>
      <a
        href={ogPngUrl}
        download={`revenant-report-${report.id}.png`}
        target="_blank"
        rel="noreferrer"
        className="card inline-flex min-h-[40px] items-center px-3 py-2 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
      >
        Download report as PNG
      </a>
      <a
        className="card inline-flex min-h-[40px] items-center px-3 py-2 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(reportUrl)}`}
        target="_blank"
        rel="noreferrer"
      >
        share on X
      </a>
      {canNativeShare && (
        <button
          type="button"
          onClick={() => {
            navigator.share?.({ title: 'Revenant Haunting Report', text: shareText, url: reportUrl }).catch(() => {});
          }}
          className="card min-h-[40px] px-3 py-2 text-xs font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          share…
        </button>
      )}
    </div>
  );
}
