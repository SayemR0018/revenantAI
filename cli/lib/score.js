// Scoring for the CLI: live ecosyste.ms + registry signals, or the bundled
// offline index. Mirrors the web heuristic (lib/score.ts) in miniature.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY = 86400e3;
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  const p = join(ROOT, 'data', 'index-snapshot.json');
  INDEX = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { rows: [] };
  return INDEX;
}

async function j(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'revenant-cli' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function band(score, archived, deprecated) {
  if (archived || deprecated || score >= 75) return 'departed';
  if (score >= 50) return 'haunted';
  if (score >= 25) return 'fading';
  return 'alive';
}

export async function scoreDep(dep) {
  const reg = dep.ecosystem === 'npm' ? 'npmjs.org' : 'pypi.org';
  const pkg = await j(`https://packages.ecosyste.ms/api/v1/registries/${reg}/packages/${encodeURIComponent(dep.name)}`);
  let repoMeta = null;
  if (pkg?.repository_url?.includes('github.com')) {
    const path = pkg.repository_url.split('github.com/')[1].replace(/\.git$/, '');
    repoMeta = await j(`https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(path)}`).catch(() => null);
  }
  const deprecated = pkg?.status === 'deprecated';
  const archived = !!repoMeta?.archived;
  const pushed = repoMeta?.pushed_at ? new Date(repoMeta.pushed_at).getTime() : null;
  const daysSinceCommit = pushed ? Math.floor((Date.now() - pushed) / DAY) : undefined;
  const lastRel = pkg?.latest_release_published_at ? new Date(pkg.latest_release_published_at).getTime() : null;
  const daysSinceRelease = lastRel ? Math.floor((Date.now() - lastRel) / DAY) : undefined;

  let score = 0;
  if (archived) score += 70;
  if (deprecated) score += 65;
  if (daysSinceCommit === undefined) score += 10;
  else if (daysSinceCommit > 730) score += 40;
  else if (daysSinceCommit > 365) score += 30;
  else if (daysSinceCommit > 180) score += 18;
  else if (daysSinceCommit > 90) score += 8;
  else if (daysSinceCommit < 30) score -= 10;
  if (daysSinceRelease > 730) score += 15;
  else if (daysSinceRelease > 365) score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    dep, score, band: band(score, archived, deprecated),
    vitals: { daysSinceCommit, daysSinceRelease, archived, deprecated, weeklyDownloads: pkg?.downloads ?? null, dependents: pkg?.dependent_repos_count ?? null, repoUrl: pkg?.repository_url },
    epitaph: null,
  };
}

export function scoreDepOffline(dep) {
  const row = index().rows.find((r) => r.dep.ecosystem === dep.ecosystem && r.dep.name === dep.name);
  if (!row) {
    return { dep, score: 0, band: 'alive', vitals: {}, epitaph: null, offline: true, unknown: true };
  }
  return { dep, score: row.score, band: row.band, vitals: row.vitals, epitaph: row.epitaph ?? null, offline: true };
}
