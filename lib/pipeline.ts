// The scan pipeline — shared by the API route (in-process) and Temporal
// activities (durable). Activities are pure functions on dep refs.
import {
  DepRef, Report, ScoredDep, VitalSigns, Autopsy, ScanSummary, Contributor,
} from './types';
import { getPackage, getRepo, getRepoIssuesStats, getRepoContributors, githubRefFromUrl } from './ecosystems';
import {
  npmMeta, pypiMeta, NpmMeta, PypiMeta, npmDownloadsTrend, registryRepoUrl, registryDeprecation, lastReleaseInfo, firstReleaseAt,
} from './registries';
import { ghRepo, ghLastCommit, ghCommitActivity, ghContributors } from './github';
import { ghostScore } from './score';
import { classifyCause, fallbackEpitaph, lastWords } from './epitaph';
import { findSuccessors } from './successors';
import { mapLimit } from './fetch';
import { getReport, saveReport } from './store';
import { buildCorpus } from './corpus';
import { chatJson, providerFor, AutopsySchema } from './llm';

const DAY = 86400_000;

export async function resolveRepo(dep: DepRef): Promise<ScoredDep['repo'] | undefined> {
  const eco = await getPackage(dep.ecosystem, dep.name).catch(() => null);
  const fromEco = eco?.repository_url ? githubRefFromUrl(eco.repository_url) : null;
  if (fromEco) return fromEco;
  const reg = dep.ecosystem === 'npm' ? await npmMeta(dep.name) : await pypiMeta(dep.name);
  const url = registryRepoUrl(dep.ecosystem, reg);
  return url ? githubRefFromUrl(url) ?? undefined : undefined;
}

