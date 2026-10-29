// Tombstone cache: a scored dep with autopsy, persisted 24h, with seed fallback.
import { promises as fs } from 'fs';
import path from 'path';
import { DepRef, Ecosystem, ScoredDep } from './types';
import { scoreOne } from './pipeline';

const DIR = process.env.REVENANT_DATA_DIR || path.join(process.cwd(), 'data', 'store');
const TOMB = path.join(DIR, 'tombstones');
const SEED_TOMB = path.join(process.cwd(), 'data', 'seed', 'tombstones');
const TTL = 24 * 3600_000;

const inflight = new Map<string, Promise<ScoredDep | null>>();

function safeKey(eco: Ecosystem, name: string) {
  return `${eco}__${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
}

function file(eco: Ecosystem, name: string) {
  return path.join(TOMB, safeKey(eco, name));
}

function seedFile(eco: Ecosystem, name: string) {
  return path.join(SEED_TOMB, safeKey(eco, name));
}

function isRealTombstone(d: ScoredDep | null): d is ScoredDep {
  if (!d || d.notFound) return false;
  const v = d.vitals ?? {};
  return Boolean(
    d.snapshotAt ||
      v.daysSinceCommit !== undefined ||
      v.daysSinceRelease !== undefined ||
      v.archived ||
      v.deprecated ||
      v.weeklyDownloads != null ||
      d.repo,
  );
}

async function readSeedTombstone(eco: Ecosystem, name: string): Promise<ScoredDep | null> {
  try {
    const raw = await fs.readFile(seedFile(eco, name), 'utf8');
    const parsed = JSON.parse(raw) as ScoredDep;
    return isRealTombstone(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function getTombstone(eco: Ecosystem, name: string, force = false): Promise<ScoredDep | null> {
  const key = `${eco}/${name}`;
  if (!force) {
    try {
      const st = await fs.stat(file(eco, name));
      if (Date.now() - st.mtimeMs < TTL) {
        const cached = JSON.parse(await fs.readFile(file(eco, name), 'utf8')) as ScoredDep;
        if (isRealTombstone(cached)) return cached;
      }
    } catch {
      /* miss */
    }
    const seeded = await readSeedTombstone(eco, name);
    if (seeded) return seeded;
  }
  if (inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
    const dep: DepRef = { ecosystem: eco, name };
    const out = await scoreOne(dep, { withAutopsy: true });
    if (out.notFound) {
      const seeded = await readSeedTombstone(eco, name);
      return seeded;
    }
    if (out.error) {
      const seeded = await readSeedTombstone(eco, name);
      if (seeded) return seeded;
      return out;
    }
    await fs.mkdir(TOMB, { recursive: true }).catch(() => {});
    await fs.writeFile(file(eco, name), JSON.stringify(out)).catch(() => {});
    return out;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}
