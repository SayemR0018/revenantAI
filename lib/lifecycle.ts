// Declared-lifecycle detection (Part A):
// 1. Curated registry (data/lifecycle.json, offline-safe, verified sources only)
// 2. README / repository description scan with strict false-positive guards
// 3. Optional LLM second opinion (Part B) with verbatim-substring quote validation,
//    7-day cache, and 20-call per-scan budget.
import { createHash } from 'crypto';
import { promises as fs, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  DepRef,
  Ecosystem,
  LifecycleSignal,
  LifecycleStatus,
  RepoRef,
} from './types';
import { cachedFetch } from './fetch';
import { ghReadme } from './github';
import { chatJson, LifecycleLlmSchema, providersFor } from './llm';

export interface CuratedLifecycleEntry {
  ecosystem: Ecosystem;
  name: string;
  status: LifecycleStatus;
  quote: string;
  url: string;
}

export interface LifecycleScanBudget {
  count: number;
  max: number;
}

export function createLifecycleBudget(max = 20): LifecycleScanBudget {
  return { count: 0, max };
}

let curatedCache: CuratedLifecycleEntry[] | null = null;

export function loadCuratedLifecycle(): CuratedLifecycleEntry[] {
  if (curatedCache) return curatedCache;
  const candidates = [
    path.join(process.cwd(), 'data', 'lifecycle.json'),
    path.join(process.cwd(), 'cli', 'data', 'lifecycle.json'),
  ];
  for (const file of candidates) {
    try {
      const raw = JSON.parse(readFileSync(/* turbopackIgnore: true */ file, 'utf8'));
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.entries) ? raw.entries : null;
      if (list) {
        curatedCache = list as CuratedLifecycleEntry[];
        return curatedCache;
      }
    } catch {
      /* try next */
    }
  }
  curatedCache = [];
  return curatedCache;
}

export function curatedLifecycle(dep: DepRef): LifecycleSignal | null {
  const entries = loadCuratedLifecycle();
  const hit = entries.find(
    (e) => e.ecosystem === dep.ecosystem && e.name.toLowerCase() === dep.name.toLowerCase(),
  );
  if (!hit) return null;
  return {
    status: hit.status,
    source: 'curated',
    quote: hit.quote.slice(0, 200),
    url: hit.url,
  };
}

const PROCESS_HEADING_RE =
  /\b(contributing|contributors?|governance|code\s+of\s+conduct|release\s+process|releasing|how\s+to\s+contribute|pull\s+requests|development\s+setup|changelog)\b/i;

const RELEVANT_HEADING_RE =
  /\b(status|maintenance|deprecat\w*|legacy|sunset\w*|unmaintained|abandon\w*|end[- ]of[- ]life)\b/i;

const EXPLICIT_STATUS_HEADING_RE =
  /^\s*#{1,6}\s*(?:⚠️\s*|warning[:\s]*|notice[:\s]*)?(?:project\s+status|status|deprecated!?|unmaintained!?|maintenance\s+mode|legacy\s+project|end\s+of\s+life|abandoned!?)\s*$/i;

