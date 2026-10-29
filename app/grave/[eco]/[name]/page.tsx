import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTombstone } from '@/lib/tombstones';
import {
  Ecosystem,
  BAND_LABEL,
  ScoredDep,
  CauseOfDeath,
  EvidenceItem,
  visualBandFor,
} from '@/lib/types';
import { heuristicScore } from '@/lib/score';
import { humanizeDays } from '@/lib/format';
import { PulseSparkline } from '@/components/PulseSparkline';
import { Ofrenda } from '@/components/Ofrenda';
import { SeanceChat } from '@/components/SeanceChat';
import { SupportLinks } from '@/components/SupportLinks';
import { TombstoneShare } from '@/components/TombstoneShare';
import { TombstoneResurrectTrigger } from '@/components/TombstoneResurrectTrigger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Props {
  params: Promise<{ eco: string; name: string }>;
}

const CAUSE_META: Record<CauseOfDeath, { title: string; summary: string }> = {
  deprecated_official: {
    title: 'Officially Deprecated',
    summary:
      'The maintainers published a formal registry deprecation notice guiding users toward newer alternatives.',
  },
  archived_by_author: {
    title: 'Archived by Maintainers',
    summary:
      'The repository was intentionally placed in read-only archive mode after completing its service.',
  },
  maintainer_burnout: {
    title: 'Unanswered Backlog & Maintainer Fatigue',
    summary:
      'Commits stopped while open issues accumulated without response — a signal that maintainers stepped back.',
  },
  superseded: {
    title: 'Superseded by Modern Alternatives',
    summary:
      'Development quieted while ecosystem adoption shifted toward newer libraries or built-in platform APIs.',
  },
  company_pulled: {
    title: 'Corporate Sponsor Stepped Back',
    summary:
      'Organizational backing ended while the open-source code remained public.',
  },
  ecosystem_shift: {
    title: 'Platform Era Shift',
    summary:
      'The surrounding runtime or toolchain evolved past the problem this package originally solved.',
  },
  slow_decay: {
    title: 'Gradual Dormancy',
    summary:
      'No sudden announcement — commits and releases gradually spaced out until activity went quiet.',
  },
  alive: {
    title: 'Active & Maintained',
    summary:
      'Recent commits, releases, or maintainer activity indicate a healthy, living project.',
  },
  unknown: {
    title: 'Inconclusive Public Signals',
    summary:
      'Public registries and repository metadata did not contain enough evidence to classify activity.',
  },
};

const KIND_LABEL: Record<EvidenceItem['kind'], string> = {
  commit: 'Commit',
  release: 'Release',
  issue: 'Issue',
  pr: 'Pull Request',
  registry: 'Registry',
  repo_meta: 'Repository',
  news: 'Announcement',
  readme: 'README',
  archive: 'Archive',
};

const FEATURE_LABEL: Record<string, string> = {
  archived: 'Repository archived (read-only)',
  deprecated: 'Registry deprecation flag',
  daysSinceCommit: 'Time since last commit',
  daysSinceRelease: 'Time since last release',
  busFactor: 'High single-author concentration',
  authors365: 'Zero active authors in past year',
  issueCloseRate: 'Low 180-day issue resolution rate',
  stalePrs: 'Stale open pull requests',
  downloadsTrend: 'Declining download trend',
  recentActivity: 'Recent commit activity (mitigation)',
  recentRelease: 'Recent release published (mitigation)',
  tabpfn: 'TabPFN calibrated abandonment probability',
};

