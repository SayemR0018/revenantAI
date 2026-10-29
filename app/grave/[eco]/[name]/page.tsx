import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTombstone } from '@/lib/tombstones';
import { Ecosystem, BAND_LABEL, ScoredDep, visualBandFor } from '@/lib/types';
import { PulseSparkline } from '@/components/PulseSparkline';
import { Ofrenda } from '@/components/Ofrenda';
import { SeanceChat } from '@/components/SeanceChat';
import { SupportLinks } from '@/components/SupportLinks';
import { TombstoneShare } from '@/components/TombstoneShare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Props { params: Promise<{ eco: string; name: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eco, name } = await params;
  const n = decodeURIComponent(name);
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
  const noData = <span className="text-sm font-normal" style={{ color: 'var(--violet-mute)' }}>not enough data</span>;
  return (
    <article>
      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <div className="tombstone mx-auto flex h-[340px] w-[280px] flex-col items-center justify-center p-6 text-center">
          <div className={`font-display text-7xl band-${vb}`}>{t.error ? '?' : t.score}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--violet-mute)' }}>ghost score</div>
          <div className={`mt-3 text-xl uppercase tracking-wider band-${vb}`}>{BAND_LABEL[vb]}</div>
          {t.error && (
            <div className="mt-2 px-2 text-xs" style={{ color: 'var(--bone-dim)' }}>
              We couldn&apos;t find enough public signals
            </div>
          )}
          {v.archived && <div className="font-mono-data mt-3 text-xs" style={{ color: 'var(--violet-mute)' }}>✝ archived</div>}
          {v.deprecated && <div className="font-mono-data mt-1 text-xs" style={{ color: 'var(--violet-mute)' }}>⚠ deprecated</div>}
        </div>

        <div>
          <p className="font-mono-data text-sm" style={{ color: 'var(--marigold)' }}>{t.dep.ecosystem} package</p>
          <h1 className="font-display mt-1 break-words text-3xl sm:text-5xl">{t.dep.name}</h1>
          {t.autopsy?.epitaph && (
            <blockquote className="font-display mt-4 border-l-2 pl-4 text-xl italic" style={{ borderColor: 'var(--marigold)', color: 'var(--bone-dim)' }}>
              {t.autopsy.epitaph}
            </blockquote>
          )}
          <p className="font-mono-data mt-3 text-xs" style={{ color: 'var(--violet-mute)' }}>
            epitaph by {t.autopsy?.generatedBy ?? '—'} · signals, not verdicts
          </p>
          {t.autopsy?.lastWords && (
            <p className="mt-4 text-sm" style={{ color: 'var(--violet-mute)' }}>
              Last words: <a className="font-mono-data underline" href={t.autopsy.lastWordsUrl} target="_blank" rel="noreferrer">“{t.autopsy.lastWords}”</a>
            </p>
          )}
        </div>
      </div>

      <section className="card mt-10 p-6" aria-labelledby="vitals">
        <h2 id="vitals" className="font-display text-2xl">Vital signs</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Vital label="commit pulse (26 wks)"><PulseSparkline data={v.commitsPerWeek} width={150} height={30} /></Vital>
          <Vital label="last commit">{v.daysSinceCommit !== undefined ? `${v.daysSinceCommit} days ago` : noData}</Vital>
          <Vital label="release gap">{v.daysSinceRelease !== undefined ? `${v.daysSinceRelease} days` : noData}</Vital>
          <Vital label="bus factor">{v.busFactor !== undefined ? `${Math.round(v.busFactor * 100)}% top author` : noData}</Vital>
          <Vital label="issue close rate">{v.issueCloseRate180 != null ? `${Math.round(v.issueCloseRate180 * 100)}%` : noData}</Vital>
          <Vital label="weekly downloads">{v.weeklyDownloads != null ? v.weeklyDownloads.toLocaleString() : noData}</Vital>
          <Vital label="dependents">{v.dependents != null ? v.dependents.toLocaleString() : noData}</Vital>
          <Vital label="years active">{years ?? noData}</Vital>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-2xl">Cause of death</h2>
          <p className="mt-2 text-lg capitalize" style={{ color: 'var(--marigold)' }}>
            {(t.autopsy?.causeOfDeath ?? 'unknown').replace(/_/g, ' ')}
          </p>
          <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--bone-dim)' }}>
            {t.evidence.map((e) => (
              <li key={e.id}>
                <span className="font-mono-data text-xs" style={{ color: 'var(--violet-mute)' }}>[{e.id}]</span>{' '}
                {e.url ? <a className="underline hover:text-[var(--marigold)]" href={e.url} target="_blank" rel="noreferrer">{e.label}</a> : e.label}
                {' — '}{e.detail}
              </li>
            ))}
            {!t.evidence.length && <li>No conclusive evidence — absence of evidence is not evidence of absence.</li>}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-2xl">Living successors</h2>
          {t.successors?.length ? (
            <ul className="mt-3 space-y-3">
              {t.successors.map((s) => (
                <li key={s.name}>
                  {s.url ? (
                    <a className="font-mono-data hover:text-[var(--marigold)]" href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
                  ) : <span className="font-mono-data">{s.name}</span>}
                  <span className="ml-2 text-sm" style={{ color: 'var(--violet-mute)' }}>{s.reason}</span>
                  {s.weeklyDownloads != null && <span className="ml-2 text-xs" style={{ color: 'var(--violet-mute)' }}>{s.weeklyDownloads.toLocaleString()}/wk</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--bone-dim)' }}>
              No clear successor found. The maintainers may still be resting — check the repo before planning the funeral.
            </p>
          )}
          {t.repo && (
            <p className="mt-4 text-sm">
              <a className="underline hover:text-[var(--marigold)]" href={t.repo.url} target="_blank" rel="noreferrer">
                Visit the repository
              </a>
            </p>
          )}
        </div>
      </section>

      <Ofrenda contributors={t.contributors ?? []} vitals={v} name={t.dep.name} />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <SeanceChat eco={t.dep.ecosystem} name={t.dep.name} />
        <div className="space-y-6">
          <SupportLinks repoUrl={v.repoUrl} />
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

function Vital({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>{label}</div>
      <div className="font-mono-data mt-1 text-lg">{children}</div>
    </div>
  );
}
