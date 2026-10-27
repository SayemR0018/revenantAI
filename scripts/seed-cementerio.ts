// Build data/cementerio.json — the bundled Graveyard Index snapshot.
// Run: npx tsx scripts/seed-cementerio.ts [--npm 2000] [--pypi 1000]
// Uses ecosyste.ms top-package rankings; scores via the heuristic engine.
import { promises as fs } from 'fs';
import path from 'path';
import { Ecosystem, ScoredDep } from '../lib/types';
import { scoreOne } from '../lib/pipeline';
import { fetchJson } from '../lib/fetch';

const args = process.argv.slice(2);
const num = (flag: string, dflt: number) => {
  const i = args.indexOf(flag);
  return i >= 0 ? parseInt(args[i + 1], 10) || dflt : dflt;
};
const NPM_N = num('--npm', 300);
const PYPI_N = num('--pypi', 150);

interface TopPkg { name: string }

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

async function main() {
  const rows: (Pick<ScoredDep, 'dep' | 'score' | 'band' | 'vitals'> & { epitaph?: string })[] = [];
  for (const eco of ['npm', 'pypi'] as Ecosystem[]) {
    const names = await top(eco, eco === 'npm' ? NPM_N : PYPI_N);
    console.log(`${eco}: ${names.length} packages`);
    for (const name of names) {
      try {
        const s = await scoreOne({ ecosystem: eco, name }, { withAutopsy: false });
        rows.push({ dep: s.dep, score: s.score, band: s.band, vitals: s.vitals, epitaph: s.autopsy?.epitaph });
      } catch (e) {
        console.error(`${eco}/${name}:`, e);
      }
      if (rows.length % 25 === 0) console.log(`  …${rows.length}`);
    }
  }
  rows.sort((a, b) => b.score - a.score);
  const file = path.join(process.cwd(), 'data', 'cementerio.json');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, rows }, null, 1),
  );
  console.log(`wrote ${file} (${rows.length} entries)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
