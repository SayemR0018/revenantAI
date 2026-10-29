import { Metadata } from 'next';
import { runReceiptChecks, ReceiptCategory } from '@/lib/receipts-core';

export const metadata: Metadata = { title: 'Receipts — live integration status' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COLOR = {
  PASS: 'var(--alive)',
  DEGRADED: '#f2bd49',
  SKIPPED: 'var(--violet-mute)',
  FAIL: 'var(--departed)',
} as const;

const CATEGORIES: ReceiptCategory[] = [
  'Open-Weight AI & Agents',
  'Data, Durable Execution & Cloud',
  'Developer Workflow & Partner Integrations',
];

export default async function ReceiptsPage() {
  const checks = await runReceiptChecks({ quick: true });
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const skippedChecks = checks.filter((c) => c.status === 'SKIPPED' && c.enableHint);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl sm:text-4xl">Receipts</h1>
        <span className="font-mono-data rounded border border-[#35305c] bg-[#14112b] px-3 py-1 text-xs" style={{ color: 'var(--alive)' }}>
          {passCount} PASS · checked live
        </span>
      </div>
      <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--bone-dim)' }}>
        Honest, live verification for every partner and open-source integration in Revenant. We never
        fake a credentialed service: optional integrations without keys on this instance are marked{' '}
        <span className="font-mono-data">SKIPPED</span> and run their documented open/local fallback.
      </p>

      {/* Honest status legend */}
      <section className="card mt-6 grid gap-3 p-4 text-xs sm:grid-cols-4" aria-label="Status legend">
        <div>
          <span className="font-mono-data font-bold" style={{ color: COLOR.PASS }}>
            ● PASS
          </span>
          <p className="mt-1" style={{ color: 'var(--bone-dim)' }}>
            Genuinely active and load-bearing in this runtime right now.
          </p>
        </div>
        <div>
          <span className="font-mono-data font-bold" style={{ color: COLOR.DEGRADED }}>
            ● DEGRADED
          </span>
          <p className="mt-1" style={{ color: 'var(--bone-dim)' }}>
            Code path present, operating in partial or fallback mode.
          </p>
        </div>
        <div>
          <span className="font-mono-data font-bold" style={{ color: COLOR.SKIPPED }}>
            ● SKIPPED
          </span>
          <p className="mt-1" style={{ color: 'var(--bone-dim)' }}>
            Optional credential not set on this deployment; graceful fallback active.
          </p>
        </div>
        <div>
          <span className="font-mono-data font-bold" style={{ color: COLOR.FAIL }}>
            ● FAIL
          </span>
          <p className="mt-1" style={{ color: 'var(--bone-dim)' }}>
            Configured, but the live health check failed (never hidden).
          </p>
        </div>
      </section>

      {/* Grouped integration tables */}
      <div className="mt-8 space-y-8">
        {CATEGORIES.map((category) => {
          const rows = checks.filter((c) => c.category === category);
          return (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <h2 id={`cat-${category}`} className="font-display text-2xl" style={{ color: 'var(--marigold)' }}>
                {category}
              </h2>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#241f45]">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr
                      className="border-b border-[#241f45] bg-[#14112b] text-left text-xs uppercase tracking-wider"
                      style={{ color: 'var(--violet-mute)' }}
                    >
                      <th className="w-28 py-2.5 pl-4 pr-3">status</th>
                      <th className="w-56 py-2.5 pr-4">integration</th>
                      <th className="py-2.5 pr-4">role in revenant &amp; evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-t border-[#241f45] align-top">
                        <td className="font-mono-data py-3 pl-4 pr-3 font-bold" style={{ color: COLOR[c.status] }}>
                          {c.status}
                        </td>
                        <td className="py-3 pr-4 font-medium">{c.partner}</td>
                        <td className="py-3 pr-4" style={{ color: 'var(--bone-dim)' }}>
                          <div>{c.role}</div>
                          {c.evidence && (
                            <div className="font-mono-data mt-1 text-xs">
                              <a
                                className="underline hover:text-[var(--marigold)]"
                                href={c.evidence}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--violet-mute)' }}
                              >
                                Inspect source evidence →
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* Collapsed how-to-enable section for developer env vars */}
      {skippedChecks.length > 0 && (
        <details className="card mt-8 p-4 text-xs">
          <summary className="font-mono-data cursor-pointer font-semibold hover:text-[var(--marigold)]" style={{ color: 'var(--bone)' }}>
            How to enable optional SKIPPED integrations ({skippedChecks.length} credential-gated)
          </summary>
          <ul className="mt-3 space-y-2 border-t border-[#241f45] pt-3" style={{ color: 'var(--bone-dim)' }}>
            {skippedChecks.map((c) => (
              <li key={c.id}>
                <strong style={{ color: 'var(--bone)' }}>{c.partner}:</strong>{' '}
                <span className="font-mono-data" style={{ color: 'var(--violet-mute)' }}>
                  {c.enableHint}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="font-mono-data mt-6 text-xs" style={{ color: 'var(--violet-mute)' }}>
        machine-readable JSON receipt:{' '}
        <a className="underline hover:text-[var(--marigold)]" href="/api/health/integrations">
          /api/health/integrations
        </a>
      </p>
    </div>
  );
}
