// Ghost score: heuristic model + optional remote TabPFN scoring via ml/ service.
// The heuristic is deliberately transparent — every point is attributable to a signal.
import { FeatureVector, VitalSigns, Band, bandFor, FEATURE_KEYS } from './types';

export interface ScoreResult {
  score: number;
  band: Band;
  confidence: 'high' | 'medium' | 'low';
  contributions: { feature: string; points: number }[];
  model: 'heuristic-v1' | 'tabpfn';
}

/** Build the ML feature vector from vitals (mirrors ml/features.py). */
export function featureVector(v: VitalSigns): FeatureVector {
  const weekly = v.commitsPerWeek ?? [];
  const sum = (n: number) => weekly.slice(-Math.ceil(n / 7)).reduce((a, b) => a + b, 0);
  // slope: linear regression over weekly counts (commits/week per week)
  let slope = 0;
  if (weekly.length > 4) {
    const n = weekly.length;
    const xs = weekly.map((_, i) => i);
    const xm = xs.reduce((a, b) => a + b, 0) / n;
    const ym = weekly.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((a, x, i) => a + (x - xm) * (weekly[i] - ym), 0);
    const den = xs.reduce((a, x) => a + (x - xm) ** 2, 0);
    slope = den ? num / den : 0;
  }
  return {
    daysSinceCommit: v.daysSinceCommit ?? 3650,
    commits30: sum(30),
    commits90: sum(90),
    commits180: sum(180),
    commits365: v.commitsLast365 ?? sum(365),
    commitSlope: slope,
    authors90: 0,
    authors365: v.authorsLast365 ?? 0,
    busFactor: v.busFactor ?? 1,
    daysSinceRelease: v.daysSinceRelease ?? 3650,
    releases365: 0,
    issueCloseRate180: v.issueCloseRate180 ?? 0,
    medianFirstResponseHrs: v.medianIssueFirstResponseHrs ?? 720,
    prMergeRate180: 0,
    stalePrs: v.stalePrs ?? 0,
    openIssues: v.openIssues ?? 0,
    repoAgeDays: v.repoUrl && v.yearsActive ? Math.round(v.yearsActive * 365) : 365,
    hasCi: 0,
    hasFunding: 0,
    orgOwned: 0,
    archived: v.archived ? 1 : 0,
    deprecated: v.deprecated ? 1 : 0,
    logWeeklyDownloads: Math.log1p(v.weeklyDownloads ?? 0),
    downloadsTrend: v.downloadsTrend ?? 1,
  };
}

/** Transparent heuristic — the documented fallback when TabPFN is unavailable. */
export function heuristicScore(v: VitalSigns): ScoreResult {
  const c: { feature: string; points: number }[] = [];
  const add = (feature: string, points: number) => c.push({ feature, points });

  if (v.archived) add('archived', 70);
  if (v.deprecated) add('deprecated', 65);

  const dc = v.daysSinceCommit;
  if (dc !== undefined) {
    if (dc > 730) add('daysSinceCommit', 40);
    else if (dc > 365) add('daysSinceCommit', 30);
    else if (dc > 180) add('daysSinceCommit', 18);
    else if (dc > 90) add('daysSinceCommit', 8);
  } else add('daysSinceCommit', 10); // unknown activity is itself mildly worrying

  const dr = v.daysSinceRelease;
  if (dr !== undefined) {
    if (dr > 730) add('daysSinceRelease', 15);
    else if (dr > 365) add('daysSinceRelease', 10);
    else if (dr > 180) add('daysSinceRelease', 4);
  }

  if (v.busFactor !== undefined && v.busFactor >= 0.8 && (v.authorsLast365 ?? 1) <= 2)
    add('busFactor', 8);
  if ((v.authorsLast365 ?? 0) === 0 && !v.archived) add('authors365', 10);

  if (v.issueCloseRate180 !== undefined && v.issueCloseRate180 !== null) {
    if (v.issueCloseRate180 < 0.1 && (v.openIssues ?? 0) > 50) add('issueCloseRate', 8);
    else if (v.issueCloseRate180 < 0.25) add('issueCloseRate', 4);
  }
  if ((v.stalePrs ?? 0) > 20) add('stalePrs', 6);

  if (v.downloadsTrend !== null && v.downloadsTrend !== undefined && v.downloadsTrend < 0.5)
    add('downloadsTrend', 4); // usage collapsing matters less than dev activity

  // mitigations — real signs of life pull the score down
  if (dc !== undefined && dc < 30) add('recentActivity', -10);
  if (dr !== undefined && dr < 90) add('recentRelease', -6);

  const raw = c.reduce((a, x) => a + x.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const confidence =
    v.daysSinceCommit !== undefined && (v.commitsPerWeek?.length ?? 0) > 0
      ? 'high'
      : v.daysSinceCommit !== undefined
        ? 'medium'
        : 'low';
  return { score, band: bandFor(score, !!v.archived, !!v.deprecated), confidence, contributions: c, model: 'heuristic-v1' };
}

/** Try the ML service (TabPFN); fall back to the heuristic on any failure. */
export async function ghostScore(v: VitalSigns): Promise<ScoreResult> {
  const url = process.env.ML_SERVICE_URL;
  if (url && process.env.TABPFN_MODE !== 'off') {
    try {
      const fv = featureVector(v);
      const res = await fetch(`${url.replace(/\/$/, '')}/score`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ features: FEATURE_KEYS.map((k) => fv[k]) }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const j = (await res.json()) as { p_abandoned?: number };
        if (typeof j.p_abandoned === 'number') {
          const score = Math.round(j.p_abandoned * 100);
          return {
            score,
            band: bandFor(score, !!v.archived, !!v.deprecated),
            confidence: 'high',
            contributions: [{ feature: 'tabpfn', points: score }],
            model: 'tabpfn',
          };
        }
      }
    } catch {
      /* fall through to heuristic */
    }
  }
  return heuristicScore(v);
}
