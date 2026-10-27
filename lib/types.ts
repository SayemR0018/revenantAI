export type Ecosystem = 'npm' | 'pypi';

export type Band = 'alive' | 'fading' | 'haunted' | 'departed';

export interface DepRef {
  ecosystem: Ecosystem;
  name: string;
  versionSpec?: string;
}

export interface RepoRef {
  host: 'github';
  owner: string;
  repo: string;
  url: string;
}

export interface VitalSigns {
  repoUrl?: string;
  pushedAt?: string; // last push to any branch (ISO)
  lastCommitAt?: string; // default branch (ISO)
  daysSinceCommit?: number;
  lastReleaseAt?: string;
  daysSinceRelease?: number;
  commitsPerWeek?: number[]; // last ~26 weeks, oldest first — pulse sparkline
  commitsLast365?: number;
  authorsLast365?: number;
  busFactor?: number; // top author share of last-365 commits, 0..1
  archived?: boolean;
  deprecated?: boolean;
  deprecationMessage?: string;
  openIssues?: number;
  issueCloseRate180?: number | null;
  medianIssueFirstResponseHrs?: number | null;
  stalePrs?: number | null;
  weeklyDownloads?: number | null;
  downloadsTrend?: number | null; // ratio recent vs prior period
  dependents?: number | null;
  yearsActive?: number | null;
  language?: string | null;
  license?: string | null;
}

export type CauseOfDeath =
  | 'maintainer_burnout'
  | 'superseded'
  | 'archived_by_author'
  | 'ecosystem_shift'
  | 'company_pulled'
  | 'deprecated_official'
  | 'slow_decay'
  | 'alive'
  | 'unknown';

export interface EvidenceItem {
  id: string;
  kind:
    | 'commit'
    | 'release'
    | 'issue'
    | 'pr'
    | 'registry'
    | 'repo_meta'
    | 'news'
    | 'readme'
    | 'archive';
  label: string;
  detail: string;
  url?: string;
  at?: string;
}

export interface Successor {
  ecosystem: Ecosystem;
  name: string;
  reason: string;
  url?: string;
  weeklyDownloads?: number | null;
  source: 'registry_pointer' | 'active_fork' | 'search' | 'curated';
}

export interface Contributor {
  handle: string;
  commits?: number;
  url?: string;
}

export interface Autopsy {
  causeOfDeath: CauseOfDeath;
  epitaph: string;
  lastWords?: string;
  lastWordsUrl?: string;
  evidenceIds: string[];
  generatedBy: string; // provider id or 'fallback-rules'
}

export interface ScoredDep {
  dep: DepRef;
  repo?: RepoRef;
  vitals: VitalSigns;
  score: number; // 0..100
  band: Band;
  confidence: 'high' | 'medium' | 'low';
  evidence: EvidenceItem[];
  autopsy?: Autopsy;
  successors?: Successor[];
  contributors?: Contributor[];
  error?: string;
}

export interface ScanSummary {
  total: number;
  alive: number;
  fading: number;
  haunted: number;
  departed: number;
  unknown: number;
}

export interface Report {
  id: string;
  createdAt: string;
  source: 'manifest' | 'repo' | 'package';
  sourceLabel: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: { done: number; total: number; phase: string };
  results: ScoredDep[];
  summary: ScanSummary;
  isPublic: boolean;
  error?: string;
}

export interface CorpusChunk {
  id: string;
  packageId: string; // `${eco}/${name}`
  source: 'readme' | 'issue' | 'changelog' | 'docs' | 'release';
  text: string;
  url?: string;
  embedding?: number[];
}

export interface SeanceMessage {
  role: 'user' | 'spirit';
  text: string;
  evidenceIds?: string[];
  voiced?: boolean;
}

export interface FeatureVector {
  daysSinceCommit: number;
  commits30: number;
  commits90: number;
  commits180: number;
  commits365: number;
  commitSlope: number;
  authors90: number;
  authors365: number;
  busFactor: number;
  daysSinceRelease: number;
  releases365: number;
  issueCloseRate180: number;
  medianFirstResponseHrs: number;
  prMergeRate180: number;
  stalePrs: number;
  openIssues: number;
  repoAgeDays: number;
  hasCi: number;
  hasFunding: number;
  orgOwned: number;
  archived: number;
  deprecated: number;
  logWeeklyDownloads: number;
  downloadsTrend: number;
}

export const FEATURE_KEYS = [
  'daysSinceCommit',
  'commits30',
  'commits90',
  'commits180',
  'commits365',
  'commitSlope',
  'authors90',
  'authors365',
  'busFactor',
  'daysSinceRelease',
  'releases365',
  'issueCloseRate180',
  'medianFirstResponseHrs',
  'prMergeRate180',
  'stalePrs',
  'openIssues',
  'repoAgeDays',
  'hasCi',
  'hasFunding',
  'orgOwned',
  'archived',
  'deprecated',
  'logWeeklyDownloads',
  'downloadsTrend',
] as const;

export function bandFor(score: number, archived = false, deprecated = false): Band {
  if (archived || deprecated || score >= 75) return 'departed';
  if (score >= 50) return 'haunted';
  if (score >= 25) return 'fading';
  return 'alive';
}

export const BAND_LABEL: Record<Band, string> = {
  alive: 'Alive',
  fading: 'Fading',
  haunted: 'Haunted',
  departed: 'Departed',
};