function slugifyHeading(heading: string): string {
  return heading
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .toLowerCase()
    .replace(/[`*_~[\]()!?:.,/\\<>]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

interface SectionSlice {
  heading?: string;
  anchor?: string;
  text: string;
}

/**
 * Strip fenced code blocks and comments, then return the first ~6000 chars plus any
 * status/maintenance/deprecation/legacy/sunset section outside Contributing/Governance.
 */
export function extractRelevantReadmeSections(markdown: string): SectionSlice[] {
  if (!markdown) return [];

  // 1. Remove fenced code blocks (``` or ~~~) and HTML comments / <pre> blocks.
  const withoutFences = markdown
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/~~~[\s\S]*?~~~/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '\n')
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '\n');

  const lines = withoutFences.split(/\r?\n/);
  interface RawSection {
    level: number;
    heading: string;
    startChar: number;
    isProcess: boolean;
    isRelevantHeading: boolean;
    lines: string[];
  }

  const sections: RawSection[] = [];
  const headingStack: { level: number; text: string; isProcess: boolean }[] = [];
  let current: RawSection = {
    level: 0,
    heading: '',
    startChar: 0,
    isProcess: false,
    isRelevantHeading: false,
    lines: [],
  };
  sections.push(current);

  let charOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLen = line.length + 1;

    // Check ATX heading (# Heading) or Setext heading (next line === or ---)
    const atx = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*$/);
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const setext =
      !atx && line.trim().length > 0 && /^\s*(= substr|={3,}|-{3,})\s*$/.test(nextLine)
        ? { level: nextLine.trim().startsWith('=') ? 1 : 2, title: line.trim() }
        : null;

    if (atx || setext) {
      const level = atx ? atx[1].length : setext!.level;
      const title = atx ? atx[2].trim() : setext!.title;
      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      const parentProcess = headingStack.some((h) => h.isProcess);
      const selfProcess = PROCESS_HEADING_RE.test(title) && !RELEVANT_HEADING_RE.test(title);
      const isProcess = parentProcess || selfProcess;
      headingStack.push({ level, text: title, isProcess });

      current = {
        level,
        heading: title,
        startChar: charOffset,
        isProcess,
        isRelevantHeading: RELEVANT_HEADING_RE.test(title),
        lines: [],
      };
      sections.push(current);
      if (EXPLICIT_STATUS_HEADING_RE.test(line)) {
        current.lines.push(title);
      }
      if (setext) {
        charOffset += lineLen + nextLine.length + 1;
        i++;
        continue;
      }
    } else {
      current.lines.push(line);
    }

    charOffset += lineLen;
  }

  const out: SectionSlice[] = [];
  for (const s of sections) {
    if (s.isProcess) continue;
    if (s.startChar > 6000 && !s.isRelevantHeading) continue;
    const body = s.lines.join('\n');
    const maxLen = s.startChar <= 6000 ? Math.max(0, 6000 - s.startChar) : 2500;
    const clipped = body.slice(0, Math.max(800, maxLen));
    if (!clipped.trim()) continue;
    out.push({
      heading: s.heading || undefined,
      anchor: s.heading ? slugifyHeading(s.heading) : undefined,
      text: clipped,
    });
  }
  return out;
}

function isBadgeOrLinkOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  // Reference link definition: [id]: https://...
  if (/^\[[^\]]+\]:\s*\S+/.test(t)) return true;
  // Remove markdown badges [![...](...)](...) and images ![...](...) and HTML <img>/<a> tags
  const stripped = t
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/\[!\[[^\]]*\]\[[^\]]*\]\]\[[^\]]*\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')
    .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, '')
    .replace(/<\/?(?:img|picture|source|a|p|div|span|br|hr)\b[^>]*>/gi, '')
    .replace(/[|\s•·-]+/g, '')
    .trim();
  if (!stripped) return true;
  // Pure URL or markdown link list line
  if (/^(?:\[[^\]]+\]\([^)]+\)\s*[|•·-]?\s*)+$/.test(t) && !/maintenance|legacy|unmaintained|deprecated|abandoned|sunset/i.test(t)) {
    return true;
  }
  return false;
}

