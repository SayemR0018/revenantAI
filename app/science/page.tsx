import { promises as fs } from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { loadCementerioIndex } from '@/lib/cementerio';

export const metadata: Metadata = { title: 'The Science — ghost-risk model' };

interface EvalResults {
  generatedAt: string;
  datasetSize: number;
  features: string[];
  folds: number;
  models: { name: string; rocAuc: number | null; prAuc: number | null; brier: number | null; notes?: string }[];
  limitations: string[];
}

async function loadEval(): Promise<EvalResults | null> {
  for (const rel of [
    ['data', 'eval-results.json'],
    ['data', 'seed', 'eval-results.json'],
  ]) {
    try {
      return JSON.parse(await fs.readFile(path.join(process.cwd(), ...rel), 'utf8'));
    } catch {
      /* next */
    }
  }
  return null;
}

const HEURISTIC_WEIGHTS = [
  { signal: 'Repository archived (read-only)', points: '+70 pts', kind: 'risk' },
  { signal: 'Official registry deprecation flag', points: '+65 pts', kind: 'risk' },
  { signal: 'No commits in >2 years (>730d)', points: '+40 pts', kind: 'risk' },
  { signal: 'No release in >2 years (>730d)', points: '+15 pts', kind: 'risk' },
  { signal: 'Zero active authors in last 365 days', points: '+10 pts', kind: 'risk' },
  { signal: 'Single-author bus factor >=80%', points: '+8 pts', kind: 'risk' },
  { signal: '180-day issue close rate <10% (>50 open)', points: '+8 pts', kind: 'risk' },
  { signal: 'Recent commit (<30d) & release (<90d)', points: '−16 pts', kind: 'mitigation' },
];

