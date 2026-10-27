// Direct registry clients: npm registry + PyPI JSON API. No auth needed.
import { cachedFetch } from './fetch';
import { Ecosystem } from './types';

export interface NpmMeta {
  name: string;
  'dist-tags'?: { latest?: string };
  time?: Record<string, string>;
  versions?: Record<string, { deprecated?: string; repository?: { url?: string } }>;
  repository?: { url?: string } | string;
  deprecated?: string;
  maintainers?: { name?: string; email?: string }[];
  license?: string | { type?: string };
}

export interface PypiMeta {
  info: {
    name: string;
    project_urls?: Record<string, string>;
    yanked?: boolean;
    license?: string;
    summary?: string;
    classifiers?: string[];
  };
  releases?: Record<string, { upload_time?: string; yanked?: boolean }[]>;
  urls?: { upload_time?: string }[];
}

export async function npmMeta(name: string): Promise<NpmMeta | null> {
  return cachedFetch<NpmMeta>(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { ttlMs: 6 * 3600_000 });
}

export async function pypiMeta(name: string): Promise<PypiMeta | null> {
  return cachedFetch<PypiMeta>(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, { ttlMs: 6 * 3600_000 });
}

export async function npmDownloads(name: string, range = 'last-week'): Promise<number | null> {
  const d = await cachedFetch<{ downloads?: number }>(
    `https://api.npmjs.org/downloads/point/${range}/${encodeURIComponent(name)}`,
    { ttlMs: 6 * 3600_000 },
  );
  return d?.downloads ?? null;
}

/** Compare last-month vs the month a year ago — crude but real trend. */
export async function npmDownloadsTrend(name: string): Promise<{ weekly: number | null; trend: number | null }> {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const d4w = (d: Date) => new Date(d.getTime() - 28 * 86400_000);
  const [recent, prior] = await Promise.all([
    cachedFetch<{ downloads?: number }>(
      `https://api.npmjs.org/downloads/point/${fmt(d4w(now))}:${fmt(now)}/${encodeURIComponent(name)}`,
      { ttlMs: 6 * 3600_000 },
    ),
    cachedFetch<{ downloads?: number }>(
      `https://api.npmjs.org/downloads/point/${fmt(d4w(d4w(new Date(now.getTime() - 300 * 86400_000))))}:${fmt(new Date(now.getTime() - 300 * 86400_000))}/${encodeURIComponent(name)}`,
      { ttlMs: 24 * 3600_000 },
    ),
  ]);
  const r = recent?.downloads ?? null;
  const p = prior?.downloads ?? null;
  return { weekly: r !== null ? Math.round(r / 4) : null, trend: r !== null && p ? r / p : null };
}

export function registryRepoUrl(eco: Ecosystem, meta: NpmMeta | PypiMeta | null): string | undefined {
  if (!meta) return undefined;
  if (eco === 'npm') {
    const m = meta as NpmMeta;
    const repo = typeof m.repository === 'string' ? m.repository : m.repository?.url;
    if (repo?.includes('github.com')) return repo;
    const latest = m['dist-tags']?.latest;
    const v = latest ? m.versions?.[latest]?.repository?.url : undefined;
    if (v?.includes('github.com')) return v;
  } else {
    const urls = (meta as PypiMeta).info?.project_urls ?? {};
    for (const k of Object.keys(urls)) {
      if (urls[k]?.includes('github.com')) return urls[k];
    }
  }
  return undefined;
}

export function registryDeprecation(eco: Ecosystem, meta: NpmMeta | PypiMeta | null): { deprecated: boolean; message?: string } {
  if (!meta) return { deprecated: false };
  if (eco === 'npm') {
    const m = meta as NpmMeta;
    const latest = m['dist-tags']?.latest;
    const msg = (latest ? m.versions?.[latest]?.deprecated : undefined) ?? m.deprecated;
    return msg ? { deprecated: true, message: msg } : { deprecated: false };
  }
  const p = meta as PypiMeta;
  const cls = p.info?.classifiers ?? [];
  if (cls.some((c) => c.includes('Inactive'))) return { deprecated: true, message: 'PyPI classifier: Development Status :: Inactive' };
  if (p.info?.yanked) return { deprecated: true, message: 'Latest release yanked' };
  return { deprecated: false };
}

export function lastReleaseInfo(eco: Ecosystem, meta: NpmMeta | PypiMeta | null): { at?: string; version?: string } {
  if (!meta) return {};
  if (eco === 'npm') {
    const m = meta as NpmMeta;
    const latest = m['dist-tags']?.latest;
    const at = latest ? m.time?.[latest] : undefined;
    return { at, version: latest };
  }
  const p = meta as PypiMeta;
  let best: string | undefined;
  let bestV: string | undefined;
  for (const [v, files] of Object.entries(p.releases ?? {})) {
    for (const f of files) {
      if (f.upload_time && (!best || f.upload_time > best)) {
        best = f.upload_time;
        bestV = v;
      }
    }
  }
  return { at: best, version: bestV };
}

export function firstReleaseAt(eco: Ecosystem, meta: NpmMeta | PypiMeta | null): string | undefined {
  if (!meta) return undefined;
  if (eco === 'npm') {
    const m = meta as NpmMeta;
    const times = Object.entries(m.time ?? {})
      .filter(([k]) => k !== 'created' && k !== 'modified')
      .map(([, v]) => v)
      .sort();
    return times[0];
  }
  const p = meta as PypiMeta;
  let best: string | undefined;
  for (const files of Object.values(p.releases ?? {})) {
    for (const f of files) {
      if (f.upload_time && (!best || f.upload_time < best)) best = f.upload_time;
    }
  }
  return best;
}
