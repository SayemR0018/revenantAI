import { Suspense } from 'react';
import Link from 'next/link';
import { ScoredDep, BAND_LABEL } from '@/lib/types';
import { loadCementerioIndex } from '@/lib/cementerio';
import { humanizeDays } from '@/lib/format';
import { CementerioSearch } from '@/components/CementerioSearch';

export const metadata = { title: 'Cementerio — the Graveyard Index' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

interface SearchParams {
  band?: string;
  eco?: string;
  q?: string;
  sort?: string;
  page?: string;
}

const GHOST_KIN_CLUSTERS = [
  {
    cluster: 'HTTP & Request Clients',
    kin: [
      { eco: 'npm', name: 'request' },
      { eco: 'npm', name: 'request-promise' },
    ],
    successor: 'undici / native fetch',
  },
  {
    cluster: 'Build & Stylesheet Toolchains',
    kin: [
      { eco: 'npm', name: 'node-sass' },
      { eco: 'npm', name: 'gulp-util' },
      { eco: 'npm', name: 'bower' },
    ],
    successor: 'sass (Dart Sass) / Vite',
  },
  {
    cluster: 'Legacy Test & Lint Runners',
    kin: [
      { eco: 'npm', name: 'tslint' },
      { eco: 'npm', name: 'protractor' },
      { eco: 'npm', name: 'istanbul' },
      { eco: 'pypi', name: 'nose' },
    ],
    successor: 'eslint / Playwright / pytest',
  },
];

export default async function Cementerio({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { band = '', eco = '', q = '', sort = 'score', page: pageParam = '1' } = await searchParams;
  const { generatedAt, isSeed, rows } = await loadCementerioIndex();
  const snapDate = generatedAt ? generatedAt.slice(0, 10) : '';

  const counts = {
    all: rows.length,
    departed: rows.filter((r) => r.band === 'departed').length,
    haunted: rows.filter((r) => r.band === 'haunted').length,
    fading: rows.filter((r) => r.band === 'fading').length,
    alive: rows.filter((r) => r.band === 'alive').length,
  };

  const filtered = rows
    .filter(
      (r) =>
        (!band || r.band === band) &&
        (!eco || r.dep.ecosystem === eco) &&
        (!q || r.dep.name.toLowerCase().includes(q.toLowerCase())),
    )
    .sort((a, b) => {
      if (sort === 'lastCommit') {
        return (b.vitals.daysSinceCommit ?? -1) - (a.vitals.daysSinceCommit ?? -1);
      }
      if (sort === 'downloads') {
        return (b.vitals.weeklyDownloads ?? -1) - (a.vitals.weeklyDownloads ?? -1);
      }
      if (sort === 'name') {
        return a.dep.name.localeCompare(b.dep.name);
      }
      return b.score - a.score;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, parseInt(pageParam, 10) || 1));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  const departed = rows.filter((r) => r.band === 'departed').slice(0, 10);

  function pageHref(nextPage: number) {
    const p = new URLSearchParams();
    if (band) p.set('band', band);
    if (eco) p.set('eco', eco);
    if (q) p.set('q', q);
    if (sort && sort !== 'score') p.set('sort', sort);
    if (nextPage > 1) p.set('page', String(nextPage));
    const s = p.toString();
    return s ? `/cementerio?${s}` : '/cementerio';
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl sm:text-4xl">Cementerio</h1>
        {snapDate && (
          <span
            className="font-mono-data rounded border border-[#35305c] bg-[#14112b] px-2.5 py-1 text-xs"
            style={{ color: 'var(--violet-mute)' }}
          >
            {isSeed ? `snapshot from ${snapDate}` : `live index · ${snapDate}`} · {rows.length} unique packages
          </span>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--bone-dim)' }}>
        The Graveyard Index — high-impact npm and PyPI packages ranked by ghost risk. Refreshed
        nightly by the Temporal cron job.
      </p>

      {/* Recently departed horizontal strip */}
      {!band && !q && departed.length > 0 && (
        <section className="mt-7" aria-labelledby="recently-departed">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="recently-departed" className="font-display text-xl">
              Recently departed &amp; archived memorials
            </h2>
            <span className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
              {counts.departed} in index
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {departed.slice(0, 4).map((r) => (
              <Link
                key={`${r.dep.ecosystem}/${r.dep.name}`}
                href={`/grave/${r.dep.ecosystem}/${encodeURIComponent(r.dep.name)}`}
                className="card flex flex-col justify-between p-4 transition-colors hover:border-[var(--marigold)]"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-data uppercase" style={{ color: 'var(--violet-mute)' }}>
                      {r.dep.ecosystem}
                    </span>
                    <span className="font-display text-2xl band-departed">{r.score}</span>
                  </div>
                  <div className="font-mono-data mt-1 truncate text-base font-semibold">
                    {r.dep.name}
                  </div>
                  {r.epitaph && (
                    <p className="mt-1.5 line-clamp-2 text-xs italic" style={{ color: 'var(--bone-dim)' }}>
                      “{r.epitaph}”
                    </p>
                  )}
                </div>
                <div className="font-mono-data mt-3 text-[11px]" style={{ color: 'var(--violet-mute)' }}>
                  {r.vitals.deprecated ? '⚠ deprecated' : r.vitals.archived ? '✝ archived' : 'departed'}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Plain GET form (works without JS, enhanced with debounced client input) */}
      <form className="card mt-7 flex flex-col gap-3 p-4" method="get" action="/cementerio">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by band">
            {(
              [
                ['', `All (${counts.all})`],
                ['departed', `Departed (${counts.departed})`],
                ['haunted', `Haunted (${counts.haunted})`],
                ['fading', `Fading (${counts.fading})`],
                ['alive', `Alive (${counts.alive})`],
              ] as const
            ).map(([b, label]) => {
              const active = band === b || (!band && !b);
              return (
                <button
                  key={b || 'all'}
                  type="submit"
                  name="band"
                  value={b}
                  className="font-mono-data min-h-[40px] rounded-md px-3 py-1.5 text-xs transition-colors"
                  style={{
                    background: active ? 'var(--marigold)' : 'var(--ink-3)',
                    color: active ? 'var(--ink)' : 'var(--bone-dim)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Suspense
              fallback={
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Filter by package name…"
                  aria-label="Filter by package name"
                  className="font-mono-data min-h-[42px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-3 py-2 text-sm"
                />
              }
            >
              <CementerioSearch key={q} defaultValue={q} />
            </Suspense>

            <label htmlFor="cem-eco" className="sr-only">
              Ecosystem
            </label>
            <select
              id="cem-eco"
              name="eco"
              defaultValue={eco}
              aria-label="Ecosystem"
              className="font-mono-data min-h-[42px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-2.5 py-2 text-xs"
            >
              <option value="">All ecosystems</option>
              <option value="npm">npm</option>
              <option value="pypi">pypi</option>
            </select>

            <label htmlFor="cem-sort" className="sr-only">
              Sort order
            </label>
            <select
              id="cem-sort"
              name="sort"
              defaultValue={sort}
              aria-label="Sort order"
              className="font-mono-data min-h-[42px] rounded-md border border-[#35305c] bg-[#0d0b1e] px-2.5 py-2 text-xs"
            >
              <option value="score">Sort: Ghost score</option>
              <option value="lastCommit">Sort: Oldest commit</option>
              <option value="downloads">Sort: Weekly downloads</option>
              <option value="name">Sort: Package name</option>
            </select>

            <button
              type="submit"
              className="font-mono-data min-h-[42px] rounded-md border border-[#35305c] bg-[#1d1936] px-3 py-2 text-xs hover:border-[var(--marigold)]"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      {/* Mobile compact card list (< sm) */}
      <ol className="mt-6 space-y-2.5 sm:hidden" aria-label="Packages in index">
        {pageRows.map((r, i) => {
          const rank = startIdx + i + 1;
          const vb = r.error ? 'unknown' : r.band;
          return (
            <li key={`${r.dep.ecosystem}/${r.dep.name}`} className="card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono-data mr-2 text-xs" style={{ color: 'var(--violet-mute)' }}>
                    #{rank}
                  </span>
                  <Link
                    href={`/grave/${r.dep.ecosystem}/${encodeURIComponent(r.dep.name)}`}
                    className="font-mono-data text-base font-semibold hover:text-[var(--marigold)]"
                  >
                    {r.dep.name}
                  </Link>
                  <span className="font-mono-data ml-2 text-xs" style={{ color: 'var(--violet-mute)' }}>
                    {r.dep.ecosystem}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-display text-xl band-${vb}`}>{r.error ? '?' : r.score}</span>
                  <span className={`ml-1.5 text-[10px] font-semibold uppercase band-${vb}`}>
                    {BAND_LABEL[vb as ScoredDep['band']]}
                  </span>
                </div>
              </div>
              <div className="font-mono-data mt-2 flex flex-wrap gap-x-3 text-xs" style={{ color: 'var(--bone-dim)' }}>
                <span>commit: {humanizeDays(r.vitals.daysSinceCommit)}</span>
                {r.vitals.weeklyDownloads != null && (
                  <span>· {r.vitals.weeklyDownloads.toLocaleString()}/wk</span>
                )}
                {r.vitals.archived && <span>· ✝ archived</span>}
                {r.vitals.deprecated && <span>· ⚠ deprecated</span>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Desktop / Tablet sticky-column table (sm+) */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-[#241f45] sm:block">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr
              className="border-b border-[#241f45] bg-[#14112b] text-left text-xs uppercase tracking-wider"
              style={{ color: 'var(--violet-mute)' }}
            >
              <th className="py-2.5 pl-3 pr-3">#</th>
              <th className="sticky left-0 bg-[#14112b] py-2.5 pr-3">package</th>
              <th className="py-2.5 pr-3">eco</th>
              <th className="py-2.5 pr-3">score</th>
              <th className="py-2.5 pr-3">band</th>
              <th className="py-2.5 pr-3">last commit</th>
              <th className="py-2.5 pr-3">downloads/wk</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              const rank = startIdx + i + 1;
              const vb = r.error ? 'unknown' : r.band;
              return (
                <tr key={`${r.dep.ecosystem}/${r.dep.name}`} className="border-t border-[#241f45]">
                  <td className="font-mono-data py-2.5 pl-3 pr-3 text-xs" style={{ color: 'var(--violet-mute)' }}>
                    {rank}
                  </td>
                  <td className="sticky left-0 bg-[#0d0b1e] py-2.5 pr-3">
                    <Link
                      className="font-mono-data font-medium hover:text-[var(--marigold)]"
                      href={`/grave/${r.dep.ecosystem}/${encodeURIComponent(r.dep.name)}`}
                    >
                      {r.dep.name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3" style={{ color: 'var(--violet-mute)' }}>
                    {r.dep.ecosystem}
                  </td>
                  <td className={`font-mono-data py-2.5 pr-3 font-semibold band-${vb}`}>
                    {r.error ? '?' : r.score}
                  </td>
                  <td className={`py-2.5 pr-3 capitalize band-${vb}`}>
                    {BAND_LABEL[vb as ScoredDep['band']]}
                  </td>
                  <td className="font-mono-data py-2.5 pr-3" style={{ color: 'var(--bone-dim)' }}>
                    {r.vitals.daysSinceCommit !== undefined ? humanizeDays(r.vitals.daysSinceCommit) : '—'}
                    {r.vitals.archived ? ' ✝' : ''}
                    {r.vitals.deprecated ? ' ⚠' : ''}
                  </td>
                  <td className="font-mono-data py-2.5 pr-3" style={{ color: 'var(--bone-dim)' }}>
                    {r.vitals.weeklyDownloads != null ? r.vitals.weeklyDownloads.toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!filtered.length && (
        <p className="mt-8 text-sm" style={{ color: 'var(--violet-mute)' }}>
          No packages in the Graveyard Index match that filter.
        </p>
      )}

      {/* Pagination bar (25 per page) */}
      {filtered.length > PAGE_SIZE && (
        <nav
          className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#241f45] pt-4 text-xs"
          aria-label="Cementerio pagination"
        >
          <span className="font-mono-data" style={{ color: 'var(--violet-mute)' }}>
            Showing {startIdx + 1}–{Math.min(filtered.length, startIdx + PAGE_SIZE)} of {filtered.length} packages (page {currentPage} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Link
                href={pageHref(currentPage - 1)}
                className="card inline-flex min-h-[40px] items-center px-3.5 py-1.5 font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
              >
                ← Previous 25
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={pageHref(currentPage + 1)}
                className="card inline-flex min-h-[40px] items-center px-3.5 py-1.5 font-medium hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
              >
                Next 25 →
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Ghost Kin clusters */}
      <section className="mt-12" aria-labelledby="ghost-kin">
        <h2 id="ghost-kin" className="font-display text-2xl">
          Ghost kin — related departed families
        </h2>
        <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--bone-dim)' }}>
          Packages that went quiet during the same platform transition often haunt the same manifests.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {GHOST_KIN_CLUSTERS.map((g) => (
            <div key={g.cluster} className="card p-4">
              <div className="font-display text-lg" style={{ color: 'var(--marigold)' }}>
                {g.cluster}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {g.kin.map((k) => (
                  <Link
                    key={`${k.eco}/${k.name}`}
                    href={`/grave/${k.eco}/${k.name}`}
                    className="font-mono-data rounded border border-[#35305c] bg-[#0d0b1e] px-2 py-1 text-xs hover:border-[var(--marigold)] hover:text-[var(--marigold)]"
                  >
                    {k.eco}/{k.name}
                  </Link>
                ))}
              </div>
              <p className="font-mono-data mt-3 text-xs" style={{ color: 'var(--alive)' }}>
                Living path: {g.successor}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
