import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import { ScoredDep, BAND_LABEL } from '@/lib/types';

export const metadata = { title: 'Cementerio — the Graveyard Index' };
export const dynamic = 'force-dynamic';

interface Row {
  dep: { ecosystem: string; name: string };
  score: number;
  band: string;
  vitals: { daysSinceCommit?: number; weeklyDownloads?: number | null; archived?: boolean; deprecated?: boolean };
  epitaph?: string;
}

async function loadIndex(): Promise<{ generatedAt: string; rows: Row[] }> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'data', 'cementerio.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { generatedAt: '', rows: [] };
  }
}

export default async function Cementerio({ searchParams }: { searchParams: Promise<{ band?: string; q?: string }> }) {
  const { band, q } = await searchParams;
  const { generatedAt, rows } = await loadIndex();
  const filtered = rows.filter(
    (r) => (!band || r.band === band) && (!q || r.dep.name.toLowerCase().includes(q.toLowerCase())),
  );
  const departed = rows.filter((r) => r.band === 'departed').slice(0, 20);

  return (
    <div>
      <h1 className="font-display text-4xl">Cementerio</h1>
      <p className="mt-2 max-w-2xl" style={{ color: 'var(--bone-dim)' }}>
        The Graveyard Index — the most-depended-on packages in npm and PyPI, ranked by ghost risk.
        Refreshed nightly by the Temporal cron job. {generatedAt && `Snapshot ${new Date(generatedAt).toLocaleDateString()}, ${rows.length} packages.`}
      </p>

      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q} placeholder="filter by name" aria-label="filter by name"
          className="font-mono-data rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm" />
        {(['', 'departed', 'haunted', 'fading', 'alive'] as const).map((b) => (
          <button key={b || 'all'} name="band" value={b}
            className="rounded-md px-3 py-2 text-sm capitalize"
            style={{ background: band === b || (!band && !b) ? 'var(--marigold)' : 'var(--ink-3)', color: band === b || (!band && !b) ? 'var(--ink)' : 'var(--bone-dim)' }}>
            {b || 'all'}
          </button>
        ))}
      </form>

      {!band && !q && departed.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl">Recently departed</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {departed.slice(0, 10).map((r) => (
              <Link key={r.dep.name} href={`/grave/${r.dep.ecosystem}/${encodeURIComponent(r.dep.name)}`}
                className="card min-w-[180px] p-4 hover:border-[var(--marigold)]">
                <div className="font-display text-3xl band-departed">{r.score}</div>
                <div className="font-mono-data mt-1 truncate text-sm">{r.dep.name}</div>
                <div className="text-xs" style={{ color: 'var(--violet-mute)' }}>{r.dep.ecosystem}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
            <th className="py-2 pr-3">#</th><th className="py-2 pr-3">package</th><th className="py-2 pr-3">eco</th>
            <th className="py-2 pr-3">score</th><th className="py-2 pr-3">band</th><th className="py-2 pr-3">last commit</th>
            <th className="py-2 pr-3">downloads/wk</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 300).map((r, i) => (
            <tr key={`${r.dep.ecosystem}/${r.dep.name}`} className="border-t border-[#241f45]">
              <td className="font-mono-data py-2 pr-3 text-xs" style={{ color: 'var(--violet-mute)' }}>{i + 1}</td>
              <td className="py-2 pr-3">
                <Link className="font-mono-data hover:text-[var(--marigold)]" href={`/grave/${r.dep.ecosystem}/${encodeURIComponent(r.dep.name)}`}>
                  {r.dep.name}
                </Link>
              </td>
              <td className="py-2 pr-3" style={{ color: 'var(--violet-mute)' }}>{r.dep.ecosystem}</td>
              <td className={`font-mono-data py-2 pr-3 band-${r.band}`}>{r.score}</td>
              <td className={`py-2 pr-3 capitalize band-${r.band}`}>{BAND_LABEL[r.band as ScoredDep['band']]}</td>
              <td className="font-mono-data py-2 pr-3" style={{ color: 'var(--bone-dim)' }}>
                {r.vitals.daysSinceCommit !== undefined ? `${r.vitals.daysSinceCommit}d` : '—'}
                {r.vitals.archived ? ' ✝' : ''}{r.vitals.deprecated ? ' ⚠' : ''}
              </td>
              <td className="font-mono-data py-2" style={{ color: 'var(--bone-dim)' }}>
                {r.vitals.weeklyDownloads != null ? r.vitals.weeklyDownloads.toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && <p className="mt-8" style={{ color: 'var(--violet-mute)' }}>The cemetery is empty for that filter — the index refresh may not have run yet.</p>}
    </div>
  );
}
