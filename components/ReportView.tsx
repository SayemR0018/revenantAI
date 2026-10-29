'use client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Report, ScoredDep, BAND_LABEL, visualBandFor } from '@/lib/types';
import { PulseSparkline } from './PulseSparkline';

const ORDER: Record<string, number> = { departed: 0, haunted: 1, fading: 2, alive: 3, unknown: 4 };

export function ReportView({ initial }: { initial: Report }) {
  const [report, setReport] = useState(initial);

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

  const sorted = useMemo(
    () =>
      [...report.results].sort(
        (a, b) => ORDER[visualBandFor(a)] - ORDER[visualBandFor(b)] || b.score - a.score,
      ),
    [report.results],
  );
  const s = report.summary;
  const ghosts = s.haunted + s.departed;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Haunting Report</h1>
          <p className="font-mono-data mt-1 text-sm" style={{ color: 'var(--violet-mute)' }}>
            {report.sourceLabel} · {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <ShareBlock id={report.id} />
      </div>

      {report.status !== 'done' && report.status !== 'error' && (
        <div className="card mt-6 p-4">
          <div className="flex items-center gap-3">
            <span className="ghost-float inline-block" aria-hidden>👻</span>
            <div className="flex-1">
              <div className="text-sm capitalize" style={{ color: 'var(--bone-dim)' }}>{report.progress.phase}</div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-[#241f45]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${report.progress.total ? (report.progress.done / report.progress.total) * 100 : 0}%`,
                    background: 'var(--marigold)',
                  }}
                />
              </div>
            </div>
            <span className="font-mono-data text-sm">{report.progress.done}/{report.progress.total}</span>
          </div>
        </div>
      )}
      {report.status === 'error' && (
        <p role="alert" className="card mt-6 p-4" style={{ color: 'var(--departed)' }}>
          The seance failed: {report.error ?? 'unknown error'}
        </p>
      )}

      {report.status === 'done' && (
        <p className="mt-6 text-xl">
          {ghosts === 0
            ? `No ghosts among ${s.total} dependencies — a healthy tree.`
            : `${ghosts} ghost${ghosts === 1 ? '' : 's'} among ${s.total} dependencies.`}{' '}
          <span className="text-sm" style={{ color: 'var(--violet-mute)' }}>
            {s.departed} departed · {s.haunted} haunted · {s.fading} fading · {s.alive} alive
            {s.unknown ? ` · ${s.unknown} unknown` : ''}
          </span>
        </p>
      )}

      <ol className="mt-6 space-y-3">
        {sorted.map((d) => (
          <DepRow key={`${d.dep.ecosystem}/${d.dep.name}`} d={d} />
        ))}
      </ol>
    </div>
  );
}

function DepRow({ d }: { d: ScoredDep }) {
  const vb = visualBandFor(d);
  return (
    <li className="card flex items-center gap-4 p-4">
      <div className="w-16 text-center">
        <div className={`font-display text-2xl band-${vb}`}>{d.error ? '?' : d.score}</div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider band-${vb}`}>
          {BAND_LABEL[vb]}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {d.notFound ? (
          <span className="font-mono-data truncate text-lg" style={{ color: 'var(--bone)' }}>
            {d.dep.name}
          </span>
        ) : (
          <Link
            href={`/grave/${d.dep.ecosystem}/${encodeURIComponent(d.dep.name)}`}
            className="font-mono-data truncate text-lg hover:text-[var(--marigold)]"
          >
            {d.dep.name}
          </Link>
        )}
        <div className="mt-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
          {d.dep.ecosystem}
          {!d.error && d.vitals.daysSinceCommit !== undefined && ` · last commit ${d.vitals.daysSinceCommit}d ago`}
          {!d.error && d.vitals.archived && ' · archived'}
          {!d.error && d.vitals.deprecated && ' · deprecated'}
          {d.error && ` · ${d.error || "We couldn't find enough public signals"}`}
        </div>
      </div>
      <PulseSparkline data={d.vitals.commitsPerWeek} />
    </li>
  );
}

const emptySubscribe = () => () => {};

function ShareBlock({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
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

  const reportUrl = `${origin.replace(/\/$/, '')}/r/${id}`;
  const shareText = 'My dependency tree has ghosts. Haunting report (signals, not verdicts):';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(reportUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="card min-h-[40px] px-3 py-2 text-sm hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
      >
        {copied ? '✓ copied' : 'copy link'}
      </button>
      <a
        className="card inline-flex min-h-[40px] items-center px-3 py-2 text-sm hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
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
          className="card min-h-[40px] px-3 py-2 text-sm hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
        >
          share…
        </button>
      )}
    </div>
  );
}