function cleanSentenceForMatching(raw: string): string {
  return raw
    // Replace inline code spans with neutral token so code literals don't trigger
    .replace(/`[^`]*`/g, ' [code] ')
    // Unwrap markdown links [label](url) -> label and [label][ref] -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    // Strip markdown bold/italics/blockquote markers
    .replace(/^[\s>*_~-]+/, '')
    .replace(/(\*\*|__|\*|_)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanQuoteForDisplay(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^[\s>]+/, '')
    .replace(/(\*\*|__)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

interface PatternGroup {
  status: LifecycleStatus;
  patterns: RegExp[];
}

const PATTERN_GROUPS: PatternGroup[] = [
  {
    status: 'unmaintained',
    patterns: [
      /\bno\s+longer\s+(?:actively\s+|being\s+)?maintained\b/i,
      /\b(?:is|are|currently|now|officially)\s+unmaintained\b/i,
      /\bunmaintained\s+(?:project|package|library|module|repository|repo)\b/i,
      /^[\s⚠️WarningNoticeStatus:*-]*unmaintained\b/i,
      /\bnot\s+(?:actively\s+|being\s+)?maintained\b/i,
      /\b(?:this\s+)?(?:project|package|library|module|repository|repo)\s+(?:is|has\s+been)\s+(?:now\s+|officially\s+)?abandoned\b/i,
      /\b(?:reached|reaching|has\s+reached|is\s+at)\s+end[- ]of[- ]life\b/i,
      /\bend[- ]of[- ]life\s*\(\s*eol\s*\)/i,
    ],
  },
  {
    status: 'seeking_maintainers',
    patterns: [
      /\blooking\s+for\s+(?:a\s+)?(?:new\s+)?maintainers?\b/i,
      /\bseeking\s+(?:a\s+)?(?:new\s+)?maintainers?\b/i,
      /\bneeds?\s+(?:a\s+)?(?:new\s+)?maintainers?\b/i,
      /\bup\s+for\s+adoption\b/i,
    ],
  },
  {
    status: 'sunset',
    patterns: [
      /\b(?:this\s+)?(?:project|package|library|module|repository|repo)\s+(?:is\s+being|has\s+been|will\s+be)\s+sunset(?:ted)?\b/i,
      /\bsunsetting\s+(?:this\s+)?(?:project|package|library|module|repository|repo)\b/i,
      /\bwill\s+be\s+(?:deprecated|archived)\b/i,
      /\b(?:is|has\s+been|was)\s+superseded\s+by\b/i,
      /^[\s⚠️WarningNoticeStatus:*-]*superseded\s+by\b/i,
    ],
  },
  {
    status: 'maintenance',
    patterns: [
      /\bmaintenance[- ]mode\b/i,
      /\bmaintenance-only\b/i,
      /\bonly\s+(?:accepting|receiving)\s+(?:critical\s+|urgent\s+|important\s+)?(?:bug|security)(?:\s+(?:and|or)\s+(?:bug|security))?\s+fix(?:es)?\b/i,
      /\bno\s+(?:new\s+)?features\s+(?:are\s+(?:being\s+)?(?:accepted|planned|added)|will\s+be\s+(?:accepted|added|implemented))\b/i,
      /\bnew\s+features\s+are\s+not\s+(?:being\s+)?accepted\b/i,
    ],
  },
  {
    status: 'legacy',
    patterns: [
      /\blegacy\s+project\b/i,
      /\bis\s+a\s+legacy\s+(?:library|package|module|tool|framework|project)\b/i,
      /\bconsider\s+(?:using|choosing)\s+(?:a\s+different|another)\b/i,
      /\byou\s+should\s+choose\s+a\s+different\s+library\b/i,
      /\bwhile\s+\S+\s+is\s+maintained,\s+we\s+recommend\s+.+\bfor\s+new\s+(?:front-end\s+|frontend\s+)?projects\b/i,
    ],
  },
];

const PRE_NEGATION_RE =
  /\b(not|no\s+longer|never|isn'?t|aren'?t|wasn'?t|weren'?t|neither|nor|without\s+being|far\s+from|instead\s+of|rather\s+than|don'?t\s+consider|do\s+not\s+consider)\b/i;

const PAST_TENSE_RE = /\b(was|were|previously|formerly|used\s+to\s+be|had\s+been|once)\b/i;

const NOW_ACTIVE_RE =
  /\b(?:but|however|though|although|yet|,|and)\s*(?:it\s+is\s+|is\s+|we\s+are\s+)?now\s+(?:active|actively\s+(?:developed|maintained)|maintained|revived|resumed|under\s+active\s+development)\b/i;

const FALSE_SUBJECT_RE =
  /\b(?:maintenance\s+(?:release|releases|branch|branches|window|windows|schedule|policy|scripts?|tasks?|work|burden|overhead|cost|costs|check|checks|page|screen)|(?:routine|scheduled|regular|server|database|system|planned|preventive)\s+maintenance|maintenance\s+of\s+(?:your|the|an?|existing|user|client|server|database|install|installation|code|dependencies)|(?:if|when|whether)\s+(?:a|an|the|your)\s+(?:server|service|app|application|site|system|database|cluster)\s+is\s+in\s+maintenance\s+mode|(?:put|place|switch|toggle|enter)\s+(?:the\s+|your\s+)?(?:server|service|app|application|site|system)\s+(?:into|in)\s+maintenance\s+mode|no\s+(?:new\s+)?features\s+(?:in\s+(?:this|patch|minor)\s+(?:release|version|pr)|without\s+an?\s+(?:issue|rfc|discussion|proposal)))\b/i;

function isFalsePositiveMatch(sentence: string, matchIndex: number, matchedText: string): boolean {
  if (FALSE_SUBJECT_RE.test(sentence)) return true;

  const before = sentence.slice(Math.max(0, matchIndex - 45), matchIndex);
  // Check for negation within ~40 chars before the match (note: "no longer" or "not" inside matchedText itself is part of the pattern, not in `before`)
  if (PRE_NEGATION_RE.test(before)) return true;

  const after = sentence.slice(matchIndex + matchedText.length, matchIndex + matchedText.length + 80);
  // Past tense reversal ("was in maintenance mode, now actively developed")
  if (PAST_TENSE_RE.test(before) && (NOW_ACTIVE_RE.test(after) || NOW_ACTIVE_RE.test(sentence))) {
    return true;
  }
  if (NOW_ACTIVE_RE.test(after)) return true;

  return false;
}

/**
 * Pure detector on README markdown or repo description text.
 */
export function detectLifecycleFromText(
  text: string,
  opts: { source?: 'readme' | 'repo_description'; repoUrl?: string } = {},
): LifecycleSignal | null {
  if (!text || !text.trim()) return null;
  const source = opts.source ?? 'readme';
  const baseRepoUrl = opts.repoUrl?.replace(/\/$/, '');

  const sections: SectionSlice[] =
    source === 'readme' ? extractRelevantReadmeSections(text) : [{ text: text.slice(0, 1000) }];

  for (const sec of sections) {
    // Split into paragraphs (blank-line separated), filter out badge/link lines
    const paragraphs = sec.text.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const keptLines = para
        .split(/\r?\n/)
        .filter((line) => !isBadgeOrLinkOnlyLine(line) && !/^\s*#{1,6}\s+/.test(line));
      if (!keptLines.length) continue;

      const joinedPara = keptLines.join(' ');
      // Split into sentences while keeping context
      const rawSentences = joinedPara
        .split(/(?<=[.!?])\s+(?=[A-Z⚠️"'>`])/)
        .map((s) => s.trim())
        .filter(Boolean);

      const candidates = rawSentences.length ? rawSentences : [joinedPara];

      for (let i = 0; i < candidates.length; i++) {
        const rawSent = candidates[i];
        const cleaned = cleanSentenceForMatching(rawSent);
        if (!cleaned || cleaned.length < 10) continue;

        for (const group of PATTERN_GROUPS) {
          for (const pat of group.patterns) {
            const m = pat.exec(cleaned);
            if (!m) continue;
            if (isFalsePositiveMatch(cleaned, m.index, m[0])) continue;

            // Include the next short sentence in quote if it's part of the same notice (e.g. "New features are not being accepted.")
            let displayQuote = cleanQuoteForDisplay(rawSent);
            if (i + 1 < candidates.length && displayQuote.length < 110) {
              const nextClean = cleanQuoteForDisplay(candidates[i + 1]);
              if (
                nextClean &&
                displayQuote.length + 1 + nextClean.length <= 200 &&
                /\b(features|bug|security|maintenance|deprecated|use|recommend|instead|status)\b/i.test(nextClean)
              ) {
                displayQuote = `${displayQuote} ${nextClean}`;
              }
            }

            const url = baseRepoUrl
              ? sec.anchor
                ? `${baseRepoUrl}#${sec.anchor}`
                : `${baseRepoUrl}#readme`
              : undefined;

            return {
              status: group.status,
              source,
              quote: displayQuote.slice(0, 200),
              url,
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Verbatim quote check for the LLM second-opinion classifier:
 * The quote returned by the model MUST be a verbatim substring of the README excerpt.
 */
export function validateLlmLifecycleQuote(quote: string, readmeExcerpt: string): boolean {
  if (!quote || !readmeExcerpt) return false;
  const trimmed = quote.trim();
  if (trimmed.length < 6) return false;
  if (readmeExcerpt.includes(trimmed)) return true;
  // Also allow matching when markdown bold/link punctuation was stripped or whitespace normalized,
  // ONLY if the normalized substring appears verbatim in the normalized excerpt.
  const norm = (s: string) => s.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  return norm(readmeExcerpt).includes(norm(trimmed));
}

const LIFECYCLE_CACHE_DIR = path.join(
  process.env.REVENANT_DATA_DIR || path.join(process.cwd(), 'data', 'store'),
  'lifecycle-cache',
);
const LIFECYCLE_CACHE_TTL_MS = 7 * 24 * 3600_000;
const memLlmLifecycleCache = new Map<string, { at: number; value: LifecycleSignal | null }>();

export function clearLifecycleCache(): void {
  memLlmLifecycleCache.clear();
  curatedCache = null;
  try {
    rmSync(LIFECYCLE_CACHE_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function llmCacheKey(pkg: string, excerpt: string): string {
  const hash = createHash('sha256').update(excerpt).digest('hex').slice(0, 24);
  const safePkg = pkg.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safePkg}__${hash}`;
}

async function readLlmLifecycleCache(key: string): Promise<{ hit: boolean; value: LifecycleSignal | null }> {
  const mem = memLlmLifecycleCache.get(key);
  if (mem && Date.now() - mem.at < LIFECYCLE_CACHE_TTL_MS) {
    return { hit: true, value: mem.value };
  }
  const file = path.join(LIFECYCLE_CACHE_DIR, `${key}.json`);
  try {
    const st = await fs.stat(file);
    if (Date.now() - st.mtimeMs < LIFECYCLE_CACHE_TTL_MS) {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as { value: LifecycleSignal | null };
      memLlmLifecycleCache.set(key, { at: st.mtimeMs, value: parsed.value });
      return { hit: true, value: parsed.value };
    }
  } catch {
    /* cache miss */
  }
  return { hit: false, value: null };
}

async function writeLlmLifecycleCache(key: string, value: LifecycleSignal | null): Promise<void> {
  memLlmLifecycleCache.set(key, { at: Date.now(), value });
  try {
    await fs.mkdir(LIFECYCLE_CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(LIFECYCLE_CACHE_DIR, `${key}.json`), JSON.stringify({ value }));
  } catch {
    /* ignore cache write failure */
  }
}

/**
 * Optional LLM second-opinion classifier on public README excerpts (≤3000 chars).
 * Never runs offline, caps at 20 calls per scan, caches for 7 days by pkg + sha256(excerpt),
 * and rejects any model answer whose quote is not a verbatim substring of the excerpt.
 */
export async function classifyLifecycleWithLlm(
  pkg: string,
  readmeExcerpt: string,
  opts: { url?: string; budget?: LifecycleScanBudget } = {},
): Promise<LifecycleSignal | null> {
  if (process.env.REVENANT_OFFLINE) return null;
  if (!readmeExcerpt || !readmeExcerpt.trim()) return null;
  if (opts.budget && opts.budget.count >= opts.budget.max) return null;

  const providers = providersFor('lifecycle');
  if (!providers.length) return null;

  // Send only public package name + ≤3000 chars of its public README.
  const excerpt = readmeExcerpt.slice(0, 3000);
  const cacheKey = llmCacheKey(pkg, excerpt);
  const cached = await readLlmLifecycleCache(cacheKey);
  if (cached.hit) return cached.value;

  if (opts.budget) opts.budget.count++;

  const messages = [
    {
      role: 'system' as const,
      content:
        'You classify whether an open-source project README explicitly declares its own lifecycle status. ' +
        'Return strict JSON matching { "status": "maintenance" | "legacy" | "unmaintained" | "seeking_maintainers" | "sunset" | "none", "confidence": number (0..1), "quote": string }. ' +
        'The "quote" field MUST be an exact verbatim substring copied character-for-character from the provided README excerpt (empty string if status is "none"). Never paraphrase or invent quotes.',
    },
    {
      role: 'user' as const,
      content: `Package: ${pkg}\n\nPublic README excerpt:\n${excerpt}`,
    },
  ];

  const chainSpec = providers.map((p) => p.spec || p.id).join(',');
  try {
    const { data } = await chatJson(chainSpec, messages, LifecycleLlmSchema);
    if (!data || data.status === 'none' || data.confidence < 0.6) {
      await writeLlmLifecycleCache(cacheKey, null);
      return null;
    }
    if (!validateLlmLifecycleQuote(data.quote, excerpt)) {
      await writeLlmLifecycleCache(cacheKey, null);
      return null;
    }
    const signal: LifecycleSignal = {
      status: data.status,
      source: 'llm',
      quote: data.quote.trim().slice(0, 200),
      url: opts.url,
    };
    await writeLlmLifecycleCache(cacheKey, signal);
    return signal;
  } catch {
    return null;
  }
}

export async function fetchReadmeForLifecycle(owner: string, repo: string): Promise<string | null> {
  if (process.env.REVENANT_OFFLINE) return null;
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`;
    const raw = await cachedFetch<string>(rawUrl, {
      ttlMs: 24 * 3600_000,
      timeoutMs: 4000,
      text: true,
    }).catch(() => null);
    if (raw && typeof raw === 'string' && raw.trim()) return raw;
  } catch {
    /* swallow */
  }
  try {
    return await ghReadme(owner, repo).catch(() => null);
  } catch {
    return null;
  }
}

const AMBIGUOUS_CUE_RE =
  /\b(maintenance|legacy|unmaintained|deprecated|abandoned|sunset|superseded|end[- ]of[- ]life|looking\s+for\s+maintainers|seeking\s+maintainers)\b/i;

/**
 * Full priority pipeline for a package's declared lifecycle status:
 * 1. Curated registry (data/lifecycle.json)
 * 2. README / repo description regex scan
 * 3. Optional LLM second opinion on ambiguous README excerpts (when configured)
 */
export async function detectLifecycle(
  dep: DepRef,
  opts: {
    repo?: RepoRef;
    repoDescription?: string;
    readmeText?: string | null;
    budget?: LifecycleScanBudget;
  } = {},
): Promise<LifecycleSignal | null> {
  // 1. Curated registry (instant, offline-safe, verified)
  const curated = curatedLifecycle(dep);
  if (curated) return curated;

  if (process.env.REVENANT_OFFLINE && opts.readmeText === undefined && !opts.repoDescription) {
    return null;
  }

  const repoUrl = opts.repo?.url;

  // 2. Repo description check + README scan
  let readme = opts.readmeText;
  if (readme === undefined && opts.repo) {
    readme = await fetchReadmeForLifecycle(opts.repo.owner, opts.repo.repo);
  }

  let regexSignal: LifecycleSignal | null = null;
  if (readme) {
    regexSignal = detectLifecycleFromText(readme, { source: 'readme', repoUrl });
  }
  if (!regexSignal && opts.repoDescription) {
    regexSignal = detectLifecycleFromText(opts.repoDescription, {
      source: 'repo_description',
      repoUrl,
    });
  }

  // 3. Optional LLM second opinion when README has lifecycle cues and LLM_LIFECYCLE_PROVIDER is explicitly set
  //    or when the README has ambiguous lifecycle cues that regex didn't match.
  const hasExplicitLlmEnv = Boolean(process.env.LLM_LIFECYCLE_PROVIDER);
  if (
    readme &&
    !process.env.REVENANT_OFFLINE &&
    AMBIGUOUS_CUE_RE.test(readme.slice(0, 6000)) &&
    (!regexSignal || hasExplicitLlmEnv)
  ) {
    const sections = extractRelevantReadmeSections(readme);
    const excerpt = (sections.map((s) => s.text).join('\n\n') || readme).slice(0, 3000);
    const llmSignal = await classifyLifecycleWithLlm(`${dep.ecosystem}/${dep.name}`, excerpt, {
      url: repoUrl ? `${repoUrl}#readme` : undefined,
      budget: opts.budget,
    });
    if (llmSignal) {
      return llmSignal;
    }
  }

  return regexSignal;
}
