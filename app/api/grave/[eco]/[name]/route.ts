import { NextRequest, NextResponse } from 'next/server';
import { getTombstone } from '@/lib/tombstones';
import { Ecosystem } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eco: string; name: string }> }) {
  const { eco, name } = await params;
  if (eco !== 'npm' && eco !== 'pypi') return NextResponse.json({ error: 'ecosystem must be npm or pypi' }, { status: 400 });
  const t = await getTombstone(eco as Ecosystem, decodeURIComponent(name));
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(t);
}
