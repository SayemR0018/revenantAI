import { promises as fs } from 'fs';
import path from 'path';
import { Band, Ecosystem } from './types';

export interface CementerioRow {
  dep: { ecosystem: Ecosystem; name: string };
  score: number;
  band: Band;
  vitals: {
    daysSinceCommit?: number;
    daysSinceRelease?: number;
    weeklyDownloads?: number | null;
    archived?: boolean;
    deprecated?: boolean;
    deprecationMessage?: string;
    repoUrl?: string;
  };
  epitaph?: string;
  error?: string;
}

export interface CementerioIndex {
  generatedAt: string;
  isSeed: boolean;
  rows: CementerioRow[];
}

export function dedupeCementerioRows(rows: CementerioRow[]): CementerioRow[] {
  const seen = new Map<string, CementerioRow>();
  for (const r of rows) {
    if (!r?.dep?.ecosystem || !r?.dep?.name) continue;
    const key = `${r.dep.ecosystem}/${r.dep.name.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (r.epitaph && !existing.epitaph) || r.score > existing.score) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

export async function loadCementerioIndex(): Promise<CementerioIndex> {
  const livePath = path.join(process.cwd(), 'data', 'cementerio.json');
  const seedPath = path.join(process.cwd(), 'data', 'seed', 'cementerio.json');

  try {
    const raw = await fs.readFile(livePath, 'utf8');
    const parsed = JSON.parse(raw) as { generatedAt?: string; rows?: CementerioRow[] };
    const rows = dedupeCementerioRows(parsed.rows ?? []);
    if (rows.length > 0 && rows.some((r) => r.band === 'departed')) {
      return { generatedAt: parsed.generatedAt ?? '', isSeed: false, rows };
    }
  } catch {
    /* fall back to seed */
  }

  try {
    const raw = await fs.readFile(seedPath, 'utf8');
    const parsed = JSON.parse(raw) as { generatedAt?: string; rows?: CementerioRow[] };
    const rows = dedupeCementerioRows(parsed.rows ?? []);
    return { generatedAt: parsed.generatedAt ?? '', isSeed: true, rows };
  } catch {
    return { generatedAt: '', isSeed: true, rows: [] };
  }
}
