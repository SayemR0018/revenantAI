// Report store: MongoDB Atlas when MONGODB_URI is set, otherwise a JSON file
// store in data/store/ (good enough for demos; honest fallback).
import { promises as fs } from 'fs';
import path from 'path';
import { Report, CorpusChunk } from './types';

const DIR = process.env.REVENANT_DATA_DIR || path.join(process.cwd(), 'data', 'store');
const REPORTS = path.join(DIR, 'reports');
const CORPUS = path.join(DIR, 'corpus');

interface MongoLike {
  db(name: string): { collection(n: string): MongoCollection };
}
interface MongoCollection {
  findOne(q: object): Promise<Record<string, unknown> | null>;
  replaceOne(q: object, d: object, o?: object): Promise<unknown>;
  insertOne(d: object): Promise<unknown>;
  find(q?: object): { sort(o: object): { limit(n: number): { toArray(): Promise<Record<string, unknown>[]> } } };
}

let mongoClient: MongoLike | null | undefined;

async function mongo(): Promise<MongoCollection | null> {
  if (mongoClient === undefined) {
    if (!process.env.MONGODB_URI) {
      mongoClient = null;
    } else {
      try {
        const { MongoClient } = await import('mongodb');
        const c = new MongoClient(process.env.MONGODB_URI);
        await c.connect();
        mongoClient = c as unknown as MongoLike;
      } catch {
        mongoClient = null;
      }
    }
  }
  return mongoClient ? mongoClient.db('revenant').collection('reports') : null;
}

export async function saveReport(r: Report): Promise<void> {
  const col = await mongo();
  if (col) {
    await col.replaceOne({ _id: r.id }, { ...r, _id: r.id }, { upsert: true });
    return;
  }
  await fs.mkdir(REPORTS, { recursive: true });
  await fs.writeFile(path.join(REPORTS, `${r.id}.json`), JSON.stringify(r));
}

export async function getReport(id: string): Promise<Report | null> {
  const col = await mongo();
  if (col) {
    const d = await col.findOne({ _id: id });
    if (d) {
      const { _id: _drop, ...rest } = d as unknown as { _id: string } & Report;
      void _drop;
      return rest as Report;
    }
    return null;
  }
  try {
    return JSON.parse(await fs.readFile(path.join(REPORTS, `${id}.json`), 'utf8')) as Report;
  } catch {
    return null;
  }
}

async function corpusCol(): Promise<MongoCollection | null> {
  const c = await mongo();
  if (!c) return null;
  return mongoClient!.db('revenant').collection('corpus');
}

export async function saveCorpus(chunks: CorpusChunk[]): Promise<void> {
  if (!chunks.length) return;
  const col = await corpusCol();
  if (col) {
    for (const ch of chunks) await col.replaceOne({ _id: ch.id }, { ...ch, _id: ch.id }, { upsert: true });
    return;
  }
  await fs.mkdir(CORPUS, { recursive: true });
  await fs.writeFile(path.join(CORPUS, `${chunks[0].packageId.replace(/\//g, '__')}.json`), JSON.stringify(chunks));
}

export async function getCorpus(packageId: string): Promise<CorpusChunk[]> {
  const col = await corpusCol();
  if (col) {
    const docs = await col.find({ packageId }).sort({}).limit(200).toArray();
    return docs as unknown as CorpusChunk[];
  }
  try {
    return JSON.parse(await fs.readFile(path.join(CORPUS, `${packageId.replace(/\//g, '__')}.json`), 'utf8')) as CorpusChunk[];
  } catch {
    return [];
  }
}
