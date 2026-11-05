// Scoring for the CLI: live ecosyste.ms + registry signals, or the bundled
// offline index. Mirrors the web heuristic (lib/score.ts) in miniature,
// including declared lifecycle status from cli/data/lifecycle.json.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY = 86400e3;
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const LIFECYCLE_POINTS = {
  maintenance: 35,
  legacy: 35,
  sunset: 40,
  unmaintained: 50,
  seeking_maintainers: 40,
};

let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  const p = join(ROOT, 'data', 'index-snapshot.json');
  INDEX = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { rows: [] };
  return INDEX;
}

let LIFECYCLE = null;
function lifecycleRegistry() {
  if (LIFECYCLE) return LIFECYCLE;
  const candidates = [
    join(ROOT, 'data', 'lifecycle.json'),
    join(ROOT, '..', 'data', 'lifecycle.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = JSON.parse(readFileSync(p, 'utf8'));
        LIFECYCLE = Array.isArray(raw) ? raw : raw?.entries ?? [];
        return LIFECYCLE;
      } catch {
        /* ignore */
      }
    }
  }
  LIFECYCLE = [];
  return LIFECYCLE;
}

export function curatedLifecycle(dep) {
  const hit = lifecycleRegistry().find(
    (e) => e.ecosystem === dep.ecosystem && e.name.toLowerCase() === dep.name.toLowerCase(),
  );
  if (!hit) return null;
  return {
    status: hit.status,
    source: 'curated',
    quote: hit.quote,
    url: hit.url,
  };
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
  const lifecycle = !deprecated && !archived ? curatedLifecycle(dep) : null;

  let score = 0;
  let otherRiskPoints = 0;
  const addRisk = (pts) => {
    score += pts;
    otherRiskPoints += pts;
  };
  if (archived) addRisk(70);
  if (deprecated) addRisk(65);
  if (lifecycle) score += LIFECYCLE_POINTS[lifecycle.status] ?? 35;

  if (daysSinceCommit === undefined) addRisk(10);
  else if (daysSinceCommit > 730) addRisk(40);
  else if (daysSinceCommit > 365) addRisk(30);
  else if (daysSinceCommit > 180) addRisk(18);
  else if (daysSinceCommit > 90) addRisk(8);
  else if (!lifecycle && daysSinceCommit < 30) score -= 10;

  if (daysSinceRelease > 730) addRisk(15);
  else if (daysSinceRelease > 365) addRisk(10);
  else if (daysSinceRelease > 180) addRisk(4);
  else if (!lifecycle && daysSinceRelease !== undefined && daysSinceRelease < 90) score -= 6;

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (lifecycle) {
    score = Math.max(25, score);
    if ((lifecycle.status === 'maintenance' || lifecycle.status === 'legacy') && otherRiskPoints === 0) {
      score = Math.min(49, score);
    }
  }

  const epitaph = lifecycle
    ? `${dep.name} is in maintenance mode: still patched, no longer evolving. Plan your exit while it is calm.`
    : null;

  return {
    dep,
    score,
    band: band(score, archived, deprecated),
    vitals: {
      daysSinceCommit,
      daysSinceRelease,
      archived,
      deprecated,
       ...(lifecycle ? { lifecycle } : {}),
      weeklyDownloads: pkg?.downloads ?? null,
      dependents: pkg?.dependent_repos_count ?? null,
      repoUrl: pkg?.repository_url,
    },
    epitaph,
  };
}

export function scoreDepOffline(dep) {
  const row = index().rows.find(
    (r) => r.dep.ecosystem === dep.ecosystem && r.dep.name.toLowerCase() === dep.name.toLowerCase(),
  );
  const lc = curatedLifecycle(dep);
  if (!row) {
    if (lc) {
      const pts = LIFECYCLE_POINTS[lc.status] ?? 35;
      const score = Math.max(25, Math.min(100, pts));
      return {
        dep,
        score,
        band: band(score, false, false),
        vitals: { lifecycle: lc },
        epitaph: `${dep.name} is in maintenance mode: still patched, no longer evolving. Plan your exit while it is calm.`,
        offline: true,
      };
    }
    return { dep, score: 0, band: 'alive', vitals: {}, epitaph: null, offline: true, unknown: true };
  }
  const vitals = { ...(row.vitals ?? {}) };
  if (lc && !vitals.deprecated && !vitals.archived && !vitals.lifecycle) {
    vitals.lifecycle = lc;
  }
  return {
    dep,
    score: row.score,
    band: row.band,
    vitals,
    epitaph: row.epitaph ?? null,
    offline: true,
  };
}
