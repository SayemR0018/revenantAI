// GitHub API client — used to enrich signals. Works unauthenticated (60/hr)
// but is meant to run with GITHUB_TOKEN (5000/hr). Rate-limit aware.
import { cachedFetch, fetchJson, FetchError } from './fetch';

const API = 'https://api.github.com';

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const tok = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (tok) h.Authorization = `Bearer ${tok}`;
  return h;
}

export interface GhRepo {
  full_name: string;
  html_url: string;
  description?: string;
  language?: string;
  archived?: boolean;
  pushed_at?: string;
  created_at?: string;
  open_issues_count?: number;
  default_branch?: string;
  owner?: { login: string; type: string };
  license?: { spdx_id?: string } | null;
  homepage?: string;
}

export interface GhCommit {
  sha: string;
  commit: { message: string; committer?: { date?: string } };
  html_url: string;
}

export interface GhRelease {
  tag_name: string;
  published_at?: string;
  name?: string;
  html_url: string;
}

export interface GhContributor {
  login?: string;
  contributions?: number;
  type?: string;
  html_url?: string;
}

export async function ghRepo(owner: string, repo: string): Promise<GhRepo | null> {
  try {
    return await cachedFetch<GhRepo>(`${API}/repos/${owner}/${repo}`, { ttlMs: 3600_000, init: { headers: headers() } });
  } catch (e) {
    if (e instanceof FetchError && e.status === 403) throw e; // rate limit — bubble up
    return null;
  }
}

export async function ghLastCommit(owner: string, repo: string, branch?: string): Promise<GhCommit | null> {
  const q = branch ? `?sha=${encodeURIComponent(branch)}&per_page=1` : '?per_page=1';
  const data = await cachedFetch<GhCommit[]>(`${API}/repos/${owner}/${repo}/commits${q}`, {
    ttlMs: 3600_000,
    init: { headers: headers() },
  }).catch(() => null);
  return Array.isArray(data) && data.length ? data[0] : null;
}

/** Weekly commit totals for the last 52 weeks (GitHub stats endpoint). */
export async function ghCommitActivity(owner: string, repo: string): Promise<number[] | null> {
  const data = await cachedFetch<{ total: number; week: number; days: number[] }[]>(
    `${API}/repos/${owner}/${repo}/stats/commit_activity`,
    { ttlMs: 24 * 3600_000, init: { headers: headers() } },
  ).catch(() => null);
  if (!Array.isArray(data) || !data.length) return null;
  return data.slice(-26).map((w) => w.total);
}

export async function ghLatestRelease(owner: string, repo: string): Promise<GhRelease | null> {
  const data = await cachedFetch<GhRelease>(`${API}/repos/${owner}/${repo}/releases/latest`, {
    ttlMs: 6 * 3600_000,
    init: { headers: headers() },
  }).catch(() => null);
  return data ?? null;
}

export async function ghContributors(owner: string, repo: string): Promise<GhContributor[]> {
  const data = await cachedFetch<GhContributor[]>(
    `${API}/repos/${owner}/${repo}/contributors?per_page=30`,
    { ttlMs: 24 * 3600_000, init: { headers: headers() } },
  ).catch(() => null);
  return Array.isArray(data) ? data.filter((c) => c.type !== 'Bot') : [];
}

export async function ghSearchRepos(q: string, perPage = 5): Promise<GhRepo[]> {
  const data = await cachedFetch<{ items?: GhRepo[] }>(
    `${API}/search/repositories?q=${encodeURIComponent(q)}&per_page=${perPage}`,
    { ttlMs: 7 * 24 * 3600_000, init: { headers: headers() } },
  ).catch(() => null);
  return data?.items ?? [];
}

export async function ghRateLimit(): Promise<{ remaining: number; limit: number; reset: string } | null> {
  const data = await fetchJson<{ rate?: { remaining: number; limit: number; reset: number } }>(
    `${API}/rate_limit`,
    { headers: headers() },
  );
  return data?.rate ? { remaining: data.rate.remaining, limit: data.rate.limit, reset: new Date(data.rate.reset * 1000).toISOString() } : null;
}

/** Fetch README text (markdown source) for grounding. */
export async function ghReadme(owner: string, repo: string): Promise<string | null> {
  const data = await cachedFetch<{ content?: string; encoding?: string }>(
    `${API}/repos/${owner}/${repo}/readme`,
    { ttlMs: 24 * 3600_000, init: { headers: headers() } },
  ).catch(() => null);
  if (data?.content && data.encoding === 'base64') {
    try {
      return Buffer.from(data.content, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  return null;
}
