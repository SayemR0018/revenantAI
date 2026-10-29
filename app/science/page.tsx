import { promises as fs } from 'fs';
import path from 'path';
import { Metadata } from 'next';

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

export default async function SciencePage() {
  const ev = await loadEval();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl">The Science</h1>
      <p className="mt-3" style={{ color: 'var(--bone-dim)' }}>
        The ghost score predicts <em>P(a project is abandoned within 12 months)</em> using{' '}
        <strong>TabPFN</strong>, an open-weight tabular foundation model, trained on repository history
        reconstructed at snapshot date T0&nbsp;=&nbsp;2025-10-27. No current stars or forks are used — that would
        leak the future.
      </p>

      <section className="card mt-8 p-6">
        <h2 className="font-display text-2xl">Dataset card</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--bone-dim)' }}>
          <li>{ev?.datasetSize ?? '≈1,500'} GitHub repositories behind npm/PyPI packages, stratified by popularity tier</li>
          <li>Label: no non-bot default-branch commit in (T0, T0+12mo], or archived, or registry-deprecated</li>
          <li>Features: commit cadence, authors, bus factor, release gap, issue/PR response, downloads trend — all computed only from pre-T0 events</li>
          <li>Stratified {ev?.folds ?? 5}-fold CV; metrics: ROC-AUC, PR-AUC, Brier + calibration</li>
        </ul>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-display text-2xl">TabPFN vs baselines</h2>
        {ev ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
                <th className="py-1">model</th><th>ROC-AUC</th><th>PR-AUC</th><th>Brier ↓</th>
              </tr>
            </thead>
            <tbody>
              {ev.models.map((m) => (
                <tr key={m.name} className="border-t border-[#241f45]">
                  <td className="font-mono-data py-2 pr-3">{m.name}{m.notes ? ` — ${m.notes}` : ''}</td>
                  <td className="font-mono-data">{m.rocAuc?.toFixed(3) ?? '—'}</td>
                  <td className="font-mono-data">{m.prAuc?.toFixed(3) ?? '—'}</td>
                  <td className="font-mono-data">{m.brier?.toFixed(3) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-4 text-sm" style={{ color: 'var(--bone-dim)' }}>
            Evaluation has not run yet in this deployment. Run <code className="font-mono-data">python -m ml.eval</code> — results land in <code className="font-mono-data">data/eval-results.json</code> and render here verbatim, including honest negative results.
          </p>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-display text-2xl">Limitations & honest negatives</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--bone-dim)' }}>
          {(ev?.limitations ?? [
            'The label is a proxy: "no commits" conflates finished with abandoned.',
            'Issue/PR response features are dropped when history reconstruction exceeds the 6h dataset budget — stated reduction, not hidden.',
            'A high score is a signal to investigate, never a verdict on a maintainer.',
          ]).map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>
    </div>
  );
}
