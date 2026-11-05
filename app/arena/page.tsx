import { Metadata } from 'next';
import { ArenaClient } from '@/components/ArenaClient';
import { listArenaProviders, isClosedProvider, resolveProvider } from '@/lib/llm';

export const metadata: Metadata = { title: 'Arena — which ghost writes the best eulogy?' };
export const dynamic = 'force-dynamic';

export default function ArenaPage() {
  const configuredSpecs = listArenaProviders();
  const extraClosedContestants = configuredSpecs
    .filter((spec) => isClosedProvider(spec))
    .map((spec) => {
      let model = spec.split(':').slice(1).join(':') || 'gpt-5.4-mini';
      try {
        model = resolveProvider(spec).model();
      } catch {
        /* ignore */
      }
      return {
        provider: spec.split(':')[0],
        model,
        closed: true,
      };
    });

  return (
    <div>
      <h1 className="font-display text-4xl">The Arena</h1>
      <p className="mt-3 max-w-2xl" style={{ color: 'var(--bone-dim)' }}>
        The same autopsy across open-weight models by default (plus any opt-in closed-weight baseline
        when explicitly configured), side by side. Which ghost writes the best eulogy? Pick a package
        and vote — every vote is logged for the receipts.
      </p>
      <ArenaClient extraClosedContestants={extraClosedContestants} />
    </div>
  );
}