export async function fetchSignals(dep: DepRef): Promise<{ vitals: VitalSigns; repo?: ScoredDep['repo']; contributors: Contributor[]; exists: boolean }> {
  const v: VitalSigns = {};
  const now = Date.now();
  const repo = await resolveRepo(dep);

  const [eco, reg] = await Promise.all([
    getPackage(dep.ecosystem, dep.name).catch(() => null),
    dep.ecosystem === 'npm' ? npmMeta(dep.name).catch(() => null) : pypiMeta(dep.name).catch(() => null),
  ]);

  const hasReg =
    dep.ecosystem === 'npm'
      ? Boolean((reg as NpmMeta | null)?.name)
      : Boolean((reg as PypiMeta | null)?.info?.name);
  const hasEco = Boolean(eco?.name);
  const exists = hasReg || hasEco || Boolean(repo);
  if (!exists) {
    return { vitals: v, repo: undefined, contributors: [], exists: false };
  }

  const dep_ = registryDeprecation(dep.ecosystem, reg);
  v.deprecated = dep_.deprecated || eco?.status === 'deprecated';
  v.deprecationMessage = dep_.message ?? eco?.deprecation_status?.message ?? undefined;

  const rel = lastReleaseInfo(dep.ecosystem, reg);
  v.lastReleaseAt = rel.at;
  v.daysSinceRelease = rel.at ? Math.floor((now - new Date(rel.at).getTime()) / DAY) : undefined;
  const firstRel = firstReleaseAt(dep.ecosystem, reg) ?? eco?.first_release_published_at;
  if (firstRel) v.yearsActive = (now - new Date(firstRel).getTime()) / (365.25 * DAY);
  v.dependents = eco?.dependent_repos_count ?? eco?.dependent_packages_count ?? null;
  v.license = eco?.licenses ?? undefined;

  if (dep.ecosystem === 'npm') {
    const t = await npmDownloadsTrend(dep.name).catch(() => ({ weekly: null, trend: null }));
    v.weeklyDownloads = t.weekly ?? (eco?.downloads_period === 'last-month' ? Math.round((eco?.downloads ?? 0) / 4.33) : null);
    v.downloadsTrend = t.trend;
  } else {
    v.weeklyDownloads = eco?.downloads_period === 'last-month' ? Math.round((eco?.downloads ?? 0) / 4.33) : null;
  }

  const contribs: Contributor[] = [];
  if (repo) {
    v.repoUrl = repo.url;
    const [ecoRepo, issues, ecoContribs, gh] = await Promise.all([
      getRepo(repo.owner, repo.repo).catch(() => null),
      getRepoIssuesStats(repo.owner, repo.repo).catch(() => null),
      getRepoContributors(repo.owner, repo.repo).catch(() => []),
      ghRepo(repo.owner, repo.repo).catch(() => null),
    ]);

    v.archived = gh?.archived ?? ecoRepo?.archived;
    v.pushedAt = gh?.pushed_at ?? ecoRepo?.pushed_at;
    v.openIssues = gh?.open_issues_count ?? ecoRepo?.open_issues_count ?? undefined;
    v.language = gh?.language ?? ecoRepo?.language ?? undefined;

    if (issues) {
      const closed = issues.past_year_issues_closed_count ?? 0;
      const opened = issues.past_year_issues_count ?? 0;
      v.issueCloseRate180 = opened > 0 ? Math.min(1, closed / opened) : null;
      v.medianIssueFirstResponseHrs = issues.issue_time_to_close_seconds
        ? Math.round(issues.issue_time_to_close_seconds / 3600)
        : null;
      v.stalePrs = issues.stale_pull_requests_count ?? null;
    }

    const ecoC = ecoContribs.filter((c) => c.login);
    if (ecoC.length) {
      const total = ecoC.reduce((a, c) => a + (c.commits_count ?? 0), 0);
      for (const c of ecoC.slice(0, 12)) {
        contribs.push({ handle: c.login!, commits: c.commits_count, url: `https://github.com/${c.login}` });
      }
      const top = ecoC[0]?.commits_count ?? 0;
      v.busFactor = total ? top / total : undefined;
      v.authorsLast365 = ecoC.filter((c) => (c.commits_count ?? 0) > 0).length;
      v.commitsLast365 = total || undefined;
    } else {
      const ghC = await ghContributors(repo.owner, repo.repo).catch(() => []);
      for (const c of ghC.slice(0, 12)) {
        if (c.login) contribs.push({ handle: c.login, commits: c.contributions, url: c.html_url });
      }
    }

    // pulse + precise last commit (GitHub; skipped silently when rate-limited)
    const [weekly, last] = await Promise.all([
      ghCommitActivity(repo.owner, repo.repo).catch(() => null),
      ghLastCommit(repo.owner, repo.repo, gh?.default_branch).catch(() => null),
    ]);
    if (weekly) v.commitsPerWeek = weekly;
    v.lastCommitAt = last?.commit?.committer?.date ?? v.pushedAt;
    if (last && !v['lastWords' as never]) {
      // stash subject for the autopsy
      (v as VitalSigns & { _lastCommitSubject?: string })._lastCommitSubject = last.commit.message.split('\n')[0];
    }
    v.daysSinceCommit = v.lastCommitAt ? Math.floor((now - new Date(v.lastCommitAt).getTime()) / DAY) : v.pushedAt ? Math.floor((now - new Date(v.pushedAt).getTime()) / DAY) : undefined;
  }

  return { vitals: v, repo, contributors: contribs, exists: true };
}

