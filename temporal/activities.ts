// Temporal activities — thin durable wrappers over lib/pipeline.
// Each activity is retryable and idempotent; heartbeats during fan-out.
import { heartbeat } from '@temporalio/activity';
import { DepRef, RepoRef, ScoredDep, VitalSigns, ScanSummary } from '../lib/types';
import { getReport, saveReport } from '../lib/store';
import { scoreOne, resolveRepo, fetchSignals } from '../lib/pipeline';
import { ghostScore } from '../lib/score';
import { mapLimit } from '../lib/fetch';

export async function parseManifestActivity(reportId: string): Promise<DepRef[]> {
  const r = await getReport(reportId);
  if (!r) throw new Error(`report ${reportId} not found`);
  const deps = (r as unknown as { _deps: DepRef[] })._deps ?? [];
  r.status = 'running';
  await saveReport(r);
  return deps;
}

export async function resolveReposActivity(deps: DepRef[]): Promise<(RepoRef | undefined)[]> {
  return mapLimit(deps, 8, async (d, i) => {
    heartbeat(`resolve ${i}/${deps.length}`);
    return resolveRepo(d);
  });
}

export async function fetchSignalsActivity(
  deps: DepRef[],
  _repos: (RepoRef | undefined)[],
  _onProgress?: (done: number, phase: string) => void,
): Promise<VitalSigns[]> {
  // activity-level progress is emitted via heartbeats, not the callback
  return mapLimit(deps, 8, async (d, i) => {
    heartbeat(`signals ${i}/${deps.length}`);
    return (await fetchSignals(d)).vitals;
  });
}

export async function scoreBatchActivity(deps: DepRef[], vitals: VitalSigns[]): Promise<ScoredDep[]> {
  return mapLimit(deps, 8, async (dep, i) => {
    heartbeat(`score ${i}/${deps.length}`);
    const v = vitals[i];
    const s = await ghostScore(v);
    const r = await getReport(''); // keep id out; full dep object assembled at render
    void r;
    return {
      dep, vitals: v, score: s.score, band: s.band, confidence: s.confidence,
      evidence: [], contributors: [],
    } as ScoredDep;
  });
}

export async function autopsyActivity(reportId: string, results: ScoredDep[], minScore: number, max: number): Promise<ScoredDep[]> {
  // fill contributors+evidence for scored deps, autopsy only the worst (≤ max)
  const out: ScoredDep[] = [];
  let autopsies = 0;
  for (let i = 0; i < results.length; i++) {
    heartbeat(`autopsy ${i}/${results.length}`);
    const r = results[i];
    if (r.score >= minScore && autopsies < max) {
      const full = await scoreOne(r.dep, { withAutopsy: true }); // reuses caches
      out.push(full);
      autopsies++;
    } else {
      const c = await import('../lib/epitaph').then((m) => m.classifyCause(r.vitals));
      r.evidence = c.evidence;
      out.push(r);
    }
  }
  return out;
}

export async function renderReportActivity(reportId: string, results: ScoredDep[]): Promise<void> {
  const r = await getReport(reportId);
  if (!r) throw new Error(`report ${reportId} not found`);
  r.results = results;
  const s: ScanSummary = { total: results.length, alive: 0, fading: 0, haunted: 0, departed: 0, unknown: 0 };
  for (const x of results) {
    if (x.error) s.unknown++;
    else s[x.band]++;
  }
  r.summary = s;
  r.status = 'done';
  r.progress = { done: results.length, total: results.length, phase: 'done' };
  delete (r as unknown as { _deps?: DepRef[] })._deps;
  await saveReport(r);
}
