// Living successors: registry deprecation pointers, active forks, curated map.
import { DepRef, Successor, VitalSigns } from './types';
import { ghSearchRepos } from './github';
import { getPackage } from './ecosystems';

// Curated migration map for well-known departed/abandoned packages.
const CURATED: Record<string, Successor[]> = {
  'npm/request': [
    { ecosystem: 'npm', name: 'undici', reason: 'Officially recommended successor to request', url: 'https://github.com/nodejs/undici', source: 'curated' },
    { ecosystem: 'npm', name: 'node-fetch', reason: 'Fetch API surface for Node', url: 'https://github.com/node-fetch/node-fetch', source: 'curated' },
    { ecosystem: 'npm', name: 'axios', reason: 'Widely maintained HTTP client', url: 'https://github.com/axios/axios', source: 'curated' },
  ],
  'npm/moment': [
    { ecosystem: 'npm', name: 'dayjs', reason: 'Moment-compatible API, actively maintained', url: 'https://github.com/iamkun/dayjs', source: 'curated' },
    { ecosystem: 'npm', name: 'date-fns', reason: 'Modular, tree-shakeable', url: 'https://github.com/date-fns/date-fns', source: 'curated' },
    { ecosystem: 'npm', name: 'luxon', reason: 'From the Moment team; modern Intl-based', url: 'https://github.com/moment/luxon', source: 'curated' },
  ],
  'npm/node-sass': [
    { ecosystem: 'npm', name: 'sass', reason: 'Dart Sass — the primary Sass implementation', url: 'https://github.com/sass/dart-sass', source: 'curated' },
  ],
  'npm/tslint': [
    { ecosystem: 'npm', name: 'eslint', reason: 'TSLint was deprecated in favor of ESLint + typescript-eslint', url: 'https://github.com/eslint/eslint', source: 'curated' },
  ],
  'npm/request-promise': [
    { ecosystem: 'npm', name: 'undici', reason: 'Successor path after request deprecation', url: 'https://github.com/nodejs/undici', source: 'curated' },
  ],
  'pypi/nose': [
    { ecosystem: 'pypi', name: 'pytest', reason: 'The standard modern Python test runner', url: 'https://github.com/pytest-dev/pytest', source: 'curated' },
  ],
  'pypi/pipenv': [
    { ecosystem: 'pypi', name: 'uv', reason: 'Fast modern Python package/project manager', url: 'https://github.com/astral-sh/uv', source: 'curated' },
    { ecosystem: 'pypi', name: 'poetry', reason: 'Actively maintained dependency manager', url: 'https://github.com/python-poetry/poetry', source: 'curated' },
  ],
  'pypi/flask-restful': [
    { ecosystem: 'pypi', name: 'flask-smorest', reason: 'Maintained successor for REST APIs on Flask', url: 'https://github.com/marshmallow-code/flask-smorest', source: 'curated' },
  ],
};

export async function findSuccessors(dep: DepRef, v: VitalSigns): Promise<Successor[]> {
  const key = `${dep.ecosystem}/${dep.name}`;
  const out: Successor[] = [...(CURATED[key] ?? [])];

  // 1. Deprecation messages often name the replacement.
  if (v.deprecationMessage) {
    const m = v.deprecationMessage.match(/(?:use|migrate to|replaced by|install)\s+[`'"]?(@?[a-z0-9][a-z0-9._/-]*)[`'"]?/i);
    if (m && m[1] && m[1].toLowerCase() !== dep.name.toLowerCase()) {
      const cand = await getPackage(dep.ecosystem, m[1]).catch(() => null);
      out.push({
        ecosystem: dep.ecosystem,
        name: m[1],
        reason: 'Named in the official deprecation notice',
        source: 'registry_pointer',
        weeklyDownloads: cand?.downloads ?? null,
      });
    }
  }

  // 2. Active forks / similarly-named live projects (GitHub search, cached a week).
  if (out.length < 2 && v.repoUrl) {
    const owner = v.repoUrl.split('/').slice(-2)[0];
    const repo = v.repoUrl.split('/').pop()!;
    const forks = await ghSearchRepos(`repo:${owner}/${repo} fork:true`, 5).catch(() => []);
    const repos = forks.length ? forks : await ghSearchRepos(`${repo} in:name sort:updated`, 5).catch(() => []);
    for (const r of repos.slice(0, 3)) {
      if (r.archived) continue;
      const pushedDays = r.pushed_at ? Math.floor((Date.now() - new Date(r.pushed_at).getTime()) / 86400_000) : 9999;
      if (pushedDays < 120) {
        out.push({
          ecosystem: dep.ecosystem,
          name: r.full_name,
          reason: `Active ${forks.length ? 'fork' : 'project'} — pushed ${pushedDays}d ago`,
          url: r.html_url,
          source: forks.length ? 'active_fork' : 'search',
        });
      }
    }
  }
  return out.slice(0, 4);
}
