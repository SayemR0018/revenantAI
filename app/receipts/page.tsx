import { Metadata } from 'next';
import { runReceiptChecks } from '@/lib/receipts-core';

export const metadata: Metadata = { title: 'Receipts — live integration status' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COLOR = { PASS: 'var(--alive)', DEGRADED: '#e8b33c', SKIPPED: '#6f6599', FAIL: 'var(--departed)' } as const;

export default async function ReceiptsPage() {
  const checks = await runReceiptChecks({ quick: true });
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl">Receipts</h1>
      <p className="mt-3" style={{ color: 'var(--bone-dim)' }}>
        Honest status for every integration — checked live, right now. PASS means genuinely working and
        load-bearing. SKIPPED means not configured, with exactly what to set. Nothing is faked.
      </p>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--violet-mute)' }}>
            <th className="py-2 pr-4">status</th><th className="py-2 pr-4">integration</th><th className="py-2">evidence / notes</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.id} className="border-t border-[#241f45] align-top">
              <td className="font-mono-data py-3 pr-4 font-bold" style={{ color: COLOR[c.status] }}>{c.status}</td>
              <td className="py-3 pr-4">{c.partner}</td>
              <td className="py-3" style={{ color: 'var(--bone-dim)' }}>
                {c.notes}
                {c.evidence && <div className="font-mono-data mt-1 text-xs"><a className="underline" href={c.evidence}>{c.evidence}</a></div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono-data mt-6 text-xs" style={{ color: 'var(--violet-mute)' }}>
        machine-readable: <a className="underline" href="/api/health/integrations">/api/health/integrations</a>
      </p>
    </div>
  );
}