const GLOW_COLOR: Record<string, string> = {
  alive: 'rgba(82, 209, 112, 0.22)',
  fading: 'rgba(242, 189, 73, 0.22)',
  haunted: 'rgba(255, 140, 66, 0.25)',
  departed: 'rgba(197, 148, 255, 0.28)',
  unknown: 'rgba(176, 168, 209, 0.18)',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eco, name } = await params;
  if (eco !== 'npm' && eco !== 'pypi') notFound();
  const n = decodeURIComponent(name);
  const t = await getTombstone(eco as Ecosystem, n);
  if (!t) notFound();
  const ogImg = `/api/og/${eco}/${encodeURIComponent(n)}`;
  return {
    title: `${n} — tombstone`,
    description: `Ghost score, cause of death, epitaph and ofrenda for ${n} (${eco}).`,
    openGraph: {
      title: `${n} (${eco}) — Revenant Tombstone`,
      description: `Ghost score, cause of death, epitaph and ofrenda for ${n} (${eco}). Signals, not verdicts.`,
      images: [{ url: ogImg, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${n} (${eco}) — Revenant Tombstone`,
      description: `Ghost score, cause of death, epitaph and ofrenda for ${n} (${eco}).`,
      images: [ogImg],
    },
  };
}

export default async function GravePage({ params }: Props) {
  const { eco, name } = await params;
  if (eco !== 'npm' && eco !== 'pypi') notFound();
  const n = decodeURIComponent(name);
  const t = await getTombstone(eco as Ecosystem, n);
  if (!t) notFound();
  return <Tombstone t={t} />;
}

function Tombstone({ t }: { t: ScoredDep }) {
  const v = t.vitals;
  const vb = visualBandFor(t);
  const years = v.yearsActive ? Math.max(1, Math.round(v.yearsActive)) : null;
  const noData = (
    <span className="text-sm font-normal" style={{ color: 'var(--violet-mute)' }}>
      not enough data
    </span>
  );

  const causeKey: CauseOfDeath = t.autopsy?.causeOfDeath ?? (vb === 'alive' ? 'alive' : 'unknown');
  const causeInfo = CAUSE_META[causeKey] ?? CAUSE_META.unknown;

  const fallbackHeuristic = heuristicScore(v);
  const contributions = t.contributions?.length ? t.contributions : fallbackHeuristic.contributions;
  const modelName = t.model ?? fallbackHeuristic.model;

  return (
    <article>
      {/* Tombstone Hero */}
      <div className="grid items-start gap-8 md:grid-cols-[270px_1fr]">
        <div
          className="tombstone mx-auto flex w-full max-w-[260px] flex-col items-center justify-center px-6 py-8 text-center"
          style={{
            boxShadow: `inset 0 1px 0 #443d76, 0 12px 42px ${GLOW_COLOR[vb] ?? GLOW_COLOR.unknown}`,
          }}
        >
          <div className="font-mono-data text-[11px] uppercase tracking-[0.28em]" style={{ color: 'var(--violet-mute)' }}>
            {t.dep.ecosystem}
          </div>
          <div className={`font-display mt-1 text-6xl sm:text-7xl band-${vb}`}>
            {t.error ? '?' : t.score}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.28em]" style={{ color: 'var(--violet-mute)' }}>
            ghost score
          </div>
          <div className={`mt-2.5 text-lg font-semibold uppercase tracking-wider band-${vb}`}>
            {BAND_LABEL[vb]}
          </div>
          {t.error && (
            <div className="mt-2 px-2 text-xs" style={{ color: 'var(--bone-dim)' }}>
              We couldn&apos;t find enough public signals
            </div>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {v.archived && (
              <span className="font-mono-data rounded border border-[#35305c] bg-[#0d0b1e] px-2 py-0.5 text-[11px]" style={{ color: 'var(--departed)' }}>
                ✝ archived
              </span>
            )}
            {v.deprecated && (
              <span className="font-mono-data rounded border border-[#35305c] bg-[#0d0b1e] px-2 py-0.5 text-[11px]" style={{ color: 'var(--haunted)' }}>
                ⚠ deprecated
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono-data text-sm" style={{ color: 'var(--marigold)' }}>
              {t.dep.ecosystem} package memorial
            </p>
            <details className="relative text-xs">
              <summary
                className="font-mono-data cursor-pointer rounded border border-[#35305c] bg-[#14112b] px-2.5 py-1.5 hover:border-[var(--marigold)]"
                style={{ color: 'var(--bone-dim)' }}
              >
                ℹ︎ How to read this score
              </summary>
              <div className="card mt-2 max-w-md p-3.5 text-xs leading-relaxed" style={{ color: 'var(--bone-dim)' }}>
                <strong style={{ color: 'var(--marigold)' }}>Signals, not verdicts.</strong> A ghost
                score (0–100) estimates the probability that a repository will go 12 months without a
                non-bot commit, become archived, or be deprecated. A high score is a prompt to check
                your dependency health — never an accusation against its maintainers.
              </div>
            </details>
          </div>

          <h1 className="font-display mt-1 break-words text-3xl sm:text-5xl">{t.dep.name}</h1>

          {t.autopsy?.epitaph && (
            <blockquote
              className="font-display mt-4 border-l-2 pl-4 text-lg italic sm:text-xl"
              style={{ borderColor: 'var(--marigold)', color: 'var(--bone-dim)' }}
            >
              “{t.autopsy.epitaph}”
            </blockquote>
          )}

          <p className="font-mono-data mt-3 text-xs" style={{ color: 'var(--violet-mute)' }}>
            epitaph by {t.autopsy?.generatedBy ?? 'fallback-rules'} · model {modelName} · signals, not verdicts
            {t.snapshotAt ? ` · snapshot from ${t.snapshotAt.slice(0, 10)}` : ''}
          </p>

          {t.autopsy?.lastWords && (
            <p className="mt-4 text-sm" style={{ color: 'var(--bone-dim)' }}>
              <span style={{ color: 'var(--violet-mute)' }}>Last words: </span>
              {t.autopsy.lastWordsUrl ? (
                <a
                  className="font-mono-data underline hover:text-[var(--marigold)]"
                  href={t.autopsy.lastWordsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  “{t.autopsy.lastWords}”
                </a>
              ) : (
                <span className="font-mono-data">“{t.autopsy.lastWords}”</span>
              )}
            </p>
          )}

          {(vb === 'departed' || vb === 'haunted' || (t.successors && t.successors.length > 0)) && (
            <div className="mt-5">
              <TombstoneResurrectTrigger dep={t} />
            </div>
          )}
        </div>
      </div>

      {/* Vital signs with threshold meters and plain-language hints */}
      <section className="card mt-10 p-6" aria-labelledby="vitals">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="vitals" className="font-display text-2xl">
            Vital signs
          </h2>
          <span className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>
            hover or focus any vital for threshold guidance
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Vital
            label="commit pulse (26 wks)"
            meaning="Weekly commit cadence over the last 6 months; flatlined means 0 recent commits."
          >
            <PulseSparkline data={v.commitsPerWeek} width={140} height={28} />
          </Vital>

          <Vital
            label="last commit"
            meaning="Threshold: >365 days without a commit strongly elevates ghost risk."
            meterPct={v.daysSinceCommit !== undefined ? Math.min(100, Math.round((v.daysSinceCommit / 730) * 100)) : undefined}
            meterWarn={v.daysSinceCommit !== undefined && v.daysSinceCommit > 365}
          >
            {v.daysSinceCommit !== undefined ? humanizeDays(v.daysSinceCommit) : noData}
          </Vital>

          <Vital
            label="release gap"
            meaning="Threshold: >365 days since the latest registry release."
            meterPct={v.daysSinceRelease !== undefined ? Math.min(100, Math.round((v.daysSinceRelease / 730) * 100)) : undefined}
            meterWarn={v.daysSinceRelease !== undefined && v.daysSinceRelease > 365}
          >
            {v.daysSinceRelease !== undefined ? humanizeDays(v.daysSinceRelease, '') : noData}
          </Vital>

          <Vital
            label="bus factor"
            meaning="Share of commits by the single top author; >=80% means reliance on one person."
            meterPct={v.busFactor !== undefined ? Math.round(v.busFactor * 100) : undefined}
            meterWarn={v.busFactor !== undefined && v.busFactor >= 0.8}
          >
            {v.busFactor !== undefined ? `${Math.round(v.busFactor * 100)}% top author` : noData}
          </Vital>

          <Vital
            label="issue close rate"
            meaning="Share of issues closed over the past year; <25% can signal backlog pressure."
            meterPct={v.issueCloseRate180 != null ? Math.round(v.issueCloseRate180 * 100) : undefined}
            meterWarn={v.issueCloseRate180 != null && v.issueCloseRate180 < 0.25}
          >
            {v.issueCloseRate180 != null ? `${Math.round(v.issueCloseRate180 * 100)}%` : noData}
          </Vital>

          <Vital
            label="weekly downloads"
            meaning="Recent weekly downloads from the package registry."
          >
            {v.weeklyDownloads != null ? v.weeklyDownloads.toLocaleString() : noData}
          </Vital>

          <Vital
            label="dependents"
            meaning="Public repositories or packages that depend on this project."
          >
            {v.dependents != null ? v.dependents.toLocaleString() : noData}
          </Vital>

          <Vital
            label="years active"
            meaning="Time elapsed since the package's first recorded release."
          >
            {years !== null ? `${years} ${years === 1 ? 'year' : 'years'}` : noData}
          </Vital>
        </div>
      </section>

      {/* Score breakdown: horizontal contribution bar chart */}
      {!t.error && contributions.length > 0 && (
        <section className="card mt-8 p-6" aria-labelledby="score-breakdown">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="score-breakdown" className="font-display text-2xl">
                What pushed this score up or down
              </h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--bone-dim)' }}>
                Transparent signal attribution — positive points increase ghost risk, green negative points reflect active mitigations.
              </p>
            </div>
            <span className="font-mono-data rounded border border-[#35305c] bg-[#0d0b1e] px-2.5 py-1 text-xs" style={{ color: 'var(--marigold)' }}>
              model: {modelName}
            </span>
          </div>

          <ul className="mt-4 space-y-2.5">
            {contributions.map((c, idx) => {
              const isMitigation = c.points < 0;
              const pct = Math.min(100, Math.max(8, Math.round((Math.abs(c.points) / 70) * 100)));
              return (
                <li key={`${c.feature}-${idx}`} className="grid items-center gap-2 text-xs sm:grid-cols-[240px_1fr_64px]">
                  <span style={{ color: 'var(--bone)' }}>
                    {FEATURE_LABEL[c.feature] ?? c.feature}
                  </span>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0d0b1e]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: isMitigation ? 'var(--alive)' : c.points >= 50 ? 'var(--departed)' : 'var(--haunted)',
                      }}
                    />
                  </div>
                  <span
                    className="font-mono-data text-right font-semibold"
                    style={{ color: isMitigation ? 'var(--alive)' : 'var(--marigold)' }}
                  >
                    {c.points > 0 ? `+${c.points}` : c.points} pts
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cause of death & Living successors */}
      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-2xl">Cause of death</h2>
          <p className="mt-2 text-lg font-medium" style={{ color: 'var(--marigold)' }}>
            {causeInfo.title}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--bone-dim)' }}>
            {causeInfo.summary}
          </p>

          <ol className="mt-4 space-y-2.5 text-sm" style={{ color: 'var(--bone-dim)' }}>
            {t.evidence.map((e, idx) => (
              <li
                key={e.id}
                id={`evidence-${e.id}`}
                className="rounded-lg border border-[#241f45] bg-[#0d0b1e] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-mono-data rounded bg-[#1d1936] px-2 py-0.5 text-[11px] font-semibold uppercase"
                    style={{ color: 'var(--marigold)' }}
                  >
                    #{idx + 1} · {KIND_LABEL[e.kind] ?? e.kind}
                  </span>
                  {e.url ? (
                    <a
                      className="font-medium underline hover:text-[var(--marigold)]"
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.label}
                    </a>
                  ) : (
                    <span className="font-medium" style={{ color: 'var(--bone)' }}>
                      {e.label}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--bone-dim)' }}>
                  {e.detail}
                </p>
              </li>
            ))}
            {!t.evidence.length && (
              <li className="rounded-lg border border-[#241f45] bg-[#0d0b1e] p-3 text-xs">
                No conclusive risk evidence recorded — absence of evidence is not evidence of absence.
              </li>
            )}
          </ol>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-2xl">Living successors</h2>
          {t.successors?.length ? (
            <ul className="mt-3 space-y-3">
              {t.successors.map((s) => (
                <li
                  key={s.name}
                  className="rounded-lg border border-[#241f45] bg-[#0d0b1e] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {s.url ? (
                      <a
                        className="font-mono-data text-base font-semibold underline hover:text-[var(--marigold)]"
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.name}
                      </a>
                    ) : (
                      <span className="font-mono-data text-base font-semibold">{s.name}</span>
                    )}
                    <span className="font-mono-data rounded bg-[#1d1936] px-2 py-0.5 text-[10px] uppercase" style={{ color: 'var(--violet-mute)' }}>
                      {s.source.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--bone-dim)' }}>
                    {s.reason}
                    {s.weeklyDownloads != null ? ` · ${s.weeklyDownloads.toLocaleString()}/wk` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--bone-dim)' }}>
              No replacement needed or no drop-in successor registered. Check the repository before
              planning a migration.
            </p>
          )}
          {t.repo && (
            <p className="mt-4 text-sm">
              <a
                className="underline hover:text-[var(--marigold)]"
                href={t.repo.url}
                target="_blank"
                rel="noreferrer"
              >
                Visit the repository ({t.repo.owner}/{t.repo.repo}) →
              </a>
            </p>
          )}
        </div>
      </section>

      <Ofrenda contributors={t.contributors ?? []} vitals={v} name={t.dep.name} />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
        <SeanceChat eco={t.dep.ecosystem} name={t.dep.name} />
        <div className="space-y-6">
          <Suspense
            fallback={
              <div className="card flex items-center gap-3 p-6 text-xs" style={{ color: 'var(--violet-mute)' }}>
                <div className="candle" aria-hidden="true" />
                <span>Lighting the candles for maintainer support links…</span>
              </div>
            }
          >
            <SupportLinks repoUrl={v.repoUrl} />
          </Suspense>
          <TombstoneShare
            eco={t.dep.ecosystem}
            name={t.dep.name}
            score={t.error ? '?' : t.score}
            bandLabel={BAND_LABEL[vb]}
            fallbackBaseUrl={
              process.env.NEXT_PUBLIC_BASE_URL ||
              process.env.RENDER_EXTERNAL_URL ||
              'http://localhost:3000'
            }
          />
        </div>
      </div>
    </article>
  );
}

function Vital({
  label,
  meaning,
  meterPct,
  meterWarn,
  children,
}: {
  label: string;
  meaning: string;
  meterPct?: number;
  meterWarn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      tabIndex={0}
      title={meaning}
      className="group rounded-lg border border-[#241f45] bg-[#0d0b1e] p-3.5 focus:border-[var(--marigold)]"
    >
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
        {label}
      </div>
      <div className="font-mono-data mt-1 text-lg">{children}</div>
      {meterPct !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1d1936]" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(4, meterPct)}%`,
              background: meterWarn ? 'var(--haunted)' : 'var(--alive)',
            }}
          />
        </div>
      )}
      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: 'var(--violet-mute)' }}>
        {meaning}
      </p>
    </div>
  );
}
