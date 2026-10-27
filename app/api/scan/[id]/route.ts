import { NextRequest, NextResponse } from 'next/server';
import { getReport } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { results, ...rest } = r;
  return NextResponse.json({ ...rest, resultsCount: results.length, results });
}
