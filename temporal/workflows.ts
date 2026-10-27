import { proxyActivities, defineQuery, setHandler } from '@temporalio/workflow';
import type * as acts from './activities';

export interface Progress {
  done: number;
  total: number;
  phase: string;
}

export const progressQuery = defineQuery<Progress>('progress');

const { parseManifestActivity, resolveReposActivity, fetchSignalsActivity, scoreBatchActivity, autopsyActivity, renderReportActivity } =
  proxyActivities<typeof acts>({
    startToCloseTimeout: '5 minutes',
    heartbeatTimeout: '30 seconds',
    retry: { initialInterval: '2s', backoffCoefficient: 2, maximumAttempts: 5 },
  });

/**
 * ExhumeWorkflow: parse → resolve (fan-out ×8) → fetchSignals → score →
 * autopsy (score ≥ 50 only, max 10) → render. Progress exposed via query.
 */
export async function ExhumeWorkflow(reportId: string): Promise<string> {
  const progress: Progress = { done: 0, total: 0, phase: 'queued' };
  setHandler(progressQuery, () => progress);

  const deps = await parseManifestActivity(reportId);
  progress.total = deps.length;
  progress.phase = 'resolving repositories';

  const repos = await resolveReposActivity(deps);
  const vitals = await fetchSignalsActivity(deps, repos, (d, phase) => {
    progress.done = d;
    progress.phase = phase;
  });

  progress.phase = 'scoring';
  const scores = await scoreBatchActivity(deps, vitals);

  progress.phase = 'autopsies';
  const autopsied = await autopsyActivity(reportId, scores, 50, 10);

  progress.phase = 'rendering report';
  await renderReportActivity(reportId, autopsied);
  progress.done = progress.total;
  progress.phase = 'done';
  return reportId;
}
