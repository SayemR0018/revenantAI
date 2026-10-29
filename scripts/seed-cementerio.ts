// Build data/seed/cementerio.json and data/seed/tombstones/*.json using the real pipeline.
// Run: npm run seed  (or npx tsx scripts/seed-cementerio.ts)
import { promises as fs } from 'fs';
import path from 'path';
import { Ecosystem, ScoredDep } from '../lib/types';
import { scoreOne } from '../lib/pipeline';
import { fetchJson } from '../lib/fetch';
import { CementerioRow, dedupeCementerioRows } from '../lib/cementerio';

// Curated candidates: scored via the real pipeline; only packages actually reported
// by their registry/GitHub are kept with their real computed scores and bands.
const CURATED_CANDIDATES: { ecosystem: Ecosystem; name: string; showcase?: boolean }[] = [
  { ecosystem: 'npm', name: 'request', showcase: true },
  { ecosystem: 'npm', name: 'left-pad', showcase: true },
  { ecosystem: 'npm', name: 'node-sass', showcase: true },
  { ecosystem: 'npm', name: 'tslint', showcase: true },
  { ecosystem: 'npm', name: 'gulp-util', showcase: true },
  { ecosystem: 'npm', name: 'bower', showcase: true },
  { ecosystem: 'npm', name: 'jade' },
  { ecosystem: 'npm', name: 'coffee-script' },
  { ecosystem: 'npm', name: 'request-promise' },
  { ecosystem: 'npm', name: 'protractor' },
  { ecosystem: 'npm', name: 'istanbul' },
  { ecosystem: 'npm', name: 'optimist' },
  { ecosystem: 'npm', name: 'nomnom' },
  { ecosystem: 'npm', name: 'uuid-1345' },
  { ecosystem: 'npm', name: 'ms', showcase: true },
  { ecosystem: 'npm', name: 'moment', showcase: true },
  { ecosystem: 'npm', name: 'lodash', showcase: true },
  { ecosystem: 'npm', name: 'react', showcase: true },
  { ecosystem: 'pypi', name: 'nose', showcase: true },
  { ecosystem: 'pypi', name: 'six', showcase: true },
  { ecosystem: 'pypi', name: 'requests', showcase: true },
  { ecosystem: 'pypi', name: 'distribute' },
  { ecosystem: 'pypi', name: 'pycrypto' },
];

interface TopPkg {
  name: string;
}

async function top(eco: Ecosystem, n: number): Promise<string[]> {
  const reg = eco === 'npm' ? 'npmjs.org' : 'pypi.org';
  const out: string[] = [];
  let page = 1;
  while (out.length < n) {
    const per = Math.min(100, n - out.length);
    const data = await fetchJson<TopPkg[]>(
      `https://packages.ecosyste.ms/api/v1/registries/${reg}/packages?sort=downloads&order=desc&per_page=${per}&page=${page}`,
    );
    if (!Array.isArray(data) || !data.length) break;
    out.push(...data.map((p) => p.name));
    page++;
  }
  return out;
}

function safeKey(eco: Ecosystem, name: string) {
  return `${eco}__${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
}

async function loadExistingRows(): Promise<CementerioRow[]> {
  for (const rel of [
    ['data', 'cementerio.json'],
    ['data', 'seed', 'cementerio.json'],
  ]) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), ...rel), 'utf8');
      const parsed = JSON.parse(raw) as { rows?: CementerioRow[] };
      if (Array.isArray(parsed.rows) && parsed.rows.length >= 140) {
        return parsed.rows;
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

async function main() {
  const snapshotAt = new Date().toISOString();
  const seedDir = path.join(process.cwd(), 'data', 'seed');
  const tombDir = path.join(seedDir, 'tombstones');
  await fs.mkdir(tombDir, { recursive: true });

  const existing = await loadExistingRows();
  const rows: CementerioRow[] = [...existing];

  console.log(`Scoring ${CURATED_CANDIDATES.length} curated & showcase packages via real pipeline...`);
  for (const cand of CURATED_CANDIDATES) {
    try {
      const s: ScoredDep = await scoreOne(
        { ecosystem: cand.ecosystem, name: cand.name },
        { withAutopsy: true },
      );
      if (s.notFound || s.error) {
        console.log(`  skip ${cand.ecosystem}/${cand.name}: ${s.error ?? 'notFound'}`);
        continue;
      }
      s.snapshotAt = snapshotAt;
      rows.push({
        dep: s.dep,
        score: s.score,
        band: s.band,
        vitals: {
          daysSinceCommit: s.vitals.daysSinceCommit,
          daysSinceRelease: s.vitals.daysSinceRelease,
          weeklyDownloads: s.vitals.weeklyDownloads,
          archived: s.vitals.archived,
          deprecated: s.vitals.deprecated,
          deprecationMessage: s.vitals.deprecationMessage,
          repoUrl: s.vitals.repoUrl,
        },
        epitaph: s.autopsy?.epitaph,
      });
      if (cand.showcase || s.band === 'departed' || s.band === 'haunted') {
        await fs.writeFile(
          path.join(tombDir, safeKey(cand.ecosystem, cand.name)),
          JSON.stringify(s, null, 2),
        );
      }
      console.log(`  ✓ ${cand.ecosystem}/${cand.name}: score=${s.score} (${s.band})`);
    } catch (e) {
      console.error(`  ✗ ${cand.ecosystem}/${cand.name}:`, e);
    }
  }

  let deduped = dedupeCementerioRows(rows);
  if (deduped.length < 160) {
    console.log(`Topping up index from ecosyste.ms (currently ${deduped.length})...`);
    for (const eco of ['npm', 'pypi'] as Ecosystem[]) {
      const names = await top(eco, eco === 'npm' ? 120 : 60);
      for (const name of names) {
        if (deduped.some((r) => r.dep.ecosystem === eco && r.dep.name.toLowerCase() === name.toLowerCase())) {
          continue;
        }
        try {
          const s = await scoreOne({ ecosystem: eco, name }, { withAutopsy: false });
          if (!s.notFound && !s.error) {
            rows.push({
              dep: s.dep,
              score: s.score,
              band: s.band,
              vitals: {
                daysSinceCommit: s.vitals.daysSinceCommit,
                daysSinceRelease: s.vitals.daysSinceRelease,
                weeklyDownloads: s.vitals.weeklyDownloads,
                archived: s.vitals.archived,
                deprecated: s.vitals.deprecated,
                deprecationMessage: s.vitals.deprecationMessage,
                repoUrl: s.vitals.repoUrl,
              },
              epitaph: s.autopsy?.epitaph,
            });
          }
        } catch {
          /* ignore */
        }
      }
    }
    deduped = dedupeCementerioRows(rows);
  }

  const payload = JSON.stringify(
    { generatedAt: snapshotAt, count: deduped.length, rows: deduped },
    null,
    2,
  );

  const seedFile = path.join(seedDir, 'cementerio.json');
  const liveFile = path.join(process.cwd(), 'data', 'cementerio.json');
  const cliFile = path.join(process.cwd(), 'cli', 'data', 'index-snapshot.json');

  await fs.writeFile(seedFile, payload);
  await fs.writeFile(liveFile, payload);
  await fs.mkdir(path.dirname(cliFile), { recursive: true });
  await fs.writeFile(cliFile, payload);

  const byBand = deduped.reduce<Record<string, number>>((acc, r) => {
    acc[r.band] = (acc[r.band] || 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${deduped.length} unique packages to ${seedFile}`, byBand);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
