// The seance: a grounded persona that speaks only from the project's own
// corpus (README, releases, issues). Never impersonates a person, never
// fabricates quotes, says "I don't remember that" when evidence is missing.
import { chat, providerFor } from './llm';
import { buildCorpus, retrieve } from './corpus';
import { DepRef, RepoRef, SeanceMessage, VitalSigns } from './types';
import { getCorpus } from './store';

export interface SeanceReply {
  text: string;
  evidenceIds: string[];
  provider: string;
  grounded: boolean;
}

const SPIRIT_RULES = [
  'You are the spirit of an open-source project — the accumulated voice of its documentation, releases, and issue threads.',
  'You are NOT a person. Never claim to be a maintainer or invent quotes from real people.',
  'Answer ONLY from the evidence excerpts provided. If the evidence does not cover the question, answer: "I don\'t remember that."',
  'Never blame or mock maintainers. Absence is not guilt.',
  'Keep replies under 4 sentences, dignified and warm.',
].join(' ');

export async function seance(
  dep: DepRef,
  repo: RepoRef | undefined,
  vitals: VitalSigns,
  history: SeanceMessage[],
  userText: string,
): Promise<SeanceReply> {
  const chunks = await getCorpus(`${dep.ecosystem}/${dep.name}`).then((c) =>
    c.length ? c : buildCorpus(dep, repo),
  );
  const found = retrieve(chunks, userText, 4);

  const vitalLine = `Vital signs: ${vitals.archived ? 'archived' : 'not archived'}, ${vitals.deprecated ? 'deprecated' : 'not deprecated'}, last commit ${vitals.lastCommitAt ?? vitals.pushedAt ?? 'unknown'}, last release ${vitals.lastReleaseAt ?? 'unknown'}, weekly downloads ${vitals.weeklyDownloads ?? 'unknown'}.`;
  const evidenceText = found.length
    ? found.map((c, i) => `[e${i + 1}] (${c.source}) ${c.text.slice(0, 500)}`).join('\n\n')
    : '';

  const provider = providerFor('seance');
  if (provider) {
    const msgs = [
      { role: 'system' as const, content: `${SPIRIT_RULES}\n\nProject: ${dep.name} (${dep.ecosystem}). ${vitalLine}` },
      ...history.slice(-8).map((m) => ({ role: (m.role === 'spirit' ? 'assistant' : 'user') as 'assistant' | 'user', content: m.text })),
      { role: 'user' as const, content: `Evidence:\n${evidenceText || '(no matching evidence found)'}\n\nQuestion: ${userText}` },
    ];
    try {
      const r = await chat(provider.id.includes('backboard') ? `${provider.id}:${provider.model()}` : provider.id, msgs, { maxTokens: 400 });
      const text = r.text.trim();
      if (text) {
        return { text, evidenceIds: found.map((_, i) => `e${i + 1}`), provider: r.provider, grounded: found.length > 0 };
      }
    } catch {
      /* fall through to template */
    }
  }

  // Template fallback — still grounded, honest about its limits.
  if (!found.length) {
    return {
      text: `I am the spirit of ${dep.name}, but my memory is thin. I don't remember that — my records only hold what the project published. Ask me about what ${dep.name} does, how to install it, or how it ended.`,
      evidenceIds: [],
      provider: 'fallback-rules',
      grounded: false,
    };
  }
  const best = found[0];
  const sentence = best.text.split(/(?<=[.!?])\s+/).find((s) =>
    userText.toLowerCase().split(/[^a-z0-9]+/).some((t) => t.length > 2 && s.toLowerCase().includes(t)),
  ) ?? best.text.split(/(?<=[.!?])\s+/)[0];
  return {
    text: `From my ${best.source}: ${sentence.slice(0, 380)}${sentence.length > 380 ? '…' : ''} (a fuller answer needs a living model — connect a Gemma key for the full seance)`,
    evidenceIds: found.map((_, i) => `e${i + 1}`),
    provider: 'fallback-rules',
    grounded: true,
  };
}
