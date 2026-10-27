import { getReport } from '@/lib/store';
import { ReportView } from '@/components/ReportView';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) return {};
  const ghosts = r.summary.haunted + r.summary.departed;
  return {
    title: `Haunting Report — ${r.sourceLabel}`,
    description: `${ghosts} ghosts among ${r.summary.total} dependencies. Signals, not verdicts.`,
    openGraph: { images: [`/api/og-report/${id}`] },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) notFound();
  return <ReportView initial={r} />;
}
