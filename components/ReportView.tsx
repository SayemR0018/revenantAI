'use client';
import { useEffect, useMemo, useState } from 'react';
import { Report, ScoredDep, BAND_LABEL } from '@/lib/types';
import { PulseSparkline } from './PulseSparkline';

const ORDER = { departed: 0, haunted: 1, fading: 2, alive: 3 };

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
    () => [...report.results].sort((a, b) => ORDER[a.band] - ORDER[b.band] || b.score - a.score),
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
  return (
    <li className="card flex items-center gap-4 p-4">
      <div className="w-14 text-center">
        <div className={`font-display text-2xl band-${d.band}`}>{d.error ? '?' : d.score}</div>
        <div className={`text-[10px] uppercase tracking-wider band-${d.band}`}>{BAND_LABEL[d.band]}</div>
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={`/grave/${d.dep.ecosystem}/${encodeURIComponent(d.dep.name)}`}
          className="font-mono-data truncate text-lg hover:text-[var(--marigold)]"
        >
          {d.dep.name}
        </a>
        <div className="mt-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
          {d.dep.ecosystem}
          {d.vitals.daysSinceCommit !== undefined && ` · last commit ${d.vitals.daysSinceCommit}d ago`}
          {d.vitals.archived && ' · archived'}
          {d.vitals.deprecated && ' · deprecated'}
          {d.error && ` · ${d.error}`}
        </div>
      </div>
      <PulseSparkline data={d.vitals.commitsPerWeek} />
    </li>
  );
}

function ShareBlock({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          navigator.clipboard.writeText(location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="card px-3 py-2 text-sm hover:text-[var(--marigold)]"
      >
        {copied ? 'copied' : 'copy link'}
      </button>
      <a
        className="card px-3 py-2 text-sm hover:text-[var(--marigold)]"
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('My dependency tree has ghosts. Haunting report:')}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/r/${id}`)}`}
        target="_blank" rel="noreferrer"
      >
        share
      </a>
    </div>
  );
}
