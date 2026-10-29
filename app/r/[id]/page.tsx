import { getReport } from '@/lib/store';
import { ReportView } from '@/components/ReportView';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ band?: string; eco?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) return {};
  const ghosts = r.summary.haunted + r.summary.departed;
  const ogImg = `/api/og-report/${id}`;
  return {
    title: `Haunting Report — ${r.sourceLabel}`,
    description: `${ghosts} ghosts among ${r.summary.total} dependencies. Signals, not verdicts.`,
    openGraph: {
      title: `Haunting Report — ${r.sourceLabel}`,
      description: `${ghosts} ghosts among ${r.summary.total} dependencies. Signals, not verdicts.`,
      images: [{ url: ogImg, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Haunting Report — ${r.sourceLabel}`,
      description: `${ghosts} ghosts among ${r.summary.total} dependencies. Signals, not verdicts.`,
      images: [ogImg],
    },
  };
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const r = await getReport(id);
  if (!r) notFound();
  return (
    <ReportView
      initial={r}
      initialBand={sp.band ?? ''}
      initialEco={sp.eco ?? ''}
      initialSort={sp.sort ?? 'score'}
    />
  );
}
