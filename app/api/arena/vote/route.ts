import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'store', 'arena-votes.json');

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });
  const vote = { ...body, at: new Date().toISOString() };
  // Mongo when configured, else append to a JSONL-ish file.
  if (process.env.MONGODB_URI) {
    try {
      const { MongoClient } = await import('mongodb');
      const c = new MongoClient(process.env.MONGODB_URI);
      await c.connect();
      await c.db('revenant').collection('arena_votes').insertOne(vote);
      await c.close();
      return NextResponse.json({ ok: true });
    } catch { /* fall through to file */ }
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  let arr: unknown[] = [];
  try { arr = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { /* first vote */ }
  arr.push(vote);
  await fs.writeFile(FILE, JSON.stringify(arr));
  return NextResponse.json({ ok: true });
}
