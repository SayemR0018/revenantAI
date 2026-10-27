import { Metadata } from 'next';
import { ArenaClient } from '@/components/ArenaClient';

export const metadata: Metadata = { title: 'Arena — which ghost writes the best eulogy?' };

export default function ArenaPage() {
  return (
    <div>
      <h1 className="font-display text-4xl">The Arena</h1>
      <p className="mt-3 max-w-2xl" style={{ color: 'var(--bone-dim)' }}>
        The same autopsy, three open-weight models, side by side. Which ghost writes the best eulogy?
        Pick a package and vote — every vote is logged for the receipts.
      </p>
      <ArenaClient />
    </div>
  );
}
