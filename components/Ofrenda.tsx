import { Contributor, VitalSigns } from '@/lib/types';

// Día de los Muertos ofrenda: contributors as candles, what the project gave the world.
export function Ofrenda({ contributors, vitals, name }: { contributors: Contributor[]; vitals: VitalSigns; name: string }) {
  const candles = contributors.slice(0, 10);
  return (
    <section className="card mt-8 p-6" aria-labelledby="ofrenda">
      <h2 id="ofrenda" className="font-display text-2xl" style={{ color: 'var(--marigold)' }}>
        Ofrenda
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--violet-mute)' }}>
        Every candle is a person who gave time to {name}. In the Día de los Muertos tradition,
        an ofrenda honors those who came before — these are the hands that built what you use.
      </p>
      {candles.length ? (
        <ol className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-10">
          {candles.map((c, i) => (
            <li key={c.handle} className="flex flex-col items-center">
              <div className="candle" style={{ animationDelay: `${(i % 5) * 0.4}s`, transform: `scale(${1 - Math.min(i, 7) * 0.06})` }} aria-hidden />
              <a
                href={c.url ?? `https://github.com/${c.handle}`}
                target="_blank" rel="noreferrer"
                className="font-mono-data mt-6 max-w-[90px] truncate text-xs hover:text-[var(--marigold)]"
                title={c.handle}
              >
                {c.handle}
              </a>
              {c.commits != null && <span className="font-mono-data text-[10px]" style={{ color: 'var(--violet-mute)' }}>{c.commits} commits</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-sm" style={{ color: 'var(--bone-dim)' }}>Contributor records unavailable — the candles are lit anyway.</p>
      )}
      <div className="mt-8 grid gap-4 border-t border-[#2c2752] pt-5 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>it gave the world</div>
          <div className="font-mono-data mt-1">
            {vitals.weeklyDownloads != null ? `${vitals.weeklyDownloads.toLocaleString()} downloads/week` : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>depended on by</div>
          <div className="font-mono-data mt-1">{vitals.dependents != null ? `${vitals.dependents.toLocaleString()} repos` : '—'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>years of service</div>
          <div className="font-mono-data mt-1">{vitals.yearsActive ? `${Math.round(vitals.yearsActive)}` : '—'}</div>
        </div>
      </div>
    </section>
  );
}
