'use client';
import { useState, useSyncExternalStore } from 'react';
import { Contributor, VitalSigns } from '@/lib/types';

// Día de los Muertos 3-tier ofrenda altar: papel picado, marigold petals,
// contributors as candles scaled by commit share, plus a local "Light a candle" ritual.
export function Ofrenda({
  contributors,
  vitals,
  name,
}: {
  contributors: Contributor[];
  vitals: VitalSigns;
  name: string;
}) {
  const storageKey = `revenant:candle:${name}`;
  const persistedLit = useSyncExternalStore(
    (cb) => {
      window.addEventListener('storage', cb);
      return () => window.removeEventListener('storage', cb);
    },
    () => {
      try {
        return localStorage.getItem(storageKey) === '1';
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [justLit, setJustLit] = useState(false);
  const lit = persistedLit || justLit;

  function lightCandle() {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
    setJustLit(true);
  }

  const candles = contributors.slice(0, 10);
  const maxCommits = Math.max(1, ...candles.map((c) => c.commits ?? 1));

  // Distribute contributors across 3 altar tiers (top tier: 1-2, middle: up to 4, lower: remaining)
  const tier1 = candles.slice(0, Math.min(2, candles.length));
  const tier2 = candles.slice(tier1.length, tier1.length + 4);
  const tier3 = candles.slice(tier1.length + tier2.length);
  const tiers = [
    { level: 1, label: 'Upper tier · Lead stewards', items: tier1, widthClass: 'max-w-xl' },
    { level: 2, label: 'Middle tier · Core contributors', items: tier2, widthClass: 'max-w-3xl' },
    { level: 3, label: 'Lower tier · Community builders', items: tier3, widthClass: 'max-w-5xl' },
  ].filter((t) => t.items.length > 0);

  return (
    <section className="card mt-8 overflow-hidden p-0" aria-labelledby="ofrenda">
      {/* Decorative papel picado & marigold garland header */}
      <div className="bg-[#191438] px-5 pt-5 pb-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--papel-magenta)' }}>
              Día de los Muertos · Altar of Remembrance
            </p>
            <h2 id="ofrenda" className="font-display mt-1 text-2xl sm:text-3xl" style={{ color: 'var(--marigold)' }}>
              Ofrenda
            </h2>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--bone-dim)' }}>
              Every candle represents a person who gave time to {name}. In the Día de los Muertos
              tradition, an ofrenda welcomes back the memory of those who came before — honoring the
              hands that built the software we rely on.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={lightCandle}
              disabled={lit}
              aria-pressed={lit}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold transition-all"
              style={{
                borderColor: lit ? 'var(--marigold)' : '#443d76',
                background: lit ? 'rgba(242, 163, 60, 0.16)' : '#14112b',
                color: lit ? 'var(--marigold)' : 'var(--bone)',
              }}
            >
              <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
                <path
                  d="M7 1C7 1 10 3.8 10 6C10 7.7 8.7 9 7 9C5.3 9 4 7.7 4 6C4 3.8 7 1 7 1Z"
                  fill={lit ? 'var(--candle)' : '#a79ed1'}
                />
                <rect x="4.5" y="9.5" width="5" height="7.5" rx="1" fill="#f4ecd8" />
              </svg>
              <span>{lit ? '✓ Your candle is lit on this altar' : 'Light a candle in gratitude'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Tiered Altar */}
      <div className="px-4 py-6 sm:px-6">
        {candles.length > 0 ? (
          <div className="space-y-4">
            {tiers.map((tier, tIdx) => (
              <div
                key={tier.level}
                className={`mx-auto ${tier.widthClass} rounded-xl border border-[#35305c] bg-gradient-to-b from-[#1d1936] to-[#131029] px-4 pt-6 pb-4 shadow-lg`}
              >
                <div className="mb-3 flex items-center justify-between border-b border-[#2c2752] pb-2">
                  <span className="font-mono-data text-[11px] uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
                    {tier.label}
                  </span>
                  {/* Marigold petals along each tier step */}
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {[0, 1, 2, 3].map((p) => (
                      <span
                        key={p}
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: p % 2 === 0 ? 'var(--marigold)' : 'var(--marigold-deep)' }}
                      />
                    ))}
                  </div>
                </div>

                <ol className="flex flex-wrap items-end justify-center gap-x-6 gap-y-8 pt-4 sm:gap-x-10">
                  {tier.items.map((c, i) => {
                    const share = c.commits ? Math.max(0.72, Math.min(1.15, 0.72 + (c.commits / maxCommits) * 0.43)) : 0.88;
                    const rank = tIdx === 0 ? i + 1 : tIdx === 1 ? tier1.length + i + 1 : tier1.length + tier2.length + i + 1;
                    const profileUrl = c.url ?? `https://github.com/${c.handle}`;
                    return (
                      <li key={c.handle} className="group flex flex-col items-center text-center">
                        <div
                          className="candle"
                          style={{
                            animationDelay: `${((rank - 1) % 5) * 0.35}s`,
                            transform: `scale(${share.toFixed(2)})`,
                          }}
                          aria-hidden="true"
                        />
                        <a
                          href={profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={`#${rank} ${c.handle}${c.commits != null ? ` (${c.commits.toLocaleString()} commits)` : ''}`}
                          className="mt-4 rounded border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1 transition-colors group-hover:border-[var(--marigold)] focus:border-[var(--marigold)]"
                        >
                          <span className="font-mono-data block max-w-[120px] truncate text-xs font-medium group-hover:text-[var(--marigold)]">
                            @{c.handle}
                          </span>
                          <span className="font-mono-data block text-[10px]" style={{ color: 'var(--violet-mute)' }}>
                            {c.commits != null ? `${c.commits.toLocaleString()} commits` : 'maintainer'}
                          </span>
                        </a>
                      </li>
                    );
                  })}

                  {/* Visitor's lit candle appears on the upper tier */}
                  {tIdx === 0 && lit && (
                    <li className="flex flex-col items-center text-center">
                      <div className="candle" aria-hidden="true" />
                      <div
                        className="mt-4 rounded border px-2.5 py-1"
                        style={{ borderColor: 'var(--marigold)', background: '#0d0b1e' }}
                      >
                        <span className="font-mono-data block text-xs font-medium" style={{ color: 'var(--marigold)' }}>
                          Visiting developer
                        </span>
                        <span className="font-mono-data block text-[10px]" style={{ color: 'var(--bone-dim)' }}>
                          lit in gratitude
                        </span>
                      </div>
                    </li>
                  )}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-xl border border-[#35305c] bg-[#1d1936] p-6 text-center">
            <div className="mx-auto flex justify-center pt-3" aria-hidden="true">
              <div className="candle" />
            </div>
            <p className="mt-5 text-sm" style={{ color: 'var(--bone-dim)' }}>
              Contributor records unavailable — a single candle burns in their honor.
            </p>
          </div>
        )}

        {/* What it gave the world */}
        <div className="mt-6 grid gap-4 border-t border-[#2c2752] pt-5 sm:grid-cols-3">
          <div className="rounded-lg bg-[#0d0b1e] p-3.5">
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
              It gave the world
            </div>
            <div className="font-mono-data mt-1 text-base" style={{ color: 'var(--marigold)' }}>
              {vitals.weeklyDownloads != null
                ? `${vitals.weeklyDownloads.toLocaleString()} downloads/week`
                : 'not enough data'}
            </div>
          </div>
          <div className="rounded-lg bg-[#0d0b1e] p-3.5">
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
              Depended on by
            </div>
            <div className="font-mono-data mt-1 text-base">
              {vitals.dependents != null
                ? `${vitals.dependents.toLocaleString()} public repos`
                : 'not enough data'}
            </div>
          </div>
          <div className="rounded-lg bg-[#0d0b1e] p-3.5">
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
              Years of service
            </div>
            <div className="font-mono-data mt-1 text-base">
              {vitals.yearsActive ? `${Math.max(1, Math.round(vitals.yearsActive))} years` : 'not enough data'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
