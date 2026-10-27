// ecosyste.ms client — open data, no API key required.
// https://packages.ecosyste.ms / https://repos.ecosyste.ms
import { cachedFetch } from './fetch';
import { Ecosystem, RepoRef } from './types';

const REGISTRY: Record<Ecosystem, string> = { npm: 'npmjs.org', pypi: 'pypi.org' };

export interface EcoPackage {
  name: string;
  ecosystem: string;
  description?: string;
  homepage?: string;
  licenses?: string;
  repository_url?: string;
  downloads?: number;
  downloads_period?: string;
  dependent_repos_count?: number;
  dependent_packages_count?: number;
  latest_release_number?: string;
  latest_release_published_at?: string;
  first_release_published_at?: string;
  status?: string | null; // e.g. "deprecated"
  deprecation_status?: { message?: string } | null;
  maintainers?: { login?: string; name?: string }[];
  rankings?: { downloads?: number };
  metadata?: Record<string, unknown>;
}

export interface EcoRepo {
  full_name: string;
  html_url: string;
  description?: string;
  language?: string;
  archived?: boolean;
  pushed_at?: string;
  created_at?: string;
  updated_at?: string;
  stargazers_count?: number;
  open_issues_count?: number;
  forks_count?: number;
  license?: string;
  owner_type?: string; // 'Organization' | 'User'
  commit_stats?: { total_commits?: number; total_committers?: number; dco?: boolean };
  topics?: string[];
}

export interface EcoIssuesStats {
  past_year_issues_count?: number;
  past_year_pull_requests_count?: number;
  past_year_merged_pull_requests_count?: number;
  past_year_issues_closed_count?: number;
  issue_time_to_close_seconds?: number | null;
  pull_request_time_to_close_seconds?: number | null;
  average_issue_age_seconds?: number | null;
  stale_issues_count?: number;
  stale_pull_requests_count?: number;
}

export function registryFor(eco: Ecosystem) {
  return REGISTRY[eco];
}

export async function getPackage(eco: Ecosystem, name: string): Promise<EcoPackage | null> {
  return cachedFetch<EcoPackage>(
    `https://packages.ecosyste.ms/api/v1/registries/${REGISTRY[eco]}/packages/${encodeURIComponent(name)}`,
    { ttlMs: 6 * 3600_000 },
  );
}

export async function getPackageRepo(eco: Ecosystem, name: string): Promise<RepoRef | null> {
  const pkg = await getPackage(eco, name);
  const url = pkg?.repository_url || (pkg?.homepage?.includes('github.com') ? pkg.homepage : undefined);
  const ref = url ? githubRefFromUrl(url) : null;
  return ref;
}

export function githubRefFromUrl(url: string): RepoRef | null {
  const m = url.match(/github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?].*)?$/);
  if (!m) return null;
  return { host: 'github', owner: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}` };
}

export async function getRepo(owner: string, repo: string): Promise<EcoRepo | null> {
  return cachedFetch<EcoRepo>(
    `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(owner)}%2F${encodeURIComponent(repo)}`,
    { ttlMs: 12 * 3600_000 },
  );
}

export async function getRepoIssuesStats(owner: string, repo: string): Promise<EcoIssuesStats | null> {
  return cachedFetch<EcoIssuesStats>(
    `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(owner)}%2F${encodeURIComponent(repo)}/issues`,
    { ttlMs: 12 * 3600_000 },
  );
}

export interface EcoMaintainer {
  login?: string;
  name?: string;
  commits_count?: number;
  url?: string;
}

export async function getRepoContributors(owner: string, repo: string): Promise<EcoMaintainer[]> {
  const data = await cachedFetch<EcoMaintainer[]>(
    `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(owner)}%2F${encodeURIComponent(repo)}/contributors`,
    { ttlMs: 12 * 3600_000 },
  );
  return Array.isArray(data) ? data : [];
}

export async function getRepoCommitsWeekly(owner: string, repo: string): Promise<number[] | null> {
  // ecosyste.ms exposes commits summary; if unavailable we synthesize the pulse from pushed_at.
  const data = await cachedFetch<{ past_year_weekly?: number[] } & Record<string, unknown>>(
    `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(owner)}%2F${encodeURIComponent(repo)}/commits`,
    { ttlMs: 12 * 3600_000 },
  );
  if (data && Array.isArray((data as { commits_per_week?: number[] }).commits_per_week)) {
    return (data as { commits_per_week: number[] }).commits_per_week;
  }
  return null;
}
