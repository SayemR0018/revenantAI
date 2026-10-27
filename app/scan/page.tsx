import { ScanForm } from '@/components/ScanForm';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Scan your dependencies' };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-3xl pt-8">
      <h1 className="font-display text-4xl">Exhume your dependencies</h1>
      <p className="mt-2" style={{ color: 'var(--bone-dim)' }}>
        Paste a manifest, point at a public repo, or name a single package. Public-data only;
        private-repo scans (via sign-in) are never shared.
      </p>
      <div className="card mt-6 p-6">
        <ScanForm />
      </div>
    </div>
  );
}