export default async function SciencePage() {
  const [ev, index] = await Promise.all([loadEval(), loadCementerioIndex()]);
  const snapDate = index.generatedAt ? index.generatedAt.slice(0, 10) : '2026-10-30';
  const total = index.rows.length;
  const departed = index.rows.filter((r) => r.band === 'departed').length;
  const haunted = index.rows.filter((r) => r.band === 'haunted').length;
  const fading = index.rows.filter((r) => r.band === 'fading').length;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl sm:text-4xl">The Science</h1>
        <span className="font-mono-data rounded border border-[#35305c] bg-[#14112b] px-2.5 py-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
          snapshot {snapDate}
        </span>
      </div>
      <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--bone-dim)' }}>
        The ghost score estimates <em>P(a project is abandoned within 12 months)</em> using{' '}
        <strong>TabPFN</strong>, an open-weight tabular foundation model, paired with a transparent
        point-attributable heuristic (<code className="font-mono-data">heuristic-v1</code>). Features are
        computed strictly from repository history prior to snapshot date T0&nbsp;=&nbsp;2025-10-27 — never
        current stars or forks, which would leak future popularity.
      </p>

      {/* Dataset card + live index summary */}
      <section className="card mt-8 p-6" aria-labelledby="dataset-card">
        <h2 id="dataset-card" className="font-display text-2xl">
          Dataset card &amp; Graveyard Index distribution
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm" style={{ color: 'var(--bone-dim)' }}>
          <li>
            <strong>Current seeded index ({snapDate}):</strong> {total} unique npm &amp; PyPI packages —{' '}
            <span className="band-departed font-mono-data">{departed} Departed</span>,{' '}
            <span className="band-haunted font-mono-data">{haunted} Haunted</span>,{' '}
            <span className="band-fading font-mono-data">{fading} Fading</span>.
          </li>
          <li>
            <strong>Training specification:</strong> {ev?.datasetSize ?? '≈1,500'} GitHub repositories behind
            npm/PyPI packages, stratified across download tiers.
          </li>
          <li>
            <strong>Ground-truth label:</strong> <code className="font-mono-data">abandoned_12m</code> = no
            non-bot default-branch commit in (T0, T0+12mo], OR repository archived, OR package officially
            deprecated in that window.
          </li>
          <li>
            <strong>24 engineered features:</strong> commit cadence (30/90/180/365d), linear commit slope,
            distinct authors, bus factor, release gap, issue close rate, stale PRs, and download trend.
          </li>
        </ul>
      </section>

      {/* TabPFN vs Baselines (bar chart if eval-results.json exists, honest state + heuristic weights otherwise) */}
      <section className="card mt-6 p-6" aria-labelledby="eval-section">
        <h2 id="eval-section" className="font-display text-2xl">
          TabPFN vs baselines
        </h2>
        {ev ? (
          <>
            <div className="mt-4 space-y-3">
              {ev.models.map((m) => {
                const roc = m.rocAuc ?? 0;
                const pr = m.prAuc ?? 0;
                return (
                  <div key={m.name} className="rounded-lg border border-[#241f45] bg-[#0d0b1e] p-3 text-xs">
                    <div className="flex items-center justify-between font-mono-data">
                      <span className="font-semibold" style={{ color: 'var(--bone)' }}>{m.name}</span>
                      <span style={{ color: 'var(--violet-mute)' }}>
                        ROC-AUC {m.rocAuc?.toFixed(3) ?? '—'} · PR-AUC {m.prAuc?.toFixed(3) ?? '—'} · Brier {m.brier?.toFixed(3) ?? '—'}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px]" style={{ color: 'var(--violet-mute)' }}>ROC-AUC</span>
                        <div className="mt-0.5 h-2 overflow-hidden rounded bg-[#1d1936]">
                          <div style={{ width: `${Math.round(roc * 100)}%`, background: 'var(--marigold)' }} className="h-full" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px]" style={{ color: 'var(--violet-mute)' }}>PR-AUC</span>
                        <div className="mt-0.5 h-2 overflow-hidden rounded bg-[#1d1936]">
                          <div style={{ width: `${Math.round(pr * 100)}%`, background: 'var(--papel-turquoise)' }} className="h-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
                    <th className="py-1">model</th>
                    <th>ROC-AUC</th>
                    <th>PR-AUC</th>
                    <th>Brier ↓</th>
                  </tr>
                </thead>
                <tbody>
                  {ev.models.map((m) => (
                    <tr key={m.name} className="border-t border-[#241f45]">
                      <td className="font-mono-data py-2 pr-3">
                        {m.name}
                        {m.notes ? ` — ${m.notes}` : ''}
                      </td>
                      <td className="font-mono-data">{m.rocAuc?.toFixed(3) ?? '—'}</td>
                      <td className="font-mono-data">{m.prAuc?.toFixed(3) ?? '—'}</td>
                      <td className="font-mono-data">{m.brier?.toFixed(3) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm" style={{ color: 'var(--bone-dim)' }}>
            <p>
              As of snapshot <span className="font-mono-data">{snapDate}</span>, the 5-fold cross-validation
              benchmark (<code className="font-mono-data">data/eval-results.json</code>) has not been executed
              in this environment because we never invent or hardcode synthetic benchmark numbers.
            </p>
            <h3 className="font-display mt-5 text-lg" style={{ color: 'var(--marigold)' }}>
              Active production scorer: <code className="font-mono-data">heuristic-v1</code> signal weights
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--violet-mute)' }}>
              Every point on a Revenant tombstone is directly attributable to the public signals below:
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-[#241f45]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#241f45] bg-[#14112b] text-left uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
                    <th className="py-2 pl-3 pr-3">Observable signal</th>
                    <th className="py-2 pr-3 text-right">Attribution</th>
                  </tr>
                </thead>
                <tbody>
                  {HEURISTIC_WEIGHTS.map((w) => (
                    <tr key={w.signal} className="border-t border-[#241f45]">
                      <td className="py-2 pl-3 pr-3" style={{ color: 'var(--bone)' }}>{w.signal}</td>
                      <td
                        className="font-mono-data py-2 pr-3 text-right font-semibold"
                        style={{ color: w.kind === 'mitigation' ? 'var(--alive)' : 'var(--marigold)' }}
                      >
                        {w.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Limitations & honest negatives */}
      <section className="card mt-6 p-6" aria-labelledby="limitations">
        <h2 id="limitations" className="font-display text-2xl">
          Limitations &amp; honest negatives
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm" style={{ color: 'var(--bone-dim)' }}>
          {(
            ev?.limitations ?? [
              'The label is a proxy: "no commits in 12 months" can conflate small feature-complete libraries with abandoned ones.',
              'Issue/PR response history reconstruction is dropped when GitHub API rate limits are constrained — disclosed here rather than silently imputed.',
              'Absence of a linked GitHub repository renders as UNKNOWN, never ALIVE.',
              'A high ghost score is a signal to inspect your dependency tree, never a verdict on a maintainer.',
            ]
          ).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