export async function autopsy(dep: DepRef, vitals: VitalSigns): Promise<Autopsy> {
  const { cause, evidence } = classifyCause(vitals);
  const last = lastWords(vitals, (vitals as VitalSigns & { _lastCommitSubject?: string })._lastCommitSubject);

  const provider = providerFor('autopsy');
  if (provider) {
    const evText = evidence.map((e) => `${e.id}: ${e.label} — ${e.detail}`).join('\n');
    const { data, result } = await chatJson(
      provider.id,
      [
        { role: 'system', content: 'You write dignified autopsies for open-source projects. Return strict JSON: causeOfDeath (enum), evidenceIds (only ids given), epitaph (max 2 sentences, warm, never blaming maintainers, no jokes at their expense). Signals, not verdicts.' },
        {
          role: 'user',
          content: `Project: ${dep.ecosystem}/${dep.name}\nVitals: ${JSON.stringify({ ...vitals, commitsPerWeek: undefined })}\nEvidence:\n${evText || '(none)'}\nSuggested cause: ${cause}`,
        },
      ],
      AutopsySchema,
    );
    if (data) {
      const validIds = data.evidenceIds.filter((id) => evidence.some((e) => e.id === id));
      return {
        causeOfDeath: data.causeOfDeath,
        epitaph: data.epitaph,
        evidenceIds: validIds.length ? validIds : evidence.map((e) => e.id),
        lastWords: last.text,
        lastWordsUrl: last.url,
        generatedBy: `${result!.provider}/${result!.model}`,
      };
    }
  }

  return {
    causeOfDeath: cause,
    epitaph: fallbackEpitaph(dep.name, cause, vitals),
    evidenceIds: evidence.map((e) => e.id),
    lastWords: last.text,
    lastWordsUrl: last.url,
    generatedBy: 'fallback-rules',
  };
}

export async function scoreOne(dep: DepRef, opts: { withAutopsy?: boolean } = {}): Promise<ScoredDep> {
  try {
    const { vitals, repo, contributors, exists } = await fetchSignals(dep);
    if (!exists) {
      return {
        dep,
        vitals: {},
        score: 0,
        band: 'alive',
        confidence: 'low',
        evidence: [],
        error: "We couldn't find enough public signals",
        notFound: true,
      };
    }
    const hasAnySignal =
      vitals.daysSinceCommit !== undefined ||
      vitals.daysSinceRelease !== undefined ||
      Boolean(vitals.archived) ||
      Boolean(vitals.deprecated) ||
      vitals.weeklyDownloads != null;
    if (!hasAnySignal) {
      return {
        dep,
        repo,
        vitals,
        score: 0,
        band: 'alive',
        confidence: 'low',
        evidence: [],
        contributors,
        error: "We couldn't find enough public signals",
      };
    }
    const s = await ghostScore(vitals);
    const out: ScoredDep = {
      dep, repo, vitals,
      score: s.score, band: s.band, confidence: s.confidence,
      contributions: s.contributions,
      model: s.model,
      evidence: classifyCause(vitals).evidence,
      contributors,
    };
    if (opts.withAutopsy || s.band === 'haunted' || s.band === 'departed') {
      out.autopsy = await autopsy(dep, vitals);
      out.successors = await findSuccessors(dep, vitals).catch(() => []);
      if (repo) await buildCorpus(dep, repo).catch(() => {});
    }
    return out;
  } catch (e) {
    return {
      dep, vitals: {}, score: 0, band: 'alive', confidence: 'low',
      evidence: [], error: e instanceof Error ? e.message : "We couldn't find enough public signals",
    };
  }
}

export async function runScan(reportId: string, onProgress?: (r: Report) => Promise<void>): Promise<Report> {
  const report = await getReport(reportId);
  if (!report) throw new Error(`report ${reportId} not found`);
  report.status = 'running';
  report.progress.phase = 'resolving repositories';
  await saveReport(report);
  await onProgress?.(report);

  const deps: DepRef[] = (report as unknown as { _deps: DepRef[] })._deps ?? [];
  const results: ScoredDep[] = new Array(deps.length);
  await mapLimit(deps, 8, async (dep, i) => {
    results[i] = await scoreOne(dep);
    report.progress = { done: i + 1, total: deps.length, phase: `examining ${dep.name}` };
    await saveReport(report);
    await onProgress?.(report);
  });

  report.results = results.filter(Boolean);
  const s: ScanSummary = { total: report.results.length, alive: 0, fading: 0, haunted: 0, departed: 0, unknown: 0 };
  for (const r of report.results) {
    if (r.error) s.unknown++;
    else s[r.band]++;
  }
  report.summary = s;
  report.status = 'done';
  report.progress = { done: deps.length, total: deps.length, phase: 'rendering report' };
  delete (report as unknown as { _deps?: DepRef[] })._deps;
  await saveReport(report);
  await onProgress?.(report);
  return report;
}
