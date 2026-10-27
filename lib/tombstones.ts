// Tombstone cache: a scored dep with autopsy, persisted 24h.
import { promises as fs } from 'fs';
import path from 'path';
import { DepRef, Ecosystem, ScoredDep } from './types';
import { scoreOne } from './pipeline';

const DIR = process.env.REVENANT_DATA_DIR || path.join(process.cwd(), 'data', 'store');
const TOMB = path.join(DIR, 'tombstones');
const TTL = 24 * 3600_000;

const inflight = new Map<string, Promise<ScoredDep | null>>();

function file(eco: Ecosystem, name: string) {
  return path.join(TOMB, `${eco}__${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
}

export async function getTombstone(eco: Ecosystem, name: string, force = false): Promise<ScoredDep | null> {
  const key = `${eco}/${name}`;
  if (!force) {
    try {
      const st = await fs.stat(file(eco, name));
      if (Date.now() - st.mtimeMs < TTL) {
        return JSON.parse(await fs.readFile(file(eco, name), 'utf8')) as ScoredDep;
      }
    } catch {
      /* miss */
    }
  }
  if (inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
    const dep: DepRef = { ecosystem: eco, name };
    const out = await scoreOne(dep, { withAutopsy: true });
    if (out.error) return out; // still render a tombstone with unknowns
    await fs.mkdir(TOMB, { recursive: true });
    await fs.writeFile(file(eco, name), JSON.stringify(out));
    return out;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}
