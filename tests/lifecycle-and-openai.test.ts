import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { heuristicScore, ghostScore } from '@/lib/score';
import { classifyCause, fallbackEpitaph } from '@/lib/epitaph';
import {
  curatedLifecycle,
  detectLifecycleFromText,
  validateLlmLifecycleQuote,
  classifyLifecycleWithLlm,
  clearLifecycleCache,
  createLifecycleBudget,
} from '@/lib/lifecycle';
import {
  resolveProvider,
  providerFor,
  providersFor,
  listArenaProviders,
  chat,
} from '@/lib/llm';
import { agentModel } from '@/mastra/agents';
import { runReceiptChecks } from '@/lib/receipts-core';
import { scoreDepOffline } from '../cli/lib/score.js';
import {
  MOMENT_LIKE_VITALS,
  POSITIVE_README_FIXTURES,
  NEGATIVE_README_FIXTURES,
} from './fixtures/lifecycle-fixtures';

describe('Part A: declared lifecycle signal & scoring', () => {
  it('moment-like vitals without lifecycle stays alive (regression guard)', () => {
    const res = heuristicScore({ ...MOMENT_LIKE_VITALS });
    expect(res.band).toBe('alive');
    expect(res.score).toBe(0);
    expect(res.contributions.some((c) => c.feature === 'recentActivity' && c.points < 0)).toBe(true);
    expect(res.contributions.some((c) => c.feature === 'recentRelease' && c.points < 0)).toBe(true);
  });

  it('moment-like vitals + curated lifecycle -> band fading, 25 <= score <= 49, lifecycle contribution, no negative mitigations', () => {
    const lc = curatedLifecycle({ ecosystem: 'npm', name: 'moment' });
    expect(lc).not.toBeNull();
    expect(lc?.status).toBe('maintenance');
    expect(lc?.source).toBe('curated');
    expect(lc?.quote).toContain('maintenance mode');

    const res = heuristicScore({
      ...MOMENT_LIKE_VITALS,
      lifecycle: lc!,
    });
    expect(res.band).toBe('fading');
    expect(res.score).toBeGreaterThanOrEqual(25);
    expect(res.score).toBeLessThanOrEqual(49);
    expect(res.score).toBe(35);
    expect(res.confidence).toBe('high');
    expect(res.contributions).toContainEqual({ feature: 'lifecycle', points: 35 });
    expect(res.contributions.some((c) => c.points < 0)).toBe(false);

    const { cause, evidence } = classifyCause({
      ...MOMENT_LIKE_VITALS,
      lifecycle: lc!,
    });
    expect(cause).toBe('maintenance_mode');
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      kind: 'readme',
      label: 'Declared in maintenance mode',
      detail: lc!.quote,
      url: lc!.url,
    });
    expect(fallbackEpitaph('moment', cause, { ...MOMENT_LIKE_VITALS, lifecycle: lc! })).toBe(
      'moment is in maintenance mode: still patched, no longer evolving. Plan your exit while it is calm.',
    );
  });

  it('README detector matches positive fixtures accurately', () => {
    const m = detectLifecycleFromText(POSITIVE_README_FIXTURES.momentReadme, {
      source: 'readme',
      repoUrl: 'https://github.com/moment/moment',
    });
    expect(m).not.toBeNull();
    expect(m?.status).toBe('maintenance');
    expect(m?.quote).toContain('Moment.js is a legacy project, now in maintenance mode.');
    expect(m?.url).toBe('https://github.com/moment/moment#momentjs');

    const unm = detectLifecycleFromText(POSITIVE_README_FIXTURES.unmaintainedNotice, {
      source: 'readme',
      repoUrl: 'https://github.com/example/old-widget',
    });
    expect(unm?.status).toBe('unmaintained');

    const seek = detectLifecycleFromText(POSITIVE_README_FIXTURES.seekingMaintainersNotice, {
      source: 'readme',
      repoUrl: 'https://github.com/example/fast-queue',
    });
    expect(seek?.status).toBe('seeking_maintainers');
    expect(seek?.url).toBe('https://github.com/example/fast-queue#project-status');

    const leg = detectLifecycleFromText(POSITIVE_README_FIXTURES.legacyNotice, {
      source: 'readme',
    });
    expect(leg?.status).toBe('legacy');

    const sun = detectLifecycleFromText(POSITIVE_README_FIXTURES.sunsetNotice, {
      source: 'readme',
    });
    expect(sun?.status).toBe('sunset');
  });

  it('README detector rejects all false-positive negative fixtures', () => {
    expect(detectLifecycleFromText(NEGATIVE_README_FIXTURES.notInMaintenanceMode)).toBeNull();
    expect(detectLifecycleFromText(NEGATIVE_README_FIXTURES.noLongerInMaintenance)).toBeNull();
    expect(detectLifecycleFromText(NEGATIVE_README_FIXTURES.maintenanceRelease)).toBeNull();
    expect(detectLifecycleFromText(NEGATIVE_README_FIXTURES.codeFenceMention)).toBeNull();
    expect(detectLifecycleFromText(NEGATIVE_README_FIXTURES.wasInMaintenanceNowActive)).toBeNull();
    expect(detectLifecycleFromText(NEGATIVE_README_FIXTURES.contributingMaintenanceHeading)).toBeNull();
  });

  it('TabPFN path with mocked fetch returning p_abandoned: 0.02 + lifecycle maintenance floors score to 30', async () => {
    const prevUrl = process.env.ML_SERVICE_URL;
    const prevMode = process.env.TABPFN_MODE;
    process.env.ML_SERVICE_URL = 'http://ml.local:8000';
    process.env.TABPFN_MODE = 'api';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ p_abandoned: 0.02 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    try {
      const res = await ghostScore({
        ...MOMENT_LIKE_VITALS,
        lifecycle: {
          status: 'maintenance',
          source: 'curated',
          quote: 'Moment.js is a legacy project, now in maintenance mode.',
        },
      });
      expect(res.model).toBe('tabpfn');
      expect(res.score).toBe(30);
      expect(res.band).toBe('fading');
      expect(res.contributions.some((c) => c.feature === 'lifecycle')).toBe(true);
    } finally {
      fetchSpy.mockRestore();
      if (prevUrl === undefined) delete process.env.ML_SERVICE_URL;
      else process.env.ML_SERVICE_URL = prevUrl;
      if (prevMode === undefined) delete process.env.TABPFN_MODE;
      else process.env.TABPFN_MODE = prevMode;
    }
  });

  it('archived and deprecated paths and healthy packages remain unchanged; CLI offline matches', () => {
    for (const pkg of ['request', 'node-sass', 'tslint', 'left-pad']) {
      const off = scoreDepOffline({ ecosystem: 'npm', name: pkg });
      expect(off.band).toBe('departed');
      expect(off.score).toBeGreaterThanOrEqual(75);
    }
    const babelEslint = heuristicScore({
      deprecated: true,
      deprecationMessage: 'babel-eslint is now @babel/eslint-parser',
      archived: true,
      daysSinceCommit: 1600,
    });
    expect(babelEslint.band).toBe('departed');

    for (const pkg of ['react', 'lodash']) {
      const off = scoreDepOffline({ ecosystem: 'npm', name: pkg });
      expect(off.band).toBe('alive');
    }

    const momentOffline = scoreDepOffline({ ecosystem: 'npm', name: 'moment' });
    expect(momentOffline.band).toBe('fading');
    expect(momentOffline.score).toBe(35);
    expect(momentOffline.vitals.lifecycle?.status).toBe('maintenance');
  });
});

