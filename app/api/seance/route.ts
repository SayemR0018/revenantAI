import { NextRequest, NextResponse } from 'next/server';
import { seance } from '@/lib/seance';
import { getTombstone } from '@/lib/tombstones';
import { Ecosystem, SeanceMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  eco: Ecosystem;
  name: string;
  history?: SeanceMessage[];
  text: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!body.text?.trim() || !body.eco || !body.name) {
    return NextResponse.json({ error: 'eco, name and text required' }, { status: 400 });
  }
  if ((body.history?.length ?? 0) > 24) {
    return NextResponse.json({ error: 'seance is limited to 24 messages' }, { status: 429 });
  }
  const t = await getTombstone(body.eco, body.name);
  if (!t) return NextResponse.json({ error: 'unknown package' }, { status: 404 });
  const reply = await seance(body.name ? { ecosystem: body.eco, name: body.name } : t.dep, t.repo, t.vitals, body.history ?? [], body.text.slice(0, 1000));
  return NextResponse.json(reply);
}
