// Cause-of-death classification + rule-based fallback epitaph.
// When an LLM provider is configured, lib/llm.ts generates the epitaph instead
// and this supplies the evidence + a dignity check.
import { CauseOfDeath, EvidenceItem, VitalSigns } from './types';

export function classifyCause(v: VitalSigns): { cause: CauseOfDeath; evidence: EvidenceItem[] } {
  const ev: EvidenceItem[] = [];
  const push = (e: Omit<EvidenceItem, 'id'>) => ev.push({ ...e, id: `ev${ev.length + 1}` });

  if (v.deprecated) {
    push({ kind: 'registry', label: 'Officially deprecated', detail: v.deprecationMessage ?? 'Registry deprecation notice', at: v.lastReleaseAt });
    return { cause: 'deprecated_official', evidence: ev };
  }
  if (v.archived) {
    push({ kind: 'repo_meta', label: 'Repository archived', detail: 'Read-only on GitHub', url: v.repoUrl });
    return { cause: 'archived_by_author', evidence: ev };
  }
  const dc = v.daysSinceCommit;
  if (dc !== undefined && Number.isFinite(dc) && dc > 730) {
    push({
      kind: 'commit',
      label: `No commits in ${Math.floor(dc / 365)}+ years`,
      detail: `Last commit ${v.lastCommitAt ?? v.pushedAt ?? 'not enough data'}`,
      url: v.repoUrl,
      at: v.lastCommitAt ?? v.pushedAt,
    });
    if ((v.openIssues ?? 0) > 0 && (v.issueCloseRate180 ?? 1) < 0.05) {
      push({ kind: 'issue', label: 'Issues unanswered', detail: `${v.openIssues} open, close rate near zero` });
      return { cause: 'maintainer_burnout', evidence: ev };
    }
    return { cause: 'slow_decay', evidence: ev };
  }
  if (dc !== undefined && Number.isFinite(dc) && dc > 365) {
    push({ kind: 'commit', label: `No commits in ${Math.floor(dc / 30)} months`, detail: `Last commit ${v.lastCommitAt ?? v.pushedAt ?? 'not enough data'}`, url: v.repoUrl });
    if ((v.downloadsTrend ?? 1) < 0.4) {
      push({ kind: 'registry', label: 'Downloads collapsing', detail: `Trend ratio ${v.downloadsTrend?.toFixed(2)}` });
      return { cause: 'superseded', evidence: ev };
    }
    return { cause: 'slow_decay', evidence: ev };
  }
  if (dc !== undefined && Number.isFinite(dc) && dc > 180) {
    push({ kind: 'commit', label: 'Commit activity paused ~6 months', detail: `Last commit ${v.lastCommitAt ?? v.pushedAt}`, url: v.repoUrl });
    return { cause: 'slow_decay', evidence: ev };
  }
  const dr = v.daysSinceRelease;
  if (dc === undefined && dr !== undefined && Number.isFinite(dr)) {
    if (dr > 730) {
      push({
        kind: 'release',
        label: `No releases in ${Math.floor(dr / 365)}+ years`,
        detail: `Last release ${v.lastReleaseAt ?? 'not enough data'}`,
        at: v.lastReleaseAt,
      });
      return { cause: 'slow_decay', evidence: ev };
    }
    return { cause: 'alive', evidence: ev };
  }
  if (dc === undefined && dr === undefined) {
    return { cause: 'unknown', evidence: ev };
  }
  return { cause: 'alive', evidence: ev };
}

const CAUSE_EPITAPH: Record<CauseOfDeath, (name: string, v: VitalSigns) => string> = {
  deprecated_official: (n) => `${n} stepped aside with a note pinned to the door. It told you where to go next — that is a kind of care.`,
  archived_by_author: (n, v) => `${n} was set in stone after ${v.yearsActive ? Math.round(v.yearsActive) + ' years' : 'long service'}. Read-only, but still standing.`,
  maintainer_burnout: (n) => `${n} went quiet while questions piled up unanswered. Somewhere, a maintainer chose their own life — respect that.`,
  superseded: (n) => `The world moved on from ${n}. What it taught us moved with it.`,
  company_pulled: (n) => `${n} outlived its sponsors. The code remains; the organization does not.`,
  ecosystem_shift: (n) => `${n} belonged to a platform era that ended. The commit log is its monument.`,
  slow_decay: (n) => `${n} did not die — it faded, release by release, until the pulse went flat.`,
  alive: (n) => `${n} still has a pulse. Long may it commit.`,
  unknown: (n) => `Of ${n}, the records are unclear. Absence of evidence is not evidence of absence.`,
};

export function fallbackEpitaph(name: string, cause: CauseOfDeath, v: VitalSigns): string {
  return CAUSE_EPITAPH[cause](name, v);
}

export function lastWords(v: VitalSigns, lastCommitSubject?: string, lastReleaseName?: string): { text?: string; url?: string } {
  const raw = lastCommitSubject ?? lastReleaseName;
  if (!raw) return {};
  return { text: raw.split('\n')[0].slice(0, 140), url: v.repoUrl };
}