describe('Part B: LLM quote validation & opt-in OpenAI provider', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    clearLifecycleCache();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.restoreAllMocks();
  });

  it('rejects model quotes that are not verbatim substrings of the README excerpt', () => {
    const excerpt = POSITIVE_README_FIXTURES.momentReadme;
    expect(
      validateLlmLifecycleQuote(
        'Moment.js is a legacy project, now in **maintenance mode**.',
        excerpt,
      ),
    ).toBe(true);
    expect(
      validateLlmLifecycleQuote(
        'This library has been deprecated by the maintainers in 2020.',
        excerpt,
      ),
    ).toBe(false);
  });

  it('keeps OpenAI strictly opt-in when OPENAI_API_KEY is unset', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_AUTOPSY_PROVIDER;
    delete process.env.LLM_LIFECYCLE_PROVIDER;
    delete process.env.LLM_ARENA_PROVIDERS;
    delete process.env.MASTRA_MODEL_PROVIDER;

    expect(providerFor('autopsy')?.id).not.toBe('openai');
    expect(providerFor('lifecycle')?.id).not.toBe('openai');
    expect(listArenaProviders()).not.toContain('openai');
    expect(agentModel().id.startsWith('openai/')).toBe(false);

    const checks = await runReceiptChecks({ quick: true });
    const openaiCheck = checks.find((c) => c.id === 'openai');
    expect(openaiCheck).toBeDefined();
    expect(openaiCheck?.status).toBe('SKIPPED');
    expect(openaiCheck?.notes).toContain('closed-weight, opt-in, never default');
  });

  it('resolves openai:<model>, comma-separated fallback chains, and Mastra opt-in when configured', () => {
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMMA_API_KEY;

    const custom = resolveProvider('openai:gpt-5.4');
    expect(custom.id).toBe('openai');
    expect(custom.closed).toBe(true);
    expect(custom.model()).toBe('gpt-5.4');

    process.env.LLM_AUTOPSY_PROVIDER = 'gemma-aistudio,openai:gpt-5.4-mini';
    const chain = providersFor('autopsy');
    expect(chain.map((p) => p.id)).toEqual(['openai']);
    expect(providerFor('autopsy')?.id).toBe('openai');

    process.env.LLM_ARENA_PROVIDERS = 'gemma-aistudio,openai';
    expect(listArenaProviders()).toEqual(['gemma-aistudio', 'openai']);

    process.env.MASTRA_MODEL_PROVIDER = 'openai';
    expect(agentModel().id).toBe('openai/gpt-5.4-mini');
  });

  it('sends max_completion_tokens, omits temperature for reasoning models, retries 429, and validates verbatim quote in classifyLifecycleWithLlm', async () => {
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    process.env.LLM_LIFECYCLE_PROVIDER = 'openai:gpt-5.4-mini';

    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () => {
        return new Response('rate limited', {
          status: 429,
          headers: { 'retry-after': '0.05' },
        });
      })
      .mockImplementationOnce(async (input, init) => {
        calls.push({
          url: String(input),
          body: JSON.parse(String(init?.body ?? '{}')),
        });
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    status: 'maintenance',
                    confidence: 0.95,
                    quote: 'Moment.js is a legacy project, now in **maintenance mode**.',
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 50, completion_tokens: 20 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      });

    const budget = createLifecycleBudget(20);
    const sig = await classifyLifecycleWithLlm(
      'npm/moment-test',
      POSITIVE_README_FIXTURES.momentReadme,
      { url: 'https://github.com/moment/moment#readme', budget },
    );

    expect(sig).not.toBeNull();
    expect(sig?.status).toBe('maintenance');
    expect(sig?.source).toBe('llm');
    expect(budget.count).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].body.max_completion_tokens).toBe(2048);
    expect(calls[0].body.max_tokens).toBeUndefined();
    expect(calls[0].body.temperature).toBeUndefined();
    expect(calls[0].body.response_format).toEqual({ type: 'json_object' });

    // Now test fabricated quote rejection on a different excerpt
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  status: 'unmaintained',
                  confidence: 0.99,
                  quote: 'Invented quote that does not exist anywhere in the README.',
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const rejected = await classifyLifecycleWithLlm(
      'npm/fabricated-test',
      POSITIVE_README_FIXTURES.momentReadme,
      { budget },
    );
    expect(rejected).toBeNull();
  });

  it('never leaks API key in chat error messages', async () => {
    const fakeSecret = 'super-secret-value-99999';
    process.env.OPENAI_API_KEY = fakeSecret;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(`Unauthorized key ${fakeSecret}`, { status: 401 }),
    );
    await expect(
      chat('openai', [{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow('openai HTTP 401');
  });
});
